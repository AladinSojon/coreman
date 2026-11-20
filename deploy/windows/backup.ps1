# CoreMan — back up the database on this PC (keeps the last 14). Copy backups off this PC now and then.
#   powershell -ExecutionPolicy Bypass -File deploy\windows\backup.ps1
$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:USERPROFILE '.coreman\backups'
New-Item -ItemType Directory -Force $dir | Out-Null
$pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' | Sort-Object FullName -Descending | Select-Object -First 1
$envFile = Join-Path $env:USERPROFILE '.coreman\host.env'
$env:PGPASSWORD = ((Get-Content $envFile | Where-Object { $_ -like 'DATABASE_PASSWORD=*' }) -split '=', 2)[1]
$file = Join-Path $dir ("coreman-{0:yyyy-MM-dd_HHmm}.dump" -f (Get-Date))
& $pgDump.FullName -h localhost -U postgres -Fc -f $file coreman
if ($LASTEXITCODE -ne 0) { throw 'Backup failed' }
Get-ChildItem $dir -Filter 'coreman-*.dump' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item -Force
Write-Host "Backup saved: $file"
