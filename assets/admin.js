(async () => {
  const {
    readPosts,
    savePosts,
    normalizePost,
    escapeHtml,
    readSiteTheme,
    resolveTheme,
    applyThemeToDocument,
    saveSiteTheme,
    readSiteSettings,
    saveSiteSettings,
    themes,
    estimateReadMinutes,
    formatReadTime,
    normalizeFocus,
    normalizeScale,
    summarizeContent,
    DEFAULT_HERO_SETTINGS,
  } = window.BlogData;

  const adminMode = document.body.dataset.adminMode || 'post';
  const isEditMode = adminMode === 'edit';
  const ADMIN_AUTH_KEY = 'admin-authenticated';

  function ensureAdminAuth() {
    if (sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true') {
      return true;
    }
    window.location.href = './login.html';
    return false;
  }

  if (!ensureAdminAuth()) return;

  const form = document.getElementById('post-form');
  const titleEl = document.getElementById('title');
  const dateEl = document.getElementById('date');
  const readEl = document.getElementById('read');
  const contentEl = document.getElementById('content');
  const tagsEl = document.getElementById('tags');
  const focusStartEl = document.getElementById('focus-start');
  const focusEndEl = document.getElementById('focus-end');
  const postList = document.getElementById('post-list');
  const postCount = document.getElementById('post-count');
  const cancelEditButton = document.getElementById('cancel-edit');
  const submitButton = document.getElementById('submit-button');
  const themeOptionsEl = document.getElementById('theme-options');
  const currentThemeLabel = document.getElementById('current-theme-label');
  const currentThemePill = document.getElementById('current-theme-pill');
  const toggleHero = document.getElementById('toggle-hero');
  const toggleFeatured = document.getElementById('toggle-featured');
  const editHint = document.getElementById('edit-hint');
  const featuredCount = document.getElementById('featured-count');
  const siteTitleInput = document.getElementById('site-title');
  const footerDescriptionInput = document.getElementById('footer-description');
  const heroOverlayInput = document.getElementById('hero-overlay');
  const heroOverlayLabel = document.getElementById('hero-overlay-label');
  const heroOverlayStartInput = document.getElementById('hero-overlay-start');
  const heroOverlayStartLabel = document.getElementById('hero-overlay-start-label');
  const heroOverlayEndInput = document.getElementById('hero-overlay-end');
  const heroOverlayEndLabel = document.getElementById('hero-overlay-end-label');
  const heroPositionInput = document.getElementById('hero-position');
  const heroPositionLabel = document.getElementById('hero-position-label');
  const resultMessage = document.getElementById('result-message');
  const siteTitleTargets = document.querySelectorAll('[data-site-title]');
  const footerDescriptionTargets = document.querySelectorAll('[data-footer-description]');

  const previewTitle = document.getElementById('preview-title');
  const previewDate = document.getElementById('preview-date');
  const previewRead = document.getElementById('preview-read');
  const previewExcerpt = document.getElementById('preview-excerpt');
  const previewThumb = document.getElementById('preview-thumb');
  const previewCard = document.getElementById('preview-card');
  const previewHero = document.getElementById('preview-hero');
  const previewHeroImage = document.getElementById('preview-hero-image');
  const previewHeroKicker = document.getElementById('preview-hero-kicker');
  const previewHeroTitle = document.getElementById('preview-hero-title');
  const previewHeroLead = document.getElementById('preview-hero-lead');
  const previewTags = document.createElement('div');
  const imageEl = document.getElementById('image');
  const siteThemePicker = document.getElementById('site-theme-picker');
  const imageScaleEl = document.getElementById('image-scale');
  const imageScaleLabel = document.getElementById('image-scale-label');

  if (!form) return;

  previewTags.className = 'tag-row';
  if (previewThumb) {
    previewThumb.insertAdjacentElement('afterend', previewTags);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dateEl) dateEl.value = today;
  if (previewDate) previewDate.textContent = today;

  let resizedImageData = '';
  let posts = readPosts().sort((a, b) => (a.order || 0) - (b.order || 0));
  let editingId = null;
  let siteThemeKey = readSiteTheme();
  let siteTheme = applyThemeToDocument(siteThemeKey);
  let selectedTheme = resolveTheme(siteThemeKey);

  function syncThemeOptions() {
    if (!themeOptionsEl) return;
    themeOptionsEl.querySelectorAll('.theme-option').forEach((option) => {
      const isActive = option.dataset.theme === selectedTheme.key;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyArticleTheme(themeKey) {
    selectedTheme = resolveTheme(themeKey);
    const { accent, accent2, name } = selectedTheme;
    if (previewCard) {
      previewCard.style.setProperty('--accent', accent);
      previewCard.style.setProperty('--accent-2', accent2);
    }
    if (currentThemePill) {
      currentThemePill.style.setProperty('--accent', accent);
      currentThemePill.style.setProperty('--accent-2', accent2);
    }
    if (currentThemeLabel) currentThemeLabel.textContent = name;
    syncThemeOptions();
  }

  function syncSiteThemePicker() {
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
      siteThemeKey = saveSiteTheme(select.value);
      siteTheme = applyThemeToDocument(siteThemeKey);
      if (!editingId || !isEditMode) {
        applyArticleTheme(siteThemeKey);
        updatePreview();
      }
    });
  }

  function renderThemeOptions() {
    if (!themeOptionsEl) return;
    themeOptionsEl.innerHTML = themes
      .map(
        (theme) => `
          <button class="theme-option" type="button" data-theme="${theme.key}" style="--accent:${theme.accent};--accent-2:${theme.accent2};" aria-pressed="${theme.key === selectedTheme.key}">
            <span class="swatch" aria-hidden="true"></span>
            <div>
              <strong>${theme.name}</strong>
              <small>${theme.accent} → ${theme.accent2}</small>
            </div>
          </button>
        `
      )
      .join('');

    themeOptionsEl.querySelectorAll('.theme-option').forEach((option) => {
      option.addEventListener('click', () => {
        applyArticleTheme(option.dataset.theme);
        updatePreview();
      });
    });
  }

  function removeLongVacationButtons() {
    document.querySelectorAll('button').forEach((button) => {
      if (button.textContent.trim() === '長期休暇') {
        button.remove();
      }
    });
  }

  removeLongVacationButtons();

  function applySiteText(settings) {
    siteTitleTargets.forEach((el) => {
      el.textContent = settings.siteTitle;
    });
    footerDescriptionTargets.forEach((el) => {
      el.textContent = settings.footerDescription;
    });
  }

  function syncHomeSettingsForm() {
    const settings = readSiteSettings();
    if (toggleHero) toggleHero.checked = settings.showHero;
    if (toggleFeatured) toggleFeatured.checked = settings.showFeatured;
    if (siteTitleInput) siteTitleInput.value = settings.siteTitle;
    if (footerDescriptionInput) footerDescriptionInput.value = settings.footerDescription;
    applySiteText(settings);
  }

  function persistHomeSettings() {
    const settings = saveSiteSettings({
      showHero: toggleHero?.checked,
      showFeatured: toggleFeatured?.checked,
    });
    applySiteText(settings);
  }

  function persistSiteInfo() {
    const settings = saveSiteSettings({
      siteTitle: siteTitleInput?.value,
      footerDescription: footerDescriptionInput?.value,
    });
    if (siteTitleInput) siteTitleInput.value = settings.siteTitle;
    if (footerDescriptionInput) footerDescriptionInput.value = settings.footerDescription;
    applySiteText(settings);
  }

  function persistPosts(nextPosts) {
    const ordered = nextPosts.map((post, index) => ({ ...post, order: index }));
    posts = ordered.map((post, index) => ({ ...post, order: index }));
    savePosts(posts);
  }

  persistPosts(posts);

  function movePost(id, offset) {
    const index = posts.findIndex((post) => post.id === id);
    if (index < 0) return;
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= posts.length) return;
    const updated = [...posts];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    persistPosts(updated);
    renderPostList();
  }

  function movePostToTop(id) {
    const index = posts.findIndex((post) => post.id === id);
    if (index < 0) return;
    const updated = [...posts];
    const [item] = updated.splice(index, 1);
    updated.unshift(item);
    persistPosts(updated);
    renderPostList();
  }

  function updatePostFlag(id, key, value) {
    if (key === 'isFeatured' && value) {
      const featuredCount = posts.filter((post) => post.isFeatured).length;
      if (featuredCount >= 30) {
        alert('注目の記事は最大30件までです。');
        renderPostList();
        return;
      }
    }

    const updated = posts.map((post) => (post.id === id ? { ...post, [key]: value } : post));
    persistPosts(updated);
    renderPostList();
  }

  function resolveHeroPreviewSettings() {
    const overlayInput = Number(heroOverlayInput?.value);
    const overlayStartInput = Number(heroOverlayStartInput?.value);
    const overlayEndInput = Number(heroOverlayEndInput?.value);
    const positionInput = Number(heroPositionInput?.value);
    const overlayOpacity = Number.isFinite(overlayInput) ? Math.min(Math.max(overlayInput, 0), 100) : DEFAULT_HERO_SETTINGS.overlayOpacity;
    let overlayStart = Number.isFinite(overlayStartInput) ? Math.min(Math.max(overlayStartInput, 0), 100) : DEFAULT_HERO_SETTINGS.overlayStart;
    let overlayEnd = Number.isFinite(overlayEndInput) ? Math.min(Math.max(overlayEndInput, 0), 100) : DEFAULT_HERO_SETTINGS.overlayEnd;
    if (overlayEnd - overlayStart < 5) {
      if (overlayEnd >= 100) {
        overlayStart = Math.max(overlayEnd - 5, 0);
      } else {
        overlayEnd = Math.min(overlayStart + 5, 100);
      }
    }
    const imagePosition = Number.isFinite(positionInput) ? Math.min(Math.max(positionInput, 0), 100) : DEFAULT_HERO_SETTINGS.imagePosition;
    const imageScale = normalizeScale(Number(imageScaleEl?.value));
    return { overlayOpacity, overlayStart, overlayEnd, imagePosition, imageScale };
  }

  function updateHeroPreview() {
    if (!previewHero) return;
    const { overlayOpacity, overlayStart, overlayEnd, imagePosition, imageScale } = resolveHeroPreviewSettings();
    const overlayStrong = overlayOpacity / 100;
    const overlayWeak = Math.min(Math.max(overlayStrong * 0.35, 0), 1);
    previewHero.style.setProperty('--hero-overlay-strong', overlayStrong.toFixed(2));
    previewHero.style.setProperty('--hero-overlay-weak', overlayWeak.toFixed(2));
    previewHero.style.setProperty('--hero-overlay-start', `${overlayStart}%`);
    previewHero.style.setProperty('--hero-overlay-end', `${overlayEnd}%`);
    previewHero.style.setProperty('--hero-image-position', `${imagePosition}%`);
    previewHero.style.setProperty('--hero-image-scale', imageScale);
    if (heroOverlayStartInput) heroOverlayStartInput.value = String(Math.round(overlayStart));
    if (heroOverlayEndInput) heroOverlayEndInput.value = String(Math.round(overlayEnd));
    if (previewHeroTitle) previewHeroTitle.textContent = previewTitle?.textContent || '無題の投稿';
    if (previewHeroLead) previewHeroLead.textContent = previewExcerpt?.textContent || '本文からAIが要約します。';
    if (previewHeroKicker) {
      previewHeroKicker.textContent = `最新記事プレビュー ${previewDate?.textContent || today}`;
    }
    if (heroOverlayLabel) heroOverlayLabel.textContent = `${Math.round(overlayOpacity)}%`;
    if (heroOverlayStartLabel) heroOverlayStartLabel.textContent = `${Math.round(overlayStart)}%`;
    if (heroOverlayEndLabel) heroOverlayEndLabel.textContent = `${Math.round(overlayEnd)}%`;
    if (heroPositionLabel) heroPositionLabel.textContent = `${Math.round(imagePosition)}%`;
    if (resizedImageData) {
      previewHero.classList.add('has-image');
      if (previewHeroImage) {
        previewHeroImage.src = resizedImageData;
        previewHeroImage.alt = `${previewHeroTitle?.textContent || '無題の投稿'}の画像`;
      }
    } else {
      previewHero.classList.remove('has-image');
      if (previewHeroImage) {
        previewHeroImage.src = '';
        previewHeroImage.alt = '';
      }
    }
  }

  function updatePreview() {
    if (!previewTitle || !previewDate || !previewRead || !previewExcerpt || !previewThumb) return;
    previewTitle.textContent = titleEl?.value || '無題の投稿';
    previewDate.textContent = dateEl?.value || today;
    previewRead.textContent = readEl?.value || '5 min';
    const summary = summarizeContent(contentEl?.value || '');
    previewExcerpt.textContent = summary || '本文からAIが要約します。';
    const tags = window.BlogData.normalizeTags((tagsEl?.value || '').split(','));
    previewTags.innerHTML = tags.map((tag) => `<span class="chip">#${window.BlogData.escapeHtml(tag)}</span>`).join('');
    const focus = normalizeFocus({ start: Number(focusStartEl?.value), end: Number(focusEndEl?.value) });
    const focusCenter = Math.round((focus.start + focus.end) / 2);
    previewThumb.style.setProperty('--focus-start', `${focus.start}%`);
    previewThumb.style.setProperty('--focus-end', `${focus.end}%`);
    const scale = normalizeScale(Number(imageScaleEl?.value));
    previewThumb.style.setProperty('--image-scale', scale);
    if (imageScaleLabel) {
      imageScaleLabel.textContent = `${scale.toFixed(2)}x`;
    }

    if (resizedImageData) {
      previewThumb.innerHTML = `<div class="focus-range" aria-hidden="true"></div><img src="${resizedImageData}" alt="${escapeHtml(previewTitle.textContent)}の画像" style="object-position:center ${focusCenter}%" />`;
      previewThumb.classList.remove('placeholder');
      previewThumb.removeAttribute('aria-hidden');
    } else {
      previewThumb.innerHTML = '<div class="focus-range" aria-hidden="true"></div><span class="muted-text">画像未設定</span>';
      previewThumb.classList.add('placeholder');
      previewThumb.setAttribute('aria-hidden', 'true');
    }
    updateHeroPreview();
  }

  function updateReadTime() {
    if (!readEl || !previewRead) return;
    const minutes = estimateReadMinutes(`${titleEl?.value || ''}\n${contentEl?.value || ''}`);
    const label = formatReadTime(minutes);
    readEl.value = label;
    previewRead.textContent = label;
  }

  function downscaleImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1200;
          const maxHeight = 1200;
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderPostList() {
    if (!postList || !postCount) return;
    if (!posts.length) {
      postCount.textContent = 'まだ投稿がありません。';
      postList.innerHTML = '<p class="muted-text">投稿を追加するとここに表示されます。</p>';
      if (featuredCount) {
        featuredCount.textContent = '注目の記事: 0件 / 30件';
      }
      return;
    }

    postCount.textContent = `${posts.length}件の投稿`;
    postList.innerHTML = posts
      .map((post, index) => {
        const theme = resolveTheme(post.theme);
        return `
          <article class="manage-card" data-id="${post.id}" style="--accent:${theme.accent};--accent-2:${theme.accent2};">
            <div class="manage-summary">
              <p class="meta"><span>${escapeHtml(post.date)}</span><span>•</span><span>${escapeHtml(post.read)}</span></p>
              <h3>${escapeHtml(post.title)}</h3>
              <p class="muted-text">${escapeHtml(post.excerpt)}</p>
              <div class="theme-pill" aria-label="テーマ ${escapeHtml(theme.name)}">
                <span class="swatch"></span>
                <strong>${escapeHtml(theme.name)}</strong>
              </div>
              <div class="status-row">
                <span class="pill ${post.hidden ? 'pill-muted' : 'pill-positive'}">${post.hidden ? '非表示' : '表示中'}</span>
                <span class="pill pill-accent ${post.isFeatured ? '' : 'pill-muted'}">注目</span>
                <span class="pill pill-outline">順番 ${index + 1}</span>
              </div>
              <div class="tag-row">${(post.tags || []).map((tag) => `<span class="chip">#${escapeHtml(tag)}</span>`).join('')}</div>
            </div>
            <div class="manage-flags">
              <label class="flag-toggle">
                <input type="checkbox" data-action="toggle" data-field="isFeatured" ${post.isFeatured ? 'checked' : ''} />
                <span>注目に設定</span>
              </label>
              <label class="flag-toggle">
                <input type="checkbox" data-action="toggle" data-field="hidden" ${post.hidden ? 'checked' : ''} />
                <span>非表示にする</span>
              </label>
            </div>
            <div class="manage-actions">
              <div class="order-controls" aria-label="表示順の操作">
                <button class="btn ghost" type="button" data-action="move-top">一番上へ</button>
                <div class="order-stack">
                  <button class="btn ghost" type="button" data-action="move-up">▲</button>
                  <button class="btn ghost" type="button" data-action="move-down">▼</button>
                </div>
              </div>
              <a class="btn ghost" href="../article.html?id=${encodeURIComponent(post.id)}">記事を表示</a>
              <button class="btn primary" type="button" data-action="edit">編集</button>
              <button class="btn danger" type="button" data-action="delete">削除</button>
            </div>
          </article>
        `;
      })
      .join('');

    postList.querySelectorAll('button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const postId = button.closest('[data-id]')?.dataset.id;
        if (postId) {
          startEdit(postId);
        }
      });
    });

    postList.querySelectorAll('button[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', () => {
        const postId = button.closest('[data-id]')?.dataset.id;
        if (postId) {
          deletePost(postId);
        }
      });
    });

    postList.querySelectorAll('input[data-action="toggle"]').forEach((input) => {
      input.addEventListener('change', () => {
        const postId = input.closest('[data-id]')?.dataset.id;
        if (!postId) return;
        const field = input.dataset.field;
        const value = input.checked;
        updatePostFlag(postId, field, value);
      });
    });

    postList.querySelectorAll('button[data-action="move-up"]').forEach((button) => {
      button.addEventListener('click', () => {
        const postId = button.closest('[data-id]')?.dataset.id;
        if (postId) {
          movePost(postId, -1);
        }
      });
    });

    postList.querySelectorAll('button[data-action="move-down"]').forEach((button) => {
      button.addEventListener('click', () => {
        const postId = button.closest('[data-id]')?.dataset.id;
        if (postId) {
          movePost(postId, 1);
        }
      });
    });

    postList.querySelectorAll('button[data-action="move-top"]').forEach((button) => {
      button.addEventListener('click', () => {
        const postId = button.closest('[data-id]')?.dataset.id;
        if (postId) {
          movePostToTop(postId);
        }
      });
    });

    if (featuredCount) {
      const count = posts.filter((post) => post.isFeatured).length;
      featuredCount.textContent = `注目の記事: ${count}件 / 30件`;
    }
  }

  function resetForm() {
    form.reset();
    resizedImageData = '';
    editingId = null;
    if (submitButton) {
      submitButton.textContent = isEditMode ? '変更を保存' : '記事を登録';
      if (isEditMode) {
        submitButton.disabled = true;
      }
    }
    if (cancelEditButton) cancelEditButton.hidden = true;
    if (editHint) editHint.hidden = !isEditMode;
    if (dateEl) dateEl.value = today;
    if (tagsEl) tagsEl.value = '';
    if (focusStartEl) focusStartEl.value = '20';
    if (focusEndEl) focusEndEl.value = '80';
    if (imageScaleEl) imageScaleEl.value = '1';
    if (heroOverlayInput) heroOverlayInput.value = String(DEFAULT_HERO_SETTINGS.overlayOpacity);
    if (heroOverlayStartInput) heroOverlayStartInput.value = String(DEFAULT_HERO_SETTINGS.overlayStart);
    if (heroOverlayEndInput) heroOverlayEndInput.value = String(DEFAULT_HERO_SETTINGS.overlayEnd);
    if (heroPositionInput) heroPositionInput.value = String(DEFAULT_HERO_SETTINGS.imagePosition);
    applyArticleTheme(siteThemeKey);
    updatePreview();
    updateReadTime();
  }

  function showResultMessage(message, tone = 'success') {
    if (!resultMessage) return;
    resultMessage.textContent = message;
    resultMessage.classList.remove('success', 'error');
    resultMessage.classList.add(tone);
    resultMessage.hidden = false;
  }

  function clearResultMessage() {
    if (!resultMessage) return;
    resultMessage.textContent = '';
    resultMessage.classList.remove('success', 'error');
    resultMessage.hidden = true;
  }

  function startEdit(id) {
    const target = posts.find((post) => post.id === id);
    if (!target) {
      return;
    }

    editingId = id;
    clearResultMessage();
    if (titleEl) titleEl.value = target.title;
    if (dateEl) dateEl.value = target.date;
    if (readEl) readEl.value = target.read;
    if (contentEl) contentEl.value = target.content || '';
    resizedImageData = target.image || '';
    if (tagsEl) tagsEl.value = (target.tags || []).join(', ');
    const focus = normalizeFocus(target.imageFocus, target.imagePosition);
    if (focusStartEl) focusStartEl.value = focus.start;
    if (focusEndEl) focusEndEl.value = focus.end;
    if (imageScaleEl) imageScaleEl.value = normalizeScale(target.imageScale);
    if (heroOverlayInput) heroOverlayInput.value = String(target.heroOverlayOpacity ?? DEFAULT_HERO_SETTINGS.overlayOpacity);
    if (heroOverlayStartInput) heroOverlayStartInput.value = String(target.heroOverlayStart ?? DEFAULT_HERO_SETTINGS.overlayStart);
    if (heroOverlayEndInput) heroOverlayEndInput.value = String(target.heroOverlayEnd ?? DEFAULT_HERO_SETTINGS.overlayEnd);
    if (heroPositionInput) heroPositionInput.value = String(target.heroImagePosition ?? DEFAULT_HERO_SETTINGS.imagePosition);
    applyArticleTheme(target.theme || selectedTheme.key);
    if (submitButton) {
      submitButton.textContent = '変更を保存';
      submitButton.disabled = false;
    }
    if (cancelEditButton) cancelEditButton.hidden = false;
    if (editHint) editHint.hidden = true;
    updatePreview();
    updateReadTime();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deletePost(id) {
    const target = posts.find((post) => post.id === id);
    if (!target) return;
    const confirmed = window.confirm(`「${target.title}」を削除しますか？`);
    if (!confirmed) return;
    const remaining = posts.filter((post) => post.id !== id);
    persistPosts(remaining);
    if (editingId === id) {
      resetForm();
    }
    renderPostList();
  }

  [titleEl, dateEl, contentEl, tagsEl].filter(Boolean).forEach((el) => {
    el.addEventListener('input', () => {
      updateReadTime();
      updatePreview();
    });
  });

  [focusStartEl, focusEndEl].filter(Boolean).forEach((el) => {
    el.addEventListener('input', () => {
      const start = Number(focusStartEl.value);
      const end = Number(focusEndEl.value);
      if (end - start < 5) {
        if (el === focusStartEl) {
          focusEndEl.value = Math.min(100, start + 5);
        } else {
          focusStartEl.value = Math.max(0, end - 5);
        }
      }
      updatePreview();
    });
  });

  if (imageScaleEl) {
    imageScaleEl.addEventListener('input', () => {
      updatePreview();
    });
  }

  [heroOverlayInput, heroOverlayStartInput, heroOverlayEndInput, heroPositionInput].filter(Boolean).forEach((input) => {
    input.addEventListener('input', () => {
      updatePreview();
    });
  });

  if (imageEl) {
    imageEl.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        resizedImageData = editingId ? posts.find((p) => p.id === editingId)?.image || '' : '';
        updatePreview();
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        imageEl.value = '';
        return;
      }

      try {
        resizedImageData = await downscaleImage(file);
        updatePreview();
      } catch (error) {
        console.error(error);
        alert('画像の読み込みに失敗しました。別のファイルでお試しください。');
        resizedImageData = editingId ? posts.find((p) => p.id === editingId)?.image || '' : '';
        updatePreview();
      }
    });
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener('click', resetForm);
  }

  [toggleHero, toggleFeatured].filter(Boolean).forEach((toggle) => {
    toggle.addEventListener('change', persistHomeSettings);
  });
  [siteTitleInput, footerDescriptionInput].filter(Boolean).forEach((input) => {
    input.addEventListener('input', persistSiteInfo);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    updateReadTime();
    updatePreview();

    if (isEditMode && !editingId) {
      showResultMessage('編集する記事を選択してください。', 'error');
      return;
    }

    const title = previewTitle?.textContent.trim() || '';
    const date = previewDate?.textContent.trim() || '';
    const read = previewRead?.textContent.trim() || '';
    const content = contentEl?.value.trim() || '';
    const excerpt = summarizeContent(content);
    const existing = editingId ? posts.find((post) => post.id === editingId) : null;
    const image = resizedImageData || existing?.image || '';
    const tags = window.BlogData.normalizeTags((tagsEl?.value || '').split(','));
    const focus = normalizeFocus({ start: Number(focusStartEl?.value), end: Number(focusEndEl?.value) });
    const imagePosition = Math.round((focus.start + focus.end) / 2);
    const theme = selectedTheme.key;
    const imageScale = normalizeScale(Number(imageScaleEl?.value));
    const heroSettings = resolveHeroPreviewSettings();

    const preparedPost = normalizePost(
      {
        ...(existing || {}),
        id: editingId || `post-${Date.now()}`,
        title,
        date,
        read,
        excerpt,
        content,
        image,
        tags,
        imagePosition,
        imageFocus: focus,
        imageScale,
        theme,
        heroOverlayOpacity: heroSettings.overlayOpacity,
        heroOverlayStart: heroSettings.overlayStart,
        heroOverlayEnd: heroSettings.overlayEnd,
        heroImagePosition: heroSettings.imagePosition,
      },
      posts.length
    );

    const nextPosts = editingId ? posts.map((post) => (post.id === editingId ? preparedPost : post)) : [preparedPost, ...posts];
    persistPosts(nextPosts);
    renderPostList();
    showResultMessage(editingId ? '変更を保存しました。' : '投稿を保存しました。トップページで確認できます。');
    resetForm();
  });

  renderPostList();
  renderThemeOptions();
  renderSiteThemePicker();
  syncSiteThemePicker();
  applyArticleTheme(selectedTheme.key);
  updateReadTime();
  updatePreview();
  syncHomeSettingsForm();

  if (isEditMode && submitButton) {
    submitButton.disabled = true;
  }
})();
