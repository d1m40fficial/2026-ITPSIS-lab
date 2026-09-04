Option Explicit

Dim fso, inputDir, outputDir, word, folder, file, doc, pdfPath, count
Set fso = CreateObject("Scripting.FileSystemObject")

If WScript.Arguments.Count <> 2 Then
  WScript.Echo "Usage: cscript //nologo export_reports_to_pdf.vbs <input-dir> <output-dir>"
  WScript.Quit 2
End If

inputDir = fso.GetAbsolutePathName(WScript.Arguments(0))
outputDir = fso.GetAbsolutePathName(WScript.Arguments(1))
If Not fso.FolderExists(inputDir) Then
  WScript.Echo "Input directory not found: " & inputDir
  WScript.Quit 2
End If
If Not fso.FolderExists(outputDir) Then fso.CreateFolder(outputDir)

Set word = CreateObject("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
Set folder = fso.GetFolder(inputDir)
count = 0

For Each file In folder.Files
  If LCase(fso.GetExtensionName(file.Name)) = "docx" Then
    Set doc = word.Documents.Open(file.Path, False, True)
    doc.Repaginate
    pdfPath = fso.BuildPath(outputDir, fso.GetBaseName(file.Name) & ".pdf")
    doc.ExportAsFixedFormat pdfPath, 17
    doc.Close False
    Set doc = Nothing
    count = count + 1
    WScript.Echo "EXPORTED " & file.Name
  End If
Next

word.Quit
Set word = Nothing

If count <> 12 Then
  WScript.Echo "Expected 12 DOCX files, exported " & count
  WScript.Quit 1
End If
WScript.Echo "TOTAL " & count
