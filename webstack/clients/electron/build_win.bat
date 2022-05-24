@echo off

call .\node_modules\.bin\electron-packager . --platform=win32 --arch=x64 --icon=s3.ico --overwrite

copy /Y README.win      SAGE3-win32-x64\README.txt

7z a -sfx7z.sfx SAGE3-win64.exe SAGE3-win32-x64
node build_win.js
