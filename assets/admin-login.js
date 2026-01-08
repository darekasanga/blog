(() => {
  const {
    readSiteTheme,
    applyThemeToDocument,
    saveSiteTheme,
    themes,
  } = window.BlogData;

  const ADMIN_AUTH_KEY = 'admin-authenticated';
  const ADMIN_AUTH_EXPIRY_KEY = 'admin-authenticated-expires';
  const ADMIN_AUTH_ID_KEY = 'admin-authenticated-id';
  const AUTH_TTL_MS = 30 * 60 * 1000;
  const CREDENTIAL_ID_KEY = 'admin-biometric-credential-id';
  const CREDENTIALS_KEY = 'admin-biometric-credentials';

  const authButton = document.getElementById('biometric-auth');
  const resetButton = document.getElementById('reset-biometric');
  const registerButton = document.getElementById('register-biometric');
  const message = document.getElementById('login-message');
  const authLinks = document.getElementById('auth-links');
  const authStatus = document.getElementById('auth-status');
  const loginCard = document.getElementById('login-card');
  const siteThemePicker = document.getElementById('site-theme-picker');
  const hint = document.getElementById('biometric-hint');
  const biometricList = document.getElementById('biometric-list');
  const biometricLabelInput = document.getElementById('biometric-label');
  const biometricAdminHint = document.getElementById('biometric-admin-hint');

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

  function readCredentialList() {
    try {
      const stored = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '[]');
      if (Array.isArray(stored)) {
        const normalized = stored
          .filter((entry) => entry && typeof entry.id === 'string')
          .map((entry) => ({
            id: entry.id,
            label: entry.label || '管理者',
            createdAt: entry.createdAt || Date.now(),
            canManageUsers: Boolean(entry.canManageUsers),
          }));
        if (normalized.length && !normalized.some((entry) => entry.canManageUsers)) {
          normalized[0].canManageUsers = true;
          saveCredentialList(normalized);
        }
        return normalized;
      }
    } catch (error) {
      // ignore malformed data
    }

    const legacy = localStorage.getItem(CREDENTIAL_ID_KEY);
    if (legacy) {
      const migrated = [{ id: legacy, label: '管理者', createdAt: Date.now(), canManageUsers: true }];
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return [];
  }

  function saveCredentialList(list) {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(list));
  }

  function getAuthenticatedCredentialId() {
    return sessionStorage.getItem(ADMIN_AUTH_ID_KEY) || '';
  }

  function canManageUsers(authId) {
    if (!authId) return false;
    return readCredentialList().some((credential) => credential.id === authId && credential.canManageUsers);
  }

  function canRegisterUsers() {
    const credentials = readCredentialList();
    if (!credentials.length) return true;
    return canManageUsers(getAuthenticatedCredentialId());
  }

  function updateManagementControls() {
    const allowed = canRegisterUsers();
    if (registerButton) registerButton.disabled = !allowed;
    if (biometricLabelInput) biometricLabelInput.disabled = !allowed;
    if (resetButton) resetButton.disabled = !allowed;
    if (biometricAdminHint) {
      biometricAdminHint.hidden = allowed;
    }
  }

  function renderCredentialList() {
    if (!biometricList) return;
    const credentials = readCredentialList();
    if (!credentials.length) {
      biometricList.innerHTML = '<p class="muted-text">登録済みの生体認証ユーザーがいません。</p>';
      return;
    }

    const allowManage = canManageUsers(getAuthenticatedCredentialId());
    biometricList.innerHTML = credentials
      .map(
        (credential) => `
          <div class="biometric-item" data-id="${credential.id}">
            <div class="biometric-summary">
              <strong>${credential.label || '管理者'}</strong>
              <p class="muted-text">登録ID: ${credential.id.slice(0, 12)}...</p>
              <div class="status-row">
                <span class="pill ${credential.canManageUsers ? 'pill-accent' : 'pill-muted'}">ユーザー管理</span>
              </div>
            </div>
            ${
              allowManage
                ? `
            <div class="biometric-actions">
              <label class="flag-toggle biometric-role-toggle">
                <input type="checkbox" data-action="toggle-manage" ${credential.canManageUsers ? 'checked' : ''} />
                <span>ユーザー管理権</span>
              </label>
              <button class="btn ghost" type="button" data-action="remove">削除</button>
            </div>
            `
                : ''
            }
          </div>
        `
      )
      .join('');

    biometricList.querySelectorAll('button[data-action="remove"]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.biometric-item');
        const id = item?.dataset.id;
        if (!id) return;
        const list = readCredentialList();
        const managers = list.filter((credential) => credential.canManageUsers);
        if (managers.length <= 1 && managers[0]?.id === id) {
          showMessage('最後のユーザー管理者は削除できません。', 'error');
          return;
        }
        const next = list.filter((credential) => credential.id !== id);
        saveCredentialList(next);
        renderCredentialList();
        showMessage('生体認証ユーザーを削除しました。', 'success');
      });
    });

    biometricList.querySelectorAll('input[data-action="toggle-manage"]').forEach((input) => {
      input.addEventListener('change', () => {
        const item = input.closest('.biometric-item');
        const id = item?.dataset.id;
        if (!id) return;
        const list = readCredentialList();
        const managers = list.filter((credential) => credential.canManageUsers);
        if (managers.length <= 1 && managers[0]?.id === id && !input.checked) {
          input.checked = true;
          showMessage('最後のユーザー管理者の権限は解除できません。', 'error');
          return;
        }
        const next = list.map((credential) =>
          credential.id === id ? { ...credential, canManageUsers: input.checked } : credential
        );
        saveCredentialList(next);
        renderCredentialList();
        showMessage(input.checked ? 'ユーザー管理権を付与しました。' : 'ユーザー管理権を解除しました。', 'success');
      });
    });
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

  function setAuthSession(credentialId) {
    sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    sessionStorage.setItem(ADMIN_AUTH_EXPIRY_KEY, String(Date.now() + AUTH_TTL_MS));
    if (credentialId) {
      sessionStorage.setItem(ADMIN_AUTH_ID_KEY, credentialId);
    }
  }

  function clearAuthSession() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_EXPIRY_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_ID_KEY);
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

  async function registerCredential(label) {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);
    const displayName = label?.trim() || `ユーザー${readCredentialList().length + 1}`;
    const userName = `admin-${Date.now()}@emperor.news`;

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'EMPEROR.NEWS',
        },
        user: {
          id: userId,
          name: userName,
          displayName,
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
    const credentialId = bufferToBase64Url(credential.rawId);
    const current = readCredentialList();
    if (!current.find((item) => item.id === credentialId)) {
      const hasManager = current.some((item) => item.canManageUsers);
      current.push({
        id: credentialId,
        label: displayName,
        createdAt: Date.now(),
        canManageUsers: !hasManager,
      });
      saveCredentialList(current);
    }
    renderCredentialList();
  }

  async function authenticateCredential(credentialIds) {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials = credentialIds.map((id) => ({
      id: base64UrlToBuffer(id),
      type: 'public-key',
      transports: ['internal'],
    }));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new Error('assertion-missing');
    }

    return assertion;
  }

  async function handleBiometricAuth() {
    clearMessage();

    const available = await isBiometricAvailable();
    if (!available) {
      showMessage('この端末では生体認証が利用できません。', 'error');
      return;
    }

    try {
      const stored = readCredentialList();
      if (!stored.length) {
        showMessage('先に生体認証ユーザーを登録してください。', 'error');
        return;
      }
      const assertion = await authenticateCredential(stored.map((item) => item.id));
      const credentialId = bufferToBase64Url(assertion.rawId);
      const current = readCredentialList();
      if (current.length && !current.some((entry) => entry.canManageUsers)) {
        const updated = current.map((entry, index) =>
          index === 0 ? { ...entry, canManageUsers: true } : entry
        );
        saveCredentialList(updated);
      }

      setAuthSession(credentialId);
      updateAuthState(true);
      updateManagementControls();
      renderCredentialList();
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
      if (!canRegisterUsers()) {
        showMessage('ユーザー管理権限がありません。', 'error');
        return;
      }
      localStorage.removeItem(CREDENTIAL_ID_KEY);
      localStorage.removeItem(CREDENTIALS_KEY);
      clearAuthSession();
      updateAuthState(false);
      renderCredentialList();
      updateManagementControls();
      showMessage('登録情報をリセットしました。再度生体認証を実行してください。', 'success');
    });
  }

  if (registerButton) {
    registerButton.addEventListener('click', async () => {
      clearMessage();
      if (!canRegisterUsers()) {
        showMessage('ユーザー管理権限がありません。', 'error');
        return;
      }
      const available = await isBiometricAvailable();
      if (!available) {
        showMessage('この端末では生体認証が利用できません。', 'error');
        return;
      }
      try {
        await registerCredential(biometricLabelInput?.value || '');
        if (biometricLabelInput) {
          biometricLabelInput.value = '';
        }
        showMessage('生体認証ユーザーを登録しました。', 'success');
      } catch (error) {
        showMessage('登録に失敗しました。端末の生体認証を再度お試しください。', 'error');
      }
    });
  }

  const redirectTarget = getRedirectTarget();
  if (isAuthSessionValid()) {
    updateAuthState(true);
    updateManagementControls();
    showMessage('認証済みのため、目的のページへ移動します。', 'success');
    window.location.href = redirectTarget;
    return;
  }

  renderSiteThemePicker();
  renderCredentialList();
  updateManagementControls();
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
