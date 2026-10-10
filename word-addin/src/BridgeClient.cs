using System;using System.IO;using System.Net;using System.Text;using System.Diagnostics;using System.Threading;using System.Reflection;
namespace Citograph.Word {
 internal class TimedClient:WebClient {protected override WebRequest GetWebRequest(Uri address){var req=base.GetWebRequest(address);req.Timeout=45000;return req;}}
 internal class BridgeClient {
  public string descriptorOverride;
  private static string Root(){string directory=Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);string config=Path.Combine(directory,"Citograph-root.txt");return File.Exists(config)?Path.GetFullPath(File.ReadAllText(config).Trim()):Path.GetFullPath(Path.Combine(directory,"..",".."));}
  private static string Executable(){
   string root=Root(),release=Path.Combine(root,"release"),fallback=Path.Combine(release,"win-unpacked","Citograph.exe");
   var candidates=new System.Collections.Generic.List<string>{Path.Combine(root,"Citograph.exe"),fallback};
   if(Directory.Exists(release))foreach(string directory in Directory.GetDirectories(release,"v*"))candidates.Add(Path.Combine(directory,"win-unpacked","Citograph.exe"));
   string selected=fallback;Version newest=new Version(0,0);
   foreach(string file in candidates){if(!File.Exists(file))continue;Version version;if(Version.TryParse(FileVersionInfo.GetVersionInfo(file).ProductVersion,out version)&&version>newest){newest=version;selected=file;}}
   return selected;
  }
  public string DescriptorPath {get {return descriptorOverride??Environment.GetEnvironmentVariable("CITOGRAPH_BRIDGE_FILE")??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"Citograph","word-bridge.json");}}
  private BridgeDescriptor Descriptor(){if(!File.Exists(DescriptorPath))throw new IOException("Citograph is not running.");var d=Data.Parse<BridgeDescriptor>(File.ReadAllText(DescriptorPath));if(d.protocol!=1||d.port<1||d.port>65535||string.IsNullOrEmpty(d.token)||d.token.Length!=64)throw new IOException("Invalid Citograph bridge descriptor.");return d;}
  private string Request(string endpoint,object body){var d=Descriptor();using(var client=new TimedClient()){client.Encoding=Encoding.UTF8;client.Headers[HttpRequestHeader.Authorization]="Bearer "+d.token;client.Headers[HttpRequestHeader.ContentType]="application/json";try{return body==null?client.DownloadString("http://127.0.0.1:"+d.port+endpoint):client.UploadString("http://127.0.0.1:"+d.port+endpoint,"POST",Data.Serialize(body));}catch(WebException e){if(e.Response!=null){using(var reader=new StreamReader(e.Response.GetResponseStream())){string detail=reader.ReadToEnd();try{var error=Data.Parse<System.Collections.Generic.Dictionary<string,object>>(detail);throw new InvalidOperationException(Data.Text(error,"error"));}catch(ArgumentException){}}}throw new InvalidOperationException("Citograph could not be reached. Open or restart Citograph 1.4 and retry.",e);}}}
  public void EnsureReady(){try{var health=Data.Parse<System.Collections.Generic.Dictionary<string,object>>(Request("/health",null));if(Convert.ToBoolean(health["ready"]))return;}catch{}string root=Root();string executable=Executable();if(!File.Exists(executable))throw new IOException("Open Citograph 1.4 before using Word citation tools. The desktop app could not be located.");Process.Start(new ProcessStartInfo(executable,"--word-bridge"){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=root,WindowStyle=ProcessWindowStyle.Hidden});for(int i=0;i<50;i++){Thread.Sleep(200);try{var health=Data.Parse<System.Collections.Generic.Dictionary<string,object>>(Request("/health",null));if(Convert.ToBoolean(health["ready"]))return;}catch{}}throw new IOException("Citograph is not ready. Close an older Citograph version, open version 1.4, and retry.");}
  public LibraryResponse Library(){EnsureReady();return Data.Parse<LibraryResponse>(Request("/library",null));}
  public FormatResponse Format(FormatRequest request){EnsureReady();return Data.Parse<FormatResponse>(Request("/format",request));}
  public ImportResponse Import(System.Collections.Generic.List<System.Collections.Generic.Dictionary<string,object>> refs){EnsureReady();return Data.Parse<ImportResponse>(Request("/import",new {references=refs}));}
  public void OpenStyleStudio(){Process.Start(new ProcessStartInfo(Executable(),"--style-studio"){UseShellExecute=true});} public void OpenDesktop(){string root=Root();string executable=Executable();if(!File.Exists(executable))throw new IOException("Citograph.exe was not found in the project release folder.");Process.Start(new ProcessStartInfo(executable){UseShellExecute=true});}
 }
}
