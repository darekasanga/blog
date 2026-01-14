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
  DEFAULT_HERO_SETTINGS,
} = window.BlogData;
let posts = readPosts();
const track = document.getElementById('card-track');
const buttons = document.querySelectorAll('[data-action]');
const listGrid = document.getElementById('list-grid');
const siteThemePicker = document.getElementById('site-theme-picker');
const heroSection = document.getElementById('hero-section');
const heroKicker = document.getElementById('hero-kicker');
const featuredSection = document.getElementById('featured');
const listSection = document.getElementById('article-list');
const heroListLink = document.getElementById('hero-list-link');
const footerListLink = document.getElementById('footer-list-link');
const heroTitle = document.getElementById('hero-title');
const heroLead = document.getElementById('hero-lead');
const heroImage = document.getElementById('hero-image');
const siteTitleTargets = document.querySelectorAll('[data-site-title]');
const footerDescriptionTargets = document.querySelectorAll('[data-footer-description]');
let siteThemeKey = readSiteTheme();
let siteTheme = applyThemeToDocument(siteThemeKey);
const sortedVisiblePosts = () =>
  [...posts].filter((post) => !post.hidden).sort((a, b) => (a.order || 0) - (b.order || 0));
const latestVisiblePost = () =>
  [...posts]
    .filter((post) => !post.hidden)
    .sort((a, b) => {
      const aTime = new Date(a.date || 0).getTime();
      const bTime = new Date(b.date || 0).getTime();
      return bTime - aTime;
    })[0];
const featuredPosts = () => {
  const visible = sortedVisiblePosts();
  return visible.filter((post) => post.isFeatured).slice(0, 30);
};

function applySiteTheme(themeKey) {
  siteThemeKey = saveSiteTheme(themeKey);
  siteTheme = applyThemeToDocument(siteThemeKey);
}

applySiteTheme(siteThemeKey);

function applyHomeSettings() {
  const settings = readSiteSettings();
  if (heroSection) heroSection.hidden = !settings.showHero;
  if (featuredSection) featuredSection.hidden = !settings.showFeatured;
  if (listSection) listSection.hidden = false;
  [heroListLink, footerListLink].forEach((link) => {
    if (link) link.hidden = false;
  });
  siteTitleTargets.forEach((el) => {
    el.textContent = settings.siteTitle;
  });
  footerDescriptionTargets.forEach((el) => {
    el.textContent = settings.footerDescription;
  });
}

const lightbox = document.createElement('div');
lightbox.className = 'lightbox hidden';
lightbox.innerHTML = '<img alt=\"拡大画像\" />';
document.body.appendChild(lightbox);

