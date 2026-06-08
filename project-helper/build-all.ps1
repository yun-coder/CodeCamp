# build-all.ps1 — Full build pipeline with automatic verification
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$totalStart = Get-Date

function ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }

Write-Host "`n=== Step 1/5: Build Frontend ===`n" -ForegroundColor Cyan
Push-Location "$Root\frontend"
npm install | Out-Null
$env:VITE_API_BASE = ""
npm run build
if (-not (Test-Path "dist\index.html")) { throw "Frontend build failed" }
ok "Frontend built"

Write-Host "`n=== Step 2/5: Verify Frontend ===`n" -ForegroundColor Cyan
$jsFile = Get-ChildItem "dist\assets" -Filter "index-*.js" | Select-Object -First 1
$content = Get-Content $jsFile.FullName -Raw
if ($content -match '127\.0\.0\.1') { throw "BUG: frontend still has hardcoded port 8000" }
if ($content -notmatch 'api/config') { throw "BUG: frontend missing config API" }
ok "No hardcoded port"
ok "Config API present"

Write-Host "`n=== Step 3/5: Prepare Frontend Dist ===`n" -ForegroundColor Cyan
$frontendDist = "$Root\build\frontend-dist"
if (Test-Path $frontendDist) { Remove-Item -Recurse -Force $frontendDist }
Copy-Item -Recurse "dist" -Destination $frontendDist
ok "Frontend dist prepared"
Pop-Location

Write-Host "`n=== Step 4/5: Build Backend with PyInstaller ===`n" -ForegroundColor Cyan
Push-Location "$Root\backend"
pip install -r requirements.txt | Out-Null
pip install pyinstaller | Out-Null
$outDir = "$Root\build\pyinstaller\backend"
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
if (Test-Path "$Root\build\pyinstaller\backend.exe") { Remove-Item -Force "$Root\build\pyinstaller\backend.exe" }
pyinstaller backend.spec --clean --distpath "$Root\build\pyinstaller"
if (-not (Test-Path "$Root\build\pyinstaller\backend\backend.exe")) { throw "PyInstaller build failed" }
ok "Backend built"
Pop-Location

Write-Host "`n=== Step 5/5: Build Electron App ===`n" -ForegroundColor Cyan
Push-Location "$Root\electron"
npm install | Out-Null
npm run build:win
$installer = Get-ChildItem -Path "$Root\build\electron-dist" -Filter "Project Helper Setup*.exe" -Recurse |
    Select-Object -First 1
if (-not $installer) { throw "Electron build failed - no installer found" }

Write-Host "`n=== Final Verification ===`n" -ForegroundColor Magenta
$pkgJS = Get-ChildItem "$Root\build\electron-dist\win-unpacked\resources\frontend\assets" -Filter "index-*.js" |
    Select-Object -First 1
if ($null -ne $pkgJS) {
    $pkgContent = Get-Content $pkgJS.FullName -Raw
    if ($pkgContent -match '127\.0\.0\.1') { Write-Host "  [WARN] packaged frontend has hardcoded port" -ForegroundColor Yellow }
    else { ok "Packaged frontend: same-origin URLs" }
}
ok "Backend EXE: $('{0:N0}' -f (Get-Item "$Root\build\pyinstaller\backend\backend.exe").Length) bytes"
ok "Installer: $('{0:N0}' -f (Get-Item $installer.FullName).Length) bytes"

$elapsed = [math]::Round(((Get-Date) - $totalStart).TotalSeconds, 1)
Write-Host "`n=== Build Complete (${elapsed}s) ===`n" -ForegroundColor Green
Write-Host "Installer: $($installer.FullName)"
Pop-Location
