// ===========================
//  English Scanner & Reader
//  PWA App - app.js
// ===========================

'use strict';

// ---------- Password Config ----------
// 若要更改密碼，在瀏覽器 Console 執行：
//   getPasswordHash('你的新密碼')
// 然後把產生的字串取代下面 CORRECT_HASH 的值
const CORRECT_HASH = 'd9ab56f8cf8c147c4f8614a056836e8e80b8dbaa51200472cb5161509f21dcc8';
const AUTH_KEY = 'app_auth_until';    // localStorage key
const AUTH_DAYS = 30;                 // 記住登入幾天

// ---------- State ----------
let apiKey = '';
let stream = null;
let cameraActive = false;
let currentEnglishText = '';
let currentChineseText = '';
let readingSpeed = 1.0;
let currentAudio = null;
let isReading = false;
let capturedImageBase64 = '';

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    afterAuth();
  } else {
    showPasswordPanel();
  }
});

// ---------- Password Helpers ----------
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 提供給使用者在 Console 執行，取得新密碼的 hash
window.getPasswordHash = async (password) => {
  const h = await hashPassword(password);
  console.log('你的新密碼 Hash（複製取代 CORRECT_HASH）：');
  console.log(h);
  return h;
};

function isAuthenticated() {
  const until = localStorage.getItem(AUTH_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

function setAuthCookie() {
  const expiry = Date.now() + AUTH_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(AUTH_KEY, expiry.toString());
}

async function verifyPassword() {
  const input = document.getElementById('password-input');
  const errorEl = document.getElementById('password-error');
  const password = input.value;

  if (!password) {
    errorEl.classList.remove('hidden');
    errorEl.textContent = '❌ 請輸入密碼';
    return;
  }

  const hash = await hashPassword(password);

  if (hash === CORRECT_HASH) {
    setAuthCookie();
    errorEl.classList.add('hidden');
    input.value = '';
    afterAuth();
  } else {
    errorEl.classList.remove('hidden');
    errorEl.textContent = '❌ 密碼錯誤，請再試一次';
    input.value = '';
    input.focus();
    // 震動回饋（手機）
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('password-input');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function afterAuth() {
  apiKey = localStorage.getItem('gcp_api_key') || '';
  if (apiKey) {
    showMainPanel();
  } else {
    showSetupPanel();
  }
}



// ---------- Panel helpers ----------
function showPasswordPanel() {
  document.getElementById('password-panel').classList.remove('hidden');
  document.getElementById('setup-panel').classList.add('hidden');
  document.getElementById('main-panel').classList.add('hidden');
  // Auto-focus password field
  setTimeout(() => document.getElementById('password-input')?.focus(), 100);
}

function showSetupPanel() {
  document.getElementById('setup-panel').classList.remove('hidden');
  document.getElementById('main-panel').classList.add('hidden');
}

function showMainPanel() {
  document.getElementById('setup-panel').classList.add('hidden');
  document.getElementById('main-panel').classList.remove('hidden');
}

// ---------- API Key ----------
function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (!key || key.length < 20) {
    showToast('請輸入有效的 API 金鑰');
    return;
  }
  apiKey = key;
  localStorage.setItem('gcp_api_key', key);
  showToast('✅ API 金鑰已儲存');
  showMainPanel();
}

function openSettings() {
  document.getElementById('api-key-input').value = '';
  showSetupPanel();
}

function toggleKeyVisibility() {
  const input = document.getElementById('api-key-input');
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ---------- Camera ----------
async function toggleCamera() {
  if (cameraActive) {
    stopCamera();
  } else {
    await startCamera();
  }
}

async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }, // Back camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('video');
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('capture-btn').disabled = false;
    document.getElementById('camera-btn-text').textContent = '關閉相機';
    cameraActive = true;
    showToast('相機已開啟');
  } catch (err) {
    console.error('Camera error:', err);
    showToast('❌ 無法開啟相機：' + (err.message || err.name));
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  const video = document.getElementById('video');
  video.srcObject = null;
  video.style.display = 'none';
  document.getElementById('camera-placeholder').style.display = 'flex';
  document.getElementById('capture-btn').disabled = true;
  document.getElementById('camera-btn-text').textContent = '開啟相機';
  cameraActive = false;
}

// ---------- Capture ----------
function captureAndProcess() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('capture-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
  capturedImageBase64 = imageDataUrl.split(',')[1]; // strip prefix

  // Show preview
  const previewImg = document.getElementById('preview-img');
  previewImg.src = imageDataUrl;
  document.getElementById('preview-section').classList.remove('hidden');

  processImage(capturedImageBase64);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const imageDataUrl = e.target.result;
    capturedImageBase64 = imageDataUrl.split(',')[1];

    // Show preview
    const previewImg = document.getElementById('preview-img');
    previewImg.src = imageDataUrl;
    document.getElementById('preview-section').classList.remove('hidden');

    processImage(capturedImageBase64);
  };
  reader.readAsDataURL(file);

  // Reset file input so same file can be re-selected
  event.target.value = '';
}

// ---------- Main Processing Pipeline ----------
async function processImage(base64Image) {
  if (!apiKey) {
    showToast('請先設定 API 金鑰');
    openSettings();
    return;
  }

  hideResults();
  showProcessing('正在辨識文字...');

  try {
    // Step 1: OCR via Google Cloud Vision API
    const englishText = await ocrWithVision(base64Image);
    if (!englishText || englishText.trim() === '') {
      hideProcessing();
      showToast('❌ 無法辨識到任何文字，請重新拍攝');
      return;
    }
    currentEnglishText = cleanText(englishText);

    // Step 2: Translate to Chinese
    showProcessing('正在翻譯成中文...');
    const chineseText = await translateText(currentEnglishText, 'en', 'zh-TW');
    currentChineseText = chineseText;

    // Step 3: Show results
    hideProcessing();
    document.getElementById('english-text').textContent = currentEnglishText;
    document.getElementById('chinese-text').textContent = currentChineseText;
    document.getElementById('results-section').classList.remove('hidden');

    // Step 4: Auto read both languages
    await readAll();

  } catch (err) {
    hideProcessing();
    console.error('Processing error:', err);
    showToast('❌ 處理失敗：' + (err.message || '未知錯誤'));
  }
}

// ---------- Google Cloud Vision OCR ----------
async function ocrWithVision(base64Image) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = {
    requests: [{
      image: { content: base64Image },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }]
    }]
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const msg = errData?.error?.message || resp.statusText;
    throw new Error(`Vision API 錯誤：${msg}`);
  }

  const data = await resp.json();
  const annotation = data?.responses?.[0]?.fullTextAnnotation;
  return annotation ? annotation.text : '';
}

