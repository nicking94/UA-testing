# Script para iniciar la aplicación Universal App
Write-Host "=== INICIANDO UNIVERSAL APP ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que PostgreSQL esté corriendo
Write-Host "Verificando PostgreSQL..." -ForegroundColor Yellow
$pgProcess = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
if (-not $pgProcess) {
    Write-Host "⚠️  PostgreSQL no parece estar corriendo. Asegúrate de iniciarlo." -ForegroundColor Yellow
}

# Generar cliente de Prisma
Write-Host "`nGenerando cliente de Prisma..." -ForegroundColor Yellow
Set-Location "apps\backend"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Error generando cliente de Prisma" -ForegroundColor Red
    exit 1
}

# Sincronizar base de datos
Write-Host "`nSincronizando base de datos..." -ForegroundColor Yellow
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Error sincronizando base de datos" -ForegroundColor Red
    Write-Host "Verifica que PostgreSQL esté corriendo y que DATABASE_URL esté configurado en .env" -ForegroundColor Yellow
    exit 1
}

# Iniciar backend
Write-Host "`nIniciando backend en http://localhost:3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; npm run start:dev"

# Esperar un poco antes de iniciar el frontend
Start-Sleep -Seconds 3

# Iniciar frontend
Set-Location "..\frontend"
Write-Host "Iniciando frontend en http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; npm run dev"

# Volver al directorio raíz
Set-Location "..\.."

Write-Host "`n✓ Aplicación iniciada!" -ForegroundColor Green
Write-Host "`nBackend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nLos servicios se ejecutan en ventanas separadas de PowerShell." -ForegroundColor White
Write-Host "Presiona Ctrl+C en cada ventana para detener los servicios." -ForegroundColor White
