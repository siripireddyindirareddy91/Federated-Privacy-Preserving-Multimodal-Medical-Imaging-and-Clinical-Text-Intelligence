param([int]$ApiPort = 8031, [int]$WebPort = 3031)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:DEMO_PASSWORD) { $env:DEMO_PASSWORD = 'ResearchDemo!2026' }
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = python -c 'import secrets; print(secrets.token_urlsafe(48))' }
$env:CORS_ORIGINS = "http://localhost:$WebPort,http://127.0.0.1:$WebPort"
$env:PORT = "$WebPort"
Start-Process -FilePath 'python' -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port',"$ApiPort") -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden
Write-Host "API: http://localhost:$ApiPort"
Write-Host "Frontend: http://localhost:$WebPort"
Write-Host "Set the API URL in frontend Settings to http://localhost:$ApiPort, then sign in."
Push-Location (Join-Path $projectRoot 'frontend')
try { npm run start } finally { Pop-Location }
