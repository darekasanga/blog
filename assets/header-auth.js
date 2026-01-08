(() => {
  const ADMIN_AUTH_KEY = 'admin-authenticated';
  const ADMIN_AUTH_EXPIRY_KEY = 'admin-authenticated-expires';

  function isAuthSessionValid() {
    const authenticated = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    const expires = Number(sessionStorage.getItem(ADMIN_AUTH_EXPIRY_KEY) || 0);
    return Boolean(authenticated && expires && Date.now() < expires);
  }

  function updateNavVisibility() {
    const authenticated = isAuthSessionValid();
    document.querySelectorAll('[data-auth="auth"]').forEach((el) => {
      el.hidden = !authenticated;
    });
    document.querySelectorAll('[data-auth="guest"]').forEach((el) => {
      el.hidden = authenticated;
    });
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_EXPIRY_KEY);
    updateNavVisibility();

    if (window.location.pathname.includes('/admin/')) {
      window.location.href = '../index.html';
    } else {
      window.location.reload();
    }
  }

  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', handleLogout);
  });

  updateNavVisibility();
})();
