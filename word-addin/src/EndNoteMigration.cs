using System;using System.Collections.Generic;using System.IO;using System.Linq;using System.Text.RegularExpressions;
namespace Citograph.Word {
 internal class MigrationField {public dynamic field;public int story;public int start;public int position;public int noteIndex;public bool bibliography;public List<EndNoteSource> sources;public CitationPayload payload;}
 internal class MigrationPlan {public List<MigrationField> fields=new List<MigrationField>();public List<string> issues=new List<string>();public List<string> warnings=new List<string>();public List<Dictionary<string,object>> references=new List<Dictionary<string,object>>();public string token;public string name;public string path;public long window;}
 internal class EndNoteMigration {
  dynamic app;DocumentController controller;BridgeClient bridge;
  public EndNoteMigration(dynamic application,DocumentController document,BridgeClient client){app=application;controller=document;bridge=client;}
  static bool EndNote(dynamic field){return (int)field.Type==81&&Regex.IsMatch((string)field.Code.Text,@"^\s*ADDIN\s+EN\.",RegexOptions.IgnoreCase);}
  MigrationPlan Scan(){
   dynamic doc=controller.Document;var p=new MigrationPlan{name=(string)doc.Name,path=(string)doc.FullName,window=Convert.ToInt64(doc.ActiveWindow.Hwnd)};var fingerprint=new System.Text.StringBuilder(p.path+"|"+p.window);
   if(!File.Exists(p.path)||!Path.GetExtension(p.path).Equals(".docx",StringComparison.OrdinalIgnoreCase))p.issues.Add("Save an editable .docx document in Word before migration.");
   if((int)doc.ProtectionType!=-1)p.issues.Add("Remove document protection before migration.");if((int)doc.Revisions.Count>0)p.issues.Add("Review and accept or reject tracked changes before migration.");
   foreach(dynamic initial in doc.StoryRanges){dynamic range=initial;while(range!=null){int story=(int)range.StoryType;fingerprint.Append("|"+story+":"+(string)range.Text);foreach(dynamic field in range.Fields){fingerprint.Append("|"+(int)field.Code.Start+":"+(string)field.Code.Text);if(!EndNote(field))continue;
    var f=new MigrationField{field=field,story=story,start=(int)field.Code.Start,position=(int)field.Result.Start};p.fields.Add(f);string code=(string)field.Code.Text;f.bibliography=Regex.IsMatch(code,@"^\s*ADDIN\s+EN\.REFLIST(?:\s|$)",RegexOptions.IgnoreCase);
    if(story!=1&&story!=2&&story!=3){p.issues.Add("EndNote fields in headers, text boxes or other unsupported stories need manual review.");continue;}
    if(story!=1){dynamic notes=story==2?doc.Footnotes:doc.Endnotes;foreach(dynamic note in notes){if((int)field.Result.Start>=(int)note.Range.Start&&(int)field.Result.End<=(int)note.Range.End){f.position=(int)note.Reference.Start;f.noteIndex=(int)note.Index;break;}}}
    if((int)field.Result.Fields.Count>0)p.issues.Add("Nested fields inside an EndNote citation need manual review at position "+f.position+".");
    if(!f.bibliography){try{f.sources=EndNoteParser.Parse(code);}catch(Exception e){p.issues.Add("Citation at position "+f.position+": "+e.Message);}}
   }try{range=range.NextStoryRange;}catch{range=null;}}}
   var all=p.fields.Where(f=>f.sources!=null).SelectMany(f=>f.sources).ToList();
   foreach(var source in all.Where(s=>s.reference==null)){
    var matches=all.Where(s=>s.reference!=null&&s.number==source.number&&source.number.Length>0&&(source.database.Length==0||s.database==source.database)&&(source.year.Length==0||source.year==Data.Year(s.reference))&&(source.author.Length==0||EndNoteParser.Normalize(Data.Authors(s.reference)).Contains(EndNoteParser.Normalize(source.author)))).Select(s=>s.reference).GroupBy(r=>Data.Text(r,"id")).Select(g=>g.First()).ToList();
    if(matches.Count==1){source.reference=matches[0];source.item.id=Data.Text(source.reference,"id");}else p.issues.Add("EndNote record "+source.number+" is missing or ambiguous. Reformat the document with its EndNote library open, then retry.");
   }
   p.references=Data.Unique(all.Where(s=>s.reference!=null).Select(s=>s.reference));
   foreach(var g in all.Where(s=>s.reference!=null).GroupBy(s=>Data.Text(s.reference,"id")))if(g.Select(s=>EndNoteParser.Normalize(Data.Text(s.reference,"title"))).Distinct().Count()>1)p.issues.Add("Conflicting titles share the same DOI. Review the EndNote records before migration.");
   foreach(var r in p.references)if(Data.Authors(r)=="Unknown author"||Data.Year(r).Length==0)p.warnings.Add(Data.Text(r,"title")+": review missing author or year metadata.");
   foreach(var f in p.fields.Where(f=>f.sources!=null))f.payload=new CitationPayload{items=f.sources.Select(s=>s.item).ToList(),references=Data.Unique(f.sources.Where(s=>s.reference!=null).Select(s=>s.reference))};
   if(!p.fields.Any(f=>!f.bibliography))p.issues.Add("No supported EndNote citation fields were found. Plain-text or unformatted citations do not contain recoverable reference links.");
   if(p.references.Count>10000||p.fields.Count>5000)p.issues.Add("Migration supports up to 10,000 sources and 5,000 fields per document.");
   fingerprint.Append("|"+Convert.ToString(doc.TrackRevisions)+"|"+doc.Revisions.Count+"|"+doc.ProtectionType);p.token=EndNoteParser.Hash(fingerprint.ToString());return p;
  }
  public string Inspect(){var p=Scan();return Data.Serialize(new{token=p.token,name=p.name,path=p.path,window=p.window,citations=p.fields.Count(f=>!f.bibliography),bibliographies=p.fields.Count(f=>f.bibliography),sources=p.references.Count,references=p.references,issues=p.issues.Distinct().ToArray(),warnings=p.warnings,canMigrate=p.issues.Count==0});}
  public string Migrate(string output,string style,string token){
   var p=Scan();if(p.token!=token)throw new InvalidOperationException("The Word document changed. Inspect it again before migration.");if(p.issues.Count>0)throw new InvalidOperationException(string.Join("\r\n",p.issues.Distinct()));
   output=Path.GetFullPath(output);if(!Path.GetExtension(output).Equals(".docx",StringComparison.OrdinalIgnoreCase)||output.Equals(p.path,StringComparison.OrdinalIgnoreCase)||File.Exists(output))throw new IOException("Choose a new, unused .docx filename. Migration never overwrites the original or an existing file.");
   var current=controller.Fields();if(current.Any(f=>f.payload==null))throw new InvalidDataException("Repair the damaged Citograph citations before migration.");var library=controller.Library();
   var refs=Data.Unique(library.references.Concat(current.SelectMany(f=>f.payload.references)).Concat(p.references));
   var clusters=current.Select(f=>new{position=f.position,story=f.story,cluster=new FormatCluster{id=f.payload.id,items=f.payload.items,noteIndex=f.noteIndex}}).Concat(p.fields.Where(f=>!f.bibliography).Select(f=>new{position=f.position,story=f.story,cluster=new FormatCluster{id=f.payload.id,items=f.payload.items,noteIndex=f.noteIndex}})).OrderBy(f=>f.position).ThenBy(f=>f.story).Select(f=>f.cluster).ToList();
   var ids=new HashSet<string>(clusters.SelectMany(c=>c.items.Select(i=>i.id)));var formatted=bridge.Format(new FormatRequest{references=refs.Where(r=>ids.Contains(Data.Text(r,"id"))).ToList(),clusters=clusters,style=style});if(formatted.citations==null||clusters.Any(c=>!formatted.citations.ContainsKey(c.id)))throw new InvalidDataException("Citation preflight returned incomplete data.");
   // Save the complete current Word document to a new path before any conversion.
   if(Scan().token!=token)throw new InvalidOperationException("The Word document changed during citation preflight. Inspect it again.");dynamic doc=controller.Document;controller=new DocumentController(app,bridge,(object)doc);doc.SaveAs2(output,16);bool previous=app.ScreenUpdating;app.ScreenUpdating=false;
   try{
    doc.TrackRevisions=false;
    library.style=style;library.styleXml=formatted.styleXml;library.localeXml=formatted.localeXml;library.references=refs;if(p.fields.Any(f=>f.bibliography))library.bibliographyTitle="";
    foreach(var f in p.fields.OrderBy(f=>f.story).ThenByDescending(f=>f.start)){
     dynamic range=f.field.Code.Duplicate;range.SetRange((int)f.field.Code.Start-1,(int)f.field.Result.End+1);f.field.Locked=false;range.Text="";range.Collapse(1);
     if(f.bibliography){if((int)range.Start>(int)range.Paragraphs.Item(1).Range.Start){range.InsertBefore("\r");range.Collapse(0);}range.Text="[Citograph bibliography]\r";dynamic control=doc.ContentControls.Add(0,range);control.Tag=DocumentController.BibliographyTag;control.Title="Citograph bibliography";}
     else range.InsertXML(RichText.CitationField(DocumentController.Code(f.payload)));
    }
    controller.SaveLibrary(library);if((int)doc.SelectContentControlsByTag(DocumentController.BibliographyTag).Count==0)controller.Bibliography();else controller.Update();
    if(Scan().fields.Count!=0)throw new InvalidDataException("An EndNote field remains. The converted document will not be saved.");
    // Commit the converted document before importing; its traveling library is a recovery source.
    doc.Save();var imported=bridge.Import(p.references);if(imported.idMap!=null){var fields=controller.Fields();foreach(var f in fields){foreach(var item in f.payload.items){string mapped;if(imported.idMap.TryGetValue(item.id,out mapped))item.id=mapped;}foreach(var r in f.payload.references){string mapped;if(imported.idMap.TryGetValue(Data.Text(r,"id"),out mapped))r["id"]=mapped;}f.field.Locked=false;f.field.Code.Text=DocumentController.Code(f.payload);f.field.Locked=true;}foreach(var r in library.references){string mapped;if(imported.idMap.TryGetValue(Data.Text(r,"id"),out mapped))r["id"]=mapped;}library.references=Data.Unique(library.references);controller.SaveLibrary(library);doc.Save();}
    return Data.Serialize(new{converted=true,path=output,citations=p.fields.Count(f=>!f.bibliography),sources=p.references.Count,added=imported.added,skipped=imported.skipped,remainingEndNoteFields=0,style=style});
   }catch(Exception e){throw new InvalidOperationException("Migration stopped. The original document is unchanged. The copy is at "+output+". If library import failed after conversion, use Import to Citograph from its traveling library. "+e.Message,e);}finally{app.ScreenUpdating=previous;}
  }
 }
}
