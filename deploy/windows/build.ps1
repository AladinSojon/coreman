# CoreMan — build the production version on this Windows PC.
# Run after pulling new code:   powershell -ExecutionPolicy Bypass -File deploy\windows\build.ps1
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path "$PSScriptRoot\..\..").Path
$home_ = Join-Path $env:USERPROFILE '.coreman'
$appDir = Join-Path $home_ 'app'
New-Item -ItemType Directory -Force $appDir | Out-Null

$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { throw 'Java 21 not found. Install it with: winget install EclipseAdoptium.Temurin.21.JDK' }
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Write-Host '==> Building the backend'
Push-Location "$repo\backend"
& .\gradlew.bat bootJar --no-daemon -q
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Backend build failed' }
$jar = Get-ChildItem build\libs\*.jar | Where-Object { $_.Name -notlike '*-plain.jar' } | Select-Object -First 1
Copy-Item $jar.FullName (Join-Path $appDir 'app.jar') -Force
Pop-Location

Write-Host '==> Building the shop'
Push-Location "$repo\frontend"
& npm.cmd install --no-audit --no-fund --loglevel=error
& npx.cmd vite build --mode vps --logLevel warn
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Shop build failed' }
Pop-Location

Write-Host "Built. Start it with:  powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1"
