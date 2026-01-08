(() => {
  const {
    readSiteTheme,
    applyThemeToDocument,
    saveSiteTheme,
    themes,
  } = window.BlogData;

  const ADMIN_PASSWORD = 'admin';
  const ADMIN_AUTH_KEY = 'admin-authenticated';
  const MFA_CODE_KEY = 'admin-mfa-code';
  const MFA_EXPIRES_KEY = 'admin-mfa-expires';
  const MFA_TIMEOUT_MS = 5 * 60 * 1000;

  const form = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password');
  const mfaInput = document.getElementById('mfa-code');
  const sendMfaButton = document.getElementById('send-mfa');
  const resetButton = document.getElementById('reset-login');
  const message = document.getElementById('login-message');
  const mfaHint = document.getElementById('mfa-hint');
  const authLinks = document.getElementById('auth-links');
  const authStatus = document.getElementById('auth-status');
  const loginCard = document.getElementById('login-card');
  const siteThemePicker = document.getElementById('site-theme-picker');

  if (!form) return;

  let siteThemeKey = readSiteTheme();
  applyThemeToDocument(siteThemeKey);

  function showMessage(text, tone = 'success') {
    if (!message) return;
    message.textContent = text;
    message.classList.remove('success', 'error');
    message.classList.add(tone);
    message.hidden = false;
  }

  function clearMessage() {
    if (!message) return;
    message.textContent = '';
    message.classList.remove('success', 'error');
    message.hidden = true;
  }

  function updateAuthState(authenticated) {
    if (authLinks) {
      authLinks.hidden = !authenticated;
    }
    if (authStatus) {
      authStatus.textContent = authenticated
        ? '認証完了。続きのメニューへ進んでください。'
        : 'ログインするとリンクが表示されます。';
    }
    if (loginCard) {
      loginCard.classList.toggle('is-authenticated', authenticated);
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
      applyThemeToDocument(siteThemeKey);
    });
  }

  function generateMfaCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem(MFA_CODE_KEY, code);
    sessionStorage.setItem(MFA_EXPIRES_KEY, String(Date.now() + MFA_TIMEOUT_MS));
    return code;
  }

  function isMfaValid(code) {
    const stored = sessionStorage.getItem(MFA_CODE_KEY);
    const expires = Number(sessionStorage.getItem(MFA_EXPIRES_KEY) || 0);
    if (!stored || !expires) return false;
    if (Date.now() > expires) return false;
    return stored === code;
  }

  if (sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true') {
    updateAuthState(true);
  }

  if (sendMfaButton) {
    sendMfaButton.addEventListener('click', () => {
      const code = generateMfaCode();
      if (mfaHint) {
        mfaHint.textContent = `認証コードを送信しました。（デモ用コード: ${code}）有効期限: 5分`;
      }
      showMessage('認証コードを送信しました。', 'success');
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      form.reset();
      clearMessage();
      if (mfaHint) {
        mfaHint.textContent = '認証コードを送ると5分間有効なコードが発行されます。';
      }
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessage();

    const password = passwordInput?.value ?? '';
    const code = mfaInput?.value ?? '';

    if (password !== ADMIN_PASSWORD) {
      showMessage('パスワードが一致しません。', 'error');
      return;
    }

    if (!isMfaValid(code)) {
      showMessage('認証コードが無効です。送信後に入力してください。', 'error');
      return;
    }

    sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    sessionStorage.removeItem(MFA_CODE_KEY);
    sessionStorage.removeItem(MFA_EXPIRES_KEY);

    showMessage('ログインに成功しました。', 'success');
    updateAuthState(true);
  });

  renderSiteThemePicker();
})();