// ---------- Google Translate API ----------
async function translateText(text, sourceLang, targetLang) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const body = {
    q: text,
    source: sourceLang,
    target: targetLang,
    format: 'text'
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const msg = errData?.error?.message || resp.statusText;
    throw new Error(`Translate API 錯誤：${msg}`);
  }

  const data = await resp.json();
  return data?.data?.translations?.[0]?.translatedText || '';
}

// ---------- Google Cloud Text-to-Speech ----------
async function synthesizeSpeech(text, languageCode) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  // Choose voice based on language
  const voiceConfig = languageCode.startsWith('zh')
    ? { languageCode: 'cmn-TW', name: 'cmn-TW-Wavenet-A' }
    : { languageCode: 'en-US', name: 'en-US-Wavenet-D' };

  const body = {
    input: { text },
    voice: voiceConfig,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: readingSpeed,
      pitch: 0
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const msg = errData?.error?.message || resp.statusText;
    // Fallback to browser TTS if Cloud TTS fails
    console.warn('Cloud TTS failed, falling back to browser TTS:', msg);
    return null;
  }

  const data = await resp.json();
  return data?.audioContent || null; // Base64-encoded MP3
}

// ---------- Speak with Cloud TTS (fallback to browser TTS) ----------
async function speakText(lang, elementId) {
  stopReading();

  const text = document.getElementById(elementId)?.textContent?.trim();
  if (!text) { showToast('沒有文字可以朗讀'); return; }

  const langCode = lang === 'zh' ? 'zh-TW' : 'en-US';

  // Highlight button
  document.querySelectorAll('.btn-action').forEach(b => b.classList.remove('speaking'));
  const btn = document.querySelector(`button[onclick="speakText('${lang}', '${elementId}')"]`);
  if (btn) btn.classList.add('speaking');

  try {
    const audioBase64 = await synthesizeSpeech(text, langCode);

    if (audioBase64) {
      // Play Cloud TTS audio
      await playBase64Audio(audioBase64, () => {
        if (btn) btn.classList.remove('speaking');
      });
    } else {
      // Fallback: browser TTS
      browserSpeak(text, langCode, () => {
        if (btn) btn.classList.remove('speaking');
      });
    }
  } catch (err) {
    console.error('TTS error:', err);
    // Last resort fallback
    browserSpeak(text, langCode, () => {
      if (btn) btn.classList.remove('speaking');
    });
  }
}

