Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2

    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    return $path
}

function New-Canvas {
    param(
        [int]$Size,
        [bool]$Transparent = $false
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($Transparent) {
        $graphics.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    } else {
        $graphics.Clear([System.Drawing.Color]::FromArgb(255, 11, 19, 32))
    }

    return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Resize-Image {
    param(
        [System.Drawing.Bitmap]$Source,
        [int]$Size
    )

    $canvas = New-Canvas -Size $Size -Transparent $true
    $graphics = $canvas.Graphics
    $bitmap = $canvas.Bitmap
    $graphics.DrawImage($Source, 0, 0, $Size, $Size)
    $graphics.Dispose()

    return $bitmap
}

function Save-Png {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Draw-Finance-Mark {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$Size,
        [bool]$TransparentBackground = $false
    )

    $navy = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $navySoft = [System.Drawing.Color]::FromArgb(255, 30, 41, 59)
    $red = [System.Drawing.Color]::FromArgb(255, 239, 35, 60)
    $redDeep = [System.Drawing.Color]::FromArgb(255, 190, 24, 39)
    $gold = [System.Drawing.Color]::FromArgb(255, 245, 176, 65)
    $goldSoft = [System.Drawing.Color]::FromArgb(255, 253, 224, 148)
    $white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    $whiteSoft = [System.Drawing.Color]::FromArgb(255, 246, 248, 252)
    $slate = [System.Drawing.Color]::FromArgb(255, 226, 232, 240)
    $shadow = [System.Drawing.Color]::FromArgb(52, 3, 7, 18)
    $strokePen = New-Object System.Drawing.Pen($navy, ($Size * 0.028))
    $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $strokePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $strokePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    if (-not $TransparentBackground) {
        $path = New-RoundedRectPath -X 36 -Y 36 -Width ($Size - 72) -Height ($Size - 72) -Radius 220
        $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            ([System.Drawing.PointF]::new(0, 0)),
            ([System.Drawing.PointF]::new($Size, $Size)),
            $red,
            $redDeep
        )
        $Graphics.FillPath($backgroundBrush, $path)
        $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
        $Graphics.FillEllipse($glowBrush, $Size * 0.10, $Size * 0.10, $Size * 0.30, $Size * 0.18)
        $Graphics.FillEllipse($glowBrush, $Size * 0.55, $Size * 0.18, $Size * 0.24, $Size * 0.20)
        $backgroundBrush.Dispose()
        $glowBrush.Dispose()
        $path.Dispose()
    }

    $walletWidth = $Size * 0.56
    $walletHeight = $Size * 0.44
    $walletX = ($Size - $walletWidth) / 2
    $walletY = $Size * 0.34
    $walletRadius = $Size * 0.07

    if (-not $TransparentBackground) {
        $walletShadowPath = New-RoundedRectPath -X ($walletX + 16) -Y ($walletY + 20) -Width $walletWidth -Height $walletHeight -Radius $walletRadius
        $walletShadowBrush = New-Object System.Drawing.SolidBrush($shadow)
        $Graphics.FillPath($walletShadowBrush, $walletShadowPath)
        $walletShadowBrush.Dispose()
        $walletShadowPath.Dispose()
    }

    $billWidth = $walletWidth * 0.72
    $billHeight = $walletHeight * 0.24
    $billX = $walletX + ($walletWidth * 0.12)
    $billY = $walletY - ($billHeight * 0.52)
    $billRadius = $Size * 0.03

    $billPathBack = New-RoundedRectPath -X ($billX + ($Size * 0.035)) -Y ($billY - ($Size * 0.02)) -Width $billWidth -Height $billHeight -Radius $billRadius
    $billBrushBack = New-Object System.Drawing.SolidBrush($white)
    $billMatrixBack = New-Object System.Drawing.Drawing2D.Matrix
    $billMatrixBack.RotateAt(-10, [System.Drawing.PointF]::new($billX + $billWidth, $billY + ($billHeight / 2)))
    $billPathBack.Transform($billMatrixBack)
    $Graphics.FillPath($billBrushBack, $billPathBack)
    $Graphics.DrawPath($strokePen, $billPathBack)

    $billPathFront = New-RoundedRectPath -X $billX -Y $billY -Width $billWidth -Height $billHeight -Radius $billRadius
    $billBrushFront = New-Object System.Drawing.SolidBrush($whiteSoft)
    $Graphics.FillPath($billBrushFront, $billPathFront)
    $Graphics.DrawPath($strokePen, $billPathFront)

    $walletBodyPath = New-RoundedRectPath -X $walletX -Y $walletY -Width $walletWidth -Height $walletHeight -Radius $walletRadius
    $walletBodyBrush = New-Object System.Drawing.SolidBrush($whiteSoft)
    $Graphics.FillPath($walletBodyBrush, $walletBodyPath)

    $panelWidth = $walletWidth * 0.50
    $panelPath = New-RoundedRectPath -X $walletX -Y $walletY -Width $panelWidth -Height $walletHeight -Radius $walletRadius
    $panelBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        ([System.Drawing.PointF]::new($walletX, $walletY)),
        ([System.Drawing.PointF]::new($walletX + $panelWidth, $walletY + $walletHeight)),
        $red,
        $redDeep
    )
    $Graphics.FillPath($panelBrush, $panelPath)

    $seamPen = New-Object System.Drawing.Pen($navy, ($Size * 0.018))
    $seamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $seamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $seamX = $walletX + $panelWidth
    $Graphics.DrawLine($seamPen, $seamX, $walletY + ($walletHeight * 0.10), $seamX, $walletY + ($walletHeight * 0.90))

    $stitchPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(170, 15, 23, 42), ($Size * 0.011))
    $stitchPen.DashPattern = @(1.6, 2.2)
    $stitchInset = $walletWidth * 0.11
    $Graphics.DrawLine($stitchPen, $walletX + $stitchInset, $walletY + ($walletHeight * 0.15), $walletX + $walletWidth - ($stitchInset * 0.65), $walletY + ($walletHeight * 0.15))
    $Graphics.DrawLine($stitchPen, $walletX + $stitchInset, $walletY + ($walletHeight * 0.84), $walletX + $walletWidth - ($stitchInset * 0.65), $walletY + ($walletHeight * 0.84))

    $strapWidth = $walletWidth * 0.30
    $strapHeight = $walletHeight * 0.26
    $strapX = $walletX + $walletWidth - ($strapWidth * 0.45)
    $strapY = $walletY + ($walletHeight * 0.39)
    $strapRadius = $strapHeight * 0.55
    $strapPath = New-RoundedRectPath -X $strapX -Y $strapY -Width $strapWidth -Height $strapHeight -Radius $strapRadius
    $strapBrush = New-Object System.Drawing.SolidBrush($white)
    $Graphics.FillPath($strapBrush, $strapPath)
    $Graphics.DrawPath($strokePen, $strapPath)

    $buttonSize = $strapHeight * 0.48
    $buttonX = $strapX + ($strapWidth * 0.36) - ($buttonSize / 2)
    $buttonY = $strapY + (($strapHeight - $buttonSize) / 2)
    $buttonBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        ([System.Drawing.PointF]::new($buttonX, $buttonY)),
        ([System.Drawing.PointF]::new($buttonX + $buttonSize, $buttonY + $buttonSize)),
        $goldSoft,
        $gold
    )
    $Graphics.FillEllipse($buttonBrush, $buttonX, $buttonY, $buttonSize, $buttonSize)
    $Graphics.DrawEllipse($strokePen, $buttonX, $buttonY, $buttonSize, $buttonSize)

    $Graphics.DrawPath($strokePen, $walletBodyPath)

    $billPathBack.Dispose()
    $billBrushBack.Dispose()
    $billMatrixBack.Dispose()
    $billPathFront.Dispose()
    $billBrushFront.Dispose()
    $walletBodyBrush.Dispose()
    $walletBodyPath.Dispose()
    $panelBrush.Dispose()
    $panelPath.Dispose()
    $seamPen.Dispose()
    $stitchPen.Dispose()
    $strapBrush.Dispose()
    $strapPath.Dispose()
    $buttonBrush.Dispose()
    $strokePen.Dispose()
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$fullCanvas = New-Canvas -Size 1024
Draw-Finance-Mark -Graphics $fullCanvas.Graphics -Size 1024 -TransparentBackground $false
$fullCanvas.Graphics.Dispose()
$fullIcon = $fullCanvas.Bitmap

