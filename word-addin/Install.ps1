$ErrorActionPreference = 'Stop'
$dll = Join-Path $PSScriptRoot 'bin\Citograph.Word.dll'
if (-not (Test-Path -LiteralPath $dll)) { & (Join-Path $PSScriptRoot 'Build.ps1') }
$assembly = [Reflection.AssemblyName]::GetAssemblyName($dll)
$installFolder = Join-Path $env:LOCALAPPDATA ('Citograph\Word\' + [Diagnostics.FileVersionInfo]::GetVersionInfo($dll).FileVersion)
New-Item -ItemType Directory -Path $installFolder -Force | Out-Null
$installedDll = Join-Path $installFolder 'Citograph.Word.dll'
Copy-Item -LiteralPath $dll -Destination $installedDll -Force
[IO.File]::WriteAllText((Join-Path $installFolder 'Citograph-root.txt'),(Split-Path -Parent $PSScriptRoot),[Text.UTF8Encoding]::new($false))
$guid = '{B2C1FAE2-9F7B-4DB6-AAC2-AB6465C872F9}'
$progId = 'Citograph.WordAddin'
$codeBase = ([Uri](Resolve-Path -LiteralPath $installedDll).Path).AbsoluteUri
# Only Citograph's own per-user COM and Word registration keys are written.
$views = @([Microsoft.Win32.RegistryView]::Registry32)
if ([Environment]::Is64BitOperatingSystem) { $views += [Microsoft.Win32.RegistryView]::Registry64 }
foreach ($view in $views) {
  $user = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$view)
  try {
    $class = $user.CreateSubKey('Software\Classes\CLSID\' + $guid)
    $class.SetValue('', 'Citograph for Microsoft Word')
    $category = $class.CreateSubKey('Implemented Categories\{62C8FE65-4EBB-45E7-B440-6E39B2CDBF29}'); $category.Dispose()
    $prog = $class.CreateSubKey('ProgId'); $prog.SetValue('', $progId); $prog.Dispose()
    $server = $class.CreateSubKey('InprocServer32')
    $server.SetValue('', 'mscoree.dll'); $server.SetValue('ThreadingModel','Both')
    $server.SetValue('Class','Citograph.Word.Addin'); $server.SetValue('Assembly',$assembly.FullName)
    $server.SetValue('RuntimeVersion','v4.0.30319'); $server.SetValue('CodeBase',$codeBase)
    foreach ($oldVersion in $server.GetSubKeyNames()) { if ($oldVersion -match '^\d+\.\d+\.\d+\.\d+$' -and $oldVersion -ne $assembly.Version.ToString()) { $server.DeleteSubKeyTree($oldVersion) } }
    $version = $server.CreateSubKey($assembly.Version.ToString())
    $version.SetValue('Class','Citograph.Word.Addin'); $version.SetValue('Assembly',$assembly.FullName)
    $version.SetValue('RuntimeVersion','v4.0.30319'); $version.SetValue('CodeBase',$codeBase)
    $version.Dispose(); $server.Dispose(); $class.Dispose()
    $prog = $user.CreateSubKey('Software\Classes\' + $progId); $prog.SetValue('', 'Citograph for Microsoft Word')
    $link = $prog.CreateSubKey('CLSID'); $link.SetValue('', $guid); $link.Dispose(); $prog.Dispose()
    $addin = $user.CreateSubKey('Software\Microsoft\Office\Word\Addins\' + $progId)
    $addin.SetValue('FriendlyName','Citograph'); $addin.SetValue('Description','Citations, bibliographies and traveling libraries for Microsoft Word')
    $addin.SetValue('LoadBehavior',3,[Microsoft.Win32.RegistryValueKind]::DWord)
    $addin.SetValue('CommandLineSafe',0,[Microsoft.Win32.RegistryValueKind]::DWord)
    $addin.Dispose()
  } finally { $user.Dispose() }
}
Write-Host 'Citograph for Word is installed for this Windows user. Open Word again to see the Citograph ribbon.'
