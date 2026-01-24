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
    hexToRgb,
  } = window.BlogData;

  const adminMode = document.body.dataset.adminMode || 'post';
  const isEditMode = adminMode === 'edit';
  const ADMIN_AUTH_KEY = 'admin-authenticated';
  const ADMIN_AUTH_EXPIRY_KEY = 'admin-authenticated-expires';

  function ensureAdminAuth() {
    const authenticated = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    const expires = Number(sessionStorage.getItem(ADMIN_AUTH_EXPIRY_KEY) || 0);

    if (authenticated && expires && Date.now() < expires) {
      return true;
    }

    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_EXPIRY_KEY);

    const redirectTarget = encodeURIComponent(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    window.location.href = `../admin/login.html?redirect=${redirectTarget}`;
    return false;
  }

  if (!ensureAdminAuth()) return;

  const form = document.getElementById('post-form');
  const titleEl = document.getElementById('title');
  const dateEl = document.getElementById('date');
  const readEl = document.getElementById('read');
  const contentEl = document.getElementById('content');
  const editorToolbars = document.querySelectorAll('[data-editor-toolbar]');
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
  const heroMaskWidthInput = document.getElementById('hero-mask-width');
  const heroMaskWidthLabel = document.getElementById('hero-mask-width-label');
  const heroMaskOpacityInput = document.getElementById('hero-mask-opacity');
  const heroMaskOpacityLabel = document.getElementById('hero-mask-opacity-label');
  const heroMaskColorInput = document.getElementById('hero-mask-color');
  const heroMaskColorLabel = document.getElementById('hero-mask-color-label');
  const heroMaskGradientInput = document.getElementById('hero-mask-gradient');
  const heroMaskGradientLabel = document.getElementById('hero-mask-gradient-label');
  const heroMaskMotionInput = document.getElementById('hero-mask-motion');
  const heroMaskAnimationInput = document.getElementById('hero-mask-animation');
  const heroMaskDurationInput = document.getElementById('hero-mask-duration');
  const heroMaskEaseInput = document.getElementById('hero-mask-ease');
  const heroMaskSampleButtons = document.querySelectorAll('[data-hero-mask-sample]');
  const heroImageMotionInput = document.getElementById('hero-image-motion');
  const heroImageMotionButtons = document.querySelectorAll('[data-hero-image-motion]');
  const heroPositionInput = document.getElementById('hero-position');
  const heroPositionLabel = document.getElementById('hero-position-label');
  const heroPositionXInput = document.getElementById('hero-position-x');
  const heroPositionXLabel = document.getElementById('hero-position-x-label');
  const heroBackgroundColorInput = document.getElementById('hero-background-color');
  const heroBackgroundColorLabel = document.getElementById('hero-background-color-label');
  const heroImageFitEl = document.getElementById('hero-image-fit');
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
  const cardImageScaleEl = document.getElementById('card-image-scale');
  const cardImageScaleLabel = document.getElementById('card-image-scale-label');
  const heroImageScaleEl = document.getElementById('hero-image-scale');
  const heroImageScaleLabel = document.getElementById('hero-image-scale-label');
  const previewModeButtons = document.querySelectorAll('.preview-mode-picker [data-preview-mode]');

  if (!form) return;

  previewTags.className = 'tag-row';
  if (previewThumb) {
    previewThumb.insertAdjacentElement('afterend', previewTags);
  }

  function setPreviewMode(mode) {
    if (previewThumb) {
      previewThumb.dataset.previewMode = mode;
    }
    previewModeButtons.forEach((button) => {
      const isActive = button.dataset.previewMode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  if (previewModeButtons.length) {
    const initialMode =
      Array.from(previewModeButtons).find((button) => button.getAttribute('aria-pressed') === 'true')
        ?.dataset.previewMode || previewModeButtons[0].dataset.previewMode;
    setPreviewMode(initialMode || 'frame');
    previewModeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setPreviewMode(button.dataset.previewMode || 'frame');
      });
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dateEl) dateEl.value = today;
  if (previewDate) previewDate.textContent = today;

  let resizedImageData = '';
  let posts = readPosts().sort((a, b) => (a.order || 0) - (b.order || 0));
  let editingId = null;

  function normalizeHeroImageFit(value) {
    return value === 'contain' ? 'contain' : DEFAULT_HERO_SETTINGS.imageFit;
  }
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
    const maskWidthInput = Number(heroMaskWidthInput?.value);
    const maskOpacityInput = Number(heroMaskOpacityInput?.value);
    const maskGradientInput = Number(heroMaskGradientInput?.value);
    const positionInput = Number(heroPositionInput?.value);
    const positionXInput = Number(heroPositionXInput?.value);
    const maskWidth = Number.isFinite(maskWidthInput)
      ? Math.min(Math.max(maskWidthInput, 0), 100)
      : DEFAULT_HERO_SETTINGS.maskWidth;
    const maskOpacity = Number.isFinite(maskOpacityInput)
      ? Math.min(Math.max(maskOpacityInput, 0), 100)
      : DEFAULT_HERO_SETTINGS.maskOpacity;
    const maskGradient = Number.isFinite(maskGradientInput)
      ? Math.min(Math.max(maskGradientInput, 0), 100)
      : DEFAULT_HERO_SETTINGS.maskGradient;
    const cappedMaskGradient = Math.min(maskGradient, Math.max(0, 100 - maskWidth));
    const imagePosition = Number.isFinite(positionInput) ? Math.min(Math.max(positionInput, 0), 100) : DEFAULT_HERO_SETTINGS.imagePosition;
    const imagePositionX = Number.isFinite(positionXInput) ? Math.min(Math.max(positionXInput, 0), 100) : DEFAULT_HERO_SETTINGS.imagePositionX;
    const heroImageScale = normalizeScale(Number(heroImageScaleEl?.value));
    const heroImageFit = normalizeHeroImageFit(heroImageFitEl?.value);
    const heroImageMotion = heroImageMotionInput?.value || DEFAULT_HERO_SETTINGS.imageMotion;
    const heroBackgroundColor = resolveHeroBackgroundColor(heroBackgroundColorInput?.value);
    const heroMaskColor = resolveHeroMaskColor(heroMaskColorInput?.value);
    const heroMaskMotion = Boolean(heroMaskMotionInput?.checked);
    const heroMaskAnimation = heroMaskAnimationInput?.value || DEFAULT_HERO_SETTINGS.maskAnimation;
    const heroMaskDurationValue = Number(heroMaskDurationInput?.value);
    const heroMaskDuration = Number.isFinite(heroMaskDurationValue) && heroMaskDurationValue > 0
      ? heroMaskDurationValue
      : DEFAULT_HERO_SETTINGS.maskDuration;
    const heroMaskEase = heroMaskEaseInput?.value || DEFAULT_HERO_SETTINGS.maskEase;
    return {
      maskOpacity,
      maskWidth,
      maskGradient: cappedMaskGradient,
      maskFadeEnd: Math.min(100, maskWidth + cappedMaskGradient),
      maskColor: heroMaskColor,
      maskMotion: heroMaskMotion,
      maskAnimation: heroMaskAnimation,
      maskDuration: heroMaskDuration,
      maskEase: heroMaskEase,
      imagePosition,
      imagePositionX,
      heroImageScale,
      heroImageFit,
      heroImageMotion,
      heroBackgroundColor,
    };
  }

  function resolveHeroBackgroundColor(value) {
    const trimmed = String(value || '').trim();
    const fallback = selectedTheme?.background || '#0b0c10';
    if (!trimmed) return fallback;
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed) || /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    return fallback;
  }

  function resolveHeroMaskColor(value) {
    const trimmed = String(value || '').trim();
    const fallback = selectedTheme?.background || DEFAULT_HERO_SETTINGS.maskColor;
    if (!trimmed) return fallback;
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed) || /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    return fallback;
  }

  function updateHeroPreviewAspect() {
    if (!previewHero) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const heroHeightValue = parseFloat(rootStyles.getPropertyValue('--hero-height'));
    const heroHeight = Number.isFinite(heroHeightValue) && heroHeightValue > 0 ? heroHeightValue : 320;
    const heroWidth = Math.max(320, window.innerWidth - 32);
    const previewWidth = previewHero.clientWidth;
    if (!previewWidth) return;
    const previewHeight = (previewWidth * heroHeight) / heroWidth;
    previewHero.style.setProperty('--hero-preview-height', `${previewHeight}px`);
    previewHero.classList.toggle('is-compact', previewHeight < 160);
  }

  function triggerHeroImageMotion(target) {
    if (!target) return;
    target.classList.remove('hero-image-motion');
    void target.offsetWidth;
    target.classList.add('hero-image-motion');
  }

  function updateHeroPreview() {
    if (!previewHero) return;
    const {
      maskOpacity,
      maskWidth,
      maskGradient,
      maskFadeEnd,
      maskColor,
      maskMotion,
      maskAnimation,
      maskDuration,
      maskEase,
      imagePosition,
      imagePositionX,
      heroImageScale,
      heroImageFit,
      heroImageMotion,
      heroBackgroundColor,
    } = resolveHeroPreviewSettings();
    const maskRgb = hexToRgb(maskColor);
    previewHero.style.setProperty('--hero-mask-opacity', (maskOpacity / 100).toFixed(2));
    previewHero.style.setProperty('--hero-mask-width', `${maskWidth}%`);
    previewHero.style.setProperty('--hero-mask-fade-end', `${maskFadeEnd}%`);
    previewHero.style.setProperty('--hero-mask-color', `${maskRgb.r}, ${maskRgb.g}, ${maskRgb.b}`);
    previewHero.style.setProperty('--hero-mask-motion', maskMotion ? 'running' : 'paused');
    previewHero.style.setProperty('--hero-mask-animation', maskAnimation);
    previewHero.style.setProperty('--hero-mask-duration', `${maskDuration}s`);
    previewHero.style.setProperty('--hero-mask-ease', maskEase);
    previewHero.style.setProperty('--hero-image-position-x', `${imagePositionX}%`);
    previewHero.style.setProperty('--hero-image-position', `${imagePosition}%`);
    previewHero.style.setProperty('--hero-image-scale', heroImageScale);
    previewHero.style.setProperty('--hero-image-fit', heroImageFit);
    previewHero.style.setProperty('--hero-image-motion', heroImageMotion);
    previewHero.style.setProperty('--hero-background-color', heroBackgroundColor);
    syncHeroImageMotionButtons(heroImageMotion);
    if (previewHeroTitle) previewHeroTitle.textContent = previewTitle?.textContent || '無題の投稿';
    if (previewHeroLead) previewHeroLead.textContent = previewExcerpt?.textContent || '本文からAIが要約します。';
    if (previewHeroKicker) {
      previewHeroKicker.textContent = `最新記事プレビュー ${previewDate?.textContent || today}`;
    }
    if (heroMaskWidthLabel) heroMaskWidthLabel.textContent = `${Math.round(maskWidth)}%`;
    if (heroMaskOpacityLabel) heroMaskOpacityLabel.textContent = `${Math.round(maskOpacity)}%`;
    if (heroMaskColorLabel) heroMaskColorLabel.textContent = maskColor;
    if (heroMaskGradientLabel) heroMaskGradientLabel.textContent = `${Math.round(maskGradient)}%`;
    if (heroPositionLabel) heroPositionLabel.textContent = `${Math.round(imagePosition)}%`;
    if (heroPositionXLabel) heroPositionXLabel.textContent = `${Math.round(imagePositionX)}%`;
    if (heroImageScaleLabel) heroImageScaleLabel.textContent = `${heroImageScale.toFixed(2)}x`;
    if (heroBackgroundColorLabel) heroBackgroundColorLabel.textContent = heroBackgroundColor;
    if (resizedImageData) {
      previewHero.classList.add('has-image');
      if (previewHeroImage) {
        previewHeroImage.src = resizedImageData;
        previewHeroImage.alt = `${previewHeroTitle?.textContent || '無題の投稿'}の画像`;
      }
      triggerHeroImageMotion(previewHero);
    } else {
      previewHero.classList.remove('has-image', 'hero-image-motion');
      if (previewHeroImage) {
        previewHeroImage.src = '';
        previewHeroImage.alt = '';
      }
    }
  }

  function applyHeroMaskSample(button) {
    if (!button) return;
    if (heroMaskWidthInput && button.dataset.maskWidth) {
      heroMaskWidthInput.value = button.dataset.maskWidth;
    }
    if (heroMaskOpacityInput && button.dataset.maskOpacity) {
      heroMaskOpacityInput.value = button.dataset.maskOpacity;
    }
    if (heroMaskGradientInput && button.dataset.maskGradient) {
      heroMaskGradientInput.value = button.dataset.maskGradient;
    }
    if (heroMaskColorInput && button.dataset.maskColor) {
      heroMaskColorInput.value = button.dataset.maskColor;
    }
    if (heroMaskAnimationInput && button.dataset.maskAnimation) {
      heroMaskAnimationInput.value = button.dataset.maskAnimation;
    }
    if (heroMaskDurationInput && button.dataset.maskDuration) {
      heroMaskDurationInput.value = button.dataset.maskDuration;
    }
    if (heroMaskEaseInput && button.dataset.maskEase) {
      heroMaskEaseInput.value = button.dataset.maskEase;
    }
    if (heroMaskMotionInput) {
      heroMaskMotionInput.checked = true;
    }
    updateHeroPreview();
  }

  heroMaskSampleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyHeroMaskSample(button);
    });
  });

  function applyHeroImageMotionSample(button) {
    if (!button || !heroImageMotionInput) return;
    heroImageMotionInput.value = button.dataset.heroImageMotion || DEFAULT_HERO_SETTINGS.imageMotion;
    syncHeroImageMotionButtons(heroImageMotionInput.value);
    updateHeroPreview();
  }

  heroImageMotionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyHeroImageMotionSample(button);
    });
  });

  function syncHeroImageMotionButtons(activeMotion) {
    heroImageMotionButtons.forEach((button) => {
      const isActive = button.dataset.heroImageMotion === activeMotion;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function getContentPlainText() {
    if (!contentEl) return '';
    return contentEl.innerText.replace(/\u00a0/g, ' ');
  }

  function getContentHtml() {
    if (!contentEl) return '';
    return contentEl.innerHTML;
  }

  function setEditorContent(value = '') {
    if (!contentEl) return;
    const trimmed = String(value || '');
    if (trimmed && /<[^>]+>/.test(trimmed)) {
      contentEl.innerHTML = trimmed;
      return;
    }
    const lines = trimmed.split('\n');
    contentEl.innerHTML = '';
    lines.forEach((line, index) => {
      if (index > 0) {
        contentEl.appendChild(document.createElement('br'));
      }
      if (line) {
        contentEl.appendChild(document.createTextNode(line));
      }
    });
  }

  function refreshContentState() {
    updateReadTime();
    updatePreview();
  }

  function wrapSelectionWithTag(tagName) {
    if (!contentEl) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!contentEl.contains(range.commonAncestorContainer)) return;
    const text = range.toString();
    const element = document.createElement(tagName);
    element.textContent = text;
    range.deleteContents();
    range.insertNode(element);
    const nextRange = document.createRange();
    if (text) {
      nextRange.setStartAfter(element);
      nextRange.collapse(true);
    } else {
      nextRange.selectNodeContents(element);
      nextRange.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(nextRange);
    contentEl.focus();
  }

  function wrapSelectionWithSpan(className) {
    if (!contentEl) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!contentEl.contains(range.commonAncestorContainer)) return;
    const text = range.toString();
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text || ' ';
    range.deleteContents();
    range.insertNode(span);
    const nextRange = document.createRange();
    if (text) {
      nextRange.setStartAfter(span);
      nextRange.collapse(true);
    } else {
      nextRange.selectNodeContents(span);
      nextRange.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(nextRange);
    contentEl.focus();
  }

  function applyTextFrame(frameClass) {
    if (!contentEl) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!contentEl.contains(range.commonAncestorContainer)) return;
    const container =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    const existingFrame = container?.closest?.('.text-frame');
    if (existingFrame) {
      existingFrame.className = `text-frame ${frameClass}`;
      return;
    }
    wrapSelectionWithSpan(`text-frame ${frameClass}`);
  }

  function insertEmoji() {
    if (!contentEl) return;
    const emoji = window.prompt('挿入する絵文字を入力してください', '😊');
    if (!emoji) return;
    document.execCommand('insertText', false, emoji);
  }

  function applyEditorAction(action) {
    if (!contentEl) return;
    switch (action) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      case 'code':
        wrapSelectionWithTag('code');
        break;
      case 'bullet':
        document.execCommand('insertUnorderedList');
        break;
      case 'number':
        document.execCommand('insertOrderedList');
        break;
      case 'quote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      case 'bubble-self':
        wrapSelectionWithSpan('bubble bubble--self');
        break;
      case 'bubble-other':
        wrapSelectionWithSpan('bubble bubble--other');
        break;
      case 'emoji':
        insertEmoji();
        break;
      case 'align-left':
        document.execCommand('justifyLeft');
        break;
      case 'align-center':
        document.execCommand('justifyCenter');
        break;
      case 'align-right':
        document.execCommand('justifyRight');
        break;
      case 'rule':
        document.execCommand('insertHorizontalRule');
        break;
      case 'newline':
        document.execCommand('insertLineBreak');
        break;
      case 'font':
        if (contentEl.dataset.pendingFont) {
          document.execCommand('fontName', false, contentEl.dataset.pendingFont);
          delete contentEl.dataset.pendingFont;
        }
        break;
      case 'font-size':
        if (contentEl.dataset.pendingFontSize) {
          document.execCommand('fontSize', false, contentEl.dataset.pendingFontSize);
          delete contentEl.dataset.pendingFontSize;
        }
        break;
      case 'font-color':
        if (contentEl.dataset.pendingFontColor) {
          document.execCommand('foreColor', false, contentEl.dataset.pendingFontColor);
          delete contentEl.dataset.pendingFontColor;
        }
        break;
      default:
        break;
    }
    refreshContentState();
  }

  function updatePreview() {
    if (!previewTitle || !previewDate || !previewRead || !previewExcerpt || !previewThumb) return;
    previewTitle.textContent = titleEl?.value || '無題の投稿';
    previewDate.textContent = dateEl?.value || today;
    previewRead.textContent = readEl?.value || '5 min';
    const summary = summarizeContent(getContentPlainText());
    previewExcerpt.textContent = summary || '本文からAIが要約します。';
    const tags = window.BlogData.normalizeTags((tagsEl?.value || '').split(','));
    previewTags.innerHTML = tags.map((tag) => `<span class="chip">#${window.BlogData.escapeHtml(tag)}</span>`).join('');
    const focus = normalizeFocus({ start: Number(focusStartEl?.value), end: Number(focusEndEl?.value) });
    const focusCenter = Math.round((focus.start + focus.end) / 2);
    previewThumb.style.setProperty('--focus-start', `${focus.start}%`);
    previewThumb.style.setProperty('--focus-end', `${focus.end}%`);
    const cardScale = normalizeScale(Number(cardImageScaleEl?.value));
    previewThumb.style.setProperty('--image-scale', cardScale);
    if (cardImageScaleLabel) {
      cardImageScaleLabel.textContent = `${cardScale.toFixed(2)}x`;
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
    updateHeroPreviewAspect();
    updateHeroPreview();
  }

  function clampPercentage(value) {
    return Math.max(0, Math.min(100, value));
  }

  function applyFocusRange(start, end) {
    if (!focusStartEl || !focusEndEl) return;
    const focus = normalizeFocus({ start, end });
    let adjustedStart = focus.start;
    let adjustedEnd = focus.end;
    if (adjustedEnd - adjustedStart < 5) {
      if (start <= end) {
        adjustedEnd = Math.min(100, adjustedStart + 5);
      } else {
        adjustedStart = Math.max(0, adjustedEnd - 5);
      }
    }
    focusStartEl.value = String(adjustedStart);
    focusEndEl.value = String(adjustedEnd);
    updatePreview();
  }

  function setupFocusRangeEditor() {
    if (!previewThumb || !focusStartEl || !focusEndEl) return;

    let dragStart = null;
    let isDragging = false;

    const getPercentageFromEvent = (event) => {
      const rect = previewThumb.getBoundingClientRect();
      if (!rect.height) return 0;
      const raw = ((event.clientY - rect.top) / rect.height) * 100;
      return Math.round(clampPercentage(raw));
    };

    previewThumb.addEventListener('pointerdown', (event) => {
      if (previewThumb.dataset.previewMode === 'pen') return;
      if (event.button !== undefined && event.button !== 0) return;
      if (!event.isPrimary) return;
      const start = getPercentageFromEvent(event);
      event.preventDefault();
      previewThumb.setPointerCapture(event.pointerId);
      dragStart = start;
      isDragging = true;
      previewThumb.classList.add('is-selecting');
      applyFocusRange(start, start);
    });

    previewThumb.addEventListener('pointermove', (event) => {
      if (!isDragging || dragStart === null) return;
      const current = getPercentageFromEvent(event);
      event.preventDefault();
      applyFocusRange(dragStart, current);
    });

    const stopDrag = (event) => {
      if (!isDragging) return;
      isDragging = false;
      dragStart = null;
      previewThumb.classList.remove('is-selecting');
      if (event?.pointerId !== undefined) {
        previewThumb.releasePointerCapture(event.pointerId);
      }
    };

    previewThumb.addEventListener('pointerup', stopDrag);
    previewThumb.addEventListener('pointercancel', stopDrag);
    previewThumb.addEventListener('pointerleave', stopDrag);
  }

  function updateReadTime() {
    if (!readEl || !previewRead) return;
    const minutes = estimateReadMinutes(`${titleEl?.value || ''}\n${getContentPlainText()}`);
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
    if (cardImageScaleEl) cardImageScaleEl.value = '1';
    if (heroImageScaleEl) heroImageScaleEl.value = '1';
    if (heroMaskWidthInput) heroMaskWidthInput.value = String(DEFAULT_HERO_SETTINGS.maskWidth);
    if (heroMaskOpacityInput) heroMaskOpacityInput.value = String(DEFAULT_HERO_SETTINGS.maskOpacity);
    if (heroMaskColorInput) heroMaskColorInput.value = resolveHeroMaskColor(selectedTheme?.background);
    if (heroMaskGradientInput) heroMaskGradientInput.value = String(DEFAULT_HERO_SETTINGS.maskGradient);
    if (heroMaskMotionInput) heroMaskMotionInput.checked = DEFAULT_HERO_SETTINGS.maskMotion;
    if (heroMaskAnimationInput) heroMaskAnimationInput.value = DEFAULT_HERO_SETTINGS.maskAnimation;
    if (heroMaskDurationInput) heroMaskDurationInput.value = String(DEFAULT_HERO_SETTINGS.maskDuration);
    if (heroMaskEaseInput) heroMaskEaseInput.value = DEFAULT_HERO_SETTINGS.maskEase;
    if (heroImageMotionInput) heroImageMotionInput.value = DEFAULT_HERO_SETTINGS.imageMotion;
    if (heroPositionInput) heroPositionInput.value = String(DEFAULT_HERO_SETTINGS.imagePosition);
    if (heroPositionXInput) heroPositionXInput.value = String(DEFAULT_HERO_SETTINGS.imagePositionX);
    if (heroImageFitEl) heroImageFitEl.value = DEFAULT_HERO_SETTINGS.imageFit;
    applyArticleTheme(siteThemeKey);
    if (heroBackgroundColorInput) heroBackgroundColorInput.value = resolveHeroBackgroundColor(selectedTheme?.background);
    setEditorContent('');
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
    setEditorContent(target.content || '');
    resizedImageData = target.image || '';
    if (tagsEl) tagsEl.value = (target.tags || []).join(', ');
    const focus = normalizeFocus(target.imageFocus, target.imagePosition);
    if (focusStartEl) focusStartEl.value = focus.start;
    if (focusEndEl) focusEndEl.value = focus.end;
    if (cardImageScaleEl) {
      cardImageScaleEl.value = normalizeScale(target.cardImageScale ?? target.imageScale);
    }
    if (heroImageScaleEl) {
      heroImageScaleEl.value = normalizeScale(target.heroImageScale ?? target.imageScale);
    }
    if (heroMaskWidthInput) heroMaskWidthInput.value = String(target.heroMaskWidth ?? DEFAULT_HERO_SETTINGS.maskWidth);
    if (heroMaskOpacityInput) heroMaskOpacityInput.value = String(target.heroMaskOpacity ?? DEFAULT_HERO_SETTINGS.maskOpacity);
    if (heroMaskColorInput) heroMaskColorInput.value = resolveHeroMaskColor(target.heroMaskColor);
    if (heroMaskGradientInput) heroMaskGradientInput.value = String(target.heroMaskGradient ?? DEFAULT_HERO_SETTINGS.maskGradient);
    if (heroMaskMotionInput) heroMaskMotionInput.checked = Boolean(target.heroMaskMotion);
    if (heroMaskAnimationInput) {
      heroMaskAnimationInput.value = target.heroMaskAnimation || DEFAULT_HERO_SETTINGS.maskAnimation;
    }
    if (heroMaskDurationInput) {
      heroMaskDurationInput.value = String(target.heroMaskDuration ?? DEFAULT_HERO_SETTINGS.maskDuration);
    }
    if (heroMaskEaseInput) {
      heroMaskEaseInput.value = target.heroMaskEase || DEFAULT_HERO_SETTINGS.maskEase;
    }
    if (heroImageMotionInput) {
      heroImageMotionInput.value = target.heroImageMotion || DEFAULT_HERO_SETTINGS.imageMotion;
    }
    if (heroPositionInput) heroPositionInput.value = String(target.heroImagePosition ?? DEFAULT_HERO_SETTINGS.imagePosition);
    if (heroPositionXInput) heroPositionXInput.value = String(target.heroImagePositionX ?? DEFAULT_HERO_SETTINGS.imagePositionX);
    if (heroImageFitEl) heroImageFitEl.value = normalizeHeroImageFit(target.heroImageFit);
    applyArticleTheme(target.theme || selectedTheme.key);
    if (heroBackgroundColorInput) {
      heroBackgroundColorInput.value = resolveHeroBackgroundColor(target.heroBackgroundColor);
    }
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

  setupFocusRangeEditor();

  if (cardImageScaleEl) {
    cardImageScaleEl.addEventListener('input', () => {
      updatePreview();
    });
  }
  if (heroImageScaleEl) {
    heroImageScaleEl.addEventListener('input', () => {
      updateHeroPreview();
    });
  }
  if (heroImageFitEl) {
    heroImageFitEl.addEventListener('change', () => {
      updateHeroPreview();
    });
  }

  [heroMaskWidthInput, heroMaskOpacityInput, heroMaskColorInput, heroMaskGradientInput, heroMaskMotionInput, heroPositionInput, heroPositionXInput, heroBackgroundColorInput]
    .filter(Boolean)
    .forEach((input) => {
    const eventType = input === heroMaskMotionInput ? 'change' : 'input';
    input.addEventListener(eventType, () => {
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

  if (editorToolbars.length) {
    editorToolbars.forEach((toolbar) => {
      toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-editor-action]');
        if (!button) return;
        applyEditorAction(button.dataset.editorAction);
      });
      toolbar.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.editorAction;
        if (!action) return;
        if (!contentEl) return;
        if (action === 'font') {
          contentEl.dataset.pendingFont = target.value;
          applyEditorAction('font');
        } else if (action === 'heading') {
          if (target.value) {
            document.execCommand('formatBlock', false, target.value);
            refreshContentState();
          }
        } else if (action === 'text-frame') {
          if (target.value) {
            applyTextFrame(target.value);
            refreshContentState();
          }
        } else if (action === 'font-size') {
          contentEl.dataset.pendingFontSize = target.value;
          applyEditorAction('font-size');
        } else if (action === 'font-color') {
          contentEl.dataset.pendingFontColor = target.value;
          applyEditorAction('font-color');
        }
        if (target.tagName === 'SELECT') {
          target.selectedIndex = 0;
        }
      });
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
    const content = getContentHtml().trim();
    const excerpt = summarizeContent(getContentPlainText());
    const existing = editingId ? posts.find((post) => post.id === editingId) : null;
    const image = resizedImageData || existing?.image || '';
    const tags = window.BlogData.normalizeTags((tagsEl?.value || '').split(','));
    const focus = normalizeFocus({ start: Number(focusStartEl?.value), end: Number(focusEndEl?.value) });
    const imagePosition = Math.round((focus.start + focus.end) / 2);
    const theme = selectedTheme.key;
    const cardImageScale = normalizeScale(Number(cardImageScaleEl?.value));
    const heroImageScale = normalizeScale(Number(heroImageScaleEl?.value));
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
        cardImageScale,
        heroImageScale,
        heroImageFit: heroSettings.heroImageFit,
        heroImageMotion: heroSettings.heroImageMotion,
        theme,
        heroMaskOpacity: heroSettings.maskOpacity,
        heroMaskWidth: heroSettings.maskWidth,
        heroMaskGradient: heroSettings.maskGradient,
        heroMaskColor: heroSettings.maskColor,
        heroMaskMotion: heroSettings.maskMotion,
        heroMaskAnimation: heroSettings.maskAnimation,
        heroMaskDuration: heroSettings.maskDuration,
        heroMaskEase: heroSettings.maskEase,
        heroImagePosition: heroSettings.imagePosition,
        heroImagePositionX: heroSettings.imagePositionX,
        heroBackgroundColor: heroSettings.heroBackgroundColor,
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
  if (heroBackgroundColorInput) {
    heroBackgroundColorInput.value = resolveHeroBackgroundColor(selectedTheme?.background);
  }
  if (heroMaskColorInput) {
    heroMaskColorInput.value = resolveHeroMaskColor(selectedTheme?.background);
  }
  updateReadTime();
  updatePreview();
  syncHomeSettingsForm();

  window.addEventListener('resize', () => {
    window.requestAnimationFrame(updateHeroPreviewAspect);
  });

  if (isEditMode && submitButton) {
    submitButton.disabled = true;
  }
})();
