param([Parameter(Mandatory=$true)][string]$RequestPath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Speech
$request=Get-Content -LiteralPath $RequestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$synth=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    if($request.operation -eq 'voices') {
        $voices=@($synth.GetInstalledVoices() | Where-Object {$_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'ru-RU'} | ForEach-Object {$_.VoiceInfo.Name})
        @{voices=$voices} | ConvertTo-Json -Compress
    } else {
        $voices=@($synth.GetInstalledVoices() | Where-Object {$_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'ru-RU'} | ForEach-Object {$_.VoiceInfo.Name})
        if($voices.Count -eq 0) {throw 'No Russian Windows voice installed'}
        $voice=if($request.voice -in $voices){$request.voice}else{$voices[0]}
        $synth.SelectVoice($voice)
        $synth.SetOutputToWaveFile([string]$request.output)
        $synth.Speak([string]$request.text)
        @{voice=$voice;generated=$true} | ConvertTo-Json -Compress
    }
} finally {$synth.Dispose()}
