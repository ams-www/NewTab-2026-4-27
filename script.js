const container = document.getElementById('icon-container');
const openSettingsBtn = document.getElementById('open-settings-btn');
const openEditBtn = document.getElementById('open-edit-btn');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerOverlay = document.getElementById('settings-drawer-overlay');
const editOverlay = document.getElementById('edit-overlay');
const wallpaperLayer = document.getElementById('wallpaper-layer');
const wallpaperOverlayEl = document.getElementById('wallpaper-overlay');

let icons = [];
let currentQuery = '';
let wallpaperActive = false; // 壁紙が有効かどうかのフラグ

const settingsIframe = document.getElementById('settings-iframe');

function openDrawer() {
  // 初回のみ iframe の src を設定して遅延読み込み
  if (settingsIframe.src === 'about:blank' || settingsIframe.src === '') {
    settingsIframe.src = 'settings.html';
  }
  
  drawerOverlay.classList.remove('-right-full');
  drawerOverlay.classList.add('right-0');
  drawerBackdrop.classList.add('opacity-100', 'pointer-events-auto');
  drawerBackdrop.classList.remove('opacity-0', 'pointer-events-none');
}
function closeDrawer() {
  drawerOverlay.classList.add('-right-full');
  drawerOverlay.classList.remove('right-0');
  drawerBackdrop.classList.remove('opacity-100', 'pointer-events-auto');
  drawerBackdrop.classList.add('opacity-0', 'pointer-events-none');
}
const editIframe = document.getElementById('edit-iframe');

function openEditMode() {
  // 初回のみ iframe の src を設定して遅延読み込み
  if (editIframe.src === 'about:blank' || editIframe.src === '') {
    editIframe.src = 'edit.html';
  }
  
  editOverlay.classList.remove('hidden');
  editOverlay.classList.add('flex');
}
function closeEditMode() {
  editOverlay.classList.add('hidden');
  editOverlay.classList.remove('flex');
}

openSettingsBtn.addEventListener('click', openDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
openEditBtn.addEventListener('click', openEditMode);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

window.addEventListener('message', (e) => {
  if (e.data?.type === 'CLOSE_DRAWER') closeDrawer();
  if (e.data?.type === 'CLOSE_EDIT') closeEditMode();
  if (e.data?.type === 'SEARCH_QUERY') {
    currentQuery = e.data.query.toLowerCase();
    renderIcons();
  }
  if (e.data?.type === 'WALLPAPER_CHANGED') applyWallpaper();
});

chrome.storage.local.get(['icons'], (res) => {
  icons = res.icons || [];
  renderIcons();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.icons) {
    icons = changes.icons.newValue || [];
    renderIcons();
  }
  if (area === 'local' && changes.wallpaper) {
    applyWallpaper();
  }
});

