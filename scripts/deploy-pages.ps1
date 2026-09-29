# Rebuild + publish frontend to the gh-pages branch.
# Usage:
#   .\scripts\deploy-pages.ps1
# With a deployed Worker API:
#   $env:VITE_API_URL = "https://forum-api.<account>.workers.dev"
#   .\scripts\deploy-pages.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

npm.cmd run build
Copy-Item dist\index.html dist\404.html -Force

$tmp = Join-Path $env:TEMP 'nbk-ghpages'
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory $tmp | Out-Null
Copy-Item dist\* $tmp -Recurse -Force
Push-Location $tmp
git init -b gh-pages
git add -A
git commit -m "Deploy site"
git remote add origin https://github.com/LupinDsama/NBKForrum.git
git push -f origin gh-pages
Pop-Location
Write-Host 'Done. Set GitHub Settings > Pages > Deploy from branch: gh-pages / root.'
