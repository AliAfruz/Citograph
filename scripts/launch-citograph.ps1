param([switch]$PrintPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot 'release'
$candidates = @()
if (Test-Path -LiteralPath $releaseRoot -PathType Container) {
  $candidates += Join-Path $releaseRoot 'win-unpacked\Citograph.exe'
  $candidates += @(Get-ChildItem -LiteralPath $releaseRoot -Directory -Filter 'v*' | ForEach-Object {
    Join-Path $_.FullName 'win-unpacked\Citograph.exe'
  })
}
$builds = @($candidates | ForEach-Object {
  if (Test-Path -LiteralPath $_ -PathType Leaf) {
    $version = $null
    if ([Version]::TryParse([Diagnostics.FileVersionInfo]::GetVersionInfo($_).ProductVersion, [ref]$version)) {
      [pscustomobject]@{ Path = $_; Version = $version; Stable = ($_ -eq (Join-Path $releaseRoot 'win-unpacked\Citograph.exe')) }
    }
  }
})
$latest = $builds | Sort-Object -Property @{Expression='Version';Descending=$true},@{Expression='Stable';Descending=$true} | Select-Object -First 1
if (-not $latest) {
  if ($PrintPath) { throw 'No packaged Citograph build was found.' }
  exit 2
}
if ($PrintPath) { Write-Output $latest.Path; exit 0 }
Start-Process -FilePath $latest.Path -WorkingDirectory (Split-Path -Parent $latest.Path)
