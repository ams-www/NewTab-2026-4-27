const nameInput = document.getElementById('name-input');
const urlInput = document.getElementById('url-input');
const iconFileInput = document.getElementById('icon-file-input');
const iconUrlInput = document.getElementById('icon-url-input');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const closeBtn = document.getElementById('close-drawer-btn');

const siSearchInput = document.getElementById('simple-icons-search');
const siSuggestionsDiv = document.getElementById('si-suggestions');
const siPreviewDiv = document.getElementById('si-selected-preview');
const siPreviewImg = document.getElementById('si-preview-img');
const siSelectedName = document.getElementById('si-selected-name');
const siClearBtn = document.getElementById('si-clear-btn');

let simpleIconsList = [];
let selectedSimpleIcon = null;

const sendToParent = (data) => window.parent.postMessage(data, '*');

closeBtn.addEventListener('click', () => sendToParent({ type: 'CLOSE_DRAWER' }));

// テーマ選択の要素を取得
const themeSelect = document.getElementById('theme-select');

// 現在のテーマ設定を読み込んで反映させる
chrome.storage.local.get(['theme'], (res) => {
  themeSelect.value = res.theme || 'auto';
});

// 選択が変わったら storage に保存する
themeSelect.addEventListener('change', (e) => {
  const selectedTheme = e.target.value;
  chrome.storage.local.set({ theme: selectedTheme });
});


/**
 * タイトルから Slug を生成する
 */
function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/\./g, 'dot')
    .replace(/&/g, 'and')
    .replace(/đ/g, 'd')
    .replace(/ħ/g, 'h')
    .replace(/ı/g, 'i')
    .replace(/ĸ/g, 'k')
    .replace(/ŀ/g, 'l')
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss')
    .replace(/ŧ/g, 't')
    .replace(/[^\w]/g, '');
}

/**
 * jsDelivr からアイコンの情報を取得
 */
async function fetchSimpleIcons() {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/simple-icons@latest/_data/simple-icons.json');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    simpleIconsList = Array.isArray(data) ? data : (data.icons || []);
  } catch (e) {
    console.warn('アイコンリストの取得に失敗しました:', e);
  }
}
fetchSimpleIcons();

/**
 * 検索処理（色付き・背景透過版）
 */
siSearchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q || simpleIconsList.length === 0) {
    siSuggestionsDiv.classList.add('hidden');
    return;
  }

  const matches = simpleIconsList
    .filter(i => i.title.toLowerCase().includes(q))
    .slice(0, 10);

  if (matches.length > 0) {
    siSuggestionsDiv.innerHTML = '';
    matches.forEach(m => {
      const slug = titleToSlug(m.title);
      const hex = m.hex ? `#${m.hex}` : '#555';
      const iconUrl = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`;

      const item = document.createElement('div');
      item.className = 'si-item';
      item.style.cssText = 'padding:0.6rem;cursor:pointer;display:flex;align-items:center;gap:0.7rem;border-bottom:1px solid #f1f5f9;';

      const iconDisplay = document.createElement('div');
      iconDisplay.style.cssText = `
        width:24px;
        height:24px;
        background-color:${hex};
        -webkit-mask-image: url(${iconUrl});
        mask-image: url(${iconUrl});
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        mask-position: center;
      `;

      const span = document.createElement('span');
      span.style.cssText = 'font-size:0.9rem;color:#334155;';
      span.textContent = m.title;

      item.append(iconDisplay, span);

      item.addEventListener('click', () => {
        selectedSimpleIcon = { ...m, slug, iconUrl };
        
        siPreviewImg.style.cssText = `
          width:24px;
          height:24px;
          background-color:${hex};
          -webkit-mask-image: url(${iconUrl});
          mask-image: url(${iconUrl});
          mask-size: contain;
          mask-size: contain;
        `;
        siPreviewImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        siPreviewImg.parentElement.style.backgroundColor = "transparent";
        siPreviewImg.parentElement.style.border = "none";
        
        siSelectedName.textContent = m.title;
        siPreviewDiv.classList.remove('hidden');
        siPreviewDiv.classList.add('flex');
        siSearchInput.classList.add('hidden');
        siSuggestionsDiv.classList.add('hidden');
        siSearchInput.value = '';
      });

      siSuggestionsDiv.appendChild(item);
    });
    siSuggestionsDiv.classList.remove('hidden');
  } else {
    siSuggestionsDiv.classList.add('hidden');
  }
});

siClearBtn.addEventListener('click', () => {
  selectedSimpleIcon = null;
  siPreviewDiv.classList.add('hidden');
  siPreviewDiv.classList.remove('flex');
  siSearchInput.classList.remove('hidden');
});

/**
 * アイコンを色付き・透過SVGとしてBase64変換
 */
async function fetchIconAsBase64(iconUrl, hex) {
  try {
    const res = await fetch(iconUrl);
    if (!res.ok) return null;
    const svgText = await res.text();
    
    const coloredSvg = svgText.replace('<svg', `<svg fill="#${hex}"`);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(coloredSvg)))}`;
  } catch (e) {
    return null;
  }
}

/**
 * 画像（ファイルまたはBlob）を処理し、データURLを返す。
 * SVGの場合はそのままSVGデータ、それ以外は128x128のWebPにリサイズ。
 */
async function processIconImage(fileOrBlob) {
  // ファイル名またはMIMEタイプでSVGか判定
  const isSvg = (fileOrBlob.type === 'image/svg+xml') || 
                (fileOrBlob.name && fileOrBlob.name.toLowerCase().endsWith('.svg'));
  
  if (isSvg) {
    // SVGの場合はテキストとして読み込み、Base64エンコード
    const text = await fileOrBlob.text();
    // 簡易的な検証：xmlタグが含まれているか
    if (!text.includes('<svg')) {
      throw new Error('不正なSVGファイルです');
    }
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }

  // それ以外の画像はリサイズしてWebPに変換
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 128, 128);
        resolve(canvas.toDataURL('image/webp'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * URLからアイコンを取得して処理（SVGの場合はそのまま保存）
 */
async function fetchIconFromUrl(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('svg') || url.toLowerCase().includes('.svg')) {
    // SVGの場合
    const svgText = await response.text();
    if (!svgText.includes('<svg')) {
      throw new Error('URLが指す内容は有効なSVGではありません');
    }
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
  } else {
    // その他の画像形式 -> Blobとして処理
    const blob = await response.blob();
    return processIconImage(blob);
  }
}

/**
 * サイト追加
 */
addBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim() || '名称未設定';
  let url = urlInput.value.trim();
  if (!url) return alert('URLを入力してね。');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  addBtn.disabled = true;
  addBtn.textContent = '保存中...';

  let iconData = null;
  try {
    if (selectedSimpleIcon) {
      iconData = await fetchIconAsBase64(selectedSimpleIcon.iconUrl, selectedSimpleIcon.hex);
    } else if (iconFileInput.files[0]) {
      iconData = await processIconImage(iconFileInput.files[0]);
    } else if (iconUrlInput.value.trim()) {
      iconData = await fetchIconFromUrl(iconUrlInput.value.trim());
    }
  } catch (e) {
    console.error('アイコン処理エラー:', e);
    alert('アイコンの読み込みに失敗しました。別の画像をお試しください。');
  }

  chrome.storage.local.get(['icons'], (res) => {
    const icons = res.icons || [];
    icons.push({ id: Date.now(), name, url, iconData });
    chrome.storage.local.set({ icons }, () => {
      // 保存完了後のリセット
      nameInput.value = '';
      urlInput.value = '';
      iconFileInput.value = '';
      iconUrlInput.value = '';
      selectedSimpleIcon = null;
      siPreviewDiv.classList.add('hidden');
      siSearchInput.classList.remove('hidden');
      addBtn.disabled = false;
      addBtn.textContent = '追加 ＋';
    });
  });
});

let searchTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => sendToParent({ type: 'SEARCH_QUERY', query: e.target.value }), 150);
});

exportBtn.addEventListener('click', () => {
  chrome.storage.local.get(['icons'], (res) => {
    const blob = new Blob([JSON.stringify(res.icons || [], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kanon-tab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
});

importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const icons = JSON.parse(ev.target.result);
      chrome.storage.local.set({ icons }, () => {
        alert('復元したよ！');
      });
    } catch (err) { alert('ファイルがおかしいみたい。'); }
  };
  reader.readAsText(file);
});


// ===== 壁紙設定 (以下変更なし) =====

const wpTypeSelect = document.getElementById('wallpaper-type');
const wpColorSection = document.getElementById('wp-color-section');
const wpUrlSection = document.getElementById('wp-url-section');
const wpFileSection = document.getElementById('wp-file-section');
const wpPreviewWrapper = document.getElementById('wp-preview-wrapper');
const wpPreviewInner = document.getElementById('wp-preview-inner');
const wpFitSection = document.getElementById('wp-fit-section');
const wpFitSelect = document.getElementById('wp-fit-select');
const wpBlurSection = document.getElementById('wp-blur-section');
const wpBlurSlider = document.getElementById('wp-blur-slider');
const wpBlurValue = document.getElementById('wp-blur-value');
const wpOpacitySection = document.getElementById('wp-opacity-section');
const wpOpacitySlider = document.getElementById('wp-opacity-slider');
const wpOpacityValue = document.getElementById('wp-opacity-value');
const wpOverlaySection = document.getElementById('wp-overlay-section');
const wpOverlayToggle = document.getElementById('wp-overlay-toggle');
const wpOverlayControls = document.getElementById('wp-overlay-controls');
const wpOverlayColor = document.getElementById('wp-overlay-color');
const wpOverlayOpacity = document.getElementById('wp-overlay-opacity');
const wpOverlayOpacityValue = document.getElementById('wp-overlay-opacity-value');
const wpColorPicker = document.getElementById('wp-color-picker');
const wpColorHex = document.getElementById('wp-color-hex');
const wpUrlInput = document.getElementById('wp-url-input');
const wpFileInput = document.getElementById('wp-file-input');
const wpResetBtn = document.getElementById('wp-reset-btn');

// 壁紙設定のデフォルト値
const defaultWallpaper = {
  type: 'none',
  color: '#1e293b',
  url: '',
  data: '',
  fit: 'cover',
  blur: 0,
  opacity: 100,
  overlayEnabled: false,
  overlayColor: '#000000',
  overlayOpacity: 30
};

let currentWallpaper = { ...defaultWallpaper };
let wpFileData = ''; // アップロードされたファイルのbase64データ

/**
 * 壁紙設定をストレージから読み込み
 */
function loadWallpaperSettings() {
  chrome.storage.local.get(['wallpaper'], (res) => {
    currentWallpaper = { ...defaultWallpaper, ...(res.wallpaper || {}) };
    wpFileData = currentWallpaper.data || '';

    // UIに反映
    wpTypeSelect.value = currentWallpaper.type;
    wpFitSelect.value = currentWallpaper.fit;
    wpBlurSlider.value = currentWallpaper.blur;
    wpBlurValue.textContent = currentWallpaper.blur + 'px';
    wpOpacitySlider.value = currentWallpaper.opacity;
    wpOpacityValue.textContent = currentWallpaper.opacity + '%';
    wpOverlayToggle.checked = currentWallpaper.overlayEnabled;
    wpOverlayColor.value = currentWallpaper.overlayColor;
    wpOverlayOpacity.value = currentWallpaper.overlayOpacity;
    wpOverlayOpacityValue.textContent = currentWallpaper.overlayOpacity + '%';
    wpColorPicker.value = currentWallpaper.color;
    wpColorHex.value = currentWallpaper.color;
    wpUrlInput.value = currentWallpaper.url;

    // オーバーレイコントロール表示
    if (currentWallpaper.overlayEnabled) {
      wpOverlayControls.classList.remove('hidden');
      wpOverlayControls.classList.add('flex');
    } else {
      wpOverlayControls.classList.add('hidden');
      wpOverlayControls.classList.remove('flex');
    }

    updateWallpaperSections();
    updateWallpaperPreview();
  });
}

/**
 * 壁紙タイプに応じてセクションの表示/非表示を切り替え
 */
function updateWallpaperSections() {
  const type = wpTypeSelect.value;
  const isNone = type === 'none';

  // 各セクションの表示制御
  wpColorSection.classList.toggle('hidden', type !== 'color');
  wpUrlSection.classList.toggle('hidden', type !== 'url');
  wpFileSection.classList.toggle('hidden', type !== 'file');

  // 壁紙が設定されている場合のみ表示するセクション
  const showExtras = !isNone;
  wpPreviewWrapper.classList.toggle('hidden', !showExtras);
  wpFitSection.classList.toggle('hidden', !showExtras || type === 'color');
  wpBlurSection.classList.toggle('hidden', !showExtras);
  wpOpacitySection.classList.toggle('hidden', !showExtras);
  wpOverlaySection.classList.toggle('hidden', !showExtras);
  wpResetBtn.classList.toggle('hidden', isNone);
}

/**
 * 壁紙プレビューを更新
 */
function updateWallpaperPreview() {
  const type = wpTypeSelect.value;
  const inner = wpPreviewInner;

  // リセット
  inner.style.backgroundImage = '';
  inner.style.backgroundColor = '';
  inner.style.backgroundSize = '';
  inner.style.backgroundPosition = '';
  inner.style.backgroundRepeat = '';
  inner.style.filter = '';
  inner.style.opacity = '';

  if (type === 'none') return;

  const blur = parseInt(wpBlurSlider.value) || 0;
  const opacity = (parseInt(wpOpacitySlider.value) || 100) / 100;
  const fit = wpFitSelect.value;

  inner.style.filter = blur > 0 ? `blur(${blur}px)` : '';
  inner.style.opacity = opacity;

  if (type === 'color') {
    inner.style.backgroundColor = wpColorPicker.value;
  } else if (type === 'url' && wpUrlInput.value.trim()) {
    inner.style.backgroundImage = `url(${wpUrlInput.value.trim()})`;
    applyFitStyle(inner, fit);
  } else if (type === 'file' && wpFileData) {
    inner.style.backgroundImage = `url(${wpFileData})`;
    applyFitStyle(inner, fit);
  }
}

/**
 * fitセレクトに基づいてスタイルを適用
 */
function applyFitStyle(el, fit) {
  switch (fit) {
    case 'cover':
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      break;
    case 'contain':
      el.style.backgroundSize = 'contain';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      break;
    case 'center':
      el.style.backgroundSize = 'auto';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      break;
    case 'repeat':
      el.style.backgroundSize = 'auto';
      el.style.backgroundPosition = 'top left';
      el.style.backgroundRepeat = 'repeat';
      break;
  }
}

/**
 * 壁紙設定をストレージに保存し、親に通知
 */
function saveWallpaperSettings() {
  const wallpaper = {
    type: wpTypeSelect.value,
    color: wpColorPicker.value,
    url: wpUrlInput.value.trim(),
    data: wpFileData,
    fit: wpFitSelect.value,
    blur: parseInt(wpBlurSlider.value) || 0,
    opacity: parseInt(wpOpacitySlider.value) || 100,
    overlayEnabled: wpOverlayToggle.checked,
    overlayColor: wpOverlayColor.value,
    overlayOpacity: parseInt(wpOverlayOpacity.value) || 30
  };

  currentWallpaper = wallpaper;
  chrome.storage.local.set({ wallpaper }, () => {
    // 親ウィンドウに壁紙変更を通知
    sendToParent({ type: 'WALLPAPER_CHANGED' });
  });
}

/**
 * 壁紙画像ファイルのリサイズ（高品質版）
 * 壁紙用なので解像度を高めに維持
 */
function resizeWallpaperImage(fileOrBlob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 最大1920pxに制限（アスペクト比維持）
        const maxDim = 1920;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // WEBPで品質0.85に圧縮（ファイルサイズ削減）
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

// ===== 壁紙設定のイベントリスナー =====

// タイプ変更
wpTypeSelect.addEventListener('change', () => {
  updateWallpaperSections();
  updateWallpaperPreview();
  saveWallpaperSettings();
});

// カラーピッカー
wpColorPicker.addEventListener('input', (e) => {
  wpColorHex.value = e.target.value;
  updateWallpaperPreview();
});
wpColorPicker.addEventListener('change', saveWallpaperSettings);

// カラーヘックス入力
wpColorHex.addEventListener('input', (e) => {
  const val = e.target.value;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    wpColorPicker.value = val;
    updateWallpaperPreview();
  }
});
wpColorHex.addEventListener('change', saveWallpaperSettings);

// 画像URL入力
let wpUrlTimer;
wpUrlInput.addEventListener('input', () => {
  clearTimeout(wpUrlTimer);
  wpUrlTimer = setTimeout(() => {
    updateWallpaperPreview();
  }, 500);
});
wpUrlInput.addEventListener('change', () => {
  updateWallpaperPreview();
  saveWallpaperSettings();
});

// 画像ファイル選択
wpFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    wpFileData = await resizeWallpaperImage(file);
    updateWallpaperPreview();
    saveWallpaperSettings();
  } catch (err) {
    console.error('壁紙画像の処理に失敗:', err);
  }
});

