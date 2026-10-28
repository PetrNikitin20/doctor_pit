param([string]$RuntimeRoot='D:\CodexWork\runtimes\ollama',[string]$Model='qwen3:4b-instruct')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$modelRuntime=[IO.Path]::GetFullPath($RuntimeRoot)
New-Item -ItemType Directory -Path $modelRuntime -Force | Out-Null
$ollamaExe=Join-Path $modelRuntime 'bin\ollama.exe'
if(!(Test-Path -LiteralPath $ollamaExe)) {
    $release=Invoke-RestMethod -Uri 'https://api.github.com/repos/ollama/ollama/releases/latest' -Headers @{'User-Agent'='doctor-pit-math-lecturer'}
    $asset=$release.assets | Where-Object {$_.name -eq 'ollama-windows-amd64.zip'} | Select-Object -First 1
    if(!$asset -or !$asset.digest){throw 'Official release checksum unavailable'}
    $archive=Join-Path $modelRuntime 'ollama.zip'
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archive -UseBasicParsing
    $digest=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if(('sha256:'+$digest) -ne $asset.digest){throw 'Ollama archive checksum mismatch'}
    Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $modelRuntime 'bin') -Force
    $release.tag_name | Set-Content -LiteralPath (Join-Path $modelRuntime 'version.txt')
}
$env:OLLAMA_MODELS=Join-Path $modelRuntime 'models'
$env:OLLAMA_HOST='127.0.0.1:11434'
$env:OLLAMA_NUM_PARALLEL='1'
$daemonReady=$false
try{$null=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2;$daemonReady=$true}catch{}
if(!$daemonReady) {
    Start-Process -FilePath $ollamaExe -ArgumentList @('serve') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $modelRuntime 'server.log') -RedirectStandardError (Join-Path $modelRuntime 'server-error.log') | Out-Null
    for($i=0;$i -lt 30;$i++){Start-Sleep -Milliseconds 500;try{$null=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2;$daemonReady=$true;break}catch{}}
}
if(!$daemonReady){throw 'Ollama server did not start'}
& $ollamaExe pull $Model
if($LASTEXITCODE -ne 0){throw 'Model download failed'}
$configFile=Join-Path $PSScriptRoot '.env.local'
$lines=if(Test-Path -LiteralPath $configFile){@(Get-Content -LiteralPath $configFile -Encoding UTF8)}else{@()}
$updates=@{LLM_PROVIDER='ollama';LLM_BASE_URL='http://127.0.0.1:11434';LLM_MODEL=$Model;OLLAMA_EXE=$ollamaExe;OLLAMA_MODELS=$env:OLLAMA_MODELS}
foreach($key in $updates.Keys){$lines=@($lines | Where-Object {$_ -notmatch ('^'+$key+'=')});$lines+=($key+'='+$updates[$key])}
[IO.File]::WriteAllLines($configFile,$lines,(New-Object Text.UTF8Encoding($false)))
Write-Output 'Local model ready. Run start.ps1.'
