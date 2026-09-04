param(
  [string]$InputDirectory = (Join-Path $PSScriptRoot '..\public\reports'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\_qa\report-renders'),
  [string]$PdfToPpm = 'C:\Users\gvadoskr\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe'
)

$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path -LiteralPath $InputDirectory).Path
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$outputPath = (Resolve-Path -LiteralPath $OutputDirectory).Path
$files = Get-ChildItem -File -LiteralPath $inputPath -Filter 'S?_LR??_template.docx' | Sort-Object Name
if ($files.Count -ne 12) { throw "Expected 12 DOCX files, found $($files.Count)." }
if (-not (Test-Path -LiteralPath $PdfToPpm)) { throw "pdftoppm not found: $PdfToPpm" }

$runPath = Join-Path $outputPath (Get-Date -Format 'yyyyMMdd-HHmmss')
$pdfPath = Join-Path $runPath '_pdf'
New-Item -ItemType Directory -Force -Path $pdfPath | Out-Null
$exporter = Join-Path $PSScriptRoot 'export_reports_to_pdf.vbs'
& cscript.exe //nologo $exporter $inputPath $pdfPath
if ($LASTEXITCODE -ne 0) { throw "Microsoft Word export failed with code $LASTEXITCODE." }

foreach ($file in $files) {
  $labOut = Join-Path $runPath $file.BaseName
  New-Item -ItemType Directory -Force -Path $labOut | Out-Null
  $pdf = Join-Path $pdfPath ($file.BaseName + '.pdf')
  if (-not (Test-Path -LiteralPath $pdf)) { throw "PDF not found for $($file.Name)." }
  & $PdfToPpm -png -r 150 $pdf (Join-Path $labOut 'page') | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "PNG render failed for $($file.Name)." }
  $pages = (Get-ChildItem -File -LiteralPath $labOut -Filter 'page-*.png').Count
  if ($pages -lt 5) { throw "Expected at least 5 pages for $($file.Name), found $pages." }
  Write-Output "RENDERED $($file.Name) PAGES=$pages"
}

Write-Output "OUTPUT $runPath"
