using System;using System.Collections.Generic;using System.IO;using System.Linq;using System.Text;using System.Text.RegularExpressions;using System.Xml;using System.Xml.Linq;using System.Security.Cryptography;
namespace Citograph.Word {
 internal class EndNoteReviewException:Exception{public EndNoteReviewException(string message):base(message){}}
 internal class EndNoteSource {public string number;public string database;public string author;public string year;public Dictionary<string,object> reference;public CitationItem item=new CitationItem();}
 internal static class EndNoteParser {
  internal static bool Named(XElement e,string name){return e.Name.LocalName.Equals(name,StringComparison.OrdinalIgnoreCase);}
  static XElement Child(XElement e,string name){return e==null?null:e.Elements().FirstOrDefault(x=>Named(x,name));}
  static XElement At(XElement e,string path){foreach(string name in path.Split('/'))e=Child(e,name);return e;}
  static string Text(XElement e,string path){var n=At(e,path);return n==null?"":n.Value.Trim();}
  static bool Flag(XElement e,string name){var n=Child(e,name);return n!=null&&!new[]{"0","false","no"}.Contains(n.Value.Trim().ToLowerInvariant());}
  internal static string Hash(string value){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-","").ToLowerInvariant();}
  internal static string Normalize(string value){return Regex.Replace(value??"",@"[^\p{L}\p{N}]","").ToLowerInvariant();}
  static object Person(string value){value=value.Trim();if(value.EndsWith(","))return new Dictionary<string,object>{{"literal",value.TrimEnd(',')}};int comma=value.IndexOf(',');if(comma>=0)return new Dictionary<string,object>{{"family",value.Substring(0,comma).Trim()},{"given",value.Substring(comma+1).Trim()}};return new Dictionary<string,object>{{"literal",value}};}
  static object[] People(XElement record,string path){var node=At(record,path);return node==null?new object[0]:node.Elements().Where(e=>Named(e,"author")).Select(e=>Person(e.Value)).ToArray();}
  static string Type(XElement record){var n=Child(record,"ref-type");string name=n==null?"":Normalize((string)n.Attribute("name"));var types=new Dictionary<string,string>{{"journalarticle","article-journal"},{"electronicarticle","article-journal"},{"book","book"},{"editedbook","book"},{"booksection","chapter"},{"bookchapter","chapter"},{"conferencepaper","paper-conference"},{"conferenceproceedings","paper-conference"},{"webpage","webpage"},{"report","report"},{"thesis","thesis"},{"newspaperarticle","article-newspaper"},{"magazinearticle","article-magazine"},{"patent","patent"},{"dataset","dataset"},{"computerprogram","software"},{"manuscript","manuscript"}};string type;if(types.TryGetValue(name,out type))return type;var ids=new Dictionary<string,string>{{"17","article-journal"},{"6","book"},{"28","book"},{"5","chapter"},{"10","paper-conference"},{"47","paper-conference"},{"27","report"},{"32","thesis"},{"12","webpage"},{"23","article-newspaper"},{"19","article-magazine"},{"25","patent"}};return n!=null&&ids.TryGetValue(n.Value.Trim(),out type)?type:"document";}
  internal static Dictionary<string,object> Reference(XElement record){
   string title=Text(record,"titles/title");if(title.Length==0)return null;
   string doi=Regex.Replace(Text(record,"electronic-resource-num"),@"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)","",RegexOptions.IgnoreCase).Trim().TrimEnd('.',',',';').ToLowerInvariant();
   var r=new Dictionary<string,object>{{"title",title},{"type",Type(record)},{"author",People(record,"contributors/authors")},{"editor",People(record,"contributors/secondary-authors")},{"DOI",doi},{"source","EndNote Word migration"}};
   foreach(var pair in new[]{new[]{"titles/secondary-title","container-title"},new[]{"periodical/abbr-1","container-title-short"},new[]{"titles/short-title","title-short"},new[]{"pages","page"},new[]{"volume","volume"},new[]{"number","issue"},new[]{"publisher","publisher"},new[]{"pub-location","publisher-place"},new[]{"edition","edition"},new[]{"abstract","abstract"},new[]{"language","language"},new[]{"isbn","ISBN"},new[]{"accession-num","accession-number"}}){string value=Text(record,pair[0]);if(value.Length>0)r[pair[1]]=value;}
   if(!r.ContainsKey("container-title")){string journal=Text(record,"periodical/full-title");if(journal.Length>0)r["container-title"]=journal;}
   var year=Regex.Match(Text(record,"dates/year"),@"\b(\d{4})\b");if(year.Success)r["issued"]=new Dictionary<string,object>{{"date-parts",new[]{new[]{int.Parse(year.Groups[1].Value)}}}};
   var urls=At(record,"urls/web-urls");if(urls!=null){var url=urls.Elements().FirstOrDefault(e=>Named(e,"url"));if(url!=null)r["URL"]=url.Value.Trim();}
   var keywords=Child(record,"keywords");if(keywords!=null)r["tags"]=keywords.Elements().Where(e=>Named(e,"keyword")).Select(e=>e.Value.Trim()).Where(v=>v.Length>0).Distinct().ToArray();
   string identity=doi.Length>0?"doi:"+doi:Data.Text(r,"type")+"|"+Normalize(title)+"|"+Normalize(Data.Authors(r))+"|"+Data.Year(r)+"|"+Normalize(Data.Text(r,"container-title"));r["id"]="enm-"+Hash(identity).Substring(0,32);return r;
  }
  internal static bool HasXml(string value){return Regex.IsMatch(value??"",@"<EndNote(?:\s|>)",RegexOptions.IgnoreCase);}
  static byte[] PackedBytes(string value){var bytes=new byte[value.Length*2];for(int i=0;i<value.Length;i++){bytes[i*2]=(byte)(value[i]&255);bytes[i*2+1]=(byte)(value[i]>>8);}return bytes;}
  internal static string DataHash(string value){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(PackedBytes(value??""))).Replace("-","").ToLowerInvariant();}
  internal static string DecodeFieldData(string value){
   if(string.IsNullOrEmpty(value))throw new InvalidDataException("Embedded EndNote data is missing. Reformat this citation in EndNote before retrying.");
   if(value.Length>16000000)throw new InvalidDataException("Embedded EndNote data is too large.");
   if(HasXml(value))return value.TrimEnd('\0').TrimStart('\uFEFF');
   // Word exposes ADDIN byte data as UTF-16 code units. Unpack each unit without encoding replacement.
   byte[] bytes=PackedBytes(value);int count=bytes.Length;while(count>0&&bytes[count-1]==0)count--;
   string decoded;try{decoded=new UTF8Encoding(false,true).GetString(bytes,0,count).TrimStart('\uFEFF');}catch(DecoderFallbackException){throw new InvalidDataException("Embedded EndNote data has an unreadable encoding. Reformat this citation in EndNote before retrying.");}
   if(!HasXml(decoded))throw new InvalidDataException("Embedded EndNote data does not contain recognizable reference XML. Reformat this citation in EndNote before retrying.");
   return decoded;
  }
  internal static List<EndNoteSource> ParseField(string code,string data){
   if(code==null||code.Length>16000000||!Regex.IsMatch(code,@"^\s*ADDIN\s+EN\.CITE(?:\.DATA)?(?:\s|<|$)",RegexOptions.IgnoreCase))throw new InvalidDataException("Unsupported EndNote citation field.");
   if(HasXml(code))return Parse(Regex.Replace(code,@"^(\s*ADDIN\s+EN\.CITE)\.DATA(?=\s|<|$)","$1",RegexOptions.IgnoreCase));
   return Parse(" ADDIN EN.CITE "+DecodeFieldData(data));
  }
  internal static List<EndNoteSource> Parse(string code){
   if(code==null||code.Length>16000000||!Regex.IsMatch(code,@"^\s*ADDIN\s+EN\.CITE(?:\s|<|$)",RegexOptions.IgnoreCase))throw new InvalidDataException("Unsupported EndNote citation field.");
   int start=code.IndexOf('<');int end=code.LastIndexOf("</EndNote>",StringComparison.OrdinalIgnoreCase);if(start<0||end<start)throw new InvalidDataException("This citation has no embedded EndNote traveling-library XML. Reformat it in EndNote before migration.");
   XElement root;var settings=new XmlReaderSettings{DtdProcessing=DtdProcessing.Prohibit,XmlResolver=null,MaxCharactersInDocument=16000000};using(var reader=XmlReader.Create(new StringReader(code.Substring(start,end+10-start)),settings))root=XElement.Load(reader);
   if(!Named(root,"EndNote"))throw new InvalidDataException("Invalid EndNote XML root.");
   var result=new List<EndNoteSource>();var allowed=new HashSet<string>(new[]{"Author","Year","RecNum","record","Prefix","Suffix","Pages","DisplayText","ExcludeAuth","ExcludeYear","AuthorOnly","YearOnly","DisplayAsAuthor"},StringComparer.OrdinalIgnoreCase);
   foreach(var cite in root.Elements().Where(e=>Named(e,"Cite"))){
    var unknown=cite.Elements().FirstOrDefault(e=>!allowed.Contains(e.Name.LocalName));if(unknown!=null)throw new EndNoteReviewException("Unsupported citation option: "+unknown.Name.LocalName+". Use a standard author/date or numeric citation before migration.");
    if(new[]{"ExcludeYear","AuthorOnly","YearOnly","DisplayAsAuthor"}.Any(flag=>Flag(cite,flag)))throw new EndNoteReviewException("Author-only or year-suppressed EndNote citations need manual review before migration.");
    var record=Child(cite,"record");var key=record==null?null:record.Descendants().FirstOrDefault(e=>Named(e,"key")&&e.Attribute("db-id")!=null);
    var source=new EndNoteSource{number=Text(cite,"RecNum"),author=Text(cite,"Author"),year=Text(cite,"Year"),database=key==null?"":(string)key.Attribute("db-id"),reference=record==null?null:Reference(record)};
    if(source.number.Length==0&&record!=null)source.number=Text(record,"rec-number");
    source.item.locator=Text(cite,"Pages");source.item.prefix=Child(cite,"Prefix")==null?"":Child(cite,"Prefix").Value;source.item.suffix=Child(cite,"Suffix")==null?"":Child(cite,"Suffix").Value;source.item.suppressAuthor=Flag(cite,"ExcludeAuth");if(source.reference!=null)source.item.id=Data.Text(source.reference,"id");result.Add(source);
   }
   if(result.Count==0||result.Count>100)throw new InvalidDataException("EndNote citation must contain between 1 and 100 sources.");return result;
  }
 }
}
