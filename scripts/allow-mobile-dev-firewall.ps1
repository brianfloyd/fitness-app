# Run this script as Administrator once to allow mobile devices to reach the Vite dev server on port 5173.
# Right-click PowerShell -> Run as Administrator, then: .\scripts\allow-mobile-dev-firewall.ps1

$ruleName = "Vite Dev 5173"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Rule '$ruleName' already exists. No change." -ForegroundColor Yellow
  exit 0
}

New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Private
Write-Host "Added firewall rule: $ruleName (port 5173, Private profile). Mobile can now reach the dev server on the same WiFi." -ForegroundColor Green
