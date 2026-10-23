param([string]$DocumentPath,[string]$PdfPath)
$ErrorActionPreference='Stop'
$articlePath=(Resolve-Path -LiteralPath $DocumentPath).Path
$articlePdf=[System.IO.Path]::GetFullPath($PdfPath)
$articleWord=$null
$articleDocument=$null
try {
 $articleWord=New-Object -ComObject Word.Application
 $articleWord.Visible=$false
 $articleWord.DisplayAlerts=0
 $articleWord.AutomationSecurity=3
 $articleDocument=$articleWord.Documents.Open($articlePath,$false,$true,$false)
 $articleDocument.Repaginate()
 $articleDocument.ExportAsFixedFormat($articlePdf,17)
 Write-Output ('Word read-only render complete. Pages: '+$articleDocument.ComputeStatistics(2))
} finally {
 if($null -ne $articleDocument){$articleDocument.Close(0);[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($articleDocument)}
 if($null -ne $articleWord){$articleWord.Quit();[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($articleWord)}
 [GC]::Collect()
 [GC]::WaitForPendingFinalizers()
}