// 表示方法
wpFitSelect.addEventListener('change', () => {
  updateWallpaperPreview();
  saveWallpaperSettings();
});

// ぼかしスライダー
wpBlurSlider.addEventListener('input', (e) => {
  wpBlurValue.textContent = e.target.value + 'px';
  updateWallpaperPreview();
});
wpBlurSlider.addEventListener('change', saveWallpaperSettings);

// 不透明度スライダー
wpOpacitySlider.addEventListener('input', (e) => {
  wpOpacityValue.textContent = e.target.value + '%';
  updateWallpaperPreview();
});
wpOpacitySlider.addEventListener('change', saveWallpaperSettings);

// オーバーレイトグル
wpOverlayToggle.addEventListener('change', (e) => {
  if (e.target.checked) {
    wpOverlayControls.classList.remove('hidden');
    wpOverlayControls.classList.add('flex');
  } else {
    wpOverlayControls.classList.add('hidden');
    wpOverlayControls.classList.remove('flex');
  }
  saveWallpaperSettings();
});

// オーバーレイ色
wpOverlayColor.addEventListener('input', () => {
  // リアルタイムプレビューは親側で反映される
});
wpOverlayColor.addEventListener('change', saveWallpaperSettings);

// オーバーレイ不透明度
wpOverlayOpacity.addEventListener('input', (e) => {
  wpOverlayOpacityValue.textContent = e.target.value + '%';
});
wpOverlayOpacity.addEventListener('change', saveWallpaperSettings);

// リセットボタン
wpResetBtn.addEventListener('click', () => {
  if (!confirm('壁紙設定をリセットしますか？')) return;
  wpFileData = '';
  currentWallpaper = { ...defaultWallpaper };
  chrome.storage.local.remove(['wallpaper'], () => {
    loadWallpaperSettings();
    sendToParent({ type: 'WALLPAPER_CHANGED' });
  });
});

// 初回読み込み
loadWallpaperSettings();