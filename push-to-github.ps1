# Script para fazer o primeiro push para o GitHub
# Execute no PowerShell: .\push-to-github.ps1

Set-Location $PSScriptRoot

# Remove locks se existirem
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue
Remove-Item .git\HEAD.lock -Force -ErrorAction SilentlyContinue

Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

Write-Host "Status:" -ForegroundColor Cyan
git status

Write-Host "`nCriando commit..." -ForegroundColor Cyan
git commit -m "Initial commit"

Write-Host "`nRenomeando branch para main..." -ForegroundColor Cyan
git branch -M main

Write-Host "`nEnviando para o GitHub (pode pedir login)..." -ForegroundColor Cyan
git push -u origin main

Write-Host "`nConcluido!" -ForegroundColor Green
