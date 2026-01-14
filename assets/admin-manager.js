(() => {
  const {
    readSiteTheme,
    applyThemeToDocument,
    saveSiteTheme,
    themes,
  } = window.BlogData;

  const MANAGER_AUTH_KEY = 'admin-manager-authenticated';
  const MANAGER_AUTH_EXPIRY_KEY = 'admin-manager-authenticated-expires';
  const MANAGER_TTL_MS = 30 * 60 * 1000;
  const MANAGER_AUTH_ID_KEY = 'admin-manager-authenticated-id';
  const MANAGER_PASSWORD_KEY = 'admin-manager-password';
  const DEFAULT_MANAGER_PASSWORD = 'administrater';

  const CREDENTIAL_ID_KEY = 'admin-biometric-credential-id';
  const CREDENTIALS_KEY = 'admin-biometric-credentials';
  const LOGIN_CODE_KEY = 'admin-login-codes';
  const LOGIN_CODE_TTL_MS = 30 * 60 * 1000;

  const managerAuthButton = document.getElementById('manager-biometric-auth');
  const managerPasswordInput = document.getElementById('manager-password');
  const managerPasswordLoginButton = document.getElementById('manager-password-login');
  const authHint = document.getElementById('manager-auth-hint');
  const authCard = document.getElementById('manager-auth-card');
  const panel = document.getElementById('manager-panel');
  const message = document.getElementById('manager-message');
  const actionMessage = document.getElementById('manager-action-message');
  const registerButton = document.getElementById('register-biometric');
  const resetButton = document.getElementById('reset-biometric');
  const biometricList = document.getElementById('biometric-list');
  const biometricLabelInput = document.getElementById('biometric-label');
  const loginCodeInput = document.getElementById('login-code');
  const issueLoginCodeButton = document.getElementById('issue-login-code');
  const loginCodeList = document.getElementById('login-code-list');
  const managerPasswordUpdateInput = document.getElementById('manager-password-update');
  const managerPasswordSaveButton = document.getElementById('manager-password-save');
  const siteThemePicker = document.getElementById('site-theme-picker');

  if (!authCard || !panel) return;

  let siteThemeKey = readSiteTheme();
  applyThemeToDocument(siteThemeKey);

  function showMessage(target, text, tone = 'success') {
    if (!target) return;
    target.textContent = text;
    target.classList.remove('success', 'error');
    target.classList.add(tone);
    target.hidden = false;
  }

  function clearMessage(target) {
    if (!target) return;
    target.textContent = '';
    target.classList.remove('success', 'error');
    target.hidden = true;
  }

  function readManagerPassword() {
    return localStorage.getItem(MANAGER_PASSWORD_KEY) || DEFAULT_MANAGER_PASSWORD;
  }

  function saveManagerPassword(value) {
    localStorage.setItem(MANAGER_PASSWORD_KEY, value);
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

  function setManagerSession(credentialId) {
    sessionStorage.setItem(MANAGER_AUTH_KEY, 'true');
    sessionStorage.setItem(MANAGER_AUTH_EXPIRY_KEY, String(Date.now() + MANAGER_TTL_MS));
    if (credentialId) {
      sessionStorage.setItem(MANAGER_AUTH_ID_KEY, credentialId);
    }
  }

  function clearManagerSession() {
    sessionStorage.removeItem(MANAGER_AUTH_KEY);
    sessionStorage.removeItem(MANAGER_AUTH_EXPIRY_KEY);
    sessionStorage.removeItem(MANAGER_AUTH_ID_KEY);
  }

  function isManagerSessionValid() {
    const authenticated = sessionStorage.getItem(MANAGER_AUTH_KEY) === 'true';
    const expires = Number(sessionStorage.getItem(MANAGER_AUTH_EXPIRY_KEY) || 0);
    return Boolean(authenticated && expires && Date.now() < expires);
  }

  function openPanel() {
    authCard.hidden = true;
    panel.hidden = false;
    renderCredentialList();
    renderLoginCodeList();
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

  function renderCredentialList() {
    if (!biometricList) return;
    const credentials = readCredentialList();
    if (!credentials.length) {
      biometricList.innerHTML = '<p class="muted-text">登録済みの生体認証ユーザーがいません。</p>';
      return;
    }

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
            <div class="biometric-actions">
              <label class="flag-toggle biometric-role-toggle">
                <input type="checkbox" data-action="toggle-manage" ${credential.canManageUsers ? 'checked' : ''} />
                <span>ユーザー管理権</span>
              </label>
              <button class="btn ghost" type="button" data-action="remove">削除</button>
            </div>
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
          showMessage(actionMessage, '最後のユーザー管理者は削除できません。', 'error');
          return;
        }
        const next = list.filter((credential) => credential.id !== id);
        saveCredentialList(next);
        renderCredentialList();
        showMessage(actionMessage, '生体認証ユーザーを削除しました。', 'success');
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
          showMessage(actionMessage, '最後のユーザー管理者の権限は解除できません。', 'error');
          return;
        }
        const next = list.map((credential) =>
          credential.id === id ? { ...credential, canManageUsers: input.checked } : credential
        );
        saveCredentialList(next);
        renderCredentialList();
        showMessage(actionMessage, input.checked ? 'ユーザー管理権を付与しました。' : 'ユーザー管理権を解除しました。', 'success');
      });
    });
  }

  function readLoginCodeList() {
    try {
      const stored = JSON.parse(localStorage.getItem(LOGIN_CODE_KEY) || '[]');
      if (Array.isArray(stored)) {
        return stored
          .filter((entry) => entry && typeof entry.code === 'string' && typeof entry.expiresAt === 'number')
          .filter((entry) => Date.now() < entry.expiresAt);
      }
    } catch (error) {
      // ignore malformed data
    }
    return [];
  }

  function saveLoginCodeList(list) {
    localStorage.setItem(LOGIN_CODE_KEY, JSON.stringify(list));
  }

  function generateLoginCode() {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return String(value[0] % 1000000).padStart(6, '0');
  }

  function renderLoginCodeList() {
    if (!loginCodeList) return;
    const codes = readLoginCodeList();
    if (!codes.length) {
      loginCodeList.innerHTML = '<p class="muted-text">発行済みのログインコードはありません。</p>';
      return;
    }

    loginCodeList.innerHTML = codes
      .map(
        (entry) => `
          <div class="login-code-item" data-code="${entry.code}">
            <div>
              <strong>${entry.code}</strong>
              <p class="muted-text">有効期限: ${new Date(entry.expiresAt).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
            </div>
            <button class="btn ghost" type="button" data-action="remove">無効にする</button>
          </div>
        `
      )
      .join('');

    loginCodeList.querySelectorAll('button[data-action="remove"]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.login-code-item');
        const code = item?.dataset.code;
        if (!code) return;
        const next = readLoginCodeList().filter((entry) => entry.code !== code);
        saveLoginCodeList(next);
        renderLoginCodeList();
        showMessage(actionMessage, 'ログインコードを無効にしました。', 'success');
      });
    });
  }

  function issueLoginCode() {
    const code = generateLoginCode();
    const next = readLoginCodeList();
    next.push({
      code,
      issuedAt: Date.now(),
      expiresAt: Date.now() + LOGIN_CODE_TTL_MS,
    });
    saveLoginCodeList(next);
    renderLoginCodeList();
    return code;
  }

  function isLoginCodeValid(code) {
    const trimmed = code.trim();
    if (!trimmed) return false;
    const codes = readLoginCodeList();
    return codes.some((entry) => entry.code === trimmed);
  }

  function consumeLoginCode(code) {
    const trimmed = code.trim();
    if (!trimmed) return false;
    const codes = readLoginCodeList();
    if (!codes.some((entry) => entry.code === trimmed)) return false;
    const next = codes.filter((entry) => entry.code !== trimmed);
    saveLoginCodeList(next);
    renderLoginCodeList();
    return true;
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

  async function isBiometricAvailable() {
    if (!window.PublicKeyCredential || !navigator.credentials) return false;
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return true;
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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

  async function handleManagerAuth() {
    clearMessage(message);

    const available = await isBiometricAvailable();
    if (!available) {
      showMessage(message, 'この端末では生体認証が利用できません。', 'error');
      return;
    }

    try {
      const stored = readCredentialList().filter((credential) => credential.canManageUsers);
      if (!stored.length) {
        showMessage(message, '管理者ユーザーが登録されていません。', 'error');
        return;
      }
      const assertion = await authenticateCredential(stored.map((item) => item.id));
      const credentialId = bufferToBase64Url(assertion.rawId);
      if (!stored.some((item) => item.id === credentialId)) {
        showMessage(message, '管理権限のないユーザーです。', 'error');
        clearManagerSession();
        return;
      }
      setManagerSession(credentialId);
      openPanel();
      showMessage(actionMessage, '管理パネルを開きました。', 'success');
    } catch (error) {
      showMessage(message, '認証に失敗しました。端末の生体認証を再度お試しください。', 'error');
    }
  }

  function handlePasswordLogin() {
    clearMessage(message);
    const inputValue = managerPasswordInput?.value || '';
    if (!inputValue) {
      showMessage(message, 'パスワードを入力してください。', 'error');
      return;
    }
    if (inputValue !== readManagerPassword()) {
      showMessage(message, 'パスワードが正しくありません。', 'error');
      return;
    }
    setManagerSession('password');
    openPanel();
    if (managerPasswordInput) managerPasswordInput.value = '';
    showMessage(actionMessage, 'パスワードでログインしました。', 'success');
  }

  function handlePasswordUpdate() {
    clearMessage(actionMessage);
    const inputValue = managerPasswordUpdateInput?.value || '';
    if (!inputValue) {
      showMessage(actionMessage, '新しいパスワードを入力してください。', 'error');
      return;
    }
    saveManagerPassword(inputValue);
    if (managerPasswordUpdateInput) managerPasswordUpdateInput.value = '';
    showMessage(actionMessage, '管理者パスワードを更新しました。', 'success');
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

  if (managerAuthButton) {
    managerAuthButton.addEventListener('click', () => {
      handleManagerAuth();
    });
  }

  if (managerPasswordLoginButton) {
    managerPasswordLoginButton.addEventListener('click', () => {
      handlePasswordLogin();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      localStorage.removeItem(CREDENTIAL_ID_KEY);
      localStorage.removeItem(CREDENTIALS_KEY);
      clearManagerSession();
      renderCredentialList();
      showMessage(actionMessage, '登録情報をリセットしました。', 'success');
    });
  }

  if (registerButton) {
    registerButton.addEventListener('click', async () => {
      clearMessage(actionMessage);
      const credentials = readCredentialList();
      const requiresLoginCode = credentials.length > 0;
      const loginCodeValue = loginCodeInput?.value?.trim() || '';
      if (requiresLoginCode && !isLoginCodeValid(loginCodeValue)) {
        showMessage(actionMessage, 'ログインコードが無効です。', 'error');
        return;
      }
      const available = await isBiometricAvailable();
      if (!available) {
        showMessage(actionMessage, 'この端末では生体認証が利用できません。', 'error');
        return;
      }
      try {
        await registerCredential(biometricLabelInput?.value || '');
        if (requiresLoginCode) {
          consumeLoginCode(loginCodeValue);
        }
        if (biometricLabelInput) biometricLabelInput.value = '';
        if (loginCodeInput) loginCodeInput.value = '';
        showMessage(actionMessage, '生体認証ユーザーを登録しました。', 'success');
      } catch (error) {
        showMessage(actionMessage, '登録に失敗しました。端末の生体認証を再度お試しください。', 'error');
      }
    });
  }

  if (issueLoginCodeButton) {
    issueLoginCodeButton.addEventListener('click', () => {
      clearMessage(actionMessage);
      const code = issueLoginCode();
      if (loginCodeInput) {
        loginCodeInput.value = code;
      }
      showMessage(actionMessage, 'ログインコードを発行しました。', 'success');
    });
  }

  if (managerPasswordSaveButton) {
    managerPasswordSaveButton.addEventListener('click', () => {
      handlePasswordUpdate();
    });
  }

  if (isManagerSessionValid()) {
    openPanel();
  }

  renderSiteThemePicker();

  isBiometricAvailable().then((available) => {
    if (!available && managerAuthButton) {
      managerAuthButton.disabled = true;
      if (authHint) {
        authHint.textContent = 'この端末では生体認証が利用できません。別の端末でお試しください。';
      }
    }
  });
})();
