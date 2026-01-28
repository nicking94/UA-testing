# Build script for production
Write-Host "Starting production build..." -ForegroundColor Cyan

# Stop Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clean Next.js cache
Set-Location "apps\frontend"
if (Test-Path ".next") {
    $tempDir = "$env:TEMP\nextjs-clean-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    robocopy $tempDir ".next" /MIR /R:0 /W:0 /NFL /NDL /NJH /NJS | Out-Null
    Remove-Item -Path $tempDir -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".next" -Force -ErrorAction SilentlyContinue
}

Write-Host "Cache cleaned" -ForegroundColor Green

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
$env:NEXT_TELEMETRY_DISABLED = "1"
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend built successfully" -ForegroundColor Green
    
    # Build backend
    Set-Location "..\backend"
    Write-Host "Building backend..." -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backend built successfully" -ForegroundColor Green
        Write-Host "Production build completed!" -ForegroundColor Green
    } else {
        Write-Host "Backend build failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Frontend build failed" -ForegroundColor Red
    exit 1
}

Set-Location "..\..\"
