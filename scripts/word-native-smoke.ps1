param([string]$ResultFolder,[string]$BridgeFile,[string]$StyleHostRoot)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class WordTestPid{[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint id);}'
Add-Type -ReferencedAssemblies 'Microsoft.CSharp','System.Core' -TypeDefinition 'public static class WordTestIO{public static void Save(object d,string f){dynamic doc=d;doc.SaveAs2(f,16);}public static object Open(object a,string f){dynamic app=a;return app.Documents.Open(f);}public static object Footnote(object d){dynamic doc=d;int p=doc.Paragraphs[2].Range.Start;return doc.Footnotes.Add(doc.Range(p,p),System.Type.Missing,"A footnote source. ");}}'
$existing=@(Get-Process WINWORD -ErrorAction SilentlyContinue|ForEach-Object{$_.Id})
$checks=[Collections.Generic.List[string]]::new();$word=$null;$doc=$null;$copy=$null;$owned=$false;$nativeHost=$false
function Pass([string]$name){$checks.Add($name);Write-Host ('PASS '+$name)}
function Check([bool]$ok,[string]$message){if(-not $ok){throw $message}}
function Report([string]$failure=''){@{passed=$checks;failure=$failure;nativeRibbonHost=$nativeHost;wordVersion=if($word){$word.Version}else{''}}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $ResultFolder 'word-native-report.json') -Encoding UTF8}
try{
 $word=New-Object -ComObject Word.Application
 Check ($word.Documents.Count -eq 0) 'Existing Word instance returned; stopped to protect open documents.'
 $doc=$word.Documents.Add();[uint32]$taskWordPid=0
 [void][WordTestPid]::GetWindowThreadProcessId([IntPtr]$doc.ActiveWindow.Hwnd,[ref]$taskWordPid)
 Check ($existing -notcontains [int]$taskWordPid) 'Test shares existing Word process; stopped.'
 $owned=$true;$word.Visible=$false;$word.DisplayAlerts=0
 [IO.File]::WriteAllText((Join-Path $ResultFolder 'word-test-process.json'),('{"wordPid":'+$taskWordPid+',"powershellPid":'+$PID+'}'))
 $word.COMAddIns.Update()
 try{$com=$word.COMAddIns.Item('Citograph.WordAddin');$com.Connect=$true;$addin=$com.Object;if($addin.Version() -ne '1.2.0'){throw 'Word loaded an earlier Citograph build.'};$nativeHost=$true}catch{
  Add-Type -TypeDefinition 'public class CitographTestHost{public object Object{get;set;}}'
  $addin=New-Object -ComObject Citograph.WordAddin;$hostObject=New-Object CitographTestHost;$custom=[Array]@()
  $addin.OnConnection($word,1,$hostObject,[ref]$custom)
  Write-Host 'Word loaded an earlier ribbon build; testing the current registered document engine directly.'
 }
 $addin.UseBridgeDescriptor($BridgeFile);Write-Host ('Native object version: '+$addin.Version());Check ($addin.Version() -eq '1.2.0') 'Unexpected version.'
 if($nativeHost){Pass 'native COM add-in loads in isolated Word'}else{Pass 'registered COM engine connects to isolated Word'}
 $doc.Content.Text="Citograph Word integration`rResearch connects ideas with evidence. `rA second perspective adds context. `r"
 $doc.Paragraphs.Item(2).Range.Select();$word.Selection.Collapse(0);$word.Selection.MoveLeft(1,1)|Out-Null
 $null=$addin.InsertCitationByIds('demo-1','12-14','see ','',$false)
 Check ($doc.Fields.Count -eq 1 -and $doc.Fields.Item(1).Type -eq 81) 'Editable field missing.'
 Check ($doc.Fields.Item(1).Result.Text -match '2013') 'APA year missing.'
 Check ($word.Selection.Start -gt $doc.Fields.Item(1).Result.End) 'Cursor remains inside citation.'
 Pass 'APA insertion preserves locator, prefix, editable field and cursor placement'
 $doc.Paragraphs.Item(3).Range.Select();$word.Selection.Collapse(0);$word.Selection.MoveLeft(1,1)|Out-Null
 $null=$addin.InsertCitationByIds('demo-4,demo-6','','','',$false)
 Check ($doc.Fields.Count -eq 2 -and ($addin.GetTravelingLibrary()|ConvertFrom-Json).references.Count -eq 3) 'Grouped metadata missing.'
 Pass 'grouped citation embeds three traveling sources'
 $null=$addin.InsertBibliography();$bib=$doc.SelectContentControlsByTag('Citograph.Bibliography')
 Check ($bib.Count -eq 1 -and $bib.Item(1).Range.Text.Length -gt 200) 'Bibliography missing.'
 Check ($doc.CustomXMLParts.SelectByNamespace('https://citograph.local/word/v1').Count -eq 1) 'Snapshot missing or duplicated.'
 Pass 'rich bibliography and document style snapshot are embedded'
 $addin.SetCitationStyle('ieee');Check ($doc.Fields.Item(1).Result.Text -match '\[1') 'IEEE numbering incorrect.'
 Pass 'APA to IEEE switching updates citations and bibliography'
 $target=$addin.GetStyleTarget()|ConvertFrom-Json
 Check ($target.citations -eq 2 -and $target.token.Length -eq 64) 'Style target inspection failed.'
 $applied=$addin.ApplyStyleToTarget('custom-native-validation',$target.token)|ConvertFrom-Json
 Check ($applied.applied -and $doc.Fields.Item(1).Result.Text.Contains([string][char]0x27E6)) 'Python style did not reach Word.'
 $snapshotXml=[xml]$doc.CustomXMLParts.SelectByNamespace('https://citograph.local/word/v1').Item(1).XML
 $snapshot=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($snapshotXml.DocumentElement.FirstChild.InnerText))|ConvertFrom-Json
 Check ($snapshot.styleXml.Contains('Native Python Style')) 'Python style snapshot missing.'
 Pass 'saved Python style applies to Word citations, bibliography and traveling snapshot'
 $blocked=$false;try{$null=$addin.ApplyStyleToTarget('apa',('0'*64))}catch{$blocked=$true}
 Check ($blocked -and $doc.Fields.Item(1).Result.Text.Contains([string][char]0x27E6)) 'Document target guard failed.'
 Pass 'Word target guard prevents style changes after target mismatch'
 $before=$doc.CustomXMLParts.SelectByNamespace('https://citograph.local/word/v1').Item(1).XML
 $blocked=$false;try{$null=$addin.ApplyStyleToTarget('style-that-does-not-exist',$target.token)}catch{$blocked=$true}
 Check ($blocked -and $doc.Fields.Item(1).Result.Text.Contains([string][char]0x27E6) -and $before -eq $doc.CustomXMLParts.SelectByNamespace('https://citograph.local/word/v1').Item(1).XML) 'Failed style changed the document snapshot.'
 Pass 'unavailable styles preserve existing Word citations and style snapshot'
 $styleTestPath=Join-Path $ResultFolder 'Citograph-style-target.docx';[WordTestIO]::Save($doc,$styleTestPath)
 if(-not $StyleHostRoot){$StyleHostRoot=Split-Path -Parent $PSScriptRoot}
 $hostExe=Join-Path $StyleHostRoot 'word-addin\bin\Citograph.StyleHost.exe'
 $hostOutput=& $hostExe inspect $BridgeFile $target.window
 Check ($LASTEXITCODE -eq 0) 'Desktop Word style host could not inspect its own test document.'
 $hostTarget=$hostOutput|ConvertFrom-Json;$target=$addin.GetStyleTarget()|ConvertFrom-Json
 Check ($hostTarget.token -eq $target.token) 'Style host selected a different Word document; stopped.'
 $hostOutput=& $hostExe apply $BridgeFile 'custom-native-validation' $hostTarget.token $hostTarget.window
 Check ($LASTEXITCODE -eq 0 -and ($hostOutput|ConvertFrom-Json).applied) 'Desktop Word style host could not apply style.'
 Pass 'desktop style host inspects and applies a saved style to the verified Word document'
 $ipcTarget=$addin.GetStyleTarget()
 [IO.File]::WriteAllText((Join-Path $ResultFolder 'word-style-ipc-target.json'),$ipcTarget)
 Write-Host 'READY_STYLE_IPC'
 $ipcAck=Join-Path $ResultFolder 'word-style-ipc-ack.json'
 $ipcDeadline=[DateTime]::UtcNow.AddSeconds(30)
 while(-not (Test-Path -LiteralPath $ipcAck)){if([DateTime]::UtcNow -gt $ipcDeadline){throw 'Desktop IPC style test timed out.'};Start-Sleep -Milliseconds 100}
 $ipcResult=Get-Content -LiteralPath $ipcAck -Raw|ConvertFrom-Json
 Check ($ipcResult.applied -and $doc.Fields.Item(1).Result.Text.Contains([string][char]0x27E6)) 'Electron style IPC did not update the verified document.'
 Pass 'Electron desktop style action reaches the exact Word document through restricted IPC'
 $addin.SetCitationStyle('nature');Check ($doc.Fields.Item(1).Result.Font.Superscript -eq -1) 'Nature superscript missing.'
 Pass 'Nature preserves actual Word superscript formatting'
 $addin.SetCitationStyle('apa');$doc.Fields.Item(1).Result.Select();$addin.EditSelectedCitationByIds('demo-1','20','','',$true)
 Check ($doc.Fields.Item(1).Result.Text -match '2013, p. 20' -and $doc.Fields.Item(1).Result.Text -notmatch 'Furukawa') 'Editing failed.'
 Pass 'citation editing updates locator and author suppression'
 $null=$addin.UpdateDocument();$null=$addin.UpdateDocument()
 Check (($addin.CheckDocument()|ConvertFrom-Json).issues.Count -eq 0) 'Document check found errors.'
 Check ($doc.CustomXMLParts.SelectByNamespace('https://citograph.local/word/v1').Count -eq 1) 'Update duplicates library.'
 Pass 'repeated updates preserve consistent metadata and pass checks'
 $import=$addin.ImportDocumentLibrary()|ConvertFrom-Json;Check ($import.added -eq 0 -and $import.skipped -eq 3) 'Import mismatch.'
 Pass 'traveling-library import reaches Citograph and detects existing sources'
 $path=Join-Path $ResultFolder 'Citograph-Word-validation.docx';[WordTestIO]::Save($doc,$path);$doc.Close([ref]0);$doc=[WordTestIO]::Open($word,$path)
 $null=$addin.UpdateDocument();Check ($doc.Fields.Count -eq 2 -and ($addin.GetTravelingLibrary()|ConvertFrom-Json).references.Count -eq 3) 'Saved fields lost.'
 Pass 'saved DOCX reopens with editable fields and traveling library'
 $f=$doc.Fields.Item(1);$source=$doc.Range($f.Code.Start-1,$f.Result.End+1);$copy=$word.Documents.Add();$copy.Range(0,0).FormattedText=$source.FormattedText
 $null=$addin.UpdateDocument();Check ($copy.Fields.Count -eq 1 -and ($addin.GetTravelingLibrary()|ConvertFrom-Json).references.Count -eq 1) 'Copied source lost.'
 Pass 'copying a field into another document carries its source'
 $f=$doc.Fields.Item(1);$source=$doc.Range($f.Code.Start-1,$f.Result.End+1);$end=$copy.Range($copy.Content.End-1,$copy.Content.End-1);$end.InsertBefore(' Additional evidence ')
 $end=$copy.Range($copy.Content.End-1,$copy.Content.End-1);$end.FormattedText=$source.FormattedText;$null=$addin.UpdateDocument()
 Check ($copy.Fields.Count -eq 2 -and ($addin.CheckDocument()|ConvertFrom-Json).issues.Count -eq 0) 'Duplicate ID repair failed.'
 Pass 'pasted duplicate citation identifiers are repaired'
 $copy.Range(0,0).InsertBefore("Page: `r`r");$range=$copy.Range(6,6);$null=$copy.Fields.Add($range,33);$copy.Activate();$addin.ConvertDocumentToPlainText()
 Check ($copy.Fields.Count -eq 1 -and $copy.Fields.Item(1).Type -eq 33) 'Unrelated field changed.'
 Check ($copy.CustomXMLParts.SelectByNamespace('https://citograph.local/word/v1').Count -eq 0) 'Conversion retains library.'
 Pass 'plain-text conversion preserves unrelated Word fields'
 $copy.Close([ref]0);$copy=$null;$doc.Activate();$note=[WordTestIO]::Footnote($doc);$note.Range.Select();$word.Selection.Collapse(0);$word.Selection.MoveLeft(1,1)|Out-Null
 $null=$addin.InsertCitationByIds('demo-8','','','',$false)
 Check ($note.Range.Fields.Count -eq 1 -and ($addin.CheckDocument()|ConvertFrom-Json).citations -eq 3) 'Footnote missing.'
 $addin.SetCitationStyle('ieee');Check ($note.Range.Fields.Item(1).Result.Text -eq '[1]') 'Footnote anchor order incorrect.'
 Check ($doc.Fields.Item(1).Result.Text -match '^\[2') 'Body not renumbered after footnote.'
 Pass 'footnote citations format and number by their document anchor'
 $addin.SetCitationStyle('apa');[WordTestIO]::Save($doc,$path);Report
}catch{Report $_.Exception.ToString();throw}finally{
 if($copy){$copy.Close([ref]0)};if($doc){$doc.Close([ref]0)};if($owned -and $word){$word.Quit([ref]0)}
 if($word){[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)};[GC]::Collect();[GC]::WaitForPendingFinalizers()
}
