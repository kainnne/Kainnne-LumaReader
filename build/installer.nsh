; Offer Markdown in Open With and Default apps without choosing it for the user.
; Do not use APP_ASSOCIATE: that macro replaces Software\Classes\.ext's default.
!macro customInstall
  WriteRegStr SHELL_CONTEXT "Software\Classes\Kainnne LumaReader Markdown" "" "Markdown document"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Kainnne LumaReader Markdown\DefaultIcon" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}",0'
  WriteRegStr SHELL_CONTEXT "Software\Classes\Kainnne LumaReader Markdown\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  !insertmacro LumaOpenWith "md"
  !insertmacro LumaOpenWith "markdown"
  !insertmacro LumaOpenWith "mkd"
  !insertmacro LumaOpenWith "mdx"
  WriteRegStr SHELL_CONTEXT "Software\Kainnne LumaReader\Capabilities" "ApplicationName" "Kainnne LumaReader"
  WriteRegStr SHELL_CONTEXT "Software\Kainnne LumaReader\Capabilities" "ApplicationDescription" "Read and edit Markdown documents"
  WriteRegStr SHELL_CONTEXT "Software\RegisteredApplications" "Kainnne LumaReader" "Software\Kainnne LumaReader\Capabilities"
!macroend

!macro LumaOpenWith EXT
  WriteRegNone SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "Kainnne LumaReader Markdown"
  WriteRegStr SHELL_CONTEXT "Software\Kainnne LumaReader\Capabilities\FileAssociations" ".${EXT}" "Kainnne LumaReader Markdown"
!macroend

!macro customUnInstall
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.md\OpenWithProgids" "Kainnne LumaReader Markdown"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.markdown\OpenWithProgids" "Kainnne LumaReader Markdown"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.mkd\OpenWithProgids" "Kainnne LumaReader Markdown"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.mdx\OpenWithProgids" "Kainnne LumaReader Markdown"
  DeleteRegValue SHELL_CONTEXT "Software\RegisteredApplications" "Kainnne LumaReader"
  DeleteRegKey SHELL_CONTEXT "Software\Classes\Kainnne LumaReader Markdown"
  DeleteRegKey SHELL_CONTEXT "Software\Kainnne LumaReader\Capabilities"
!macroend
