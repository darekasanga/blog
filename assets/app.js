const posts = [
  {
    title: 'デザインシステムで統一感を作る',
    date: '2024-05-28',
    read: '5 min',
    excerpt: '色・余白・コンポーネントを揃え、プロダクト全体の体験を向上させる方法をまとめました。',
  },
  {
    title: 'Jamstackで高速なブログを構築する',
    date: '2024-05-15',
    read: '7 min',
    excerpt: 'ビルドと配信を最適化し、安定したパフォーマンスを維持するためのベストプラクティス。',
  },
  {
    title: 'マイクロコピーでCVRを上げる',
    date: '2024-05-05',
    read: '4 min',
    excerpt: '小さな言葉の改善で大きな成果を生むために意識したいポイントを紹介。',
  },
  {
    title: 'UIモーションの作り方',
    date: '2024-04-28',
    read: '6 min',
    excerpt: 'トランジション、タイミング、フィードバックを整えることでプロダクトの質を高める。',
  },
  {
    title: 'アクセシビリティチェックリスト',
    date: '2024-04-12',
    read: '8 min',
    excerpt: '誰にとっても使いやすいUIを目指すための確認ポイントをまとめました。',
  },
];

const track = document.getElementById('card-track');
const buttons = document.querySelectorAll('[data-action]');

function renderCards() {
  track.innerHTML = posts
    .map(
      (post) => `
        <article class="card">
          <div class="meta">
            <span>${post.date}</span>
            <span>•</span>
            <span>${post.read}</span>
          </div>
          <h3>${post.title}</h3>
          <p>${post.excerpt}</p>
          <div class="actions">
            <a class="btn primary" href="admin/index.html">読む</a>
            <button class="btn ghost" type="button">共有</button>
          </div>
        </article>
      `
    )
    .join('');
}

function scrollByAmount(direction) {
  const cardWidth = track.firstElementChild?.getBoundingClientRect().width || 280;
  track.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
}

function setupButtons() {
  buttons.forEach((btn) => {
    const dir = btn.dataset.action === 'next' ? 1 : -1;
    btn.addEventListener('click', () => scrollByAmount(dir));
  });
}

renderCards();
setupButtons();
