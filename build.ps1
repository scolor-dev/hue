param(
    [switch]$NoZip
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host "=== Hue Build ===" -ForegroundColor Cyan

# 出力先
$BinDir = Join-Path $Root "bin"
if (Test-Path $BinDir) { Remove-Item $BinDir -Recurse -Force }
New-Item -ItemType Directory -Path $BinDir | Out-Null

# 1. Zig DLL ビルド
Write-Host "[1/3] Building Zig DLLs..." -ForegroundColor Yellow
Push-Location $Root
zig build -Doptimize=ReleaseFast
if ($LASTEXITCODE -ne 0) { Write-Error "Zig build failed"; exit 1 }
Pop-Location

# DLL をコピー
$ZigOut = Join-Path $Root "zig-out\bin"
Get-ChildItem "$ZigOut\*.dll" | ForEach-Object {
    Copy-Item $_.FullName $BinDir
    Write-Host "  Copied $($_.Name)"
}

# 2. Wails アプリビルド
Write-Host "[2/3] Building Wails app..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "apps\explorer")
wails build -o hue.exe
if ($LASTEXITCODE -ne 0) { Write-Error "Wails build failed"; exit 1 }
Pop-Location

# exe をコピー
$ExePath = Join-Path $Root "apps\explorer\build\bin\hue.exe"
Copy-Item $ExePath $BinDir
Write-Host "  Copied hue.exe"

# 3. ZIP 作成
if (-not $NoZip) {
    Write-Host "[3/3] Creating ZIP..." -ForegroundColor Yellow
    $ZipPath = Join-Path $Root "hue.zip"
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    Compress-Archive -Path "$BinDir\*" -DestinationPath $ZipPath
    Write-Host "  Created hue.zip"
}

Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Output: $BinDir"
