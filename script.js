const container = document.getElementById('icon-container');
const openSettingsBtn = document.getElementById('open-settings-btn');
const openEditBtn = document.getElementById('open-edit-btn');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerOverlay = document.getElementById('settings-drawer-overlay');
const editOverlay = document.getElementById('edit-overlay');

let icons = [];
let currentQuery = '';

function openDrawer() {
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
function openEditMode() {
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
  const filtered = icons.filter(item =>
    item.name.toLowerCase().includes(currentQuery) || item.url.toLowerCase().includes(currentQuery)
  );

  filtered.forEach((item) => {
    const card = document.createElement('a');
    card.href = item.url;
    card.className = 'bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md hover:shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3 relative cursor-pointer select-none';

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

    card.append(img, title);
    container.appendChild(card);
  });
}