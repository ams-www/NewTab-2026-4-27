function applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

// 初回読み込み時にテーマを適用
chrome.storage.local.get(['theme'], (res) => {
    applyTheme(res.theme || 'auto');
});

// 設定画面でテーマが変更されたら即座に反映
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.theme) {
        applyTheme(changes.theme.newValue || 'auto');
    }
});

// 「自動」設定の時に、OSのテーマ変更を検知して切り替える
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    chrome.storage.local.get(['theme'], (res) => {
        if ((res.theme || 'auto') === 'auto') {
            applyTheme('auto');
        }
    });
});

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
