# CoreMan — run the shop on this PC and publish it with a Cloudflare Tunnel.
#   powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1
# Runs in the background (logs in %USERPROFILE%\.coreman\logs). Stop with stop.ps1.
#
# Public address:
#   - No tunnel token set  -> a temporary https://<random>.trycloudflare.com link (changes on every start)
#   - TUNNEL_TOKEN in host.env -> your own domain via a named Cloudflare Tunnel (see deploy/windows/README.md)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path "$PSScriptRoot\..\..").Path
$home_ = Join-Path $env:USERPROFILE '.coreman'
$logs = Join-Path $home_ 'logs'
$jar = Join-Path $home_ 'app\app.jar'
$envFile = Join-Path $home_ 'host.env'
$pidFile = Join-Path $home_ 'pids.txt'
New-Item -ItemType Directory -Force $logs | Out-Null

if (-not (Test-Path $jar)) { throw "Not built yet. Run deploy\windows\build.ps1 first." }
if (-not (Test-Path $envFile)) { throw "Missing $envFile (settings with database password and JWT secret)." }
if (Test-Path $pidFile) { & "$PSScriptRoot\stop.ps1" | Out-Null }

# Settings -> environment of the processes started below
Get-Content $envFile | Where-Object { $_ -match '^\s*[A-Z_]+=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    Set-Item -Path "env:$($k.Trim())" -Value $v.Trim()
}

$pg = Get-Service 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pg -and $pg.Status -ne 'Running') { throw "PostgreSQL ($($pg.Name)) is not running. Start it in Services." }

$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1
$java = Join-Path $jdk.FullName 'bin\java.exe'

$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) {
    $cf = @((Join-Path $home_ 'bin\cloudflared.exe'), "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe", "$env:ProgramFiles\cloudflared\cloudflared.exe") |
        Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $cf) { throw 'cloudflared not found. Install it with: winget install Cloudflare.cloudflared' }

Write-Host '==> Opening the Cloudflare Tunnel'
if ($env:TUNNEL_TOKEN) {
    $tunnel = Start-Process $cf -ArgumentList 'tunnel', '--no-autoupdate', 'run', '--token', $env:TUNNEL_TOKEN -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput "$logs\tunnel.log" -RedirectStandardError "$logs\tunnel-error.log"
    $url = $env:FRONTEND_URL
} else {
    $tunnel = Start-Process $cf -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:4173', '--http-host-header', 'localhost:4173' `
        -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logs\tunnel.log" -RedirectStandardError "$logs\tunnel-error.log"
    $url = $null
    foreach ($i in 1..30) {
        Start-Sleep 2
        $m = Select-String -Path "$logs\tunnel-error.log", "$logs\tunnel.log" -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($m) { $url = $m.Matches[0].Value; break }
    }
}

# A quick tunnel's address changes on every start: hand it to the backend for links it builds
# (password-reset emails, payment returns). A named tunnel uses FRONTEND_URL from host.env.
if ($url -and -not $env:TUNNEL_TOKEN) { $env:FRONTEND_URL = $url; $env:BACKEND_URL = $url }

Write-Host '==> Starting the backend'
$backend = Start-Process $java -ArgumentList '-Xms256m', '-Xmx768m', '-jar', "`"$jar`"" -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput "$logs\backend.log" -RedirectStandardError "$logs\backend-error.log"
$up = $false
foreach ($i in 1..60) {
    Start-Sleep 2
    try { Invoke-WebRequest 'http://127.0.0.1:8080/api/products/filters' -UseBasicParsing -TimeoutSec 3 | Out-Null; $up = $true; break } catch { }
    if ($backend.HasExited) { break }
}
if (-not $up) { throw "Backend didn't start. See $logs\backend.log" }

Write-Host '==> Starting the shop (port 4173)'
$shop = Start-Process 'npx.cmd' -ArgumentList 'vite', 'preview', '--port', '4173', '--strictPort' -WorkingDirectory "$repo\frontend" `
    -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logs\shop.log" -RedirectStandardError "$logs\shop-error.log"
Start-Sleep 3

"$($backend.Id) $($shop.Id) $($tunnel.Id)" | Set-Content $pidFile
if ($url) { $url | Set-Content (Join-Path $home_ 'public-url.txt') }

Write-Host ''
Write-Host "CoreMan is running."
Write-Host "  On this PC:  http://localhost:4173"
if ($url) { Write-Host "  Public link: $url" } else { Write-Host "  Public link: not ready yet - check $logs\tunnel-error.log" }
Write-Host "  Stop:        powershell -ExecutionPolicy Bypass -File deploy\windows\stop.ps1"
