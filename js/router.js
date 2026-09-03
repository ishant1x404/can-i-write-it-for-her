(() => {
  'use strict';

  /*
   * PJAX ROUTER
   *
   * Replaces only #app-main.
   * The global shell, including the persistent <audio> player,
   * is never destroyed during normal navigation.
   */

  const MAIN_SELECTOR = '#app-main';
  const STYLE_LINK_ID = 'page-style';

  function isInternalPage(href) {
    try {
      const url = new URL(
        href,
        window.location.href
      );

      return (
        url.origin === window.location.origin &&
        /\.html?$/i.test(url.pathname) &&
        !url.hash
      );
    } catch {
      return false;
    }
  }

  async function loadPage(url, { push = true } = {}) {
    const main = document.querySelector(MAIN_SELECTOR);

    if (!main) {
      window.location.href = url;
      return;
    }

    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const newDoc = new DOMParser().parseFromString(
        html,
        'text/html'
      );

      const newMain = newDoc.querySelector(MAIN_SELECTOR);

      if (!newMain) {
        throw new Error(
          'Destination page has no #app-main element.'
        );
      }

      main.replaceWith(newMain);

      if (newDoc.title) {
        document.title = newDoc.title;
      }

      /*
       * Swap only the page-specific stylesheet.
       * global.css remains untouched.
       */
      const newStyle = newDoc.getElementById(STYLE_LINK_ID);
      const oldStyle = document.getElementById(STYLE_LINK_ID);

      if (newStyle && oldStyle) {
        const newHref = newStyle.getAttribute('href');

        if (
          newHref &&
          newHref !== oldStyle.getAttribute('href')
        ) {
          oldStyle.setAttribute('href', newHref);
        }
      }

      if (push) {
        history.pushState(
          { pjax: true },
          '',
          url
        );
      }

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
      });

      /*
       * Re-run page chrome only.
       * Do not recreate the music player.
       */
      if (
        window.SakshiSite &&
        typeof window.SakshiSite.onPageSwap === 'function'
      ) {
        window.SakshiSite.onPageSwap();
      }
    } catch (error) {
      console.error(
        'PJAX navigation failed; using normal navigation:',
        error
      );

      window.location.href = url;
    }
  }

  function handleDocumentClick(event) {
    if (event.defaultPrevented) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest('a[href]');

    if (!link) {
      return;
    }

    if (
      link.target &&
      link.target !== '_self'
    ) {
      return;
    }

    if (link.hasAttribute('download')) {
      return;
    }

    const href = link.getAttribute('href');

    if (!href || !isInternalPage(href)) {
      return;
    }

    const url = new URL(
      href,
      window.location.href
    ).href;

    if (url === window.location.href) {
      return;
    }

    event.preventDefault();
    loadPage(url);
  }

  function handlePopState() {
    loadPage(
      window.location.href,
      { push: false }
    );
  }

  function initRouter() {
    document.addEventListener(
      'click',
      handleDocumentClick
    );

    window.addEventListener(
      'popstate',
      handlePopState
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initRouter,
      { once: true }
    );
  } else {
    initRouter();
  }
})();
