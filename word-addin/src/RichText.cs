using System;using System.Linq;using System.Xml.Linq;using System.Collections.Generic;using System.Text.RegularExpressions;using System.Net;
namespace Citograph.Word {
 internal static class RichText {
  internal class Segment {public string text;public bool bold;public bool italic;public string vertical;}
  static XNamespace w="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  static XNamespace pkg="http://schemas.microsoft.com/office/2006/xmlPackage";
  public static string CitationField(string code){var p=new XElement(w+"p",new XElement(w+"r",new XElement(w+"fldChar",new XAttribute(w+"fldCharType","begin"),new XAttribute(w+"fldLock","1"))),new XElement(w+"r",new XElement(w+"instrText",new XAttribute(XNamespace.Xml+"space","preserve"),code)),new XElement(w+"r",new XElement(w+"fldChar",new XAttribute(w+"fldCharType","separate"))),new XElement(w+"r",new XElement(w+"t","[Formatting citation…]")),new XElement(w+"r",new XElement(w+"fldChar",new XAttribute(w+"fldCharType","end"))));return Package(new XElement(w+"body",p));}
  public static string Plain(string html){return WebUtility.HtmlDecode(Regex.Replace(html??"","<[^>]*>","")).Trim();}
  public static string BibliographyText(string html){try{var root=XElement.Parse("<root>"+(html??"").Replace("&nbsp;","&#160;")+"</root>");return string.Join("\r\n\r\n",root.Descendants().Where(e=>e.Attribute("class")!=null&&e.Attribute("class").Value.Split(' ').Contains("csl-entry")).Select(e=>e.Value.Trim()));}catch{return Plain(html);}}
  public static string SafeHtml(string html){try{var root=XElement.Parse("<root>"+(html??"").Replace("&nbsp;","&#160;")+"</root>");return string.Concat(root.Nodes().Select(SafeNode));}catch{return new XElement("span",Plain(html)).ToString(SaveOptions.DisableFormatting);}}
  private static string SafeNode(XNode node){var text=node as XText;if(text!=null)return WebUtility.HtmlEncode(text.Value);var e=node as XElement;if(e==null)return "";string tag=e.Name.LocalName.ToLowerInvariant();if(!new[]{"div","span","i","em","b","strong","sup","sub","br"}.Contains(tag))return string.Concat(e.Nodes().Select(SafeNode));string cls=e.Attribute("class")==null?"":e.Attribute("class").Value;string attribute=cls.Length>0&&Regex.IsMatch(cls,@"^csl-[a-z -]+$")?" class=\""+cls+"\"":"";return "<"+tag+attribute+">"+string.Concat(e.Nodes().Select(SafeNode))+"</"+tag+">";}
  public static List<Segment> Inline(string html){XElement root;try{root=XElement.Parse("<root>"+(html??"").Replace("&nbsp;","&#160;")+"</root>",LoadOptions.PreserveWhitespace);}catch{return new List<Segment>{new Segment{text=Plain(html)}};}var segments=new List<Segment>();foreach(var node in root.Nodes())foreach(var run in Runs(node)){var props=run.Element(w+"rPr");segments.Add(new Segment{text=run.Element(w+"t")!=null?run.Element(w+"t").Value:run.Element(w+"tab")!=null?"\t":"\n",bold=props!=null&&props.Element(w+"b")!=null,italic=props!=null&&props.Element(w+"i")!=null,vertical=props!=null&&props.Element(w+"vertAlign")!=null?(string)props.Element(w+"vertAlign").Attribute(w+"val"):null});}return segments;}
  static IEnumerable<XElement> Runs(XNode node,bool italic=false,bool bold=false,string vertical=null){
   var text=node as XText;if(text!=null){if(text.Value.Length==0)yield break;var r=new XElement(w+"r");var properties=new XElement(w+"rPr");if(italic)properties.Add(new XElement(w+"i"));if(bold)properties.Add(new XElement(w+"b"));if(vertical!=null)properties.Add(new XElement(w+"vertAlign",new XAttribute(w+"val",vertical)));if(properties.HasElements)r.Add(properties);r.Add(new XElement(w+"t",new XAttribute(XNamespace.Xml+"space","preserve"),text.Value));yield return r;yield break;}
   var element=node as XElement;if(element==null)yield break;string tag=element.Name.LocalName.ToLowerInvariant();if(tag=="br"){yield return new XElement(w+"r",new XElement(w+"br"));yield break;}
   bool i=italic||tag=="i"||tag=="em",b=bold||tag=="b"||tag=="strong";string v=tag=="sup"?"superscript":tag=="sub"?"subscript":vertical;
   foreach(var child in element.Nodes())foreach(var run in Runs(child,i,b,v))yield return run;
   var cls=element.Attribute("class");if(cls!=null&&cls.Value.Contains("csl-left-margin"))yield return new XElement(w+"r",new XElement(w+"tab"));
  }
  public static string Ooxml(string html,bool bibliography,string heading=null){
   XElement root;try{root=XElement.Parse("<root>"+(html??"").Replace("&nbsp;","&#160;")+"</root>",LoadOptions.PreserveWhitespace);}catch{root=new XElement("root",Plain(html));}
   var body=new XElement(w+"body");if(!string.IsNullOrEmpty(heading))body.Add(new XElement(w+"p",new XElement(w+"pPr",new XElement(w+"pStyle",new XAttribute(w+"val","Heading1"))),new XElement(w+"r",new XElement(w+"t",heading))));
   var entries=bibliography?root.Descendants().Where(e=>e.Attribute("class")!=null&&e.Attribute("class").Value.Split(' ').Contains("csl-entry")).ToList():new List<XElement>();
   if(!entries.Any())entries.Add(root);
   foreach(var entry in entries){var p=new XElement(w+"p");if(bibliography)p.Add(new XElement(w+"pPr",new XElement(w+"ind",new XAttribute(w+"left","360"),new XAttribute(w+"hanging","360")),new XElement(w+"spacing",new XAttribute(w+"after","120")),new XElement(w+"tabs",new XElement(w+"tab",new XAttribute(w+"val","left"),new XAttribute(w+"pos","360")))));foreach(var node in entry.Nodes())p.Add(Runs(node));body.Add(p);}
   return Package(body);
  }
  private static string Package(XElement body){var document=new XElement(w+"document",new XAttribute(XNamespace.Xmlns+"w",w),body);
   XNamespace rel="http://schemas.openxmlformats.org/package/2006/relationships";
   return new XElement(pkg+"package",new XAttribute(XNamespace.Xmlns+"pkg",pkg),new XElement(pkg+"part",new XAttribute(pkg+"name","/_rels/.rels"),new XAttribute(pkg+"contentType","application/vnd.openxmlformats-package.relationships+xml"),new XElement(pkg+"xmlData",new XElement(rel+"Relationships",new XElement(rel+"Relationship",new XAttribute("Id","rId1"),new XAttribute("Type","http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"),new XAttribute("Target","word/document.xml"))))),new XElement(pkg+"part",new XAttribute(pkg+"name","/word/document.xml"),new XAttribute(pkg+"contentType","application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"),new XElement(pkg+"xmlData",document))).ToString(SaveOptions.DisableFormatting);
  }
 }
}
