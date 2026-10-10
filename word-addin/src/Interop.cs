using System;
using System.Runtime.InteropServices;
using System.Reflection;
[assembly: AssemblyTitle("Citograph for Word")]
[assembly: AssemblyDescription("Native citation, bibliography, and traveling library tools")]
// Keep the COM assembly identity stable across compatible minor upgrades.
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.4.1.0")]
[assembly: ComVisible(false)]
namespace Citograph.Word {
 [ComImport,Guid("B65AD801-ABAF-11D0-BB8B-00A0C90F2744"),InterfaceType(ComInterfaceType.InterfaceIsDual)]
 public interface IDTExtensibility2 {
  [DispId(1)] void OnConnection([MarshalAs(UnmanagedType.IDispatch)] object application,int connectMode,[MarshalAs(UnmanagedType.IDispatch)] object addInInst,[MarshalAs(UnmanagedType.SafeArray,SafeArraySubType=VarEnum.VT_VARIANT)] ref Array custom);
  [DispId(2)] void OnDisconnection(int removeMode,[MarshalAs(UnmanagedType.SafeArray,SafeArraySubType=VarEnum.VT_VARIANT)] ref Array custom);
  [DispId(3)] void OnAddInsUpdate([MarshalAs(UnmanagedType.SafeArray,SafeArraySubType=VarEnum.VT_VARIANT)] ref Array custom);
  [DispId(4)] void OnStartupComplete([MarshalAs(UnmanagedType.SafeArray,SafeArraySubType=VarEnum.VT_VARIANT)] ref Array custom);
  [DispId(5)] void OnBeginShutdown([MarshalAs(UnmanagedType.SafeArray,SafeArraySubType=VarEnum.VT_VARIANT)] ref Array custom);
 }
 [ComImport,Guid("000C0396-0000-0000-C000-000000000046"),InterfaceType(ComInterfaceType.InterfaceIsDual)]
 public interface IRibbonExtensibility { [DispId(1)] [return:MarshalAs(UnmanagedType.BStr)] string GetCustomUI([MarshalAs(UnmanagedType.BStr)] string ribbonID); }
 public class WindowOwner:System.Windows.Forms.IWin32Window {public IntPtr Handle{get;private set;}public WindowOwner(IntPtr handle){Handle=handle;}}
 internal class PictureConverter:System.Windows.Forms.AxHost {private PictureConverter():base(""){}public static object Convert(System.Drawing.Image image){return GetIPictureDispFromPicture(image);}}
}
