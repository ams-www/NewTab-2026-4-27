const container = document.getElementById('icon-container');
const openDrawerBtn = document.getElementById('open-drawer-btn');
const drawerBackdrop = document.getElementById('drawer-backdrop');

let icons = [];
let currentQuery = '';
let dragSrcId = null;

// UI制御
function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }

openDrawerBtn.addEventListener('click', openDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

// iframeからのメッセージ受信
window.addEventListener('message', (e) => {
  if (e.data?.type === 'CLOSE_DRAWER') closeDrawer();
  if (e.data?.type === 'SEARCH_QUERY') {
    currentQuery = e.data.query.toLowerCase();
    renderIcons();
  }
});

// データ初期読み込み
chrome.storage.local.get(['icons'], (res) => {
  icons = res.icons || [];
  renderIcons();
});

// 子側で更新があったら自動でグリッドを再描画
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.icons) {
    icons = changes.icons.newValue || [];
    renderIcons();
  }
});

// 描画関数
function renderIcons() {
  container.innerHTML = '';
  const filtered = icons.filter(item =>
    item.name.toLowerCase().includes(currentQuery) || item.url.toLowerCase().includes(currentQuery)
  );

  filtered.forEach((item) => {
    const card = document.createElement('div');
    // カードのスタイルはそのまま
    card.className = 'item-card bg-white p-4 rounded-2xl shadow-md hover:shadow-lg border border-slate-100 flex flex-col items-center gap-3 relative cursor-pointer transition-all duration-200';
    card.draggable = true;
    card.dataset.id = item.id;

    card.addEventListener('click', () => {
      window.location.href = item.url;
    });

    // アイコンURLの決定
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
    // ぽわーっとした影を追加
    img.className = 'w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-transform duration-200 hover:scale-110';
    img.onerror = () => { img.src = '/img/world.svg'; };

    const title = document.createElement('span');
    title.className = 'font-semibold text-slate-700 text-sm truncate w-full text-center';
    title.textContent = item.name;

    // 編集ボタン
    const editBtn = document.createElement('button');
    editBtn.className = 'absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200';
    editBtn.title = '編集'; editBtn.textContent = '✎';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newName = prompt('名前を変更:', item.name);
      const newUrl = prompt('URLを変更:', item.url);
      if (newName !== null) item.name = newName || 'Unnamed';
      if (newUrl !== null) {
        item.url = newUrl.trim();
        if (!/^https?:\/\//i.test(item.url)) item.url = `https://${item.url}`;
      }
      chrome.storage.local.set({ icons });
    });

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors duration-200';
    deleteBtn.title = '削除'; deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('本当に削除する？')) {
        icons = icons.filter(i => i.id !== item.id);
        chrome.storage.local.set({ icons });
      }
    });

    // リンクをappendから削除
    card.append(img, title, editBtn, deleteBtn);

    // ドラッグ＆ドロップ
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
  });
}

// ドラッグ処理は変更なし
function handleDragStart(e) {
  dragSrcId = this.dataset.id;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDragEnter(e) { e.preventDefault(); this.classList.add('drag-over'); }
function handleDragLeave() { this.classList.remove('drag-over'); }
function handleDrop(e) {
  e.stopPropagation(); e.preventDefault();
  const destId = this.dataset.id;
  if (dragSrcId && dragSrcId !== destId) {
    const srcIndex = icons.findIndex(i => i.id == dragSrcId);
    const destIndex = icons.findIndex(i => i.id == destId);
    if (srcIndex > -1 && destIndex > -1) {
      const [moved] = icons.splice(srcIndex, 1);
      icons.splice(destIndex, 0, moved);
      chrome.storage.local.set({ icons });
    }
  }
  this.classList.remove('drag-over');
}
function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.item-card').forEach(d => d.classList.remove('drag-over'));
  dragSrcId = null;
}