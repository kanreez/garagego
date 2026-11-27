param([string]$Command = "help", [string]$Option = "")

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env"
$LogDir = Join-Path $env:TEMP "garagego"
$ServerLog = Join-Path $LogDir "tunnel-server.log"
$WebLog = Join-Path $LogDir "tunnel-web.log"
$ProductionApiFile = Join-Path $PSScriptRoot "production-api-url.txt"
$PagesProject = "garagego"

function Open-Window([string]$Title, [string]$CommandLine) {
  Start-Process cmd.exe -ArgumentList "/k", "title GarageGo $Title && cd /d `"$Root`" && $CommandLine" | Out-Null
}

function Test-Port([int]$Port) {
  [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

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

function Set-ApiUrl([string]$Url) {
  $lines = if (Test-Path $EnvFile) { @(Get-Content $EnvFile) } else { @() }
  $lines = @($lines | Where-Object { $_ -notmatch "^\s*#?\s*EXPO_PUBLIC_API_URL=" -and $_ -notmatch "^# Server through the cloudflared tunnel" })
  if ($Url) {
    $lines += "EXPO_PUBLIC_API_URL=$Url"
  }
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
  & taskkill.exe /FI "WINDOWTITLE eq GarageGo*" /T /F 2>$null | Out-Null
  Write-Host "Closed the GarageGo windows."
  if (-not $Force) {
    if ((Test-Port 3000) -or (Test-Port 8081)) {
      Write-Host "Something else still holds port 3000 or 8081. 'garagego stop --force' closes it too." -ForegroundColor Yellow
    }
    return
  }
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

function Publish-Site([string]$ApiUrl) {
  if ($ApiUrl) { Set-Content -Path $ProductionApiFile -Value $ApiUrl.TrimEnd("/") -Encoding ascii }
  if (-not (Test-Path $ProductionApiFile)) {
    Write-Host "No backend address yet. Run: garagego deploy https://<your-render-service>.onrender.com" -ForegroundColor Red
    exit 1
  }
  $api = (Get-Content $ProductionApiFile -Raw).Trim()
  Write-Host "Building the website for backend $api ..."
  Push-Location $Root
  try {
    $env:EXPO_PUBLIC_API_URL = $api
    & npx expo export --platform web --output-dir dist
    if ($LASTEXITCODE -ne 0) { throw "The website build failed." }
    $assets = Join-Path $Root "dist\assets"
    if (Test-Path (Join-Path $assets "node_modules")) {
      Rename-Item (Join-Path $assets "node_modules") "vendor"
      Get-ChildItem (Join-Path $Root "dist") -Recurse -File -Include *.js, *.html, *.css, *.json | ForEach-Object {
        $text = [System.IO.File]::ReadAllText($_.FullName)
        if ($text.Contains("assets/node_modules/")) {
          [System.IO.File]::WriteAllText($_.FullName, $text.Replace("assets/node_modules/", "assets/vendor/"), (New-Object System.Text.UTF8Encoding($false)))
        }
      }
    }
    $indexPath = Join-Path $Root "dist\index.html"
    $pwaHead = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot "pwa-head.html")).Trim()
    $html = [System.IO.File]::ReadAllText($indexPath)
    $html = $html.Replace('<html lang="en">', '<html lang="bg">').Replace('shrink-to-fit=no" />', 'shrink-to-fit=no, viewport-fit=cover" />')
    $html = $html.Replace('<link rel="icon" href="/favicon.ico"/>', '').Replace("</head>", "$pwaHead`n</head>")
    [System.IO.File]::WriteAllText($indexPath, $html, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Publishing to Cloudflare Pages ($PagesProject.pages.dev) ..."
    $dist = Join-Path $Root "dist"
    Push-Location $env:TEMP
    try {
      & npx --yes wrangler@4 pages deploy $dist --project-name $PagesProject --branch main --commit-dirty=true
      if ($LASTEXITCODE -ne 0) { throw "Publishing failed. If wrangler asked you to log in, run 'npx wrangler@4 login' once and try again." }
    } finally {
      Pop-Location
    }
    Write-Host ""
    Write-Host "  Live at: https://$PagesProject.pages.dev" -ForegroundColor Green
  } finally {
    Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
    Pop-Location
  }
}

switch ($Command.ToLower()) {
  "start" { Start-All $true }
  "local" { Start-All $false }
  "stop" { Stop-All ($Option -in @("--force", "-force", "force", "-f")) }
  "urls" { Show-Urls }
  "deploy" { Publish-Site $Option }
  default {
    Write-Host "garagego start   server + website + tunnels (phone anywhere, ESP32, Wokwi)"
    Write-Host "garagego local   server + website only (phone on the same Wi-Fi)"
    Write-Host "garagego stop    close everything garagego started (add --force to free ports 3000/8081 from anything else)"
    Write-Host "garagego urls    show the current addresses"
    Write-Host "garagego deploy  publish the website to garagego.pages.dev (first time: garagego deploy <backend-url>)"
  }
}
