Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$buildDir = Join-Path $root "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="48" y1="32" x2="208" y2="224" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563eb"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="216" height="216" rx="52" fill="url(#bg)"/>
  <path d="M74 58h80l36 36v104H74z" fill="#fff" opacity=".96"/>
  <path d="M154 58v36h36z" fill="#dbeafe"/>
  <path d="M97 113h70M97 137h70M97 161h46" stroke="#2563eb" stroke-width="10" stroke-linecap="round"/>
  <path d="M150 179l8-35 49-49a14 14 0 0 1 20 20l-49 49z" fill="#f59e0b"/>
  <path d="M198 104l20 20" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
  <path d="M150 179l28-15-20-20z" fill="#1e293b"/>
</svg>
'@
Set-Content -Path (Join-Path $buildDir "icon.svg") -Value $svg -Encoding UTF8

function New-IconBitmap {
  param([int]$Size)

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $scale = $Size / 256.0
  $graphics.ScaleTransform($scale, $scale)

  $rect = New-Object System.Drawing.RectangleF 20, 20, 216, 216
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $radius = 52
  $diameter = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(37, 99, 235)), ([System.Drawing.Color]::FromArgb(14, 165, 233)), 45
  $graphics.FillPath($bgBrush, $path)

  $paper = New-Object System.Drawing.Drawing2D.GraphicsPath
  $paper.AddPolygon(@(
    (New-Object System.Drawing.PointF 74, 58),
    (New-Object System.Drawing.PointF 154, 58),
    (New-Object System.Drawing.PointF 190, 94),
    (New-Object System.Drawing.PointF 190, 198),
    (New-Object System.Drawing.PointF 74, 198)
  ))
  $graphics.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 255, 255, 255))), $paper)

  $fold = New-Object System.Drawing.Drawing2D.GraphicsPath
  $fold.AddPolygon(@(
    (New-Object System.Drawing.PointF 154, 58),
    (New-Object System.Drawing.PointF 154, 94),
    (New-Object System.Drawing.PointF 190, 94)
  ))
  $graphics.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(219, 234, 254))), $fold)

  $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(37, 99, 235)), 10
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePen, 97, 113, 167, 113)
  $graphics.DrawLine($linePen, 97, 137, 167, 137)
  $graphics.DrawLine($linePen, 97, 161, 143, 161)

  $penBody = New-Object System.Drawing.Drawing2D.GraphicsPath
  $penBody.AddPolygon(@(
    (New-Object System.Drawing.PointF 150, 179),
    (New-Object System.Drawing.PointF 158, 144),
    (New-Object System.Drawing.PointF 207, 95),
    (New-Object System.Drawing.PointF 227, 115),
    (New-Object System.Drawing.PointF 178, 164)
  ))
  $graphics.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 158, 11))), $penBody)

  $shinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 8
  $shinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($shinePen, 198, 104, 218, 124)

  $tip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tip.AddPolygon(@(
    (New-Object System.Drawing.PointF 150, 179),
    (New-Object System.Drawing.PointF 178, 164),
    (New-Object System.Drawing.PointF 158, 144)
  ))
  $graphics.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30, 41, 59))), $tip)

  $graphics.Dispose()
  return $bitmap
}

function Save-PngBytes {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngFrames = @()

foreach ($size in $sizes) {
  $bitmap = New-IconBitmap -Size $size
  $framePath = Join-Path $buildDir "icon-$size.png"
  Save-PngBytes -Bitmap $bitmap -Path $framePath
  $pngFrames += [PSCustomObject]@{
    Size = $size
    Bytes = [System.IO.File]::ReadAllBytes($framePath)
  }
  $bitmap.Dispose()
}

Copy-Item -Force -Path (Join-Path $buildDir "icon-256.png") -Destination (Join-Path $buildDir "icon.png")

$icoPath = Join-Path $buildDir "icon.ico"
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $stream

$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$pngFrames.Count)

$offset = 6 + (16 * $pngFrames.Count)
foreach ($frame in $pngFrames) {
  $writer.Write([byte]$(if ($frame.Size -eq 256) { 0 } else { $frame.Size }))
  $writer.Write([byte]$(if ($frame.Size -eq 256) { 0 } else { $frame.Size }))
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$frame.Bytes.Length)
  $writer.Write([UInt32]$offset)
  $offset += $frame.Bytes.Length
}

foreach ($frame in $pngFrames) {
  $writer.Write($frame.Bytes)
}

$writer.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$writer.Dispose()
$stream.Dispose()

Write-Host "Generated build/icon.ico and build/icon.png"
