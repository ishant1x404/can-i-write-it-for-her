(() => {
  'use strict';

  /* ================================
     PJAX ROUTER
     Swaps #app-main content via fetch()
     instead of full page reloads, so the
     <audio> element in the shell never
     gets destroyed.
     ================================ */

  const MAIN_SELECTOR = '#app-main';
  const STYLE_LINK_ID = 'page-style';

  const isInternalPage = href => {
    try {
      const url = new URL(href, window.location.href);
      return (
        url.origin === window.location.origin &&
        /\.html?$/i.test(url.pathname) &&
        !url.hash
      );
    } catch {
      return false;
    }
  };

  async function loadPage(url, { push = true } = {}) {
    const main = document.querySelector(MAIN_SELECTOR);
    if (!main) {
      window.location.href = url;
      return;
    }

    let html;

    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      // Network hiccup or anything unexpected: fall back to a
      // real navigation rather than leaving the user stuck.
      console.error('Router fetch failed, falling back:', err);
      window.location.href = url;
      return;
    }

    const newDoc = new DOMParser().parseFromString(html, 'text/html');
    const newMain = newDoc.querySelector(MAIN_SELECTOR);

    if (!newMain) {
      // New page doesn't have the expected shell — bail out safely.
      window.location.href = url;
      return;
    }

    main.replaceWith(newMain);
    document.title = newDoc.title;

    const newStyle = newDoc.getElementById(STYLE_LINK_ID);
    const oldStyle = document.getElementById(STYLE_LINK_ID);

    if (newStyle && oldStyle) {
      const newHref = newStyle.getAttribute('href');
      if (newHref && newHref !== oldStyle.getAttribute('href')) {
        oldStyle.setAttribute('href', newHref);
      }
    }

    if (push) {
      history.pushState({ pjax: true }, '', url);
    }

    window.scrollTo(0, 0);

    // Let global.js re-run the page-chrome bits (active nav link,
    // prev/next widget, footer year) without touching the audio.
    if (window.SakshiSite && typeof window.SakshiSite.onPageSwap === 'function') {
      window.SakshiSite.onPageSwap();
    }
  }

  function initRouter() {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link) return;

      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (!isInternalPage(href)) return;

      const url = new URL(href, window.location.href).href;
      if (url === window.location.href) return;

      event.preventDefault();
      loadPage(url);
    });

    window.addEventListener('popstate', () => {
      loadPage(window.location.href, { push: false });
    });
  }

  document.addEventListener('DOMContentLoaded', initRouter);
})();
