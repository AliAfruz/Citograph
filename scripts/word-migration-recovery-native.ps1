param([string]$ResultFolder,[string]$BridgeFile,[string]$Root,[string]$Manuscript)
$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $Root 'word-addin\bin\Citograph.Word.dll')
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
Add-Type -ReferencedAssemblies 'Microsoft.CSharp','System.Core' -TypeDefinition @'
using System;using System.Runtime.InteropServices;using System.Text;
public class RecoveryHost{public object Object{get;set;}}
public static class RecoveryIO{
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint id);
 public static void Save(object value,string file,int format){dynamic doc=value;doc.SaveAs2(file,format);}
 public static object Open(object value,string file){dynamic app=value;return app.Documents.Open(file,false,false,false);}
 public static void Stored(object value,string data,string result){
  dynamic range=value;
  string begin="<w:r><w:fldChar w:fldCharType=\"begin\" w:fldLock=\"1\"/></w:r>";
  string xml="<pkg:package xmlns:pkg=\"http://schemas.microsoft.com/office/2006/xmlPackage\"><pkg:part pkg:name=\"/_rels/.rels\" pkg:contentType=\"application/vnd.openxmlformats-package.relationships+xml\"><pkg:xmlData><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships></pkg:xmlData></pkg:part><pkg:part pkg:name=\"/word/document.xml\" pkg:contentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"><pkg:xmlData><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p>"+begin+"<w:r><w:instrText xml:space=\"preserve\"> ADDIN EN.CITE </w:instrText></w:r>"+begin+"<w:r><w:instrText xml:space=\"preserve\"> ADDIN EN.CITE.DATA </w:instrText></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r><w:r><w:fldChar w:fldCharType=\"separate\"/></w:r><w:r><w:t>"+System.Security.SecurityElement.Escape(result)+"</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r></w:p></w:body></w:document></pkg:xmlData></pkg:part></pkg:package>";range.InsertXML(xml); byte[] bytes=Encoding.UTF8.GetBytes(data);var units=new char[(bytes.Length+1)/2];for(int i=0;i<units.Length;i++)units[i]=(char)(bytes[i*2]|(i*2+1<bytes.Length?bytes[i*2+1]<<8:0)); dynamic parent=range.Document.Fields.Item(1);parent.Data=new string(units);

 }
 public static object AddField(object r,string code){dynamic range=r;string result="Old bibliography";string xml="<pkg:package xmlns:pkg=\"http://schemas.microsoft.com/office/2006/xmlPackage\"><pkg:part pkg:name=\"/_rels/.rels\" pkg:contentType=\"application/vnd.openxmlformats-package.relationships+xml\"><pkg:xmlData><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships></pkg:xmlData></pkg:part><pkg:part pkg:name=\"/word/document.xml\" pkg:contentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"><pkg:xmlData><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:fldChar w:fldCharType=\"begin\" w:fldLock=\"1\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> ADDIN "+System.Security.SecurityElement.Escape(code)+" </w:instrText></w:r><w:r><w:fldChar w:fldCharType=\"separate\"/></w:r><w:r><w:t>"+System.Security.SecurityElement.Escape(result)+"</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r></w:p></w:body></w:document></pkg:xmlData></pkg:part></pkg:package>";range.InsertXML(xml);return range.Document.Fields.Item(range.Document.Fields.Count);}
 public static void ChangeData(object value,string data){dynamic field=value;field.Data=data;}
 public static string Data(object value){dynamic field=value;return (string)field.Data;}
 public static void NestedLink(object value){dynamic field=value;dynamic range=field.Result.Duplicate;range.Text="DOI link";field.Result.Hyperlinks.Add(field.Result,"https://doi.org/10.5555/recovery-a");}
}
'@
$existing=@(Get-Process WINWORD -ErrorAction SilentlyContinue|ForEach-Object{$_.Id})
$word=$null;$doc=$null;$owned=$false;$checks=[Collections.Generic.List[string]]::new();$expected=12
function Check([bool]$ok,[string]$message){if(!$ok){throw $message};$checks.Add($message);Write-Host ('PASS '+$message)}
function FileHash([string]$file){$stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite);try{$hash=[Security.Cryptography.SHA256]::Create();try{[BitConverter]::ToString($hash.ComputeHash($stream))}finally{$hash.Dispose()}}finally{$stream.Dispose()}}
function MacroHash([string]$file){$stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite);$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Read);try{$entry=$zip.GetEntry('word/vbaProject.bin');if(!$entry){return ''};$part=$entry.Open();try{$hash=[Security.Cryptography.SHA256]::Create();try{[BitConverter]::ToString($hash.ComputeHash($part))}finally{$hash.Dispose()}}finally{$part.Dispose()}}finally{$zip.Dispose();$stream.Dispose()}}
function Payload([object]$field){$encoded=[regex]::Match([string]$field.Code.Text,'CITOGRAPH/1\s+([A-Za-z0-9+/=]+)').Groups[1].Value;[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))|ConvertFrom-Json}
function SetPayload([object]$field,[object]$payload){$json=$payload|ConvertTo-Json -Depth 30 -Compress;$field.Locked=$false;$field.Code.Text=' ADDIN CITOGRAPH/1 '+[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))+' ';$field.Locked=$true}
try{
 $word=New-Object -ComObject Word.Application
 if($word.Documents.Count -ne 0){throw 'An existing Word instance was returned; stopped to protect open documents.'}
 $doc=$word.Documents.Add();[uint32]$taskWordPid=0;[void][RecoveryIO]::GetWindowThreadProcessId([IntPtr]$doc.ActiveWindow.Hwnd,[ref]$taskWordPid)
 if($existing -contains [int]$taskWordPid){throw 'Word fixture shares a user process; stopped.'};$owned=$true
 $word.Visible=$false;$word.DisplayAlerts=0;$word.AutomationSecurity=3
 $addin=New-Object Citograph.Word.Addin;$hostObject=New-Object RecoveryHost;$custom=[Array]@();$addin.OnConnection($word,1,$hostObject,[ref]$custom);$addin.UseBridgeDescriptor($BridgeFile);$addin.UseDocumentTarget($doc)
 $doc.Content.Text="Hidden data regression`rEvidence. `rReferences`r"
 $record='<record><rec-number>91</rec-number><ref-type name="Journal Article">17</ref-type><contributors><authors><author>Garcia, Ana</author></authors></contributors><titles><title>Hidden reference title</title><secondary-title>Synthetic Journal</secondary-title></titles><dates><year>2024</year></dates><electronic-resource-num>10.5555/recovery-a</electronic-resource-num></record>'
 $record2=$record.Replace('91','92').Replace('Hidden reference title','Second hidden reference').Replace('recovery-a','recovery-b')
 $xml='<EndNote><Cite><Author>Garcia</Author><Year>2024</Year><RecNum>91</RecNum><Pages>7</Pages>'+ $record +'</Cite><Cite><Author>Garcia</Author><Year>2024</Year><RecNum>92</RecNum>'+ $record2 +'</Cite></EndNote>'
 $xml=$xml.Replace('</EndNote>',([regex]::Match($xml,'<Cite>.*?</Cite>').Value+'</EndNote>'))
 $p=$doc.Paragraphs.Item(2).Range.End-1;[RecoveryIO]::Stored($doc.Range($p,$p),$xml,'1, 2')
 $p=$doc.Content.End-1;$bib=[RecoveryIO]::AddField($doc.Range($p,$p),'EN.REFLIST');[RecoveryIO]::NestedLink($bib)
 $source=Join-Path $ResultFolder 'Hidden-EndNote-original.docm';[RecoveryIO]::Save($doc,$source,13);$sourceHash=FileHash $source
 $report=$addin.InspectEndNoteDocument()|ConvertFrom-Json
 $report|ConvertTo-Json -Depth 20|Set-Content -LiteralPath (Join-Path $ResultFolder 'hidden-preview.json') -Encoding UTF8
 Check ($report.canMigrate -and $report.citations -eq 1 -and $report.sources -eq 2 -and $report.recoveredCitations -eq 1) 'Hidden parent and supporting data fields recover once with both sources'
 Check ($report.outputExtension -eq '.docm' -and $report.issues.Count -eq 0) 'DOCM format and bibliography hyperlinks are accepted'
 $support=$doc.Fields.Item(1).Code.Fields.Item(1);$supportCode=$support.Code.Text
 $support.Code.Text=' ADDIN EN.CITE.DATA '+$xml.Replace('<Pages>7</Pages>','<Pages>7</Pages><AuthorOnly>1</AuthorOnly>')
 $review=$addin.InspectEndNoteDocument()|ConvertFrom-Json
 Check (!$review.canMigrate -and ($review.issues -join ' ') -match 'manual review') 'Unsupported options in supporting data cannot be silently ignored'
 $support.Code.Text=' ADDIN EN.CITE.DATA '+$xml.Replace('Garcia, Ana','Garcia, Changed')
 $review=$addin.InspectEndNoteDocument()|ConvertFrom-Json
 Check (!$review.canMigrate -and ($review.issues -join ' ') -match 'different reference') 'Contradictory supporting metadata blocks conversion'
 $support.Code.Text=$supportCode;$report=$addin.InspectEndNoteDocument()|ConvertFrom-Json
 $parent=$doc.Fields.Item(1);$data=[RecoveryIO]::Data($parent);[RecoveryIO]::ChangeData($parent,($data+' '));$blocked=$false
 try{$null=$addin.MigrateEndNoteDocument((Join-Path $ResultFolder 'Changed-metadata-must-not-exist.docm'),'apa',$report.token)}catch{$blocked=$true}
 Check ($blocked -and !(Test-Path -LiteralPath (Join-Path $ResultFolder 'Changed-metadata-must-not-exist.docm'))) 'Hidden metadata changes block a stale migration before creating a copy'
 [RecoveryIO]::ChangeData($parent,$data);$report=$addin.InspectEndNoteDocument()|ConvertFrom-Json;$blocked=$false
 try{$null=$addin.MigrateEndNoteDocument((Join-Path $ResultFolder 'Macro-loss-must-not-exist.docx'),'apa',$report.token)}catch{$blocked=$true}
 Check ($blocked -and !(Test-Path -LiteralPath (Join-Path $ResultFolder 'Macro-loss-must-not-exist.docx'))) 'Macro-capable source cannot silently be saved as DOCX'
 $report=$addin.InspectEndNoteDocument()|ConvertFrom-Json
 $result=$addin.MigrateEndNoteDocument((Join-Path $ResultFolder 'Hidden-Citograph-converted.docm'),'apa',$report.token)|ConvertFrom-Json
 Check ($result.converted -and $result.citations -eq 1 -and $result.added -eq 2 -and $result.remainingEndNoteFields -eq 0) 'Stored-data citations convert, import and remove all EndNote fields'
 Check ((FileHash $source) -eq $sourceHash) 'Original hidden-data DOCM remains byte-for-byte unchanged'
 Check ($doc.Fields.Item(1).Code.Text -match 'CITOGRAPH/1' -and $doc.Fields.Item(1).Result.Text -match 'p. 7') 'Recovered citation keeps its page locator and editable Citograph field'
 $taskLibrary=$addin.GetTravelingLibrary()|ConvertFrom-Json;$taskLibrary|ConvertTo-Json -Depth 20|Set-Content -LiteralPath (Join-Path $ResultFolder 'converted-library.json') -Encoding UTF8
 Check (@($taskLibrary.references | Where-Object {$_.title -eq 'Hidden reference title'}).Count -eq 1) 'Recovered metadata survives the new traveling library'
 $taskPayload=Payload $doc.Fields.Item(1)
 Check ($taskPayload.items.Count -eq 2) 'Migration combines identical repeated source-and-options items'
 $taskOriginalCode=$doc.Fields.Item(1).Code.Text
 $taskPayload.items=@($taskPayload.items[0],$taskPayload.items[1],$taskPayload.items[1],$taskPayload.items[0]);SetPayload $doc.Fields.Item(1) $taskPayload
 Check ((($addin.CheckDocument()|ConvertFrom-Json).issues -join ' ') -match 'repeated citation items') 'Document audit identifies repeated items in existing fields'
 $addin.SetCitationStyle('american-chemical-society')
 Check ((Payload $doc.Fields.Item(1)).items.Count -eq 2 -and $doc.Fields.Item(1).Result.Text -eq '1,2' -and $doc.Fields.Item(1).Result.Font.Superscript -eq -1) 'Update repairs repeated ACS numbers and persisted payloads with superscript formatting'
 $doc.Fields.Item(1).Code.Text=$taskOriginalCode;$addin.SetCitationStyle('apa');$taskPayload=Payload $doc.Fields.Item(1)
 $taskOtherPage=$taskPayload.items[0]|ConvertTo-Json -Depth 10|ConvertFrom-Json;$taskOtherPage.locator='12';$taskPayload.items=@($taskPayload.items[0],$taskOtherPage,$taskPayload.items[1]);SetPayload $doc.Fields.Item(1) $taskPayload;$null=$addin.UpdateDocument()
 Check ((Payload $doc.Fields.Item(1)).items.Count -eq 3 -and $doc.Fields.Item(1).Result.Text -match '7' -and $doc.Fields.Item(1).Result.Text -match '12') 'Different page locators for the same source survive Word updates'
 $doc.Fields.Item(1).Code.Text=$taskOriginalCode;$null=$addin.UpdateDocument();$doc.Save()
 $path=$doc.FullName;$doc.Close([ref]0);$doc=[RecoveryIO]::Open($word,$path);$addin.UseDocumentTarget($doc);$null=$addin.UpdateDocument()
 Check (($addin.CheckDocument()|ConvertFrom-Json).citations -eq 1) 'Converted DOCM reopens and updates successfully'
 if($Manuscript){
  $userHash=FileHash $Manuscript;$macroHash=MacroHash $Manuscript
  $doc.Close([ref]0);$fixture=Join-Path $ResultFolder 'Manuscript-fixture-original.docm';Copy-Item -LiteralPath $Manuscript -Destination $fixture
  $doc=[RecoveryIO]::Open($word,$fixture);$addin.UseDocumentTarget($doc)
  $previousCitations=($addin.CheckDocument()|ConvertFrom-Json).citations;$previousSources=@(($addin.GetTravelingLibrary()|ConvertFrom-Json).references).Count
  $shapeCount=$doc.InlineShapes.Count;$tableCount=$doc.Tables.Count;$sectionCount=$doc.Sections.Count
  $report=$addin.InspectEndNoteDocument()|ConvertFrom-Json
  Check ($report.canMigrate -and $report.citations -eq 34 -and $report.sources -eq 34 -and $report.recoveredCitations -eq 8) 'Manuscript fixture recovers all 34 citation groups and 34 references without blockers'
  $converted=Join-Path $ResultFolder 'Manuscript-fixture-Citograph.docm';$result=$addin.MigrateEndNoteDocument($converted,'american-chemical-society',$report.token)|ConvertFrom-Json
  $expected+= [int]$result.added
  Check ($result.converted -and $result.citations -eq 34 -and $result.remainingEndNoteFields -eq 0) 'Manuscript fixture converts all EndNote groups into Citograph fields'
  Check ((FileHash $Manuscript) -eq $userHash -and (FileHash $fixture) -eq $userHash) 'User manuscript and unconverted test copy remain unchanged'
  Check ($macroHash.Length -gt 0 -and (MacroHash $converted).Length -gt 0 -and $doc.HasVBProject) 'VBA project is retained in the converted DOCM'
  $taskMacroReport=& python (Join-Path $PSScriptRoot 'verify-vba-source.py') $Manuscript $converted
  if($LASTEXITCODE -ne 0){throw 'Macro source comparison failed.'}
  Check (($taskMacroReport|ConvertFrom-Json).sourcePreserved) 'Every VBA module retains its exact source after Word saving'
  Check ($doc.InlineShapes.Count -eq $shapeCount -and $doc.Tables.Count -eq $tableCount -and $doc.Sections.Count -eq $sectionCount) 'Manuscript figures, tables and sections are preserved'
  Check (($addin.CheckDocument()|ConvertFrom-Json).citations -eq (34+$previousCitations) -and ($addin.GetTravelingLibrary()|ConvertFrom-Json).references.Count -eq (34+$previousSources)) 'Converted manuscript retains existing Citograph citations alongside all 34 migrated groups and sources'
 }
 @{passed=$checks;failure='';expectedLibraryReferences=$expected}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $ResultFolder 'migration-recovery-report.json') -Encoding UTF8
}catch{@{passed=$checks;failure=$_.Exception.ToString()}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $ResultFolder 'migration-recovery-report.json') -Encoding UTF8;throw}
finally{if($owned){if($doc){try{$doc.Close([ref]0)}catch{}};if($word){try{$word.Quit([ref]0)}catch{}}};if($word){[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)};[GC]::Collect();[GC]::WaitForPendingFinalizers()}