$foregroundCanvas = New-Canvas -Size 1024 -Transparent $true
Draw-Finance-Mark -Graphics $foregroundCanvas.Graphics -Size 1024 -TransparentBackground $true
$foregroundCanvas.Graphics.Dispose()
$foregroundIcon = $foregroundCanvas.Bitmap

$fullTargets = @(
    @{ Path = (Join-Path $root "src\assets\app_logo.png"); Size = 1024 },
    @{ Path = (Join-Path $root "public\favicon.png"); Size = 64 },
    @{ Path = (Join-Path $root "public\logo192.png"); Size = 192 },
    @{ Path = (Join-Path $root "public\logo512.png"); Size = 512 },
    @{ Path = (Join-Path $root "public\icon-maskable-512.png"); Size = 512 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-mdpi\ic_launcher.png"); Size = 48 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-hdpi\ic_launcher.png"); Size = 72 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"); Size = 96 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"); Size = 144 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"); Size = 192 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"); Size = 48 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"); Size = 72 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"); Size = 96 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"); Size = 144 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"); Size = 192 }
)

$foregroundTargets = @(
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.png"); Size = 108 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.png"); Size = 162 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.png"); Size = 216 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.png"); Size = 324 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"); Size = 432 }
)

foreach ($target in $fullTargets) {
    $resized = Resize-Image -Source $fullIcon -Size $target.Size
    Save-Png -Bitmap $resized -Path $target.Path
    $resized.Dispose()
}

foreach ($target in $foregroundTargets) {
    $resized = Resize-Image -Source $foregroundIcon -Size $target.Size
    Save-Png -Bitmap $resized -Path $target.Path
    $resized.Dispose()
}

$fullIcon.Dispose()
$foregroundIcon.Dispose()

Write-Output "App icons generated successfully."
