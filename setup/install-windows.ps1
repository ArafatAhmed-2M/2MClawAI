# 2M Claw Windows Setup Wizard
# Author: Arafat Ahmed Mubin (2M Ecosystem)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      🐾 2M Claw - Windows Setup 🐾      " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
Write-Host "Checking prerequisites..." -ForegroundColor White
try {
    $nodeVersion = node -v
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js (v18+) and try again." -ForegroundColor Red
    Pause
    Exit
}

# Install Dependencies
Write-Host "Installing dependencies... (This may take a minute)" -ForegroundColor White
npm install

# Compile TypeScript
Write-Host "Compiling TypeScript..." -ForegroundColor White
npm run build

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating default .env file..." -ForegroundColor White
    Copy-Item ".env.example" -Destination ".env"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "You can start 2M Claw by running: npm start" -ForegroundColor Yellow
Write-Host "The Web Dashboard will be available at http://localhost:3000" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Pause
