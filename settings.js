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
          -webkit-mask-size: contain;
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
      iconData = await resizeImage(iconFileInput.files[0]);
    } else if (iconUrlInput.value.trim()) {
      const res = await fetch(iconUrlInput.value.trim());
      const blob = await res.blob();
      iconData = await resizeImage(blob);
    }
  } catch (e) {
    console.error('処理エラー:', e);
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
      // 通知（alert）を削除したよ
    });
  });
});

/**
 * 画像リサイズ
 */
function resizeImage(fileOrBlob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 128, 128);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

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
        // インポート時も通知は不要ならここも消せるけど、今回は追加時のalertだけ消したよ
        alert('復元したよ！');
      });
    } catch (err) { alert('ファイルがおかしいみたい。'); }
  };
  reader.readAsText(file);
});

