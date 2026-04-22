@echo off
REM Opens the app in a sandboxed Chrome instance with file:// CORS restrictions lifted.
REM Uses a separate temp profile so your normal Chrome is unaffected.
start "" "msedge.exe" ^
  --disable-web-security ^
  --allow-file-access-from-files ^
  --user-data-dir="%TEMP%\superposterize-dev-profile" ^
  "%~dp0index.html"
