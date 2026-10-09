param([string]$LibraryFile,[string]$Output)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms,System.Drawing,System.Web.Extensions
[Windows.Forms.Application]::EnableVisualStyles()
$assembly=[Reflection.Assembly]::LoadFrom((Join-Path $PSScriptRoot '..\word-addin\bin\Citograph.Word.dll'))
$serializer=New-Object Web.Script.Serialization.JavaScriptSerializer
$library=$serializer.Deserialize([IO.File]::ReadAllText($LibraryFile),$assembly.GetType('Citograph.Word.LibraryResponse'))
$travel=[Activator]::CreateInstance($assembly.GetType('Citograph.Word.LibraryResponse')).references
$travel.Add($library.references[0]);$travel.Add($library.references[1])
$constructor=$assembly.GetType('Citograph.Word.ReferencePicker').GetConstructors()[0]
$picker=$constructor.Invoke(@($library,$travel,'Find your next citation',$null))
try {
 $picker.ShowInTaskbar=$false;$picker.Opacity=0;$picker.Show();[Windows.Forms.Application]::DoEvents()
 $bitmap=New-Object Drawing.Bitmap($picker.Width,$picker.Height)
 $picker.DrawToBitmap($bitmap,(New-Object Drawing.Rectangle(0,0,$picker.Width,$picker.Height)))
 $bitmap.Save($Output,[Drawing.Imaging.ImageFormat]::Png);$bitmap.Dispose()
 Write-Host 'Rendered actual native Word reference picker'
} finally {$picker.Close();$picker.Dispose()}