function renderIcons() {
  container.innerHTML = '';
  const filtered = icons.filter(item =>
    item.name.toLowerCase().includes(currentQuery) || item.url.toLowerCase().includes(currentQuery)
  );

  filtered.forEach((item) => {
    const card = document.createElement('a');
    card.href = item.url;

    // 壁紙の有無に応じてカードの背景クラスを切り替え（Tailwind運用）
    if (wallpaperActive) {
      card.className = 'bg-white/85 dark:bg-slate-800/85 backdrop-blur-sm p-4 rounded-2xl shadow-md hover:shadow-lg border border-slate-100/50 dark:border-slate-700/50 flex flex-col items-center gap-3 relative cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 overflow-hidden';
    } else {
      card.className = 'bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md hover:shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3 relative cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 overflow-hidden';
    }

    let faviconUrl = '/img/world.svg';
    if (item.iconData) {
      faviconUrl = item.iconData;
    } else {
      try {
        const domain = new URL(item.url).hostname;
        faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch { }
    }

    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = item.name;
    img.className = 'w-12 h-12 object-contain transition-transform duration-200 pointer-events-none';
    img.draggable = false;
    img.onerror = () => { img.src = '/img/world.svg'; };

    const title = document.createElement('span');
    title.className = 'font-semibold text-slate-700 dark:text-slate-200 text-sm truncate w-full text-center pointer-events-none';
    title.textContent = item.name;

    const ripple = document.createElement('md-ripple');
    ripple.setAttribute('for', 'link');

    card.append(img, title, ripple);
    container.appendChild(card);
  });
}

// ===== 壁紙機能 =====

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

/**
 * Tailwindのfit用クラスマッピング
 */
const fitClassMap = {
  cover:   { size: 'bg-cover',       pos: 'bg-center',    repeat: 'bg-no-repeat' },
  contain: { size: 'bg-contain',     pos: 'bg-center',    repeat: 'bg-no-repeat' },
  center:  { size: 'bg-auto',        pos: 'bg-center',    repeat: 'bg-no-repeat' },
  repeat:  { size: 'bg-auto',        pos: 'bg-left-top',  repeat: 'bg-repeat' }
};

/**
 * 壁紙設定をストレージから読み込み、適用する
 */
function applyWallpaper() {
  chrome.storage.local.get(['wallpaper'], (res) => {
    const wp = { ...defaultWallpaper, ...(res.wallpaper || {}) };

    if (wp.type === 'none') {
      // 壁紙なし：デフォルト背景に戻す
      wallpaperLayer.classList.add('opacity-0');
      wallpaperLayer.classList.remove('opacity-100');
      // 動的な背景プロパティのみインラインでクリア
      wallpaperLayer.style.backgroundImage = '';
      wallpaperLayer.style.backgroundColor = '';
      wallpaperOverlayEl.classList.add('hidden');
      // fit関連のTailwindクラスを削除
      Object.values(fitClassMap).forEach(c => {
        wallpaperLayer.classList.remove(c.size, c.pos, c.repeat);
      });
      // カード再描画（不透明背景に戻す）
      wallpaperActive = false;
      renderIcons();
      return;
    }

    // 不透明度（Tailwind opacity-{{n}} は離散値のみなのでインラインで対応）
    wallpaperLayer.style.opacity = (wp.opacity / 100).toString();
    wallpaperLayer.classList.remove('opacity-0');

    // ぼかし（動的値のためインライン）
    wallpaperLayer.style.filter = wp.blur > 0 ? `blur(${wp.blur}px)` : '';

    // 背景クリア
    wallpaperLayer.style.backgroundImage = '';
    wallpaperLayer.style.backgroundColor = '';

    // 既存のfitクラスを削除してから新しいものを適用
    Object.values(fitClassMap).forEach(c => {
      wallpaperLayer.classList.remove(c.size, c.pos, c.repeat);
    });

    if (wp.type === 'color') {
      // 動的カラー値のためインライン
      wallpaperLayer.style.backgroundColor = wp.color;
    } else if (wp.type === 'url' && wp.url) {
      // 動的URLのためインライン
      wallpaperLayer.style.backgroundImage = `url(${wp.url})`;
      const fitClasses = fitClassMap[wp.fit] || fitClassMap.cover;
      wallpaperLayer.classList.add(fitClasses.size, fitClasses.pos, fitClasses.repeat);
    } else if (wp.type === 'file' && wp.data) {
      // 動的データのためインライン
      wallpaperLayer.style.backgroundImage = `url(${wp.data})`;
      const fitClasses = fitClassMap[wp.fit] || fitClassMap.cover;
      wallpaperLayer.classList.add(fitClasses.size, fitClasses.pos, fitClasses.repeat);
    }

    // オーバーレイ
    if (wp.overlayEnabled) {
      const overlayAlpha = Math.round((wp.overlayOpacity / 100) * 255).toString(16).padStart(2, '0');
      // 動的カラー計算のためインライン
      wallpaperOverlayEl.style.backgroundColor = wp.overlayColor + overlayAlpha;
      wallpaperOverlayEl.classList.remove('hidden');
    } else {
      wallpaperOverlayEl.classList.add('hidden');
    }

    // カード再描画（半透明背景にする）
    wallpaperActive = true;
    renderIcons();
  });
}

// 初回読み込み時に壁紙を適用
applyWallpaper();
