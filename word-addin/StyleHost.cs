using System;using System.Runtime.InteropServices;using System.Dynamic;using System.Text;using Citograph.Word;
class StyleHost {
 delegate bool WindowCallback(IntPtr window,IntPtr data);
 [DllImport("user32.dll")]static extern bool EnumChildWindows(IntPtr parent,WindowCallback callback,IntPtr data);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern int GetClassName(IntPtr window,StringBuilder name,int count);
 [DllImport("oleacc.dll")]static extern int AccessibleObjectFromWindow(IntPtr window,uint id,ref Guid iid,[MarshalAs(UnmanagedType.Interface)]out object result);
 static object ApplicationAt(string handle){long number;if(!long.TryParse(handle,out number)||number<=0)throw new Exception("Invalid Word window.");object found=null;WindowCallback callback=(window,data)=>{var name=new StringBuilder(100);GetClassName(window,name,100);if(name.ToString()!="_WwG")return true;Guid iid=new Guid("00020400-0000-0000-C000-000000000046");object native;if(AccessibleObjectFromWindow(window,0xFFFFFFF0,ref iid,out native)==0){try{dynamic view=native;found=view.Application;return false;}catch{}}return true;};callback(new IntPtr(number),IntPtr.Zero);if(found==null)EnumChildWindows(new IntPtr(number),callback,IntPtr.Zero);if(found==null)throw new Exception("The inspected Word window is no longer available. Inspect Word again.");return found;}
 [STAThread] static int Main(string[] args){try{
  if(args.Length<1)throw new Exception("Expected inspect or apply command.");
  string handle=args[0]=="inspect"&&args.Length>=3?args[2]:args[0]=="apply"&&args.Length>=5?args[4]:null;
  object app;if(handle!=null)app=ApplicationAt(handle);else try{app=Marshal.GetActiveObject("Word.Application");}catch{throw new Exception("Open a Word document containing Citograph citations first.");}
  var engine=new Addin();dynamic host=new ExpandoObject();host.Object=null;Array custom=new object[0];engine.OnConnection(app,1,host,ref custom);
  if(args.Length>1)engine.UseBridgeDescriptor(args[1]);
  if(args[0]=="inspect")Console.WriteLine(engine.GetStyleTarget());
  else if(args[0]=="apply"&&args.Length>=4)Console.WriteLine(engine.ApplyStyleToTarget(args[2],args[3]));
  else throw new Exception("Invalid Word style command.");
  return 0;
 }catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}}
}
