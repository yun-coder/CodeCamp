# Vision FX local dependency downloader
# Usage: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$wasmDir = Join-Path $ScriptDir "wasm"
$modelDir = Join-Path $ScriptDir "models"
$assetDir = Join-Path $ScriptDir "assets"
$lootDir = Join-Path $assetDir "lootai"
New-Item -ItemType Directory -Force -Path $wasmDir, $modelDir, $lootDir | Out-Null

$wasmBase = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35"
$modelBase = "https://storage.googleapis.com/mediapipe-models"
$p5Url = "https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"

$downloads = @(
  @{
    Url = "$wasmBase/vision_bundle.mjs"
    Dest = Join-Path $wasmDir "vision_bundle.mjs"
    Name = "MediaPipe vision bundle"
  },
  @{
    Url = "$wasmBase/wasm/vision_wasm_internal.js"
    Dest = Join-Path $wasmDir "vision_wasm_internal.js"
    Name = "MediaPipe WASM JS"
  },
  @{
    Url = "$wasmBase/wasm/vision_wasm_internal.wasm"
    Dest = Join-Path $wasmDir "vision_wasm_internal.wasm"
    Name = "MediaPipe WASM binary"
  },
  @{
    Url = "$wasmBase/wasm/vision_wasm_module_internal.js"
    Dest = Join-Path $wasmDir "vision_wasm_module_internal.js"
    Name = "MediaPipe module JS"
  },
  @{
    Url = "$wasmBase/wasm/vision_wasm_module_internal.wasm"
    Dest = Join-Path $wasmDir "vision_wasm_module_internal.wasm"
    Name = "MediaPipe module WASM"
  },
  @{
    Url = "$wasmBase/wasm/vision_wasm_nosimd_internal.js"
    Dest = Join-Path $wasmDir "vision_wasm_nosimd_internal.js"
    Name = "MediaPipe no-SIMD JS"
  },
  @{
    Url = "$wasmBase/wasm/vision_wasm_nosimd_internal.wasm"
    Dest = Join-Path $wasmDir "vision_wasm_nosimd_internal.wasm"
    Name = "MediaPipe no-SIMD WASM"
  },
  @{
    Url = "$modelBase/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
    Dest = Join-Path $modelDir "gesture_recognizer.task"
    Name = "Gesture Recognizer model"
  },
  @{
    Url = "$modelBase/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    Dest = Join-Path $modelDir "face_landmarker.task"
    Name = "Face Landmarker model"
  },
  @{
    Url = $p5Url
    Dest = Join-Path $assetDir "p5.min.js"
    Name = "p5.js"
  },
  @{
    Url = "https://static.lootai.net/m0873s5xe2kdsww8/works/c3emubelct5znyp5/cover.jpg"
    Dest = Join-Path $lootDir "curtain-cover.jpg"
    Name = "LootAI reference cover"
  },
  @{
    Url = "https://static.lootai.net/tmp/m0873s5xe2kdsww8/1779589646343-0qyqzv4gl8v-5-23-.mp4"
    Dest = Join-Path $lootDir "curtain-showcase.mp4"
    Name = "LootAI showcase video"
  }
)

function Download-File {
  param($Url, $Dest, $Name)
  if (Test-Path $Dest) {
    $existing = (Get-Item $Dest).Length
    if ($existing -gt 10000) {
      Write-Host "[skip] $Name" -ForegroundColor DarkGray
      return
    }
  }
  Write-Host "[download] $Name" -ForegroundColor Cyan
  $ProgressPreference = "SilentlyContinue"
  Invoke-WebRequest -Uri $Url -OutFile $Dest -TimeoutSec 180
}

Write-Host "Vision FX dependency setup" -ForegroundColor Green
foreach ($item in $downloads) {
  Download-File -Url $item.Url -Dest $item.Dest -Name $item.Name
}

Write-Host ""
Write-Host "Done. Run: python -B server.py" -ForegroundColor Green
