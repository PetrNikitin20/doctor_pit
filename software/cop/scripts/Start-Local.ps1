param([ValidateSet('work','demo')][string]$Mode='work')
$ErrorActionPreference='Stop'
$copRepo=Split-Path -Parent $PSScriptRoot
$copNode=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if(-not(Test-Path -LiteralPath $copNode)){ $copNode=(Get-Command node -ErrorAction Stop).Source }
$copPort=if($Mode -eq 'demo'){3000}else{3001}
$copOrigin="http://127.0.0.1:$copPort"
try {
 $copHealth=Invoke-RestMethod -Uri "$copOrigin/healthz" -TimeoutSec 2
 if($copHealth.ok){ Write-Output "ЦОП уже работает: $copOrigin"; exit 0 }
} catch {}
$copPrivate=Join-Path $copRepo 'private'
New-Item -ItemType Directory -Path $copPrivate -Force | Out-Null
$copData=if($Mode -eq 'demo'){Join-Path $copRepo 'data\postgres'}else{Join-Path $copPrivate 'postgres'}
$copConfig=Join-Path $copPrivate 'local-config.json'
if($Mode -eq 'work' -and (Test-Path -LiteralPath $copConfig)){
 $copData=(Get-Content -LiteralPath $copConfig -Raw | ConvertFrom-Json).dataDir
}
if(-not(Test-Path -LiteralPath $copData)){throw 'Локальная БД ещё не подготовлена. См. docs/LOCAL.md; пустая БД не создаётся автоматически.'}
$env:PORT=[string]$copPort
$env:HOST='127.0.0.1'
$env:APP_ORIGIN=$copOrigin
$env:DATA_DIR=$copData
$env:DATABASE_URL=''
$env:LLM_PROVIDER='disabled'
$env:RUNNER_URL=''
$env:NODE_ENV='development'
$copProcess=Start-Process -FilePath $copNode -ArgumentList @('src/server.mjs') -WorkingDirectory $copRepo -WindowStyle Hidden -RedirectStandardOutput (Join-Path $copPrivate "$Mode-server.log") -RedirectStandardError (Join-Path $copPrivate "$Mode-error.log") -PassThru
@{pid=$copProcess.Id;started=$copProcess.StartTime.ToUniversalTime().ToString('o');port=$copPort} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $copPrivate "$Mode-process.json") -Encoding UTF8
for($copTry=0;$copTry -lt 20;$copTry++){
 try{$copHealth=Invoke-RestMethod -Uri "$copOrigin/healthz" -TimeoutSec 2;if($copHealth.ok){Write-Output "ЦОП запущен: $copOrigin";exit 0}}catch{}
 Start-Sleep -Milliseconds 500
}
throw "Сервер не ответил. Проверьте private/$Mode-error.log"
