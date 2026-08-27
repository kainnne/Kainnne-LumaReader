param(
  [string]$ExpectedVersion
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot "dist"
$library = (Resolve-Path (Join-Path $projectRoot "tests/release-library")).Path
$results = @()

if ([string]::IsNullOrWhiteSpace($ExpectedVersion)) {
  $package = Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
  $ExpectedVersion = $package.version
}

function Stop-LumaReaderProcesses {
  Get-Process -Name "Kainnne LumaReader" -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
}

function Invoke-LumaReaderSmoke {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (-not (Test-Path $Executable)) {
    throw "$Label executable was not found: $Executable"
  }

  Stop-LumaReaderProcesses
  $port = Get-Random -Minimum 39000 -Maximum 52000
  $arguments = @("--library=`"$library`"", "--reader-port=$port")
  $startedAt = Get-Date
  $process = Start-Process -FilePath $Executable -ArgumentList $arguments -PassThru

  try {
    $health = $null
    $lastError = $null
    $deadline = (Get-Date).AddSeconds(75)
    while ((Get-Date) -lt $deadline) {
      try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 3
        break
      } catch {
        $lastError = $_
        Start-Sleep -Milliseconds 750
      }
    }
    if (-not $health) {
      throw "$Label did not expose its loopback health endpoint: $lastError"
    }
    if (-not $health.ok -or $health.version -ne $ExpectedVersion -or -not $health.selected) {
      throw "$Label returned an unexpected health response: $($health | ConvertTo-Json -Compress)"
    }

    $files = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/files" -TimeoutSec 10
    if (-not ($files.files.path -contains "smoke.md")) {
      throw "$Label did not scan the selected release library."
    }

    $document = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/file?path=smoke.md" -TimeoutSec 10
    if ($document.kind -ne "markdown" -or $document.text -notmatch "Windows release smoke test") {
      throw "$Label did not open the Markdown smoke document."
    }

    $script:results += [pscustomobject]@{
      label = $Label
      executable = (Resolve-Path $Executable).Path
      version = $health.version
      librarySelected = $health.selected
      markdownScanned = $true
      markdownOpened = $true
      elapsedSeconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
    }
  } finally {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    Stop-LumaReaderProcesses
  }
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
Invoke-LumaReaderSmoke -Executable (Join-Path $installRoot "Kainnne LumaReader.exe") -Label "NSIS installed application"

$portable = (Get-ChildItem (Join-Path $distRoot "*-Windows-x64-Portable.exe") | Select-Object -First 1).FullName
$portableSignature = Get-AuthenticodeSignature -FilePath $portable
if ($portableSignature.Status -ne "NotSigned") {
  throw "The Windows portable build must remain unsigned, but Authenticode reported $($portableSignature.Status)."
}
Invoke-LumaReaderSmoke -Executable $portable -Label "Portable x64 application"

$results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $distRoot "windows-smoke-results.json")
$results | Format-Table -AutoSize
