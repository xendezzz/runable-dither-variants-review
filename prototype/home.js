(() => {
  const button = document.querySelector('.sidebar-toggle');
  if (!button) return;
  const setOpen = open => {
    document.body.classList.toggle('nav-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close sidebar' : 'Open sidebar');
  };
  const params = new URLSearchParams(window.location.search);
  const navPreference = params.get('nav');
  setOpen(navPreference === 'open' ? true : navPreference === 'closed' ? false : window.innerWidth > 1100);
  button.addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    setOpen(open);
    const current = new URL(window.location.href);
    current.searchParams.set('nav', open ? 'open' : 'closed');
    try { history.replaceState(null, '', current); } catch (_) { /* Local file previews may restrict history changes. */ }
    updateThemeHref();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && window.innerWidth <= 700) {
      setOpen(false);
      updateThemeHref();
    }
  });
  document.querySelectorAll('.sidebar a').forEach(link => link.addEventListener('click', () => {
    if (window.innerWidth <= 700) {
      setOpen(false);
      updateThemeHref();
    }
  }));

  const dark = /\/dark\/index\.html$/.test(window.location.pathname);
  const nestedVariant = /\/(light|dark)\/index\.html$/.test(window.location.pathname);
  const target = new URL(nestedVariant ? (dark ? '../light/index.html' : '../dark/index.html') : 'dark/index.html', window.location.href);
  const themeLink = document.createElement('a');
  themeLink.className = 'theme-switch';
  themeLink.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  themeLink.innerHTML = dark
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg><span>Light mode</span>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.7A8.5 8.5 0 0 1 8.3 3.8 8.5 8.5 0 1 0 20.2 15.7Z"/></svg><span>Dark mode</span>';
  document.body.append(themeLink);
  function updateThemeHref() {
    target.searchParams.set('nav', document.body.classList.contains('nav-open') ? 'open' : 'closed');
    target.searchParams.set('scroll', String(Math.round(window.scrollY)));
    themeLink.href = target.href;
  }
  updateThemeHref();
  window.addEventListener('scroll', updateThemeHref, { passive: true });
  themeLink.addEventListener('pointerenter', updateThemeHref);
  themeLink.addEventListener('focus', updateThemeHref);

  const savedScroll = Number(params.get('scroll'));
  if (params.has('scroll') && Number.isFinite(savedScroll) && savedScroll >= 0) {
    window.addEventListener('load', () => {
      const page = document.documentElement;
      const behavior = page.style.scrollBehavior;
      page.style.scrollBehavior = 'auto';
      window.scrollTo(0, savedScroll);
      requestAnimationFrame(() => { page.style.scrollBehavior = behavior; });
    }, { once: true });
  }
})();
