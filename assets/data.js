(function () {
  const STORAGE_KEY = 'posts';
  const THEME_STORAGE_KEY = 'site-theme';
  const SITE_SETTINGS_KEY = 'site-settings';

  const themePresets = [
    {
      key: 'violet-ice',
      name: 'バイオレット',
      accent: '#8b5cf6',
      accent2: '#38bdf8',
      background: '#0c0b1d',
      surface: '#15142d',
      panel: '#121024',
      border: '#2a2644',
      muted: '#c6c3e6',
    },
    {
      key: 'sunset',
      name: 'サンセット',
      accent: '#ff5f6d',
      accent2: '#ffc371',
      background: '#2a120a',
      surface: '#3a1a10',
      panel: '#33150d',
      border: '#4b2116',
      muted: '#f5c3b0',
    },
    {
      key: 'forest',
      name: 'フォレスト',
      accent: '#3ddc97',
      accent2: '#0f9d58',
      background: '#0d1a12',
      surface: '#13241a',
      panel: '#101e16',
      border: '#1f3a2a',
      muted: '#c7e2d4',
    },
    {
      key: 'amber-night',
      name: 'アンバー',
      accent: '#f59e0b',
      accent2: '#f97316',
      background: '#1a1309',
      surface: '#241a0c',
      panel: '#1d1509',
      border: '#3a2713',
      muted: '#f2d6a2',
    },
    {
      key: 'aqua',
      name: 'アクア',
      accent: '#22d3ee',
      accent2: '#38bdf8',
      background: '#081a1d',
      surface: '#0d2428',
      panel: '#0b1f23',
      border: '#17333a',
      muted: '#bfe2ea',
    },
    {
      key: 'blush',
      name: 'ブラッシュ',
      accent: '#ec4899',
      accent2: '#f9a8d4',
      background: '#1c0b14',
      surface: '#27101c',
      panel: '#201019',
      border: '#3b1b2a',
      muted: '#f3c5dc',
    },
    {
      key: 'citrus',
      name: 'シトラス',
      accent: '#f97316',
      accent2: '#84cc16',
      background: '#fff7e6',
      surface: '#ffffff',
      panel: '#fff2cc',
      border: '#f3d9a4',
      muted: '#6b4b1e',
    },
    {
      key: 'slate',
      name: 'スレート',
      accent: '#94a3b8',
      accent2: '#60a5fa',
      background: '#111827',
      surface: '#1f2937',
      panel: '#16202b',
      border: '#2f3948',
      muted: '#d1d5db',
    },
    {
      key: 'emerald',
      name: 'エメラルド',
      accent: '#10b981',
      accent2: '#34d399',
      background: '#052016',
      surface: '#0b2b1e',
      panel: '#08251a',
      border: '#144531',
      muted: '#b5e7d0',
    },
    {
      key: 'firefly',
      name: 'ファイアフライ',
      accent: '#c084fc',
      accent2: '#f472b6',
      background: '#120b24',
      surface: '#1b1232',
      panel: '#161028',
      border: '#2f1a4a',
      muted: '#d9c8f5',
    },
  ];

  const DEFAULT_THEME = 'violet-ice';
  const DEFAULT_FOCUS = { start: 20, end: 80 };
  const DEFAULT_SCALE = 1;
  const CHARS_PER_MINUTE = 500;
  const DEFAULT_SITE_SETTINGS = {
    showHero: true,
    showFeatured: true,
  };

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

  function normalizeSiteSettings(settings = {}) {
    return {
      showHero: typeof settings.showHero === 'boolean' ? settings.showHero : DEFAULT_SITE_SETTINGS.showHero,
      showFeatured:
        typeof settings.showFeatured === 'boolean' ? settings.showFeatured : DEFAULT_SITE_SETTINGS.showFeatured,
    };
  }

  function readSiteSettings() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(SITE_SETTINGS_KEY) || '{}');
    } catch (error) {
      console.warn('トップページ設定の読み込みに失敗しました。初期値を使用します。', error);
    }
    const normalized = normalizeSiteSettings(stored);
    localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function saveSiteSettings(nextSettings = {}) {
    const current = readSiteSettings();
    const merged = normalizeSiteSettings({ ...current, ...nextSettings });
    localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(merged));
    return merged;
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
    const isFeatured = post.isFeatured === true;
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
      const normalizedDefaults = defaultPosts.map((post, index) => normalizePost(post, index));
      savePosts(normalizedDefaults);
      return normalizedDefaults;
    }

    const normalized = stored.map((post, index) => normalizePost(post, index)).sort((a, b) => (a.order || 0) - (b.order || 0));
    savePosts(normalized);
    return normalized;
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
    SITE_SETTINGS_KEY,
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
    readSiteSettings,
    saveSiteSettings,
    applyThemeToDocument,
    estimateReadMinutes,
    formatReadTime,
    normalizeFocus,
    normalizeScale,
  };
})();
