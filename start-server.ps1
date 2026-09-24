# 英文掃描朗讀翻譯 - 本地開發伺服器
# 執行此腳本來啟動本地 HTTPS 伺服器（相機功能需要 HTTPS 或 localhost）

Write-Host "啟動本地伺服器..." -ForegroundColor Green
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  英文掃描朗讀翻譯 PWA" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python") {
            $python = $cmd
            break
        }
    } catch {}
}

if ($python) {
    Write-Host "使用 Python HTTP 伺服器" -ForegroundColor Yellow
    Write-Host "請在手機瀏覽器開啟：http://[你的電腦IP]:8080" -ForegroundColor Green
    Write-Host "或在電腦上開啟：http://localhost:8080" -ForegroundColor Green
    Write-Host ""
    Write-Host "按 Ctrl+C 停止伺服器" -ForegroundColor Gray
    Write-Host ""

    # Get local IP
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress
    if ($ip) {
        Write-Host "你的電腦 IP：$ip" -ForegroundColor Cyan
        Write-Host "手機請連同一 WiFi 後開啟：http://${ip}:8080" -ForegroundColor Cyan
    }
    Write-Host ""

    Set-Location $PSScriptRoot
    & $python -m http.server 8080
} else {
    Write-Host "未偵測到 Python，嘗試使用 Node.js..." -ForegroundColor Yellow
    $node = $null
    try {
        $ver = node --version 2>&1
        if ($ver -match "v") { $node = "node" }
    } catch {}

    if ($node) {
        # Simple Node.js server
        $serverCode = @"
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mime = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(8080, () => {
  console.log('伺服器已啟動：http://localhost:8080');
});
"@
        $serverCode | Out-File -FilePath "$PSScriptRoot\server.js" -Encoding UTF8
        Set-Location $PSScriptRoot
        Write-Host "開啟瀏覽器：http://localhost:8080" -ForegroundColor Green
        node server.js
    } else {
        Write-Host "" 
        Write-Host "❌ 未找到 Python 或 Node.js" -ForegroundColor Red
        Write-Host ""
        Write-Host "請安裝其中一個，或直接用 VS Code Live Server 擴充功能開啟專案" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "手動開啟方式：" -ForegroundColor Cyan
        Write-Host "1. 安裝 VS Code" -ForegroundColor White
        Write-Host "2. 安裝 Live Server 擴充功能" -ForegroundColor White
        Write-Host "3. 右鍵 index.html → Open with Live Server" -ForegroundColor White
        Read-Host "按 Enter 關閉"
    }
}
