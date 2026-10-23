param([ValidateSet('work','demo')][string]$Mode='work')
$ErrorActionPreference='Stop'
$copRepo=Split-Path -Parent $PSScriptRoot
$copRecord=Join-Path $copRepo "private\$Mode-process.json"
if(-not(Test-Path -LiteralPath $copRecord)){Write-Output 'Нет записи о процессе, запущенном Start-Local.ps1';exit 0}
$copInfo=Get-Content -LiteralPath $copRecord -Raw | ConvertFrom-Json
$copProcess=Get-Process -Id $copInfo.pid -ErrorAction SilentlyContinue
$copExpectedTicks=([datetime]$copInfo.started).ToUniversalTime().Ticks
if($copProcess -and $copProcess.StartTime.ToUniversalTime().Ticks -eq $copExpectedTicks){
 Stop-Process -Id $copInfo.pid
 Write-Output 'Локальный сервер остановлен. База сохранена.'
}else{Write-Output 'Сохранённый процесс уже завершён; другие процессы не затронуты.'}
