param(
    [string]$Version = "1.0.0",
    [string]$ReleaseDate = (Get-Date -Format "yyyyMMdd")
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ZipName = "PixInsight-Utilities-v$Version.zip"
$ZipPath = Join-Path $Root $ZipName
$Source = Join-Path $Root "src"

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path $Source -DestinationPath $ZipPath -CompressionLevel Optimal
$Sha1 = (Get-FileHash -Path $ZipPath -Algorithm SHA1).Hash.ToLower()

$Xri = @"
<?xml version="1.0" encoding="UTF-8"?>
<xri version="1.0">
  <description>
    <p>Mike's EZ Scripts - Quality-of-life utility scripts for PixInsight.</p>
  </description>
  <platform os="all" arch="noarch" version="1.9.4:1.9.99">
    <package fileName="$ZipName" sha1="$Sha1" type="script" releaseDate="$ReleaseDate">
      <title>Mike's EZ Scripts - PixInsight Utilities v$Version</title>
      <description>
        <p>Quality-of-life utilities for PixInsight 1.9.4 and later.</p>
        <p>Includes BatchHDR, CreateHDRImage, QuickMagentaCorrect, ResizeWindow, SaveAs10Mb, SaveAs20Mb, SyncImages, and ViewIntegration.</p>
        <p>The HDR utilities are based on CreateHDR by Jürgen Terpe.</p>
      </description>
    </package>
  </platform>
</xri>
"@

Set-Content -Path (Join-Path $Root "updates.xri") -Value $Xri -Encoding UTF8
Write-Host "Built $ZipName"
Write-Host "SHA1: $Sha1"
Write-Host "Updated updates.xri"
