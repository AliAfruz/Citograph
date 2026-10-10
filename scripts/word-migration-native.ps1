param([string]$ResultFolder,[string]$BridgeFile,[string]$Root)
$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $Root 'word-addin\bin\Citograph.Word.dll')
Add-Type -ReferencedAssemblies 'Microsoft.CSharp','System.Core' -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public class MigrationTestHost{public object Object{get;set;}}
public static class MigrationTestIO{
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint id);
 public static string Hash(string file){using(var h=System.Security.Cryptography.SHA256.Create())using(var s=new System.IO.FileStream(file,System.IO.FileMode.Open,System.IO.FileAccess.Read,System.IO.FileShare.ReadWrite|System.IO.FileShare.Delete))return BitConverter.ToString(h.ComputeHash(s));}
 public static void Save(object d,string f){dynamic doc=d;doc.SaveAs2(f,16);}
 public static object Field(object r,string code,string result){dynamic range=r;string xml="<pkg:package xmlns:pkg=\"http://schemas.microsoft.com/office/2006/xmlPackage\"><pkg:part pkg:name=\"/_rels/.rels\" pkg:contentType=\"application/vnd.openxmlformats-package.relationships+xml\"><pkg:xmlData><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships></pkg:xmlData></pkg:part><pkg:part pkg:name=\"/word/document.xml\" pkg:contentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"><pkg:xmlData><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:fldChar w:fldCharType=\"begin\" w:fldLock=\"1\"/></w:r><w:r><w:instrText xml:space=\"preserve\"> ADDIN "+System.Security.SecurityElement.Escape(code)+" </w:instrText></w:r><w:r><w:fldChar w:fldCharType=\"separate\"/></w:r><w:r><w:t>"+System.Security.SecurityElement.Escape(result)+"</w:t></w:r><w:r><w:fldChar w:fldCharType=\"end\"/></w:r></w:p></w:body></w:document></pkg:xmlData></pkg:part></pkg:package>";range.InsertXML(xml);return null;}
 public static object Note(object d){dynamic doc=d;int p=doc.Paragraphs[2].Range.Start;return doc.Footnotes.Add(doc.Range(p,p),Type.Missing,"Footnote evidence. ");}
}
'@
$existing=@(Get-Process WINWORD -ErrorAction SilentlyContinue|ForEach-Object{$_.Id});$word=$null;$doc=$null;$owned=$false;$checks=[Collections.Generic.List[string]]::new()
function Check([bool]$ok,[string]$message){if(!$ok){throw $message};$checks.Add($message);Write-Host ('PASS '+$message)}
function Record([string]$number,[string]$title,[string]$doi){'<record><rec-number>'+ $number +'</rec-number><ref-type name="Journal Article">17</ref-type><contributors><authors><author>Smith, Jane</author></authors></contributors><titles><title>'+ $title +'</title><secondary-title>Synthetic Journal</secondary-title></titles><dates><year>2024</year></dates><pages>12-20</pages><volume>5</volume><electronic-resource-num>'+ $doi +'</electronic-resource-num></record>'}
function Cite([string]$number,[string]$record,[string]$extra=''){ '<Cite><Author>Smith</Author><Year>2024</Year><RecNum>'+ $number +'</RecNum>'+ $extra +$record+'</Cite>' }
function EndNote([object]$range,[string]$inner,[string]$display){[MigrationTestIO]::Field($range,('EN.CITE <EndNote>'+ $inner +'</EndNote>'),$display)}
try{
 $word=New-Object -ComObject Word.Application;if($word.Documents.Count -ne 0){throw 'An existing Word instance was returned; stopped to protect open documents.'};$doc=$word.Documents.Add();[uint32]$taskWordPid=0;[void][MigrationTestIO]::GetWindowThreadProcessId([IntPtr]$doc.ActiveWindow.Hwnd,[ref]$taskWordPid);if($existing -contains [int]$taskWordPid){throw 'Word fixture shares a user process; stopped.'};$owned=$true;$word.Visible=$false;$word.DisplayAlerts=0
 $addin=New-Object Citograph.Word.Addin;$hostObject=New-Object MigrationTestHost;$custom=[Array]@();$addin.OnConnection($word,1,$hostObject,[ref]$custom);$addin.UseBridgeDescriptor($BridgeFile)
 $doc.Content.Text="Migration validation`rBody evidence. `rMore evidence. `rReferences`r"
 $doc.Paragraphs.Item(1).Range.Font.Bold=-1;$doc.Sections.Item(1).PageSetup.TopMargin=80
 $one=Record '1' 'Synthetic migration article' '10.5555/citograph-migration-one';$two=Record '2' 'Second synthetic article' '10.5555/citograph-migration-two'
 $p=$doc.Paragraphs.Item(2).Range.End-1;$field=EndNote ($doc.Range($p,$p)) ((Cite '1' $one '<Prefix>see </Prefix><Pages>12</Pages>')+(Cite '2' $two)) '(Smith, 2024)'
 $p=$doc.Paragraphs.Item(3).Range.End-1;$null=EndNote ($doc.Range($p,$p)) (Cite '1' '') '(Smith, 2024)'
 $note=[MigrationTestIO]::Note($doc);$p=$note.Range.End-1;$taskNoteRange=$note.Range.Duplicate;$taskNoteRange.SetRange($p,$p);$null=EndNote $taskNoteRange (Cite '2' $two) '(Smith, 2024)'
 $p=$doc.Content.End-1;$null=[MigrationTestIO]::Field($doc.Range($p,$p),'EN.REFLIST','Old EndNote bibliography')
 $p=$doc.Content.End-1;$null=$doc.Fields.Add($doc.Range($p,$p),33)
 $source=Join-Path $ResultFolder 'Synthetic-EndNote-original.docx';[MigrationTestIO]::Save($doc,$source);$originalHash=[MigrationTestIO]::Hash($source)
 $report=$addin.InspectEndNoteDocument()|ConvertFrom-Json;Check ($report.canMigrate -and $report.citations -eq 3 -and $report.sources -eq 2) 'Preview recovers grouped and repeated sources including footnotes'
 $originalCode=$doc.Fields.Item(1).Code.Text;$doc.Fields.Item(1).Code.Text=$originalCode+' ';$blocked=$false;try{$null=$addin.MigrateEndNoteDocument((Join-Path $ResultFolder 'Must-not-exist.docx'),'apa',$report.token)}catch{$blocked=$true};Check ($blocked -and !(Test-Path -LiteralPath (Join-Path $ResultFolder 'Must-not-exist.docx'))) 'Changed citation data blocks conversion before creating a copy';$doc.Fields.Item(1).Code.Text=$originalCode
 $report=$addin.InspectEndNoteDocument()|ConvertFrom-Json;$blocked=$false;try{$null=$addin.MigrateEndNoteDocument($source,'apa',$report.token)}catch{$blocked=$true};Check $blocked 'Original document cannot be selected as the destination'
 $report=$addin.InspectEndNoteDocument()|ConvertFrom-Json;[IO.File]::WriteAllText((Join-Path $ResultFolder 'migration-target.json'),($report|ConvertTo-Json -Depth 20));Write-Host 'READY_MIGRATION_IPC'
 $ack=Join-Path $ResultFolder 'migration-ack.json';$deadline=[DateTime]::UtcNow.AddSeconds(120);while(!(Test-Path -LiteralPath $ack)){if([DateTime]::UtcNow -gt $deadline){throw 'Desktop migration IPC timed out.'};Start-Sleep -Milliseconds 100};$result=Get-Content -LiteralPath $ack -Raw|ConvertFrom-Json;if($result.error){throw $result.error};$doc=$word.ActiveDocument
 Check ($result.converted -and $result.added -eq 2 -and $result.remainingEndNoteFields -eq 0) 'Desktop migration converts the copy and imports both references'
 Check ([MigrationTestIO]::Hash($source) -eq $originalHash) 'Original Word file remains byte-for-byte unchanged'
 Check ($doc.Fields.Item(1).Code.Text -match 'CITOGRAPH/1' -and $doc.Fields.Item(1).Result.Text -match 'p. 12') 'Converted citation is editable and retains page locator'
 Check ($doc.Fields.Item(1).Result.Text -match 'see ') 'Prefix spacing survives conversion'
 Check ($doc.Footnotes.Item(1).Range.Fields.Item(1).Code.Text -match 'CITOGRAPH/1') 'Footnote citation has a Citograph field'
 Check ($doc.SelectContentControlsByTag('Citograph.Bibliography').Count -eq 1 -and $doc.SelectContentControlsByTag('Citograph.Bibliography').Item(1).Range.Text -match 'Synthetic migration article') 'EndNote bibliography becomes a rich Citograph bibliography'
 Check ($doc.Fields.Item($doc.Fields.Count).Type -eq 33 -and $doc.Paragraphs.Item(1).Range.Font.Bold -eq -1 -and $doc.Sections.Item(1).PageSetup.TopMargin -eq 80) 'Unrelated PAGE field, heading and page layout are preserved'
 Check (($addin.CheckDocument()|ConvertFrom-Json).citations -eq 3) 'Document audit recognizes all converted citations'
 Check (!$doc.Content.Text.Contains('Old EndNote bibliography')) 'Old EndNote bibliography text is fully replaced'
 $lib=$addin.GetTravelingLibrary()|ConvertFrom-Json;Check ($lib.references.Count -eq 2 -and $lib.references[0].id -notmatch '^enm-') 'Document references use the imported desktop library IDs'
 $addin.SetCitationStyle('ieee');Check ($doc.Fields.Item(1).Result.Text -match '\[') 'Migrated citations can be restyled and refreshed'
 $copyPath=$doc.FullName;$doc.Save();$doc.Close([ref]0);$doc=$word.Documents.Open($copyPath);$null=$addin.UpdateDocument();Check (($addin.GetTravelingLibrary()|ConvertFrom-Json).references.Count -eq 2) 'Converted DOCX reopens with its traveling library intact'
 $doc.Close([ref]0);$doc=$word.Documents.Open($source);$report=$addin.InspectEndNoteDocument()|ConvertFrom-Json;$duplicate=$addin.MigrateEndNoteDocument((Join-Path $ResultFolder 'Synthetic-Citograph-reused.docx'),'ieee',$report.token)|ConvertFrom-Json;Check ($duplicate.added -eq 0 -and $duplicate.skipped -eq 2) 'Another migrated document reuses both existing library references'
 $doc.Close([ref]0);$doc=$word.Documents.Add();$doc.Content.Text='Broken citation ';$null=EndNote ($doc.Range(0,0)) (Cite '99' '') '(Unknown, 2024)';[MigrationTestIO]::Save($doc,(Join-Path $ResultFolder 'Unresolved-EndNote.docx'));$report=$addin.InspectEndNoteDocument()|ConvertFrom-Json;Check (!$report.canMigrate -and $report.issues.Count -gt 0) 'Unresolved references block migration with a review report'
 @{passed=$checks;failure='';wordVersion=$word.Version}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $ResultFolder 'migration-native-report.json') -Encoding UTF8
}catch{@{passed=$checks;failure=$_.Exception.ToString()}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $ResultFolder 'migration-native-report.json') -Encoding UTF8;throw}finally{if($owned){if($doc){$doc.Close([ref]0)};if($word){$word.Quit([ref]0)}};if($word){[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)};[GC]::Collect();[GC]::WaitForPendingFinalizers()}
