param([string]$OnlyForRoot)
$ErrorActionPreference = 'Stop'
if ($OnlyForRoot) {
  $config = Join-Path $env:LOCALAPPDATA 'Citograph\Word\1.1.0.0\Citograph-root.txt'
  if (-not (Test-Path -LiteralPath $config) -or [IO.Path]::GetFullPath([IO.File]::ReadAllText($config).Trim()) -ne [IO.Path]::GetFullPath($OnlyForRoot)) {
    Write-Host 'Word registration belongs to another Citograph installation; it is preserved.'
    exit 0
  }
}
$views = @([Microsoft.Win32.RegistryView]::Registry32)
if ([Environment]::Is64BitOperatingSystem) { $views += [Microsoft.Win32.RegistryView]::Registry64 }
foreach ($view in $views) {
  $user = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$view)
  try {
    foreach ($key in @('Software\Microsoft\Office\Word\Addins\Citograph.WordAddin','Software\Classes\Citograph.WordAddin','Software\Classes\CLSID\{B2C1FAE2-9F7B-4DB6-AAC2-AB6465C872F9}')) {
      $user.DeleteSubKeyTree($key,$false)
    }
  } finally { $user.Dispose() }
}
Write-Host 'Citograph Word add-in registration removed. Your documents and Citograph library are preserved.'
