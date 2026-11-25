# garagego: start and stop everything the GarageGo demo needs, from one command.
#
#   garagego start   server + public tunnel + website + website tunnel (phone, ESP32, Wokwi)
#   garagego local   server + website only, for a phone on the same Wi-Fi as this PC
#   garagego stop    close every window garagego opened
#   garagego stop --force   also close whatever else holds ports 3000 or 8081
#   garagego urls    show the current tunnel addresses again
#
# Each part runs in its own window titled "GarageGo ...", so you can read its logs.
# The server tunnel's address changes on every start; this script writes it into .env
# (EXPO_PUBLIC_API_URL) before the website starts, so the app always talks to it.

param([string]$Command = "help", [string]$Option = "")

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env"
$LogDir = Join-Path $env:TEMP "garagego"
$ServerLog = Join-Path $LogDir "tunnel-server.log"
$WebLog = Join-Path $LogDir "tunnel-web.log"

function Open-Window([string]$Title, [string]$CommandLine) {
  Start-Process cmd.exe -ArgumentList "/k", "title GarageGo $Title && cd /d `"$Root`" && $CommandLine" | Out-Null
}

function Test-Port([int]$Port) {
  [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

# cloudflared prints the quick tunnel's address once it's up; wait for it in the log file
function Wait-TunnelUrl([string]$Log) {
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Path $Log) {
      $m = Select-String -Path $Log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -Last 1
      if ($m) { return $m.Matches[0].Value }
    }
    Start-Sleep -Milliseconds 500
  }
  return $null
}

function Start-Tunnel([string]$Title, [int]$Port, [string]$Log) {
  if (Test-Path $Log) { Remove-Item $Log -Force }
  Open-Window $Title "cloudflared tunnel --url http://localhost:$Port --logfile `"$Log`""
  Wait-TunnelUrl $Log
}

# Sets (or, with an empty value, comments out) EXPO_PUBLIC_API_URL in .env, keeping every other line
function Set-ApiUrl([string]$Url) {
  $lines = if (Test-Path $EnvFile) { @(Get-Content $EnvFile) } else { @() }
  $lines = @($lines | Where-Object { $_ -notmatch "^\s*#?\s*EXPO_PUBLIC_API_URL=" -and $_ -notmatch "^# Server through the cloudflared tunnel" })
  if ($Url) {
    $lines += "# Server through the cloudflared tunnel (garagego start writes this; it changes every start)"
    $lines += "EXPO_PUBLIC_API_URL=$Url"
  }
  # No byte-order mark: Expo would read it as part of the first variable's name
  [System.IO.File]::WriteAllLines($EnvFile, [string[]]$lines, (New-Object System.Text.UTF8Encoding($false)))
}

function Show-Urls {
  $server = if (Test-Path $ServerLog) { Wait-TunnelUrl $ServerLog } else { $null }
  $web = if (Test-Path $WebLog) { Wait-TunnelUrl $WebLog } else { $null }
  Write-Host ""
  if ($web) { Write-Host "  Phone / any device:  $web" -ForegroundColor Green }
  Write-Host "  This PC:             http://localhost:8081"
  if ($server) {
    Write-Host "  Server (API):        $server"
    Write-Host "  ESP32 / Wokwi:       const char* SERVER_URL = `"$server`";" -ForegroundColor Yellow
  }
  Write-Host ""
}

function Stop-All([bool]$Force) {
  # /T closes each window's children too (node, cloudflared)
  & taskkill.exe /FI "WINDOWTITLE eq GarageGo*" /T /F 2>$null | Out-Null
  Write-Host "Closed the GarageGo windows."
  if (-not $Force) {
    if ((Test-Port 3000) -or (Test-Port 8081)) {
      Write-Host "Something else still holds port 3000 or 8081. 'garagego stop --force' closes it too." -ForegroundColor Yellow
    }
    return
  }
  # --force: whatever else listens on the demo's ports (servers started by hand or by another tool)
  $owners = Get-NetTCPConnection -LocalPort 3000, 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $owners) {
    $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    & taskkill.exe /PID $procId /T /F 2>$null | Out-Null
    Write-Host "Closed $name (PID $procId) on port 3000/8081."
  }
}

function Start-All([bool]$Tunnels) {
  if ((Test-Port 3000) -or (Test-Port 8081)) {
    Write-Host "Port 3000 or 8081 is already in use. Run 'garagego stop' first, or 'garagego stop --force' if that doesn't free it." -ForegroundColor Red
    exit 1
  }
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

  Write-Host "Starting the server..."
  Open-Window "server" "npm run server"

  if ($Tunnels) {
    Write-Host "Opening the server tunnel..."
    $server = Start-Tunnel "server tunnel" 3000 $ServerLog
    if (-not $server) {
      Write-Host "The server tunnel didn't report an address. Check the 'GarageGo server tunnel' window." -ForegroundColor Red
      exit 1
    }
    Set-ApiUrl $server
  } else {
    # Local mode: the app finds the server on this PC by itself
    Set-ApiUrl ""
  }

  Write-Host "Starting the website..."
  Open-Window "website" "npx expo start -c --web"

  if ($Tunnels) {
    Write-Host "Opening the website tunnel..."
    $null = Start-Tunnel "website tunnel" 8081 $WebLog
    Show-Urls
  } else {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*" -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    Write-Host ""
    Write-Host "  This PC:   http://localhost:8081"
    if ($ip) { Write-Host "  Phone on the same Wi-Fi:  http://${ip}:8081" -ForegroundColor Green }
    Write-Host ""
  }
  Write-Host "The website takes about a minute to build the first time. Stop everything with: garagego stop"
}

switch ($Command.ToLower()) {
  "start" { Start-All $true }
  "local" { Start-All $false }
  "stop" { Stop-All ($Option -in @("--force", "-force", "force", "-f")) }
  "urls" { Show-Urls }
  default {
    Write-Host "garagego start   server + website + tunnels (phone anywhere, ESP32, Wokwi)"
    Write-Host "garagego local   server + website only (phone on the same Wi-Fi)"
    Write-Host "garagego stop    close everything garagego started (add --force to free ports 3000/8081 from anything else)"
    Write-Host "garagego urls    show the current addresses"
  }
}
