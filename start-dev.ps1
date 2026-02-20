Write-Host "Starting Fitness App Development Servers..." -ForegroundColor Green
Write-Host ""

# Show local IP(s) for mobile access (same WiFi required)
$localIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -match '^192\.168\.|^10\.' } | Select-Object -ExpandProperty IPAddress
if ($localIPs) {
  Write-Host "Mobile access (use one of these on your phone, same WiFi):" -ForegroundColor Yellow
  foreach ($ip in $localIPs) {
    Write-Host "  https://${ip}:5173" -ForegroundColor Cyan
  }
  Write-Host "  (Accept certificate warning: Advanced -> Proceed)" -ForegroundColor Gray
  Write-Host "  If 'site can''t be reached': allow port 5173 in Windows Firewall (see docs/MOBILE-DEV.md)" -ForegroundColor Gray
  Write-Host ""
}

Write-Host "Starting Backend Server (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Both servers are starting in separate windows..." -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
