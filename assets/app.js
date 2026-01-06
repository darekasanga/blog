const { readPosts, escapeHtml } = window.BlogData;
const posts = readPosts();
const track = document.getElementById('card-track');
const buttons = document.querySelectorAll('[data-action]');

function renderCards() {
  track.innerHTML = posts
    .map(
      (post) => `
        <article class="card">
          ${
            post.image
              ? `<div class="card-thumb"><img src="${post.image}" alt="${escapeHtml(post.title)}の画像" /></div>`
              : `<div class="card-thumb placeholder" aria-hidden="true"></div>`
          }
          <div class="meta">
            <span>${escapeHtml(post.date)}</span>
            <span>•</span>
            <span>${escapeHtml(post.read)}</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.excerpt)}</p>
          <div class="actions">
            <a class="btn primary full" href="article.html?id=${encodeURIComponent(post.id)}">記事を読む</a>
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
