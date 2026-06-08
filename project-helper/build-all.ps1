# build-all.ps1 — Full build pipeline for Project Helper Electron app
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== Step 1/4: Build Frontend ===`n" -ForegroundColor Cyan
Push-Location "$Root\frontend"
npm install
$env:VITE_API_BASE = ""
npm run build
if (-not (Test-Path "dist\index.html")) { throw "Frontend build failed" }
Write-Host "Frontend built successfully" -ForegroundColor Green

Write-Host "`n=== Step 2/4: Prepare Frontend Dist ===`n" -ForegroundColor Cyan
$frontendDist = "$Root\build\frontend-dist"
if (Test-Path $frontendDist) { Remove-Item -Recurse -Force $frontendDist }
Copy-Item -Recurse "dist" -Destination $frontendDist
Pop-Location

Write-Host "`n=== Step 3/4: Build Backend with PyInstaller ===`n" -ForegroundColor Cyan
Push-Location "$Root\backend"
pip install -r requirements.txt
pip install pyinstaller
pyinstaller backend.spec --clean --distpath "$Root\build\pyinstaller"
if (-not (Test-Path "$Root\build\pyinstaller\backend\backend.exe")) {
    throw "PyInstaller build failed"
}
Write-Host "Backend built successfully" -ForegroundColor Green
Pop-Location

Write-Host "`n=== Step 4/4: Build Electron App ===`n" -ForegroundColor Cyan
Push-Location "$Root\electron"
npm install
npm run build:win
$installer = Get-ChildItem -Path "$Root\build\electron-dist" -Filter "Project Helper Setup*.exe" -Recurse |
    Select-Object -First 1
if (-not $installer) { throw "Electron build failed - no installer found" }
Write-Host "`n=== Build Complete! ===`n" -ForegroundColor Green
Write-Host "Installer: $($installer.FullName)"
Pop-Location
