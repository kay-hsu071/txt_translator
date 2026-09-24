# 英文掃描朗讀翻譯 PWA

掃描英文書本，自動朗讀並翻譯成中文的 Progressive Web App。

## 功能

- 📷 **相機掃描** — 開啟後置相機，對準書本文字拍照
- 🔍 **OCR 辨識** — 使用 Google Cloud Vision API 辨識英文文字  
- 🌐 **中文翻譯** — 使用 Google Translate API 翻譯成繁體中文
- 🔊 **雙語朗讀** — 使用 Google Cloud TTS 先唸英文，再唸中文
- 📱 **PWA 支援** — 可安裝到手機主畫面，離線使用（API 功能需連網）

## 快速開始

### 1. 取得 Google Cloud API 金鑰

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（或選擇現有專案）
3. 開啟以下三個 API：
   - **Cloud Vision API** — OCR 文字辨識
   - **Cloud Translation API** — 英翻中
   - **Cloud Text-to-Speech API** — 語音合成
4. 前往「API 和服務 → 憑證」→「建立憑證」→「API 金鑰」
5. 複製 API 金鑰

> **費用估計**（每月免費額度後）：
> - Vision API：\$1.50 / 1000 次
> - Translate API：\$20 / 百萬字元
> - TTS Wavenet：\$16 / 百萬字元
> 
> 一般個人使用，每月約 \$0–2 USD。

### 2. 啟動本地伺服器

```powershell
# 在專案目錄執行（需要 Python 或 Node.js）
.\start-server.ps1
```

或使用 VS Code 的 **Live Server** 擴充功能。

### 3. 在手機上使用

**方法 A（同一 WiFi）：**
1. 電腦執行 `start-server.ps1`
2. 手機開啟 `http://[電腦IP]:8080`
3. 輸入 API 金鑰 → 開始使用

**方法 B（直接部署到網路，推薦）：**
- 使用 [GitHub Pages](https://pages.github.com/)、[Netlify](https://netlify.com/)、或 [Vercel](https://vercel.com/) 免費部署
- HTTPS 環境，手機相機功能完整支援

## 專案結構

```
txt_translator/
├── index.html        # 主頁面
├── style.css         # 樣式
├── app.js            # 主程式邏輯
├── sw.js             # Service Worker（PWA 離線支援）
├── manifest.json     # PWA Manifest
├── start-server.ps1  # 本地開發伺服器腳本
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 技術架構

```
相機/圖片 → Google Cloud Vision API (OCR)
                ↓
           英文文字
                ↓
         Google Translate API
                ↓
           中文翻譯
                ↓
      Google Cloud TTS (Wavenet)
       先朗讀英文 → 再朗讀中文
```

## 注意事項

- API 金鑰儲存在**瀏覽器本地 localStorage**，不會傳送到任何第三方伺服器
- 相機功能需要 HTTPS 或 localhost 環境
- 若 Cloud TTS 失敗，會自動切換到瀏覽器內建語音（免費，音質較差）
- 建議在光線充足的環境下拍攝，提升 OCR 準確率
