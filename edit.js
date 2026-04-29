const container = document.getElementById('icon-container');
const closeEditBtn = document.getElementById('close-edit-btn');

let icons = [];
let dragSrcId = null;

closeEditBtn.addEventListener('click', () => {
  window.parent.postMessage({ type: 'CLOSE_EDIT' }, '*');
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
});

function renderIcons() {
  container.innerHTML = '';

  icons.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'edit-card bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md flex flex-col items-center gap-3 relative cursor-grab border-2 border-dashed border-transparent transition-all duration-200';
    card.draggable = true;
    card.dataset.id = item.id;

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
    img.className = 'w-12 h-12 object-contain pointer-events-none grayscale opacity-80 dark:opacity-90';
    img.onerror = () => { img.src = '/img/world.svg'; };

    const title = document.createElement('span');
    title.className = 'font-semibold text-slate-700 dark:text-slate-200 text-sm truncate w-full text-center pointer-events-none';
    title.textContent = item.name;

    // 編集ボタン
    const editBtn = document.createElement('button');
    editBtn.className = 'absolute top-2 left-2 w-7 h-7 rounded-full border-none flex items-center justify-center cursor-pointer bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-300';
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
    deleteBtn.className = 'absolute top-2 right-2 w-7 h-7 rounded-full border-none flex items-center justify-center cursor-pointer bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-300';
    deleteBtn.title = '削除'; deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`「${item.name}」を本当に削除する？`)) {
        icons = icons.filter(i => i.id !== item.id);
        chrome.storage.local.set({ icons });
      }
    });

    card.append(img, title, editBtn, deleteBtn);

    // ドラッグ＆ドロップ処理
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
  });
}

function handleDragStart(e) {
  dragSrcId = this.dataset.id;
  this.classList.add('opacity-40');
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDragEnter(e) { e.preventDefault(); this.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-slate-700'); }
function handleDragLeave() { this.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-slate-700'); }
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
  this.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-slate-700');
}
function handleDragEnd() {
  this.classList.remove('opacity-40');
  document.querySelectorAll('.edit-card').forEach(d => d.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-slate-700'));
  dragSrcId = null;
}