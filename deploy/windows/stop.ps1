# CoreMan — stop the backend, shop and tunnel started by start.ps1.
$pidFile = Join-Path $env:USERPROFILE '.coreman\pids.txt'
if (-not (Test-Path $pidFile)) { Write-Host 'Nothing to stop.'; return }
foreach ($id in (Get-Content $pidFile) -split ' ') {
    if ($id) {
        # taskkill /T also stops child processes (npx -> node)
        & taskkill.exe /PID $id /T /F 2>$null | Out-Null
    }
}
Remove-Item $pidFile -Force
Write-Host 'CoreMan stopped.'
