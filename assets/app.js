const {
  readPosts,
  escapeHtml,
  resolveTheme,
  readSiteTheme,
  saveSiteTheme,
  readSiteSettings,
  applyThemeToDocument,
  themes,
  SITE_SETTINGS_KEY,
} = window.BlogData;
let posts = readPosts();
const track = document.getElementById('card-track');
const buttons = document.querySelectorAll('[data-action]');
const scrollList = document.getElementById('scroll-list');
const listGrid = document.getElementById('list-grid');
const tagMarquee = document.getElementById('tag-marquee');
const siteThemePicker = document.getElementById('site-theme-picker');
const heroSection = document.getElementById('hero-section');
const heroKicker = document.getElementById('hero-kicker');
const featuredSection = document.getElementById('featured');
const digestSection = document.getElementById('digest-section');
const listSection = document.getElementById('article-list');
const heroListLink = document.getElementById('hero-list-link');
const footerListLink = document.getElementById('footer-list-link');
let siteThemeKey = readSiteTheme();
let siteTheme = applyThemeToDocument(siteThemeKey);
const sortedVisiblePosts = () =>
  [...posts].filter((post) => !post.hidden).sort((a, b) => (a.order || 0) - (b.order || 0));
const featuredPosts = () => {
  const visible = sortedVisiblePosts();
  const featured = visible.filter((post) => post.isFeatured);
  const pool = featured.length ? featured : visible;
  return pool.slice(0, 1);
};
const digestPosts = () => {
  const visible = sortedVisiblePosts();
  const digest = visible.filter((post) => post.isDigest);
  const pool = digest.length ? digest : visible;
  return pool.slice(0, 2);
};

function applySiteTheme(themeKey) {
  siteThemeKey = saveSiteTheme(themeKey);
  siteTheme = applyThemeToDocument(siteThemeKey);
}

applySiteTheme(siteThemeKey);

function applyHomeSettings() {
  const settings = readSiteSettings();
  if (heroKicker) {
    heroKicker.textContent = settings.heroKicker;
  }
  if (heroSection) heroSection.hidden = !settings.showHero;
  if (featuredSection) featuredSection.hidden = !settings.showFeatured;
  if (digestSection) digestSection.hidden = !settings.showDigest;
  if (listSection) listSection.hidden = !settings.showList;
  [heroListLink, footerListLink].forEach((link) => {
    if (link) link.hidden = !settings.showList;
  });
}

const tagPalette = ['#6c63ff', '#4fc3f7', '#ffb347', '#ff6b6b', '#9b72ff', '#4ef2c7', '#f2c14e'];
const lightbox = document.createElement('div');
lightbox.className = 'lightbox hidden';
lightbox.innerHTML = '<img alt=\"拡大画像\" />';
document.body.appendChild(lightbox);

function renderTags(tags = []) {
  if (!tagMarquee) return;
  const visible = sortedVisiblePosts();
  const allTags = Array.from(
    new Set(
      visible
        .map((post) => post.tags || [])
        .flat()
        .filter(Boolean)
    )
  );

  if (!allTags.length) {
    tagMarquee.innerHTML = '<span class="muted-text">タグがまだありません</span>';
    return;
  }

  const repeated = [...allTags, ...allTags];
  const chips = repeated
    .map((tag, index) => {
      const color = tagPalette[index % tagPalette.length];
      return `<span class="chip" style="--chip-bg:${color}1a;--chip-fg:${color};">#${escapeHtml(tag)}</span>`;
    })
    .join('');

  tagMarquee.innerHTML = `<div class="marquee-track">${chips}</div>`;
}

function themeStyle(post) {
  const theme = resolveTheme(post.theme || siteThemeKey);
  const scale = post.imageScale ?? 1;
  return `--accent:${theme.accent};--accent-2:${theme.accent2};--focus-start:${post.imageFocus?.start ?? 0}%;--focus-end:${post.imageFocus?.end ?? 100}%;--image-scale:${scale};`;
}

