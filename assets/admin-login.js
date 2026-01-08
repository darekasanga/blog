(() => {
  const {
    readSiteTheme,
    applyThemeToDocument,
    saveSiteTheme,
    themes,
  } = window.BlogData;

  const ADMIN_AUTH_KEY = 'admin-authenticated';
  const ADMIN_AUTH_EXPIRY_KEY = 'admin-authenticated-expires';
  const AUTH_TTL_MS = 30 * 60 * 1000;
  const CREDENTIAL_ID_KEY = 'admin-biometric-credential-id';

  const authButton = document.getElementById('biometric-auth');
  const resetButton = document.getElementById('reset-biometric');
  const message = document.getElementById('login-message');
  const authLinks = document.getElementById('auth-links');
  const authStatus = document.getElementById('auth-status');
  const loginCard = document.getElementById('login-card');
  const siteThemePicker = document.getElementById('site-theme-picker');
  const hint = document.getElementById('biometric-hint');

  if (!authButton) return;

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

  function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlToBuffer(base64Url) {
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (!redirectParam) return './index.html';

    let targetUrl;
    try {
      targetUrl = new URL(redirectParam, window.location.origin);
    } catch (error) {
      return './index.html';
    }

    if (targetUrl.origin !== window.location.origin) {
      return './index.html';
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  }

  function setAuthSession() {
    sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    sessionStorage.setItem(ADMIN_AUTH_EXPIRY_KEY, String(Date.now() + AUTH_TTL_MS));
  }

  function clearAuthSession() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_EXPIRY_KEY);
  }

  function isAuthSessionValid() {
    const isAuthenticated = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    const expires = Number(sessionStorage.getItem(ADMIN_AUTH_EXPIRY_KEY) || 0);
    if (!isAuthenticated || !expires) return false;
    return Date.now() < expires;
  }

  async function isBiometricAvailable() {
    if (!window.PublicKeyCredential || !navigator.credentials) return false;
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return true;
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }

  async function registerCredential() {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'EMPEROR.NEWS',
        },
        user: {
          id: userId,
          name: 'admin@emperor.news',
          displayName: '管理者',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential) {
      throw new Error('credential-missing');
    }

    localStorage.setItem(CREDENTIAL_ID_KEY, bufferToBase64Url(credential.rawId));
  }

  async function authenticateCredential(credentialId) {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: base64UrlToBuffer(credentialId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new Error('assertion-missing');
    }
  }

  async function handleBiometricAuth() {
    clearMessage();

    const available = await isBiometricAvailable();
    if (!available) {
      showMessage('この端末では生体認証が利用できません。', 'error');
      return;
    }

    try {
      const storedId = localStorage.getItem(CREDENTIAL_ID_KEY);
      if (!storedId) {
        showMessage('初回登録を開始します。', 'success');
        await registerCredential();
      } else {
        await authenticateCredential(storedId);
      }

      setAuthSession();
      updateAuthState(true);
      showMessage('認証に成功しました。', 'success');
      window.location.href = getRedirectTarget();
    } catch (error) {
      showMessage('認証に失敗しました。端末の生体認証を再度お試しください。', 'error');
    }
  }

  authButton.addEventListener('click', () => {
    handleBiometricAuth();
  });

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      localStorage.removeItem(CREDENTIAL_ID_KEY);
      clearAuthSession();
      updateAuthState(false);
      showMessage('登録情報をリセットしました。再度生体認証を実行してください。', 'success');
    });
  }

  const redirectTarget = getRedirectTarget();
  if (isAuthSessionValid()) {
    updateAuthState(true);
    showMessage('認証済みのため、目的のページへ移動します。', 'success');
    window.location.href = redirectTarget;
    return;
  }

  renderSiteThemePicker();
  updateAuthState(false);

  isBiometricAvailable().then((available) => {
    if (!available) {
      authButton.disabled = true;
      if (hint) {
        hint.textContent = 'この端末では生体認証が利用できません。別の端末でお試しください。';
      }
    }
  });
})();
