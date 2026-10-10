using System;using System.Collections.Generic;using System.IO;using System.Linq;using System.Text.RegularExpressions;using System.Text;using System.Xml;using System.Xml.Linq;
namespace Citograph.Word {
 internal class MigrationField {public dynamic field;public int story;public int start;public int end;public int position;public int noteIndex;public bool bibliography;public string code;public string data;public List<EndNoteSource> sources;public CitationPayload payload;}
 internal class MigrationPlan {public List<MigrationField> fields=new List<MigrationField>();public List<string> issues=new List<string>();public List<string> warnings=new List<string>();public List<string> notices=new List<string>();public List<Dictionary<string,object>> references=new List<Dictionary<string,object>>();public string token;public string name;public string path;public string outputExtension;public bool hasMacros;public int recovered;public int carriers;public int hyperlinks;public long window;}
 internal class EndNoteMigration {
  dynamic app;DocumentController controller;BridgeClient bridge;
  public EndNoteMigration(dynamic application,DocumentController document,BridgeClient client){app=application;controller=document;bridge=client;}
  static bool EndNote(dynamic field){return (int)field.Type==81&&Regex.IsMatch((string)field.Code.Text,@"^\s*ADDIN\s+EN\.",RegexOptions.IgnoreCase);}
  static bool Cite(string code){return Regex.IsMatch(code??"",@"^\s*ADDIN\s+EN\.CITE(?:\s|<|$)",RegexOptions.IgnoreCase);}
  static bool Carrier(string code){return Regex.IsMatch(code??"",@"^\s*ADDIN\s+EN\.CITE\.DATA(?:\s|$)",RegexOptions.IgnoreCase);}
  static string StoredData(dynamic field){
   string raw="";try{raw=(string)field.Data??"";}catch{}
   if(raw.Length==0)return raw;
   try{string decoded=EndNoteParser.DecodeFieldData(raw);if(decoded.IndexOf("</EndNote>",StringComparison.OrdinalIgnoreCase)>=0)return decoded;}catch{}
   // Read the selected field's Open XML byte data if the COM string cannot be decoded.
   try{
    dynamic range=field.Code.Duplicate;range.SetRange((int)field.Code.Start-1,(int)field.Result.End+1);
    string xml=(string)range.WordOpenXML;var settings=new XmlReaderSettings{DtdProcessing=DtdProcessing.Prohibit,XmlResolver=null,MaxCharactersInDocument=32000000};XElement root;
    using(var reader=XmlReader.Create(new StringReader(xml),settings))root=XElement.Load(reader);
    var part=root.Descendants().FirstOrDefault(e=>e.Name.LocalName=="part"&&e.Attributes().Any(a=>a.Name.LocalName=="name"&&a.Value=="/word/document.xml"));
    if(part!=null)foreach(var data in part.Descendants().Where(e=>e.Name.LocalName=="fldData")){
     byte[] bytes=Convert.FromBase64String(data.Value);if(bytes.Length>16000000)continue;
     string decoded=new UTF8Encoding(false,true).GetString(bytes).TrimEnd('\0').TrimStart('\uFEFF');
     if(EndNoteParser.HasXml(decoded)&&decoded.IndexOf("</EndNote>",StringComparison.OrdinalIgnoreCase)>=0)return decoded;
    }
   }catch{}
   return raw;
  }
  static void Unlock(dynamic field,int depth=0){if(depth>128)throw new InvalidDataException("Citation fields are nested too deeply.");field.Locked=false;foreach(dynamic child in field.Code.Fields)Unlock(child,depth+1);foreach(dynamic child in field.Result.Fields)Unlock(child,depth+1);}
  static string Where(MigrationField field){return "Citation at position "+field.position;}
  static bool SameSources(List<EndNoteSource> first,List<EndNoteSource> second){
   if(first.Count!=second.Count)return false;
   for(int i=0;i<first.Count;i++){var a=first[i];var b=second[i];
    if(a.item.id!=b.item.id||a.item.locator!=b.item.locator||a.item.prefix!=b.item.prefix||a.item.suffix!=b.item.suffix||a.item.suppressAuthor!=b.item.suppressAuthor)return false;
    if(a.reference!=null&&b.reference!=null&&Data.Serialize(a.reference)!=Data.Serialize(b.reference))return false;
    if(a.reference==null&&b.reference==null&&(a.number!=b.number||a.year!=b.year||a.author!=b.author))return false;
   }return true;
  }
  MigrationPlan Scan(){
   dynamic doc=controller.Document;
   var p=new MigrationPlan{name=(string)doc.Name,path=(string)doc.FullName,window=Convert.ToInt64(doc.ActiveWindow.Hwnd)};
   var fingerprint=new System.Text.StringBuilder(p.path+"|"+p.window);
   string extension=Path.GetExtension(p.path).ToLowerInvariant();
   try{p.hasMacros=(bool)doc.HasVBProject;}catch{p.hasMacros=extension==".docm";}
   p.outputExtension=p.hasMacros||extension==".docm"?".docm":".docx";
   if(!File.Exists(p.path)||!new[]{".docx",".docm",".doc"}.Contains(extension))p.issues.Add("Save the document as .docx, .docm or .doc in Word, then inspect it again.");
   if((int)doc.ProtectionType!=-1)p.issues.Add("Remove document protection before migration.");
   if((int)doc.Revisions.Count>0)p.issues.Add("Review and accept or reject tracked changes before migration.");
   if(p.outputExtension==".docm")p.notices.Add("The new .docm copy will retain the document's macros.");
   if(extension==".doc")p.notices.Add("The original .doc file will be preserved; the new copy uses "+p.outputExtension+".");
   var candidates=new List<MigrationField>();var seen=new HashSet<string>();
   foreach(dynamic initial in doc.StoryRanges){dynamic range=initial;while(range!=null){
    int story=(int)range.StoryType;fingerprint.Append("|"+story+":"+(string)range.Text);
    foreach(dynamic field in range.Fields){
     string code=(string)field.Code.Text;fingerprint.Append("|"+(int)field.Code.Start+":"+code);
     if(!EndNote(field))continue;
     string data=StoredData(field);fingerprint.Append("|hidden:"+EndNoteParser.DataHash(data));
     string key=story+":"+(int)field.Code.Start+":"+(int)field.Result.End;if(!seen.Add(key))continue;
     candidates.Add(new MigrationField{field=field,story=story,start=(int)field.Code.Start,end=(int)field.Result.End,position=(int)field.Result.Start,code=code,data=data,bibliography=Regex.IsMatch(code,@"^\s*ADDIN\s+EN\.REFLIST(?:\s|$)",RegexOptions.IgnoreCase)});
    }
    try{range=range.NextStoryRange;}catch{range=null;}
   }}
   foreach(var f in candidates){
    // EN.CITE.DATA is part of its enclosing citation, not another citation group.
    if(Carrier(f.code)&&candidates.Any(parent=>parent!=f&&parent.story==f.story&&Cite(parent.code)&&parent.start<f.start&&parent.end>=f.end)){p.carriers++;continue;}
    p.fields.Add(f);
    if(f.story!=1&&f.story!=2&&f.story!=3){p.issues.Add("EndNote fields in headers, text boxes or other unsupported stories need manual review.");continue;}
    if(f.story!=1){dynamic notes=f.story==2?doc.Footnotes:doc.Endnotes;foreach(dynamic note in notes){if((int)f.field.Result.Start>=(int)note.Range.Start&&(int)f.field.Result.End<=(int)note.Range.End){f.position=(int)note.Reference.Start;f.noteIndex=(int)note.Index;break;}}}
    if(f.bibliography){
     foreach(dynamic nested in f.field.Result.Fields){if((int)nested.Type==88)p.hyperlinks++;else p.issues.Add("The EndNote bibliography contains a nested field other than a hyperlink. Review it before migration.");}
     continue;
    }
    bool nestedIssue=false;
    foreach(dynamic nested in f.field.Code.Fields)if(!Carrier((string)nested.Code.Text))nestedIssue=true;
    if((int)f.field.Result.Fields.Count>0)nestedIssue=true;
    if(nestedIssue){p.issues.Add(Where(f)+": a nested field changes the citation display and needs review.");continue;}
    if(Carrier(f.code)&&string.IsNullOrWhiteSpace((string)f.field.Result.Text)){p.issues.Add(Where(f)+": an isolated EndNote data field has no visible citation. Reformat this citation in EndNote before retrying.");continue;}
    try{
     // Keep the outer citation code separate from XML carried by nested support fields.
     string primaryCode=Regex.Replace(f.code,@"\u0013[^\u0013\u0015]*\u0015","");
     List<EndNoteSource> recovered=null;Exception primaryError=null;int unreadable=0;
     try{recovered=EndNoteParser.ParseField(primaryCode,f.data);}catch(Exception error){primaryError=error;if(error is EndNoteReviewException||EndNoteParser.HasXml(primaryCode))throw;}
     foreach(dynamic nested in f.field.Code.Fields){
      if(!Carrier((string)nested.Code.Text))continue;
      string child=StoredData(nested);if(child.Length==0&&!EndNoteParser.HasXml((string)nested.Code.Text))continue;
      List<EndNoteSource> supporting;try{supporting=EndNoteParser.ParseField((string)nested.Code.Text,child);}catch(EndNoteReviewException){throw;}catch{unreadable++;continue;}
      if(recovered==null)recovered=supporting;
      else if(!SameSources(recovered,supporting))throw new InvalidDataException("The citation and its supporting data field contain different reference metadata or citation options. Reformat this citation in EndNote before retrying.");
     }
     if(recovered==null)throw primaryError??new InvalidDataException("No complete embedded reference data was found for this citation.");
     f.sources=recovered;
     if(unreadable>0)p.warnings.Add(Where(f)+": recovered from a complete embedded copy; a redundant supporting copy was unreadable.");
     if(!EndNoteParser.HasXml(primaryCode))p.recovered++;
    }catch(Exception e){p.issues.Add(Where(f)+": "+e.Message);}
   }
   var all=p.fields.Where(f=>f.sources!=null).SelectMany(f=>f.sources).ToList();
   foreach(var source in all.Where(s=>s.reference==null)){
    var matches=all.Where(s=>s.reference!=null&&s.number==source.number&&source.number.Length>0&&(source.database.Length==0||s.database==source.database)&&(source.year.Length==0||source.year==Data.Year(s.reference))&&(source.author.Length==0||EndNoteParser.Normalize(Data.Authors(s.reference)).Contains(EndNoteParser.Normalize(source.author)))).Select(s=>s.reference).GroupBy(r=>Data.Text(r,"id")).Select(g=>g.First()).ToList();
    if(matches.Count==1){source.reference=matches[0];source.item.id=Data.Text(source.reference,"id");}
    else p.issues.Add("EndNote record "+source.number+" is missing or ambiguous. Reformat the document with its EndNote library open, then retry.");
   }
   p.references=Data.Unique(all.Where(s=>s.reference!=null).Select(s=>s.reference));
   foreach(var g in all.Where(s=>s.reference!=null).GroupBy(s=>Data.Text(s.reference,"id")))if(g.Select(s=>EndNoteParser.Normalize(Data.Text(s.reference,"title"))).Distinct().Count()>1)p.issues.Add("Conflicting titles share the same DOI. Review the EndNote records before migration.");
   foreach(var r in p.references)if(Data.Authors(r)=="Unknown author"||Data.Year(r).Length==0)p.warnings.Add(Data.Text(r,"title")+": review missing author or year metadata.");
   foreach(var f in p.fields.Where(f=>f.sources!=null))f.payload=new CitationPayload{items=f.sources.Select(s=>s.item).ToList(),references=Data.Unique(f.sources.Where(s=>s.reference!=null).Select(s=>s.reference))};
   if(!p.fields.Any(f=>!f.bibliography))p.issues.Add("No supported EndNote citation fields were found. Plain-text or unformatted citations do not contain recoverable reference links.");
   if(p.references.Count>10000||p.fields.Count>5000)p.issues.Add("Migration supports up to 10,000 sources and 5,000 fields per document.");
   if(p.recovered>0)p.notices.Add("Recovered "+p.recovered+" citation groups from additional embedded EndNote data.");
   if(p.hyperlinks>0)p.notices.Add("Bibliography hyperlinks were recognized. The bibliography will be rebuilt in the selected style.");
   fingerprint.Append("|"+doc.SaveFormat+"|"+p.hasMacros+"|"+Convert.ToString(doc.TrackRevisions)+"|"+doc.Revisions.Count+"|"+doc.ProtectionType);
   p.token=EndNoteParser.Hash(fingerprint.ToString());return p;
  }
  public string Inspect(){var p=Scan();return Data.Serialize(new{token=p.token,name=p.name,path=p.path,window=p.window,citations=p.fields.Count(f=>!f.bibliography),bibliographies=p.fields.Count(f=>f.bibliography),sources=p.references.Count,references=p.references,issues=p.issues.Distinct().ToArray(),warnings=p.warnings,notices=p.notices,outputExtension=p.outputExtension,hasMacros=p.hasMacros,recoveredCitations=p.recovered,canMigrate=p.issues.Count==0});}
  public string Migrate(string output,string style,string token){
   var p=Scan();if(p.token!=token)throw new InvalidOperationException("The Word document changed. Inspect it again before migration.");if(p.issues.Count>0)throw new InvalidOperationException(string.Join("\r\n",p.issues.Distinct()));
   output=Path.GetFullPath(output);string extension=Path.GetExtension(output).ToLowerInvariant();
   if(!new[]{".docx",".docm"}.Contains(extension)||output.Equals(p.path,StringComparison.OrdinalIgnoreCase)||File.Exists(output))throw new IOException("Choose a new, unused .docx or .docm filename. Migration never overwrites the original or an existing file.");
   if(p.outputExtension==".docm"&&extension!=".docm")throw new IOException("Choose a .docm destination to preserve this document's macros.");
   var current=controller.Fields();if(current.Any(f=>f.payload==null))throw new InvalidDataException("Repair the damaged Citograph citations before migration.");var library=controller.Library();
   var refs=Data.Unique(library.references.Concat(current.SelectMany(f=>f.payload.references)).Concat(p.references));
   var clusters=current.Select(f=>new{position=f.position,story=f.story,cluster=new FormatCluster{id=f.payload.id,items=f.payload.items,noteIndex=f.noteIndex}}).Concat(p.fields.Where(f=>!f.bibliography).Select(f=>new{position=f.position,story=f.story,cluster=new FormatCluster{id=f.payload.id,items=f.payload.items,noteIndex=f.noteIndex}})).OrderBy(f=>f.position).ThenBy(f=>f.story).Select(f=>f.cluster).ToList();
   var ids=new HashSet<string>(clusters.SelectMany(c=>c.items.Select(i=>i.id)));var formatted=bridge.Format(new FormatRequest{references=refs.Where(r=>ids.Contains(Data.Text(r,"id"))).ToList(),clusters=clusters,style=style});if(formatted.citations==null||clusters.Any(c=>!formatted.citations.ContainsKey(c.id)))throw new InvalidDataException("Citation preflight returned incomplete data.");
   if(Scan().token!=token)throw new InvalidOperationException("The Word document changed during citation preflight. Inspect it again.");dynamic doc=controller.Document;controller=new DocumentController(app,bridge,(object)doc);doc.SaveAs2(output,extension==".docm"?13:16);bool previous=app.ScreenUpdating;app.ScreenUpdating=false;
   try{
    doc.TrackRevisions=false;
    library.style=style;library.styleXml=formatted.styleXml;library.localeXml=formatted.localeXml;library.references=refs;if(p.fields.Any(f=>f.bibliography))library.bibliographyTitle="";
    foreach(var f in p.fields.OrderBy(f=>f.story).ThenByDescending(f=>f.start)){
     dynamic range=f.field.Code.Duplicate;range.SetRange((int)f.field.Code.Start-1,(int)f.field.Result.End+1);Unlock(f.field);try{range.Text="";}catch(Exception error){throw new InvalidOperationException("Could not replace "+(f.bibliography?"bibliography":"citation")+" at position "+f.position+" (range "+range.Start+"–"+range.End+"): "+error.Message,error);}range.Collapse(1);
     if(f.bibliography){if((int)range.Start>(int)range.Paragraphs.Item(1).Range.Start){range.InsertBefore("\r");range.Collapse(0);}range.Text="[Citograph bibliography]\r";dynamic control=doc.ContentControls.Add(0,range);control.Tag=DocumentController.BibliographyTag;control.Title="Citograph bibliography";}
     else range.InsertXML(RichText.CitationField(DocumentController.Code(f.payload)));
    }
    controller.SaveLibrary(library);if((int)doc.SelectContentControlsByTag(DocumentController.BibliographyTag).Count==0)controller.Bibliography();else controller.Update();
    if(Scan().fields.Count!=0)throw new InvalidDataException("An EndNote field remains. The converted document will not be saved.");
    doc.Save();var imported=bridge.Import(p.references);if(imported.idMap!=null){var fields=controller.Fields();foreach(var f in fields){foreach(var item in f.payload.items){string mapped;if(imported.idMap.TryGetValue(item.id,out mapped))item.id=mapped;}foreach(var r in f.payload.references){string mapped;if(imported.idMap.TryGetValue(Data.Text(r,"id"),out mapped))r["id"]=mapped;}f.field.Locked=false;f.field.Code.Text=DocumentController.Code(f.payload);f.field.Locked=true;}foreach(var r in library.references){string mapped;if(imported.idMap.TryGetValue(Data.Text(r,"id"),out mapped))r["id"]=mapped;}library.references=Data.Unique(library.references);controller.SaveLibrary(library);doc.Save();}
    return Data.Serialize(new{converted=true,path=output,citations=p.fields.Count(f=>!f.bibliography),sources=p.references.Count,recoveredCitations=p.recovered,added=imported.added,skipped=imported.skipped,remainingEndNoteFields=0,macrosPreserved=extension==".docm",style=style});
   }catch(Exception e){throw new InvalidOperationException("Migration stopped. The original document is unchanged. The copy is at "+output+". If library import failed after conversion, use Import to Citograph from its traveling library. "+e.Message,e);}finally{app.ScreenUpdating=previous;}
  }
 }
}
