const nameInput = document.getElementById('name-input');
const urlInput = document.getElementById('url-input');
const iconFileInput = document.getElementById('icon-file-input');
const iconUrlInput = document.getElementById('icon-url-input');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const closeBtn = document.getElementById('close-drawer-btn');

// 親への通信窓口
const sendToParent = (data) => window.parent.postMessage(data, '*');

// ドロワーを閉じる
closeBtn.addEventListener('click', () => sendToParent({ type: 'CLOSE_DRAWER' }));

// 検索フィルター送信（150ms間引き）
let searchTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => sendToParent({ type: 'SEARCH_QUERY', query: e.target.value }), 150);
});

// 画像をリサイズしてBase64にする関数（容量節約のため）
function resizeImageAndGetBase64(fileOrBlob, maxWidth = 128, maxHeight = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // サイズ調整
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // 背景透過も維持できるPNGで出力
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('画像の読み込みに失敗したよ'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗したよ'));
    reader.readAsDataURL(fileOrBlob);
  });
}

// 追加
addBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim() || 'Unnamed';
  let url = urlInput.value.trim();
  if (!url) return alert('URLを入力してね！');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  // ボタンを一時的に無効化
  addBtn.disabled = true;
  addBtn.textContent = '処理中...';

  let iconData = null;
  const iconFile = iconFileInput.files[0];
  const iconUrl = iconUrlInput.value.trim();

  try {
    if (iconFile) {
      // ファイルから読み込み
      iconData = await resizeImageAndGetBase64(iconFile);
    } else if (iconUrl) {
      // URLから取得して変換
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
    // 新しく iconData も一緒に保存するよ
    icons.push({ id: Date.now(), name, url, iconData });
    chrome.storage.local.set({ icons });

    // 入力欄をクリア
    nameInput.value = '';
    urlInput.value = '';
    iconFileInput.value = '';
    iconUrlInput.value = '';

    addBtn.disabled = false;
    addBtn.textContent = '追加 ＋';
  });
});

// エクスポート
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

// インポート
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