function renderCards() {
  if (!track) return;
  const items = featuredPosts();
  if (!items.length) {
    track.innerHTML = '<p class="muted-text">表示できる記事がありません。</p>';
    return;
  }

  track.innerHTML = items
    .map(
      (post) => `
        <article class="card" style="${themeStyle(post)}">
          ${
            post.image
              ? `<div class="card-thumb"><div class="focus-range" aria-hidden="true"></div><img src="${post.image}" alt="${escapeHtml(post.title)}の画像" style="object-position:center ${post.imagePosition ?? 50}%;" /></div>`
              : `<div class="card-thumb placeholder" aria-hidden="true"><div class="focus-range" aria-hidden="true"></div></div>`
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
          <div class="tag-row">${(post.tags || []).map((tag) => `<span class="chip">#${escapeHtml(tag)}</span>`).join('')}</div>
        </article>
      `
    )
    .join('');
}

function renderScrollList() {
  if (!scrollList) return;
  const items = digestPosts();
  if (!items.length) {
    scrollList.innerHTML = '<p class="muted-text">表示できる記事がありません。</p>';
    return;
  }

  scrollList.innerHTML = items
    .map(
      (post) => `
        <article class="scroll-card" style="${themeStyle(post)}">
          <div class="scroll-thumb ${post.image ? '' : 'placeholder'}" style="--image-pos:${post.imagePosition ?? 50}%;--focus-start:${post.imageFocus?.start ?? 0}%;--focus-end:${post.imageFocus?.end ?? 100}%;--image-scale:${post.imageScale ?? 1};">
            ${
              post.image
                ? `<div class="focus-range" aria-hidden="true"></div><img src="${post.image}" alt="${escapeHtml(post.title)}の画像" />`
                : '<div class="focus-range" aria-hidden="true"></div><span class="muted-text">画像未設定</span>'
            }
          </div>
          <div class="scroll-body">
            <p class="meta"><span>${escapeHtml(post.date)}</span><span>•</span><span>${escapeHtml(post.read)}</span></p>
            <h3>${escapeHtml(post.title)}</h3>
            <p class="muted-text">${escapeHtml(post.excerpt)}</p>
            <div class="tag-row">${(post.tags || []).map((tag) => `<span class="chip">#${escapeHtml(tag)}</span>`).join('')}</div>
          </div>
          <a class="stretched-link" href="article.html?id=${encodeURIComponent(post.id)}" aria-label="${escapeHtml(post.title)}を読む"></a>
        </article>
      `
    )
    .join('');
}

function renderListGrid() {
  if (!listGrid) return;
  const items = sortedVisiblePosts();
  if (!items.length) {
    listGrid.innerHTML = '<p class="muted-text">表示できる記事がありません。</p>';
    return;
  }

  const latestItems = items.slice(0, 2);
  const remainingItems = items.slice(2);

  const digestMarkup = latestItems
    .map(
      (post) => `
        <article class="scroll-card" style="${themeStyle(post)}">
          <div class="scroll-thumb ${post.image ? '' : 'placeholder'}" style="--image-pos:${post.imagePosition ?? 50}%;--focus-start:${post.imageFocus?.start ?? 0}%;--focus-end:${post.imageFocus?.end ?? 100}%;--image-scale:${post.imageScale ?? 1};">
            ${
              post.image
                ? `<div class="focus-range" aria-hidden="true"></div><img src="${post.image}" alt="${escapeHtml(post.title)}の画像" />`
                : '<div class="focus-range" aria-hidden="true"></div><span class="muted-text">画像未設定</span>'
            }
          </div>
          <div class="scroll-body">
            <p class="meta"><span>${escapeHtml(post.date)}</span><span>•</span><span>${escapeHtml(post.read)}</span></p>
            <h3>${escapeHtml(post.title)}</h3>
            <p class="muted-text">${escapeHtml(post.excerpt)}</p>
            <div class="tag-row">${(post.tags || []).map((tag) => `<span class="chip">#${escapeHtml(tag)}</span>`).join('')}</div>
          </div>
          <a class="stretched-link" href="article.html?id=${encodeURIComponent(post.id)}" aria-label="${escapeHtml(post.title)}を読む"></a>
        </article>
      `
    )
    .join('');

  const gridMarkup = remainingItems
    .map((post) => {
      const theme = resolveTheme(post.theme || siteThemeKey);
      const imagePos = post.imagePosition ?? 50;
      const imageScale = post.imageScale ?? 1;
      return `
        <article class="gallery-card" style="--accent:${theme.accent};--accent-2:${theme.accent2};">
          <a class="gallery-link" href="article.html?id=${encodeURIComponent(post.id)}">
            ${
              post.image
                ? `<div class="gallery-thumb"><img src="${post.image}" alt="${escapeHtml(post.title)}の画像" style="object-position:center ${imagePos}%;--image-scale:${imageScale};" /></div>`
                : '<div class="gallery-thumb placeholder"><span class="muted-text">画像未設定</span></div>'
            }
            <div class="gallery-body">
              <p class="meta"><span>${escapeHtml(post.date)}</span><span>•</span><span>${escapeHtml(post.read)}</span></p>
              <h3>${escapeHtml(post.title)}</h3>
              <p class="muted-text">${escapeHtml(post.excerpt)}</p>
            </div>
          </a>
        </article>
      `;
    })
    .join('');

  listGrid.innerHTML = `
    ${latestItems.length ? `<div class="scroll-list">${digestMarkup}</div>` : ''}
    ${remainingItems.length ? `<div class="gallery-grid three-column">${gridMarkup}</div>` : ''}
  `;
}

function scrollByAmount(direction) {
  if (!track) return;
  const cardWidth = track.firstElementChild?.getBoundingClientRect().width || 280;
  track.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
}

function setupButtons() {
  buttons.forEach((btn) => {
    const dir = btn.dataset.action === 'next' ? 1 : -1;
    btn.addEventListener('click', () => scrollByAmount(dir));
  });
}

function openLightbox(src, alt) {
  const img = lightbox.querySelector('img');
  img.src = src;
  img.alt = alt || '拡大画像';
  lightbox.classList.remove('hidden');
}

function setupLightbox() {
  lightbox.addEventListener('click', () => {
    lightbox.classList.add('hidden');
  });

  function bindImages(selector) {
    document.querySelectorAll(selector).forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', (event) => {
        event.preventDefault();
        openLightbox(img.src, img.alt);
      });
    });
  }

  bindImages('.card-thumb img');
  bindImages('.scroll-thumb img');
}

function syncThemePicker() {
  if (!siteThemePicker) return;
  const select = siteThemePicker.querySelector('select');
  if (select) {
    select.value = siteThemeKey;
  }
}

function renderSiteThemePicker() {
  if (!siteThemePicker) return;
  siteThemePicker.innerHTML = `
    <label for="site-theme-select">表示テーマ</label>
    <select id="site-theme-select" aria-label="表示テーマを選択">
      ${themes.map((theme) => `<option value="${theme.key}">${theme.name}</option>`).join('')}
    </select>
  `;

  const select = siteThemePicker.querySelector('select');
  select.value = siteThemeKey;
  select.addEventListener('change', () => {
    applySiteTheme(select.value);
    renderCards();
    renderScrollList();
    renderListGrid();
  });
}

function reloadPosts() {
  posts = readPosts();
  renderCards();
  renderScrollList();
  renderTags();
  renderListGrid();
}

window.addEventListener('storage', (event) => {
  if (event.key === window.BlogData.STORAGE_KEY) {
    reloadPosts();
  }
  if (event.key === SITE_SETTINGS_KEY) {
    applyHomeSettings();
  }
});

applyHomeSettings();
renderCards();
setupButtons();
renderScrollList();
renderTags();
renderListGrid();
setupLightbox();
renderSiteThemePicker();
syncThemePicker();
