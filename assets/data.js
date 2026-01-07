(function () {
  const STORAGE_KEY = 'posts';
  const THEME_STORAGE_KEY = 'site-theme';

  const themePresets = [
    {
      key: 'violet-ice',
      name: 'バイオレット',
      accent: '#6c63ff',
      accent2: '#4fc3f7',
      background: '#0b0c10',
      surface: '#11131a',
      panel: '#0f1119',
      border: '#1e2230',
      muted: '#c7ced9',
    },
    {
      key: 'sunset',
      name: 'サンセット',
      accent: '#ff6b6b',
      accent2: '#ffb347',
      background: '#1a0f14',
      surface: '#221218',
      panel: '#1c0f15',
      border: '#2f1b20',
      muted: '#f4c7bd',
    },
    {
      key: 'forest',
      name: 'フォレスト',
      accent: '#5ad07a',
      accent2: '#1fa47a',
      background: '#0c130f',
      surface: '#121b14',
      panel: '#0e1611',
      border: '#1b2a1f',
      muted: '#c1d6c7',
    },
    {
      key: 'amber-night',
      name: 'アンバー',
      accent: '#f2c14e',
      accent2: '#f08c42',
      background: '#14100a',
      surface: '#1c140b',
      panel: '#171009',
      border: '#2a1d0f',
      muted: '#e6d5b8',
    },
    {
      key: 'aqua',
      name: 'アクア',
      accent: '#4ef2c7',
      accent2: '#4fc3f7',
      background: '#071412',
      surface: '#0d1d19',
      panel: '#0a1815',
      border: '#12302a',
      muted: '#c0dedd',
    },
    {
      key: 'blush',
      name: 'ブラッシュ',
      accent: '#f285b9',
      accent2: '#ffb3d1',
      background: '#140c12',
      surface: '#1c1018',
      panel: '#170d14',
      border: '#2a1a24',
      muted: '#f0cadf',
    },
    {
      key: 'citrus',
      name: 'シトラス',
      accent: '#ffe66d',
      accent2: '#ff9f1c',
      background: '#121009',
      surface: '#1b160c',
      panel: '#151009',
      border: '#2c200f',
      muted: '#eadbb5',
    },
    {
      key: 'slate',
      name: 'スレート',
      accent: '#7f8c8d',
      accent2: '#5d6d7e',
      background: '#0c0d10',
      surface: '#14161b',
      panel: '#101217',
      border: '#1f2229',
      muted: '#c7ced9',
    },
    {
      key: 'emerald',
      name: 'エメラルド',
      accent: '#2ecc71',
      accent2: '#1abc9c',
      background: '#08130e',
      surface: '#0f1c15',
      panel: '#0c1812',
      border: '#123124',
      muted: '#c0e1d2',
    },
    {
      key: 'firefly',
      name: 'ファイアフライ',
      accent: '#a29bfe',
      accent2: '#ff9ff3',
      background: '#0b0a13',
      surface: '#141124',
      panel: '#100e1c',
      border: '#1f1b32',
      muted: '#d4cff6',
    },
  ];

  const DEFAULT_THEME = themePresets[0].key;
  const DEFAULT_FOCUS = { start: 20, end: 80 };
  const DEFAULT_SCALE = 1;
  const CHARS_PER_MINUTE = 500;

  function clampFeaturedAndDigest(list = []) {
    const ordered = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    const featuredId = ordered.find((post) => post.isFeatured)?.id;
    const digestIds = ordered.filter((post) => post.isDigest).map((post) => post.id).slice(0, 2);
    return ordered.map((post) => ({
      ...post,
      isFeatured: featuredId ? post.id === featuredId : false,
      isDigest: digestIds.includes(post.id),
    }));
  }

  function hexToRgb(hex = '') {
    const normalized = hex.replace('#', '');
    if (normalized.length === 3) {
      const [r, g, b] = normalized.split('').map((char) => parseInt(char + char, 16));
      return { r, g, b };
    }
    if (normalized.length !== 6) {
      return { r: 11, g: 12, b: 16 };
    }
    const int = parseInt(normalized, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }

  function relativeLuminance(hexColor = '#000000') {
    const { r, g, b } = hexToRgb(hexColor);
    const [lr, lg, lb] = [r, g, b].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  }

  function pickTextColor(background = '#0b0c10') {
    const luminance = relativeLuminance(background);
    return luminance > 0.35 ? '#0b0c10' : '#f5f7fb';
  }

  function pickMutedColor(background = '#0b0c10', fallback = '#c7ced9') {
    const luminance = relativeLuminance(background);
    if (fallback) return fallback;
    return luminance > 0.35 ? '#374151' : '#c7ced9';
  }

  const defaultPosts = [
    {
      id: 'post-design-system',
      title: 'デザインシステムで統一感を作る',
      date: '2024-05-28',
      read: '5 min',
      excerpt: '色・余白・コンポーネントを揃え、プロダクト全体の体験を向上させる方法をまとめました。',
      content: 'デザインシステムは複数プロジェクトを横断して品質を揃えるための基盤です。\nカラーパレットや余白のルール、コンポーネントの指針を小さくても良いので書き残すところから始めましょう。\nデザイナーだけでなく開発者も参照しやすい形にしておくと浸透が早まります。',
      image: '',
      tags: ['デザイン', 'UI'],
      imagePosition: 50,
      imageFocus: DEFAULT_FOCUS,
      theme: 'violet-ice',
      isFeatured: true,
      isDigest: true,
      hidden: false,
      order: 0,
    },
    {
      id: 'post-jamstack',
      title: 'Jamstackで高速なブログを構築する',
      date: '2024-05-15',
      read: '7 min',
      excerpt: 'ビルドと配信を最適化し、安定したパフォーマンスを維持するためのベストプラクティス。',
      content: 'JamstackはプリレンダリングとCDN配信で安定した速さを実現できます。\nビルド時間を短縮するために不要な依存を削る、画像を最適化するなどの基本を積み上げましょう。',
      image: '',
      tags: ['Jamstack', 'パフォーマンス'],
      imagePosition: 50,
      imageFocus: { start: 16, end: 84 },
      theme: 'sunset',
      isFeatured: false,
      isDigest: true,
      hidden: false,
      order: 1,
    },
    {
      id: 'post-microcopy',
      title: 'マイクロコピーでCVRを上げる',
      date: '2024-05-05',
      read: '4 min',
      excerpt: '小さな言葉の改善で大きな成果を生むために意識したいポイントを紹介。',
      content: 'ボタンやエラー文言の一言で印象は大きく変わります。\n「次へ進む」よりも「お支払いへ進む」のように具体的な行動を示すと迷いを減らせます。',
      image: '',
      tags: ['ライティング', 'UX'],
      imagePosition: 50,
      imageFocus: { start: 24, end: 88 },
      theme: 'forest',
      isFeatured: false,
      isDigest: false,
      hidden: false,
      order: 2,
    },
    {
      id: 'post-ui-motion',
      title: 'UIモーションの作り方',
      date: '2024-04-28',
      read: '6 min',
      excerpt: 'トランジション、タイミング、フィードバックを整えることでプロダクトの質を高める。',
      content: 'モーションは気づかれない程度の小ささで一貫させることが重要です。\n等速ではなく少しだけイージングを加え、遅延を短く保つと軽快に感じます。',
      image: '',
      tags: ['アニメーション', 'UI'],
      imagePosition: 50,
      imageFocus: { start: 12, end: 82 },
      theme: 'amber-night',
      isFeatured: false,
      isDigest: false,
      hidden: false,
      order: 3,
    },
    {
      id: 'post-accessibility',
      title: 'アクセシビリティチェックリスト',
      date: '2024-04-12',
      read: '8 min',
      excerpt: '誰にとっても使いやすいUIを目指すための確認ポイントをまとめました。',
      content: '代替テキスト、十分なコントラスト、フォーカスの明示は最低限おさえましょう。\nチェックリストを用意して継続的に振り返る文化を作ると品質を落としにくくなります。',
      image: '',
      tags: ['アクセシビリティ', 'チェックリスト'],
      imagePosition: 50,
      imageFocus: { start: 18, end: 86 },
      theme: 'aqua',
      isFeatured: false,
      isDigest: false,
      hidden: false,
      order: 4,
    },
  ];

  function resolveTheme(key = DEFAULT_THEME) {
    return themePresets.find((theme) => theme.key === key) || themePresets[0];
  }

  function readSiteTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = resolveTheme(stored);
    localStorage.setItem(THEME_STORAGE_KEY, theme.key);
    return theme.key;
  }

  function saveSiteTheme(themeKey = DEFAULT_THEME) {
    const theme = resolveTheme(themeKey);
    localStorage.setItem(THEME_STORAGE_KEY, theme.key);
    return theme.key;
  }

  function applyThemeToDocument(themeKey = DEFAULT_THEME) {
    const theme = resolveTheme(themeKey);
    const bg = theme.background || '#0b0c10';
    const text = theme.foreground || pickTextColor(bg);
    const muted = pickMutedColor(bg, theme.muted);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-2', theme.accent2);
    document.documentElement.style.setProperty('--bg', bg);
    document.documentElement.style.setProperty('--fg', text);
    document.documentElement.style.setProperty('--card', theme.surface || '#11131a');
    document.documentElement.style.setProperty('--panel', theme.panel || theme.surface || '#0f1119');
    document.documentElement.style.setProperty('--border', theme.border || '#1e2230');
    document.documentElement.style.setProperty('--muted', muted);
    return theme;
  }

  function normalizeFocus(input = null, fallbackPosition = 50) {
    if (input && Number.isFinite(input.start) && Number.isFinite(input.end)) {
      const start = Math.min(Math.max(Number(input.start), 0), 100);
      const end = Math.min(Math.max(Number(input.end), start + 5), 100);
      return { start, end };
    }

    const center = Number.isFinite(Number(fallbackPosition)) ? Math.min(Math.max(Number(fallbackPosition), 0), 100) : 50;
    const start = Math.max(center - 30, 0);
    const end = Math.min(center + 30, 100);
    return { start, end };
  }

  function formatReadTime(minutes = 1) {
    const min = Math.max(1, Math.round(minutes));
    return `${min} min`;
  }

  function estimateReadMinutes(text = '') {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized.length) return 1;
    const minutes = normalized.length / CHARS_PER_MINUTE;
    return Math.max(1, Math.ceil(minutes));
  }

  function normalizeTags(rawTags = []) {
    return (Array.isArray(rawTags) ? rawTags : String(rawTags || '').split(',')).map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 2);
  }

  function normalizeScale(input = DEFAULT_SCALE) {
    const value = Number(input);
    if (!Number.isFinite(value)) return DEFAULT_SCALE;
    return Math.min(Math.max(value, 0.5), 2);
  }

  function normalizePost(post = {}, index = 0) {
    const id = post.id || `post-${Date.now()}-${index}`;
    const date = post.date || new Date().toISOString().slice(0, 10);
    const textForRead = `${post.excerpt || ''}\n${post.content || ''}\n${post.title || ''}`;
    const read = post.read || formatReadTime(estimateReadMinutes(textForRead));
    const excerpt = post.excerpt || '';
    const content = post.content || excerpt || '本文がまだ登録されていません。';
    const imageFocus = normalizeFocus(post.imageFocus, post.imagePosition);
    const focusCenter = Math.round((imageFocus.start + imageFocus.end) / 2);
    const imagePosition = Number.isFinite(Number(post.imagePosition)) ? Math.min(Math.max(Number(post.imagePosition), 0), 100) : focusCenter;
    const imageScale = normalizeScale(post.imageScale);
    const theme = resolveTheme(post.theme || readSiteTheme() || DEFAULT_THEME).key;
    const isFeatured = post.isFeatured !== false;
    const isDigest = post.isDigest !== false;
    const hidden = post.hidden === true;
    const order = Number.isFinite(Number(post.order)) ? Number(post.order) : index;
    return {
      id,
      title: post.title || '無題の投稿',
      date,
      read,
      excerpt,
      content,
      image: post.image || '',
      tags: normalizeTags(post.tags),
      imagePosition,
      imageFocus,
      imageScale,
      theme,
      isFeatured,
      isDigest,
      hidden,
      order,
    };
  }

  function savePosts(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  function readPosts() {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      console.warn('投稿データの読み込みに失敗しました。初期データを使用します。', error);
      savePosts(defaultPosts);
      return [...defaultPosts];
    }

    if (!Array.isArray(stored) || stored.length === 0) {
      const normalizedDefaults = clampFeaturedAndDigest(defaultPosts.map((post, index) => normalizePost(post, index)));
      savePosts(normalizedDefaults);
      return normalizedDefaults;
    }

    const normalized = stored.map((post, index) => normalizePost(post, index)).sort((a, b) => (a.order || 0) - (b.order || 0));
    const clamped = clampFeaturedAndDigest(normalized);
    savePosts(clamped);
    return clamped;
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.BlogData = {
    STORAGE_KEY,
    defaultPosts,
    readPosts,
    savePosts,
    normalizePost,
    escapeHtml,
    normalizeTags,
    themes: themePresets,
    resolveTheme,
    readSiteTheme,
    saveSiteTheme,
    applyThemeToDocument,
    estimateReadMinutes,
    formatReadTime,
    normalizeFocus,
    normalizeScale,
  };
})();
