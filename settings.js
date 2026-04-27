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
let selectedSimpleIconSlug = null;

const sendToParent = (data) => window.parent.postMessage(data, '*');

closeBtn.addEventListener('click', () => sendToParent({ type: 'CLOSE_DRAWER' }));

let searchTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => sendToParent({ type: 'SEARCH_QUERY', query: e.target.value }), 150);
});

async function fetchSimpleIcons() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/simple-icons/simple-icons/refs/heads/develop/data/simple-icons.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.icons)) {
      simpleIconsList = data.icons;
    } else {
      simpleIconsList = [];
    }
  } catch(e) { 
    console.warn('Simple Iconsのリスト取得失敗。予備の読み込みを試みます:', e);
    simpleIconsList = []; 
  }
}
fetchSimpleIcons();

siSearchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  
  if (!q || !Array.isArray(simpleIconsList) || simpleIconsList.length === 0) {
    siSuggestionsDiv.classList.add('hidden');
    return;
  }
  
  const matches = simpleIconsList.filter(i => {
    const titleMatch = i.title && i.title.toLowerCase().includes(q);
    const slugMatch = i.slug && i.slug.includes(q);
    return titleMatch || slugMatch;
  }).slice(0, 10);

  if (matches.length > 0) {
    siSuggestionsDiv.innerHTML = matches.map(m => `
      <div class="si-item" data-slug="${m.slug}" data-title="${m.title}" style="padding: 0.5rem; cursor: pointer; display:flex; align-items:center; gap:0.5rem; border-bottom:1px solid #f1f5f9;">
        <img src="https://cdn.simpleicons.org/${m.slug}" style="width:16px; height:16px;" onerror="this.src='img/world.svg'">
        <span style="font-size:0.85rem; color:#334155;">${m.title}</span>
      </div>
    `).join('');
    siSuggestionsDiv.classList.remove('hidden');
  } else {
    siSuggestionsDiv.classList.add('hidden');
  }
});

siSuggestionsDiv.addEventListener('click', (e) => {
  const item = e.target.closest('.si-item');
  if (!item) return;
  
  selectedSimpleIconSlug = item.dataset.slug;
  
  siPreviewImg.src = `https://cdn.simpleicons.org/${selectedSimpleIconSlug}`;
  siSelectedName.textContent = item.dataset.title;
  siPreviewDiv.classList.remove('hidden');
  
  siSearchInput.classList.add('hidden');
  siSuggestionsDiv.classList.add('hidden');
  siSearchInput.value = '';
});

siClearBtn.addEventListener('click', () => {
  selectedSimpleIconSlug = null;
  siPreviewDiv.classList.add('hidden');
  siSearchInput.classList.remove('hidden');
});

document.addEventListener('click', (e) => {
  if (!siSearchInput.contains(e.target) && !siSuggestionsDiv.contains(e.target)) {
    siSuggestionsDiv.classList.add('hidden');
  }
});

async function fetchSvgBase64(slug) {
  const url = `https://cdn.simpleicons.org/${slug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('SVG fetch failed');
  const svgText = await res.text();
  
  const encoder = new TextEncoder();
  const bytes = encoder.encode(svgText);
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function resizeImageAndGetBase64(fileOrBlob, maxWidth = 128, maxHeight = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }

        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('画像の読み込みに失敗したよ'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗したよ'));
    reader.readAsDataURL(fileOrBlob);
  });
}

addBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim() || 'Unnamed';
  let url = urlInput.value.trim();
  if (!url) return alert('URLを入力してね！');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  addBtn.disabled = true;
  addBtn.textContent = '処理中...';

  let iconData = null;
  const iconFile = iconFileInput.files[0];
  const iconUrl = iconUrlInput.value.trim();

  try {
    if (selectedSimpleIconSlug) {
      iconData = await fetchSvgBase64(selectedSimpleIconSlug);
    } else if (iconFile) {
      iconData = await resizeImageAndGetBase64(iconFile);
    } else if (iconUrl) {
      const res = await fetch(iconUrl);
      if (!res.ok) throw new Error('ネットワークエラー');
      const blob = await res.blob();
      iconData = await resizeImageAndGetBase64(blob);
    }
  } catch (e) {
    alert('アイコンの取得や変換に失敗しちゃった。とりあえず標準のアイコンにするね。');
    console.error(e);
  }

  chrome.storage.local.get(['icons'], (res) => {
    const icons = res.icons || [];
    icons.push({ id: Date.now(), name, url, iconData });
    chrome.storage.local.set({ icons });

    nameInput.value = '';
    urlInput.value = '';
    iconFileInput.value = '';
    iconUrlInput.value = '';
    
    selectedSimpleIconSlug = null;
    siPreviewDiv.classList.add('hidden');
    siSearchInput.classList.remove('hidden');

    addBtn.disabled = false;
    addBtn.textContent = '追加 ＋';
  });
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
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        chrome.storage.local.set({ icons: data });
        alert('復元完了！');
        importInput.value = '';
      }
    } catch { alert('ファイル形式がおかしいよ！'); }
  };
  reader.readAsText(file);
});