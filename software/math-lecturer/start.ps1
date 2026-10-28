param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$appRoot=$PSScriptRoot
foreach($file in @('.env','.env.local')) {
    $config=Join-Path $appRoot $file
    if(Test-Path -LiteralPath $config) {
        foreach($line in Get-Content -LiteralPath $config -Encoding UTF8) {
            if($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1],$matches[2].Trim().Trim('"'),'Process')
            }
        }
    }
}
$nodeCmd=Get-Command node -ErrorAction SilentlyContinue
$nodeExe=if($nodeCmd){$nodeCmd.Source}else{Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'}
if(!(Test-Path -LiteralPath $nodeExe)){throw 'Установите Node.js 24 или новее'}
if(!(Test-Path -LiteralPath (Join-Path $appRoot 'node_modules\katex'))) {
    $pnpmCli=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs'
    Push-Location $appRoot
    try {if(Test-Path -LiteralPath $pnpmCli){& $nodeExe $pnpmCli install --ignore-scripts}else{& npm.cmd install --ignore-scripts};if($LASTEXITCODE -ne 0){throw 'Не удалось установить зависимости'}}finally{Pop-Location}
}
$taskData=if($env:LECTURER_DATA_DIR){$env:LECTURER_DATA_DIR}else{Join-Path $appRoot 'private'}
New-Item -ItemType Directory -Path $taskData -Force | Out-Null
if($env:OLLAMA_EXE -and (Test-Path -LiteralPath $env:OLLAMA_EXE)) {
    $ollamaReady=$false
    try {$null=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2;$ollamaReady=$true}catch{}
    if(!$ollamaReady) {
        $env:OLLAMA_HOST='127.0.0.1:11434';$env:OLLAMA_NUM_PARALLEL='1'
        Start-Process -FilePath $env:OLLAMA_EXE -ArgumentList @('serve') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskData 'ollama-out.log') -RedirectStandardError (Join-Path $taskData 'ollama-error.log') | Out-Null
    }
}
$port=if($env:PORT){$env:PORT}else{'3210'}
$url='http://127.0.0.1:'+$port
$running=$false
try {$health=Invoke-RestMethod -Uri ($url+'/api/health') -TimeoutSec 4;if($health.app -ne 'doctor-pit-math-lecturer'){throw 'Порт занят другим приложением'};$running=$true}catch{}
if(!$running) {
    $process=Start-Process -FilePath $nodeExe -ArgumentList @((Join-Path $appRoot 'src\server.mjs')) -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskData 'server-out.log') -RedirectStandardError (Join-Path $taskData 'server-error.log') -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $taskData 'server.pid')
    for($i=0;$i -lt 20;$i++) {Start-Sleep -Milliseconds 500;try{$health=Invoke-RestMethod -Uri ($url+'/api/health') -TimeoutSec 4;if($health.app -eq 'doctor-pit-math-lecturer'){$running=$true;break}}catch{}}
    if(!$running){throw ('Не удалось запустить сервер. Журнал: '+(Join-Path $taskData 'server-error.log'))}
}
Write-Output ('ИИ-лектор: '+$url)
if(!$NoBrowser){Start-Process $url}
