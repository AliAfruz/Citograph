using System;using System.Collections;using System.Collections.Generic;using System.Linq;using System.Web.Script.Serialization;
namespace Citograph.Word {
 public class CitationItem {public string id;public string locator;public string label="page";public string prefix;public string suffix;public bool suppressAuthor;}
 public class CitationPayload {public int schemaVersion=1;public string id=Guid.NewGuid().ToString();public List<CitationItem> items=new List<CitationItem>();public List<Dictionary<string,object>> references=new List<Dictionary<string,object>>();}
 public class DocumentLibrary {public int schemaVersion=1;public string documentId=Guid.NewGuid().ToString();public string style="apa";public string styleXml;public string localeXml;public string bibliographyTitle="References";public List<Dictionary<string,object>> references=new List<Dictionary<string,object>>();}
 public class StyleInfo {public string id;public string name;public override string ToString(){return name;}}
 public class CollectionInfo {public string id;public string name;public string color;public override string ToString(){return name;}}
 public class LibraryResponse {public List<Dictionary<string,object>> references=new List<Dictionary<string,object>>();public List<CollectionInfo> collections=new List<CollectionInfo>();public List<StyleInfo> styles=new List<StyleInfo>();}
 public class FormatResponse {public Dictionary<string,string> citations;public string bibliography;public string styleXml;public string localeXml;public Dictionary<string,object> bibliographySettings;}
 public class FormatCluster {public string id;public List<CitationItem> items;public int noteIndex;}
 public class FormatRequest {public List<Dictionary<string,object>> references;public List<FormatCluster> clusters;public string style;public string styleXml;public string localeXml;}
 public class ImportResponse {public int added;public int skipped;public Dictionary<string,string> idMap;}
 public class BridgeDescriptor {public int port;public string token;public int protocol;public string version;}
 internal static class Data {
  public static JavaScriptSerializer Json(){return new JavaScriptSerializer{MaxJsonLength=16000000,RecursionLimit=100};}
  public static string Serialize(object value){return Json().Serialize(value);}public static T Parse<T>(string text){return Json().Deserialize<T>(text);}
  public static string Text(Dictionary<string,object> r,string key){object v;return r.TryGetValue(key,out v)&&v!=null?Convert.ToString(v):"";}
  public static string Authors(Dictionary<string,object> r){object raw;if(!r.TryGetValue("author",out raw)||raw==null)return "Unknown author";var names=new List<string>();foreach(object a in (IEnumerable)raw){var d=a as Dictionary<string,object>;if(d!=null){string literal=Text(d,"literal");names.Add(literal.Length>0?literal:(Text(d,"given")+" "+Text(d,"family")).Trim());}}return names.Count==0?"Unknown author":string.Join("; ",names);}
  public static string Year(Dictionary<string,object> r){try{var issued=(Dictionary<string,object>)r["issued"];var parts=(IEnumerable)issued["date-parts"];foreach(object p in parts)foreach(object y in (IEnumerable)p)return Convert.ToString(y);}catch{}return "";}
  public static bool HasId(IEnumerable<Dictionary<string,object>> refs,string id){return refs.Any(r=>Text(r,"id")==id);}
  public static List<CitationItem> UniqueItems(IEnumerable<CitationItem> items){var seen=new HashSet<string>();var result=new List<CitationItem>();foreach(var item in items){string locator=item.locator??"";string key=Serialize(new object[]{item.id,locator,locator.Length>0?(string.IsNullOrEmpty(item.label)?"page":item.label):"",item.prefix??"",item.suffix??"",item.suppressAuthor});if(seen.Add(key))result.Add(item);}return result;}
  public static List<Dictionary<string,object>> Unique(IEnumerable<Dictionary<string,object>> refs){var map=new Dictionary<string,Dictionary<string,object>>();foreach(var r in refs){string id=Text(r,"id");if(id.Length>0&&!map.ContainsKey(id))map[id]=r;}return map.Values.ToList();}
  public static List<StyleInfo> StandardStyles(){return new List<StyleInfo>{new StyleInfo{id="apa",name="APA 7th edition"},new StyleInfo{id="ieee",name="IEEE"},new StyleInfo{id="nature",name="Nature"},new StyleInfo{id="nlm-citation-sequence",name="NLM / Vancouver"},new StyleInfo{id="chicago-author-date",name="Chicago author–date"},new StyleInfo{id="modern-language-association",name="MLA 9th edition"},new StyleInfo{id="american-chemical-society",name="American Chemical Society"},new StyleInfo{id="harvard-cite-them-right",name="Harvard · Cite Them Right"}};}
 }
}
