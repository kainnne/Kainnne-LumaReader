param(
  [string]$ExpectedVersion
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot "dist"
$results = @()

if ([string]::IsNullOrWhiteSpace($ExpectedVersion)) {
  $package = Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
  $ExpectedVersion = $package.version
}

function Invoke-LumaReaderSmoke {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if (-not (Test-Path $Executable)) { throw "$Label executable was not found: $Executable" }
  $resultPath = Join-Path $env:RUNNER_TEMP ("lumareader-smoke-" + [guid]::NewGuid().ToString() + ".json")
  & node (Join-Path $PSScriptRoot "desktop-smoke.js") $Executable $Label $resultPath
  if ($LASTEXITCODE -ne 0) { throw "$Label failed its packaged UI smoke test." }
  $script:results += Get-Content $resultPath -Raw | ConvertFrom-Json
  Remove-Item $resultPath
}

$unpacked = Join-Path $distRoot "win-unpacked/Kainnne LumaReader.exe"
Invoke-LumaReaderSmoke -Executable $unpacked -Label "Unpacked x64 application"

$setup = (Get-ChildItem (Join-Path $distRoot "*-Windows-x64-Setup.exe") | Select-Object -First 1).FullName
$setupSignature = Get-AuthenticodeSignature -FilePath $setup
if ($setupSignature.Status -ne "NotSigned") {
  throw "The Windows installer must remain unsigned, but Authenticode reported $($setupSignature.Status)."
}
$installRoot = Join-Path $env:RUNNER_TEMP "lumareader-$ExpectedVersion-install"
$installer = Start-Process -FilePath $setup -ArgumentList @("/S", "/D=$installRoot") -Wait -PassThru
if ($installer.ExitCode -ne 0) {
  throw "The NSIS installer exited with code $($installer.ExitCode)."
}
$fileClass = "Kainnne LumaReader Markdown"
foreach ($extension in @("md", "markdown", "mkd", "mdx")) {
  $openWithPath = "HKCU:\Software\Classes\.$extension\OpenWithProgids"
  $openWith = Get-ItemProperty -Path $openWithPath -ErrorAction Stop
  if ($openWith.PSObject.Properties.Name -notcontains $fileClass) {
    throw "The NSIS installer did not register .$extension for Open With."
  }
}
$openCommand = (Get-Item "HKCU:\Software\Classes\$fileClass\shell\open\command" -ErrorAction Stop).GetValue("")
if ($openCommand -notmatch "Kainnne LumaReader\.exe" -or $openCommand -notmatch "%1") {
  throw "The Markdown Open With command is invalid: $openCommand"
}
Invoke-LumaReaderSmoke -Executable (Join-Path $installRoot "Kainnne LumaReader.exe") -Label "NSIS installed application"

$portable = (Get-ChildItem (Join-Path $distRoot "*-Windows-x64-Portable.exe") | Select-Object -First 1).FullName
$portableSignature = Get-AuthenticodeSignature -FilePath $portable
if ($portableSignature.Status -ne "NotSigned") {
  throw "The Windows portable build must remain unsigned, but Authenticode reported $($portableSignature.Status)."
}
Invoke-LumaReaderSmoke -Executable $portable -Label "Portable x64 application"

$results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $distRoot "windows-smoke-results.json")
$results | Format-Table -AutoSize