function playBase64Audio(base64, onEnd) {
  return new Promise((resolve) => {
    const audioBytes = atob(base64);
    const arrayBuffer = new ArrayBuffer(audioBytes.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < audioBytes.length; i++) {
      view[i] = audioBytes.charCodeAt(i);
    }
    const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    currentAudio = new Audio(url);
    isReading = true;
    currentAudio.playbackRate = 1; // speed already set via TTS API
    currentAudio.play();

    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      isReading = false;
      currentAudio = null;
      if (onEnd) onEnd();
      resolve();
    };

    currentAudio.onerror = () => {
      URL.revokeObjectURL(url);
      isReading = false;
      currentAudio = null;
      if (onEnd) onEnd();
      resolve();
    };
  });
}

function browserSpeak(text, langCode, onEnd) {
  if (!('speechSynthesis' in window)) {
    showToast('此瀏覽器不支援語音功能');
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = readingSpeed;
  utter.onend = () => {
    isReading = false;
    if (onEnd) onEnd();
  };
  utter.onerror = () => {
    isReading = false;
    if (onEnd) onEnd();
  };

  isReading = true;
  window.speechSynthesis.speak(utter);
}

// ---------- Read All (English → Chinese) ----------
async function readAll() {
  if (!currentEnglishText && !currentChineseText) {
    showToast('沒有文字可以朗讀');
    return;
  }

  stopReading();

  document.getElementById('read-all-btn').style.display = 'none';
  document.getElementById('stop-btn').style.display = 'inline-flex';

  isReading = true;

  try {
    // 1. Speak English
    if (currentEnglishText) {
      showToast('🔊 朗讀英文...');
      const enAudio = await synthesizeSpeech(currentEnglishText, 'en-US');
      if (enAudio && isReading) {
        await playBase64Audio(enAudio, null);
      } else if (isReading) {
        await new Promise((resolve) => browserSpeak(currentEnglishText, 'en-US', resolve));
      }
    }

    // Brief pause between languages
    if (isReading) await sleep(600);

    // 2. Speak Chinese
    if (currentChineseText && isReading) {
      showToast('🔊 朗讀中文...');
      const zhAudio = await synthesizeSpeech(currentChineseText, 'zh-TW');
      if (zhAudio && isReading) {
        await playBase64Audio(zhAudio, null);
      } else if (isReading) {
        await new Promise((resolve) => browserSpeak(currentChineseText, 'zh-TW', resolve));
      }
    }
  } catch (err) {
    console.error('readAll error:', err);
  } finally {
    finishReading();
  }
}

function stopReading() {
  isReading = false;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  document.querySelectorAll('.btn-action').forEach(b => b.classList.remove('speaking'));
  finishReading();
}

function finishReading() {
  isReading = false;
  document.getElementById('read-all-btn').style.display = '';
  const stopBtn = document.getElementById('stop-btn');
  if (stopBtn) stopBtn.style.display = 'none';
}

// ---------- Speed Control ----------
function updateSpeed(value) {
  readingSpeed = parseFloat(value);
  document.getElementById('speed-value').textContent = readingSpeed.toFixed(1) + 'x';
}

// ---------- Copy Text ----------
async function copyText(elementId) {
  const text = document.getElementById(elementId)?.textContent?.trim();
  if (!text) { showToast('沒有文字可複製'); return; }

  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ 已複製到剪貼板');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ 已複製');
  }
}

// ---------- Reset ----------
function resetScan() {
  stopReading();
  currentEnglishText = '';
  currentChineseText = '';
  capturedImageBase64 = '';

  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('preview-section').classList.add('hidden');
  document.getElementById('processing-section').classList.add('hidden');
  document.getElementById('english-text').textContent = '';
  document.getElementById('chinese-text').textContent = '';
}

// ---------- UI helpers ----------
function showProcessing(text) {
  document.getElementById('processing-text').textContent = text;
  document.getElementById('processing-section').classList.remove('hidden');
  document.getElementById('results-section').classList.add('hidden');
}

function hideProcessing() {
  document.getElementById('processing-section').classList.add('hidden');
}

function hideResults() {
  document.getElementById('results-section').classList.add('hidden');
}

function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

// ---------- Utilities ----------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(text) {
  // Remove excessive whitespace/newlines while preserving paragraph structure
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// ---------- Service Worker Registration ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