function themeStyle(post) {
  const theme = resolveTheme(post.theme || siteThemeKey);
  const scale = post.cardImageScale ?? post.imageScale ?? 1;
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

function updateHeroContent() {
  const latest = latestVisiblePost();
  if (heroSection) {
    const theme = resolveTheme(latest?.theme || siteThemeKey);
    const overlayValue = Number.isFinite(latest?.heroOverlayOpacity)
      ? latest.heroOverlayOpacity
      : DEFAULT_HERO_SETTINGS.overlayOpacity;
    const overlayStrong = Math.min(Math.max(overlayValue, 0), 100) / 100;
    const overlayWeak = Math.min(Math.max(overlayStrong * 0.35, 0), 1);
    const overlayStart = Number.isFinite(latest?.heroOverlayStart)
      ? latest.heroOverlayStart
      : DEFAULT_HERO_SETTINGS.overlayStart;
    const overlayEnd = Number.isFinite(latest?.heroOverlayEnd)
      ? latest.heroOverlayEnd
      : DEFAULT_HERO_SETTINGS.overlayEnd;
    const imagePosition = Number.isFinite(latest?.heroImagePosition)
      ? latest.heroImagePosition
      : Number.isFinite(latest?.imagePosition)
        ? latest.imagePosition
        : DEFAULT_HERO_SETTINGS.imagePosition;
    const imagePositionX = Number.isFinite(latest?.heroImagePositionX)
      ? latest.heroImagePositionX
      : DEFAULT_HERO_SETTINGS.imagePositionX;
    const imageScale = Number.isFinite(latest?.heroImageScale)
      ? latest.heroImageScale
      : Number.isFinite(latest?.imageScale)
        ? latest.imageScale
        : 1;
    const heroImageFit = latest?.heroImageFit === 'contain' ? 'contain' : DEFAULT_HERO_SETTINGS.imageFit;
    const heroBackgroundColor = latest?.heroBackgroundColor || theme.background || '#0b0c10';
    heroSection.style.setProperty('--hero-overlay-strong', overlayStrong.toFixed(2));
    heroSection.style.setProperty('--hero-overlay-weak', overlayWeak.toFixed(2));
    heroSection.style.setProperty('--hero-overlay-start', `${overlayStart}%`);
    heroSection.style.setProperty('--hero-overlay-end', `${overlayEnd}%`);
    heroSection.style.setProperty('--hero-image-position-x', `${imagePositionX}%`);
    heroSection.style.setProperty('--hero-image-position', `${imagePosition}%`);
    heroSection.style.setProperty('--hero-image-scale', imageScale);
    heroSection.style.setProperty('--hero-image-fit', heroImageFit);
    heroSection.style.setProperty('--hero-background-color', heroBackgroundColor);
  }
  if (!latest) {
    if (heroKicker) heroKicker.textContent = '最新記事';
    if (heroTitle) heroTitle.textContent = 'まだ記事がありません';
    if (heroLead) heroLead.textContent = '記事投稿ページから最初の記事を登録してください。';
    if (heroSection) {
      heroSection.classList.remove('has-image');
    }
    if (heroImage) {
      heroImage.src = '';
      heroImage.alt = '';
    }
    if (heroListLink) {
      heroListLink.href = '#article-list';
      heroListLink.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  if (heroKicker) heroKicker.textContent = `最新記事 ${latest.date}`;
  if (heroTitle) heroTitle.textContent = latest.title;
  if (heroLead) heroLead.textContent = latest.excerpt || '最新記事の概要がまだありません。';
  if (heroSection) {
    if (latest.image) {
      heroSection.classList.add('has-image');
      if (heroImage) {
        heroImage.src = latest.image;
        heroImage.alt = `${latest.title}の画像`;
      }
    } else {
      heroSection.classList.remove('has-image');
      if (heroImage) {
        heroImage.src = '';
        heroImage.alt = '';
      }
    }
  }
  if (heroListLink) {
    heroListLink.href = `article.html?id=${encodeURIComponent(latest.id)}`;
    heroListLink.removeAttribute('aria-disabled');
  }
}


function renderListGrid() {
  if (!listGrid) return;
  const items = sortedVisiblePosts();
  if (!items.length) {
    listGrid.innerHTML = '<p class="muted-text">表示できる記事がありません。</p>';
    return;
  }

  const gridMarkup = items
    .map((post) => {
      const theme = resolveTheme(post.theme || siteThemeKey);
      const imagePos = post.imagePosition ?? 50;
      const imageScale = post.cardImageScale ?? post.imageScale ?? 1;
      const articleLink = `article.html?id=${encodeURIComponent(post.id)}`;
      return `
        <article class="gallery-card" style="--accent:${theme.accent};--accent-2:${theme.accent2};">
          <a class="gallery-link" href="${articleLink}">
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
          <div class="gallery-actions">
            <a class="btn primary full" href="${articleLink}">記事を読む</a>
          </div>
        </article>
      `;
    })
    .join('');

  listGrid.innerHTML = `
    ${gridMarkup ? `<div class="gallery-grid three-column">${gridMarkup}</div>` : ''}
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
    renderListGrid();
  });
}

function reloadPosts() {
  posts = readPosts();
  updateHeroContent();
  renderCards();
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
updateHeroContent();
renderCards();
setupButtons();
renderListGrid();
setupLightbox();
renderSiteThemePicker();
syncThemePicker();
