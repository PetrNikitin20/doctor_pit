$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    pdflatex -interaction=nonstopmode -halt-on-error article.tex
    if ($LASTEXITCODE -ne 0) { throw 'First pdflatex pass failed' }
    pdflatex -interaction=nonstopmode -halt-on-error article.tex
    if ($LASTEXITCODE -ne 0) { throw 'Second pdflatex pass failed' }
    pdflatex -interaction=nonstopmode -halt-on-error article.tex
    if ($LASTEXITCODE -ne 0) { throw 'Third pdflatex pass failed' }
} finally { Pop-Location }
