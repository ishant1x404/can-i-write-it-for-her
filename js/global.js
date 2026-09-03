(() => {
  'use strict';

  const PAGES = [
    ['index.html', 'Home'],
    ['about.html', 'About'],
    ['interests.html', 'Interests'],
    ['favorites.html', 'Favorites'],
    ['memories.html', 'Memories'],
    ['timeline.html', 'Timeline'],
    ['birthday.html', 'Birthday']
  ];

  const STORAGE = {
    track: 'sakshiTrackIndex',
    time: 'sakshiTrackTime',
    volume: 'sakshiTrackVolume'
  };

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const formatTime = seconds => {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  function initNavToggle() {
    const toggle = $('.nav-toggle');
    const menu = $('.site-nav ul');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function updatePageChrome() {
    const currentPage =
      location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.site-nav a').forEach(link => {
      if (link.getAttribute('href') === currentPage) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    const main = $('#app-main');
    if (!main) return;

    main
      .querySelectorAll('.page-navigation')
      .forEach(el => el.remove());

    const pageIndex =
      PAGES.findIndex(page => page[0] === currentPage);

    if (pageIndex === -1) return;

    const previous = PAGES[pageIndex - 1];
    const next = PAGES[pageIndex + 1];

    const nav = document.createElement('nav');

    nav.className = 'page-navigation';
    nav.setAttribute('aria-label', 'Page navigation');

    nav.innerHTML = `
      ${
        previous
          ? `<a href="${previous[0]}">← ${previous[1]}</a>`
          : `<span class="disabled">← Previous</span>`
      }

      <span class="page-current">
        ${PAGES[pageIndex][1]}
      </span>

      ${
        next
          ? `<a href="${next[0]}">${next[1]} →</a>`
          : `<span class="disabled">Next →</span>`
      }
    `;

    main.appendChild(nav);
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(element => {
      element.textContent = new Date().getFullYear();
    });
  }

  function initMusicPlayer() {
    const container = $('.music-player');

    const tracks =
      window.SAKSHI &&
      Array.isArray(window.SAKSHI.music)
        ? window.SAKSHI.music
        : [];

    if (!container || !tracks.length) {
      console.warn('Music player: no tracks found.');
      return;
    }

    /* =========================
       AUDIO
       ========================= */

    const audio = new Audio();
    audio.preload = 'auto';

    const savedVolume =
      Number(localStorage.getItem(STORAGE.volume));

    audio.volume =
      Number.isFinite(savedVolume)
        ? Math.min(Math.max(savedVolume, 0), 1)
        : 0.72;

    audio.addEventListener('error', () => {
      console.error('MUSIC ERROR:', {
        src: audio.src,
        code: audio.error?.code,
        message: audio.error?.message
      });
    });

    audio.addEventListener('loadeddata', () => {
      console.log('Music loaded:', audio.src);
    });

    audio.addEventListener('canplay', () => {
      console.log('Music ready:', audio.src);
    });

    /* =========================
       STATE
       ========================= */

    let index =
      Number(localStorage.getItem(STORAGE.track));

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= tracks.length
    ) {
      index = 0;
    }

    let savedTime =
      Number(localStorage.getItem(STORAGE.time)) || 0;

    /* =========================
       PLAYER UI
       ========================= */

    container.innerHTML = `
      <div class="player-inner">

        <img
          class="track-art"
          alt="Track artwork"
        >

        <button
          class="track-info"
          type="button"
          aria-label="Open playlist"
        >
          <span class="track-meta">
            <b class="track-title"></b>
            <span class="track-artist"></span>
          </span>
        </button>

        <div class="player-controls">

          <button
            class="prev"
            type="button"
            aria-label="Previous song"
          >◀</button>

          <button
            class="play"
            type="button"
            aria-label="Play"
          >▶</button>

          <button
            class="next"
            type="button"
            aria-label="Next song"
          >▶</button>

        </div>

        <span class="time current-time">0:00</span>

        <input
          class="progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          value="0"
          aria-label="Song progress"
        >

        <span class="time duration">0:00</span>

        <button
          class="queue"
          type="button"
          aria-label="Open playlist"
        >☰</button>

      </div>

      <div class="track-menu" aria-hidden="true">

        <div class="track-menu-inner">

          <div class="menu-head">
            <b>HER SOUNDTRACK</b>

            <button
              class="close-menu"
              type="button"
              aria-label="Close playlist"
            >×</button>
          </div>

          <div class="track-list"></div>

        </div>

      </div>
    `;

    const art = $('.track-art', container);
    const title = $('.track-title', container);
    const artist = $('.track-artist', container);

    const play = $('.play', container);
    const prev = $('.prev', container);
    const next = $('.next', container);

    const progress = $('.progress', container);
    const currentTime = $('.current-time', container);
    const duration = $('.duration', container);

    const queue = $('.queue', container);
    const info = $('.track-info', container);

    const menu = $('.track-menu', container);
    const closeMenu = $('.close-menu', container);
    const trackList = $('.track-list', container);

    /* =========================
       STATE HELPERS
       ========================= */

    function saveState() {
      localStorage.setItem(
        STORAGE.track,
        String(index)
      );

      localStorage.setItem(
        STORAGE.time,
        String(
          Number.isFinite(audio.currentTime)
            ? audio.currentTime
            : 0
        )
      );

      localStorage.setItem(
        STORAGE.volume,
        String(audio.volume)
      );
    }

    function updatePlayButton() {
      const playing = !audio.paused;

      play.textContent = playing ? 'Ⅱ' : '▶';

      play.setAttribute(
        'aria-label',
        playing ? 'Pause' : 'Play'
      );
    }

    /* =========================
       PLAYLIST
       ========================= */

    function renderPlaylist() {
      trackList.innerHTML = '';

      tracks.forEach((track, trackIndex) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className =
          `track-item ${
            trackIndex === index ? 'active' : ''
          }`;

        button.innerHTML = `
          <span>
            <b>${track.title || 'Untitled'}</b>
            <small>${track.artist || ''}</small>
          </span>
        `;

        button.addEventListener('click', () => {
          loadTrack(trackIndex, true);
          closePlaylist();
        });

        trackList.appendChild(button);
      });
    }

    function openPlaylist() {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
    }

    function closePlaylist() {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
    }

    queue.addEventListener('click', openPlaylist);
    info.addEventListener('click', openPlaylist);
    closeMenu.addEventListener('click', closePlaylist);

    /* =========================
       LOAD TRACK
       ========================= */

    function loadTrack(trackIndex, autoplay = false) {
      index =
        (trackIndex + tracks.length) %
        tracks.length;

      const track = tracks[index];

      if (!track || !track.src) {
        console.error(
          'Invalid music track:',
          track
        );
        return;
      }

      audio.pause();

      title.textContent =
        track.title || 'Untitled';

      artist.textContent =
        track.artist || 'Unknown artist';

      if (track.art) {
        art.src = new URL(
          track.art,
          document.baseURI
        ).href;
      } else {
        art.removeAttribute('src');
      }

      /*
       * GitHub Pages-safe URL.
       */
      const source = new URL(
        track.src,
        document.baseURI
      ).href;

      console.log(
        'Loading music:',
        source
      );

      audio.src = source;
      audio.load();

      progress.value = 0;
      currentTime.textContent = '0:00';
      duration.textContent = '0:00';

      /*
       * Only restore saved position for the
       * previously selected track.
       */
      if (
        index ===
        Number(
          localStorage.getItem(STORAGE.track)
        )
      ) {
        savedTime =
          Number(
            localStorage.getItem(STORAGE.time)
          ) || 0;
      } else {
        savedTime = 0;
      }

      localStorage.setItem(
        STORAGE.track,
        String(index)
      );

      updatePlayButton();
      renderPlaylist();

      if (autoplay) {
        playTrack();
      }
    }

    /* =========================
       PLAY
       ========================= */

    async function playTrack() {
      try {
        /*
         * Never seek to a hard-coded snippet position.
         * This makes the player reliable on mobile.
         */
        if (
          Number.isFinite(audio.duration) &&
          audio.duration > 0
        ) {
          if (
            !Number.isFinite(savedTime) ||
            savedTime < 0 ||
            savedTime >= audio.duration
          ) {
            savedTime = 0;
          }

          audio.currentTime = savedTime;
        }

        await audio.play();

        updatePlayButton();
        saveState();

      } catch (error) {
        console.error(
          'Music playback failed:',
          error
        );

        updatePlayButton();
      }
    }

    /* =========================
       CONTROLS
       ========================= */

    play.addEventListener('click', () => {
      if (audio.paused) {
        playTrack();
      } else {
        audio.pause();
      }
    });

    prev.addEventListener('click', () => {
      loadTrack(index - 1, true);
    });

    next.addEventListener('click', () => {
      loadTrack(index + 1, true);
    });

    /* =========================
       PROGRESS
       ========================= */

    progress.addEventListener('input', () => {
      if (
        !Number.isFinite(audio.duration) ||
        audio.duration <= 0
      ) {
        return;
      }

      audio.currentTime =
        (Number(progress.value) / 100) *
        audio.duration;

      savedTime = audio.currentTime;
      currentTime.textContent =
        formatTime(audio.currentTime);

      saveState();
    });

    /* =========================
       AUDIO EVENTS
       ========================= */

    audio.addEventListener(
      'loadedmetadata',
      () => {
        if (
          !Number.isFinite(audio.duration) ||
          audio.duration <= 0
        ) {
          console.error(
            'Music has no valid duration:',
            audio.src
          );
          return;
        }

        duration.textContent =
          formatTime(audio.duration);

        if (
          Number.isFinite(savedTime) &&
          savedTime >= 0 &&
          savedTime < audio.duration
        ) {
          audio.currentTime = savedTime;
        } else {
          savedTime = 0;
          audio.currentTime = 0;
        }
      }
    );

    audio.addEventListener(
      'timeupdate',
      () => {
        if (
          !Number.isFinite(audio.duration) ||
          audio.duration <= 0
        ) {
          return;
        }

        progress.value =
          (audio.currentTime /
            audio.duration) *
          100;

        currentTime.textContent =
          formatTime(audio.currentTime);

        savedTime = audio.currentTime;
      }
    );

    audio.addEventListener(
      'play',
      updatePlayButton
    );

    audio.addEventListener(
      'pause',
      () => {
        updatePlayButton();
        saveState();
      }
    );

    audio.addEventListener(
      'ended',
      () => {
        saveState();

        /*
         * Move to the next song.
         */
        loadTrack(index + 1, true);
      }
    );

    /* =========================
       INITIALIZE
       ========================= */

    loadTrack(index, false);
  }

  /* =========================
     ROUTER HOOK
     ========================= */

  function updateAfterRoute() {
    updatePageChrome();
    initYear();
  }

  /* =========================
     START
     ========================= */

  function init() {
    initNavToggle();
    updatePageChrome();
    initYear();
    initMusicPlayer();

    window.addEventListener(
      'popstate',
      updateAfterRoute
    );

    document.addEventListener(
      'click',
      event => {
        const link =
          event.target.closest(
            'a[href]'
          );

        if (!link) return;

        const href =
          link.getAttribute('href');

        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('http') ||
          href.startsWith('mailto:')
        ) {
          return;
        }

        if (
          PAGES.some(
            page => page[0] === href
          )
        ) {
          setTimeout(
            updateAfterRoute,
            0
          );
        }
      }
    );
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
