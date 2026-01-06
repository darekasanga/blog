(function () {
  const STORAGE_KEY = 'posts';

  const defaultPosts = [
    {
      id: 'post-design-system',
      title: 'デザインシステムで統一感を作る',
      date: '2024-05-28',
      read: '5 min',
      excerpt: '色・余白・コンポーネントを揃え、プロダクト全体の体験を向上させる方法をまとめました。',
      content: 'デザインシステムは複数プロジェクトを横断して品質を揃えるための基盤です。\nカラーパレットや余白のルール、コンポーネントの指針を小さくても良いので書き残すところから始めましょう。\nデザイナーだけでなく開発者も参照しやすい形にしておくと浸透が早まります。',
      image: '',
    },
    {
      id: 'post-jamstack',
      title: 'Jamstackで高速なブログを構築する',
      date: '2024-05-15',
      read: '7 min',
      excerpt: 'ビルドと配信を最適化し、安定したパフォーマンスを維持するためのベストプラクティス。',
      content: 'JamstackはプリレンダリングとCDN配信で安定した速さを実現できます。\nビルド時間を短縮するために不要な依存を削る、画像を最適化するなどの基本を積み上げましょう。',
      image: '',
    },
    {
      id: 'post-microcopy',
      title: 'マイクロコピーでCVRを上げる',
      date: '2024-05-05',
      read: '4 min',
      excerpt: '小さな言葉の改善で大きな成果を生むために意識したいポイントを紹介。',
      content: 'ボタンやエラー文言の一言で印象は大きく変わります。\n「次へ進む」よりも「お支払いへ進む」のように具体的な行動を示すと迷いを減らせます。',
      image: '',
    },
    {
      id: 'post-ui-motion',
      title: 'UIモーションの作り方',
      date: '2024-04-28',
      read: '6 min',
      excerpt: 'トランジション、タイミング、フィードバックを整えることでプロダクトの質を高める。',
      content: 'モーションは気づかれない程度の小ささで一貫させることが重要です。\n等速ではなく少しだけイージングを加え、遅延を短く保つと軽快に感じます。',
      image: '',
    },
    {
      id: 'post-accessibility',
      title: 'アクセシビリティチェックリスト',
      date: '2024-04-12',
      read: '8 min',
      excerpt: '誰にとっても使いやすいUIを目指すための確認ポイントをまとめました。',
      content: '代替テキスト、十分なコントラスト、フォーカスの明示は最低限おさえましょう。\nチェックリストを用意して継続的に振り返る文化を作ると品質を落としにくくなります。',
      image: '',
    },
  ];

  function normalizePost(post = {}, index = 0) {
    const id = post.id || `post-${Date.now()}-${index}`;
    const date = post.date || new Date().toISOString().slice(0, 10);
    const read = post.read || '5 min';
    const excerpt = post.excerpt || '';
    const content = post.content || excerpt || '本文がまだ登録されていません。';
    return {
      id,
      title: post.title || '無題の投稿',
      date,
      read,
      excerpt,
      content,
      image: post.image || '',
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
      savePosts(defaultPosts);
      return [...defaultPosts];
    }

    const normalized = stored.map((post, index) => normalizePost(post, index));
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
    defaultPosts,
    readPosts,
    savePosts,
    normalizePost,
    escapeHtml,
  };
})();
