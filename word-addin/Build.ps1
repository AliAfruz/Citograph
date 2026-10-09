$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Install the Windows .NET Framework 4.8 runtime first.' }
New-Item -ItemType Directory -Path (Join-Path $root 'bin') -Force | Out-Null
$argsList = @('/nologo','/target:library','/platform:anycpu','/optimize+','/utf8output',('/out:' + (Join-Path $root 'bin\Citograph.Word.dll')),
  '/r:System.dll','/r:System.Core.dll','/r:Microsoft.CSharp.dll','/r:System.Web.Extensions.dll','/r:System.Windows.Forms.dll','/r:System.Drawing.dll','/r:System.Xml.Linq.dll',
  ('/resource:' + (Join-Path $root 'ribbon.xml') + ',Citograph.Ribbon.xml'),
  ('/resource:' + (Join-Path $root '..\build\icon.ico') + ',Citograph.Icon.ico'))
Get-ChildItem -LiteralPath (Join-Path $root 'icons') -Filter '*.png' | ForEach-Object { $argsList += '/resource:' + $_.FullName + ',Citograph.Icons.' + $_.Name }
Get-ChildItem -LiteralPath (Join-Path $root 'src') -Filter '*.cs' | ForEach-Object { $argsList += $_.FullName }
& $compiler @argsList
if ($LASTEXITCODE -ne 0) { throw 'Word add-in compilation failed.' }
Write-Host 'Built Citograph.Word.dll'
$hostArgs=@('/nologo','/target:exe','/platform:anycpu','/optimize+','/utf8output',('/out:'+(Join-Path $root 'bin\Citograph.StyleHost.exe')),('/r:'+(Join-Path $root 'bin\Citograph.Word.dll')),'/r:System.dll','/r:System.Core.dll','/r:Microsoft.CSharp.dll',(Join-Path $root 'StyleHost.cs'))
& $compiler @hostArgs
if($LASTEXITCODE -ne 0){throw 'Word style host compilation failed.'}
