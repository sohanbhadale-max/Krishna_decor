@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ZIPALIGN=C:\Users\sohan\AppData\Local\Android\Sdk\build-tools\35.0.0\zipalign.exe"
set "APKSIGNER=C:\Users\sohan\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
set "KEYSTORE=C:\Users\sohan\.android\debug.keystore"

echo ========================================================
echo Signing Krishna Decor Staff APK
echo ========================================================
set "STAFF_SRC=e:\PROJECTS\d-decor\staff-app\android\app\build\outputs\apk\release\app-release-unsigned.apk"
set "STAFF_ALIGNED=e:\PROJECTS\d-decor\staff-app\android\app\build\outputs\apk\release\app-release-aligned.apk"
set "STAFF_OUT=e:\PROJECTS\d-decor\release\Krishna-Decor-Staff.apk"

if exist "%STAFF_ALIGNED%" del /f /q "%STAFF_ALIGNED%"
"%ZIPALIGN%" -f -p 4 "%STAFF_SRC%" "%STAFF_ALIGNED%"
call "%APKSIGNER%" sign --ks "%KEYSTORE%" --ks-pass pass:android --ks-key-alias androiddebugkey --out "%STAFF_OUT%" "%STAFF_ALIGNED%"
call "%APKSIGNER%" verify "%STAFF_OUT%"
if exist "%STAFF_ALIGNED%" del /f /q "%STAFF_ALIGNED%"

echo ========================================================
echo Signing Krishna Decor Manager APK
echo ========================================================
set "MGR_SRC=e:\PROJECTS\d-decor\manager-app\android\app\build\outputs\apk\release\app-release-unsigned.apk"
set "MGR_ALIGNED=e:\PROJECTS\d-decor\manager-app\android\app\build\outputs\apk\release\app-release-aligned.apk"
set "MGR_OUT=e:\PROJECTS\d-decor\release\Krishna-Decor-Manager.apk"

if exist "%MGR_ALIGNED%" del /f /q "%MGR_ALIGNED%"
"%ZIPALIGN%" -f -p 4 "%MGR_SRC%" "%MGR_ALIGNED%"
call "%APKSIGNER%" sign --ks "%KEYSTORE%" --ks-pass pass:android --ks-key-alias androiddebugkey --out "%MGR_OUT%" "%MGR_ALIGNED%"
call "%APKSIGNER%" verify "%MGR_OUT%"
if exist "%MGR_ALIGNED%" del /f /q "%MGR_ALIGNED%"

echo ========================================================
echo Done Signing APKs!
echo ========================================================
