(() => {
  'use strict';

  /* ================================
     GLOBAL SITE CONTROLLER
     ================================ */

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
    volume: 'sakshiTrackVolume',
    mode: 'sakshiPlayMode'
  };

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const formatTime = seconds => {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));

    const minutes = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');

    return `${minutes}:${secs}`;
  };

  /* ================================
     NAV TOGGLE (runs once — the
     button and menu live in the
     shell, not in #app-main)
     ================================ */

  function initNavToggle() {
    const toggle = $('.nav-toggle');
    const menu = $('.site-nav ul');

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }

  /* ================================
     PAGE CHROME
     Active nav link + prev/next widget.
     Re-run after every router swap since
     the current page changes but the
     script never re-executes.
     ================================ */

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

    // Remove any prev/next widget left over from the previous page.
    main.querySelectorAll('.page-navigation').forEach(el => el.remove());

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

  /* ================================
     YEAR
     ================================ */

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(element => {
      element.textContent = new Date().getFullYear();
    });
  }

  /* ================================
     MUSIC PLAYER
     Runs exactly once, on true first
     load. Never re-run on route swaps,
     so the <audio> element (and its
     playback) is never interrupted.
     ================================ */

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

    /*
     * AUDIO ENGINE
     */

    const audio = new Audio();

    audio.preload = 'metadata';

    const savedVolume =
      Number(localStorage.getItem(STORAGE.volume));

    audio.volume =
      Number.isFinite(savedVolume)
        ? Math.min(Math.max(savedVolume, 0), 1)
        : 0.72;

    /*
     * STATE
     */

    let index =
      Number(localStorage.getItem(STORAGE.track));

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= tracks.length
    ) {
      index = 0;
    }

    let resumeTime =
      Number(localStorage.getItem(STORAGE.time)) || 0;

    /*
     * SNIPPET MODE
     * Instagram-style: play a short highlighted
     * window of each track (track.start → track.end)
     * on a loop, instead of the whole song.
     */

    let snippetMode =
      localStorage.getItem(STORAGE.mode) !== 'full';

    let clipStart = 0;
    let clipEnd = null;

    function computeClip(track) {
      const s = Number(track.start) || 0;
      const e = Number(track.end);

      return {
        start: s,
        end: Number.isFinite(e) && e > s ? e : null
      };
    }

    /*
     * PLAYER UI
     */

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

        <span class="time current-time">
          0:00
        </span>

        <input
          class="progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          value="0"
          aria-label="Song progress"
        >

        <span class="time duration">
          0:00
        </span>

        <button
          class="full-song-toggle"
          type="button"
        >Play full song</button>

        <button
          class="queue"
          type="button"
          aria-label="Open playlist"
        >☰</button>

      </div>

      <div
        class="track-menu"
        aria-hidden="true"
      >

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
    const fullSongToggle = $('.full-song-toggle', container);

    const menu = $('.track-menu', container);
    const closeMenu = $('.close-menu', container);
    const trackList = $('.track-list', container);

    /*
     * SAVE STATE
     */

    function saveState() {
      localStorage.setItem(
        STORAGE.track,
        String(index)
      );

      localStorage.setItem(
        STORAGE.time,
        String(audio.currentTime || 0)
      );

      localStorage.setItem(
        STORAGE.volume,
        String(audio.volume)
      );
    }

    /*
     * PLAY BUTTON
     */

    function updatePlayButton() {
      const playing = !audio.paused;

      play.textContent =
        playing ? 'Ⅱ' : '▶';

      play.setAttribute(
        'aria-label',
        playing ? 'Pause' : 'Play'
      );
    }

    /*
     * LOAD TRACK
     */

    function loadTrack(trackIndex, autoplay = false) {
      index =
        (trackIndex + tracks.length) %
        tracks.length;

      const track = tracks[index];

      if (!track || !track.src) {
        console.error(
          'Music player: invalid track',
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
        art.src = track.art;
      }

      /*
       * IMPORTANT:
       * Resolve the path relative to the current
       * GitHub Pages URL.
       */

      audio.src =
        new URL(
          track.src,
          window.location.href
        ).href;

      audio.load();

      const clip = computeClip(track);

      clipStart = clip.start;
      clipEnd = snippetMode ? clip.end : null;

      resumeTime = snippetMode ? clipStart : 0;

      if (
        index === Number(
          localStorage.getItem(STORAGE.track)
        )
      ) {
        const savedTime =
          Number(localStorage.getItem(STORAGE.time));

        if (Number.isFinite(savedTime)) {
          resumeTime = savedTime;
        }
      }

      progress.value = 0;
      currentTime.textContent = '0:00';
      duration.textContent = '0:00';

      updatePlayButton();
      renderPlaylist();

      if (autoplay) {
        playTrack();
      }

      localStorage.setItem(
        STORAGE.track,
        String(index)
      );
    }

    /*
     * PLAY
     */

    async function playTrack() {
      try {
        if (
          Number.isFinite(audio.duration) &&
          audio.duration > 0
        ) {
          if (snippetMode && clipEnd == null) {
            clipEnd = audio.duration;
          }

          if (clipEnd != null) {
            clipEnd = Math.min(clipEnd, audio.duration);
          }

          const ceiling =
            (snippetMode && clipEnd != null ? clipEnd : audio.duration) - 0.2;

          audio.currentTime =
            Math.min(
              Math.max(resumeTime, snippetMode ? clipStart : 0),
              Math.max(0, ceiling)
            );
        }

        await audio.play();

        updatePlayButton();

        saveState();

      } catch (error) {

        /*
         * Browser blocked playback or the
         * audio source failed.
         */

        console.error(
          'Music playback failed:',
          error
        );

        updatePlayButton();
      }
    }

    /*
     * PLAY / PAUSE
     */

    play.addEventListener('click', () => {

      if (audio.paused) {
        playTrack();
      } else {
        audio.pause();
        saveState();
      }

    });

    /*
     * PREVIOUS
     */

    prev.addEventListener('click', () => {
      loadTrack(index - 1, true);
    });

    /*
     * NEXT
     */

    next.addEventListener('click', () => {
      loadTrack(index + 1, true);
    });

    /*
     * PROGRESS BAR
     */

    progress.addEventListener('input', () => {

      if (
        !Number.isFinite(audio.duration) ||
        audio.duration <= 0
      ) {
        return;
      }

      if (snippetMode && clipEnd != null) {

        const clipLength = clipEnd - clipStart;

        audio.currentTime =
          clipStart +
          (Number(progress.value) / 100) * clipLength;

        currentTime.textContent =
          formatTime(audio.currentTime - clipStart);

      } else {

        audio.currentTime =
          (Number(progress.value) / 100) *
          audio.duration;

        currentTime.textContent =
          formatTime(audio.currentTime);

      }

      saveState();

    });

    /*
     * AUDIO EVENTS
     */

    audio.addEventListener(
      'loadedmetadata',
      () => {

        if (
          !Number.isFinite(audio.duration) ||
          audio.duration <= 0
        ) {
          return;
        }

        if (snippetMode && clipEnd == null) {
          clipEnd = audio.duration;
        }

        if (clipEnd != null) {
          clipEnd = Math.min(clipEnd, audio.duration);
        }

        const activeEnd =
          (snippetMode && clipEnd != null) ? clipEnd : audio.duration;

        duration.textContent =
          formatTime(
            (snippetMode && clipEnd != null)
              ? activeEnd - clipStart
              : audio.duration
          );

        audio.currentTime =
          Math.min(
            Math.max(resumeTime, snippetMode ? clipStart : 0),
            Math.max(0, activeEnd - 0.2)
          );

      }
    );

    audio.addEventListener(
      'timeupdate',
      () => {

        // Loop back to the start of the clip once we
        // hit the end of the highlighted snippet.
        if (
          snippetMode &&
          clipEnd != null &&
          audio.currentTime >= clipEnd - 0.05
        ) {
          audio.currentTime = clipStart;
          return;
        }

        if (
          Number.isFinite(audio.duration) &&
          audio.duration > 0
        ) {

          if (snippetMode && clipEnd != null) {

            const clipLength = clipEnd - clipStart;
            const clipPosition =
              Math.max(0, audio.currentTime - clipStart);

            progress.value =
              clipLength > 0
                ? (clipPosition / clipLength) * 100
                : 0;

            currentTime.textContent =
              formatTime(clipPosition);

          } else {

            progress.value =
              (
                audio.currentTime /
                audio.duration
              ) * 100;

            currentTime.textContent =
              formatTime(audio.currentTime);

          }

        }

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

    /*
     * AUTOMATICALLY PLAY NEXT SONG
     */

    audio.addEventListener(
      'ended',
      () => {

        // Snippet mode loops before the real file end,
        // but just in case it's ever reached, loop
        // instead of skipping to the next track.
        if (snippetMode && clipEnd != null) {
          audio.currentTime = clipStart;
          audio.play().catch(() => {});
          return;
        }

        loadTrack(index + 1, true);

      }
    );

    /*
     * ERROR REPORTING
     */

    audio.addEventListener(
      'error',
      () => {

        console.error(
          'Music file could not be loaded:',
          audio.currentSrc ||
          audio.src,
          audio.error
        );

        updatePlayButton();

      }
    );

    /*
     * PLAYLIST
     */

    function renderPlaylist() {

      trackList.innerHTML =
        tracks.map((track, i) => `
          <button
            type="button"
            class="track-option ${
              i === index ? 'selected' : ''
            }"
            data-index="${i}"
          >

            <img
              src="${track.art || ''}"
              alt=""
            >

            <span>
              <b>${track.title || 'Untitled'}</b>
              <small>${track.artist || ''}</small>
            </span>

          </button>
        `).join('');

      trackList
        .querySelectorAll('.track-option')
        .forEach(button => {

          button.addEventListener(
            'click',
            () => {

              const selected =
                Number(
                  button.dataset.index
                );

              loadTrack(selected, true);

              closePlaylist();

            }
          );

        });

    }

    /*
     * PLAYLIST OPEN / CLOSE
     */

    function openPlaylist() {
      renderPlaylist();

      menu.classList.add('open');

      menu.setAttribute(
        'aria-hidden',
        'false'
      );
    }

    function closePlaylist() {
      menu.classList.remove('open');

      menu.setAttribute(
        'aria-hidden',
        'true'
      );
    }

    /*
     * FULL SONG / SNIPPET TOGGLE
     */

    function updateToggleLabel() {
      fullSongToggle.textContent =
        snippetMode ? 'Play full song' : 'Play snippet';
    }

    updateToggleLabel();

    fullSongToggle.addEventListener('click', () => {

      snippetMode = !snippetMode;

      localStorage.setItem(
        STORAGE.mode,
        snippetMode ? 'snippet' : 'full'
      );

      updateToggleLabel();

      const track = tracks[index];
      const clip = computeClip(track);

      clipStart = clip.start;
      clipEnd = snippetMode ? clip.end : null;

      if (clipEnd == null && snippetMode) {
        clipEnd = audio.duration;
      }

      const wasPlaying = !audio.paused;

      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        const target = snippetMode ? clipStart : 0;

        audio.currentTime =
          Math.min(target, Math.max(0, audio.duration - 0.2));
      }

      if (wasPlaying) {
        audio.play().catch(() => {});
      }

      saveState();

    });

    queue.addEventListener(
      'click',
      openPlaylist
    );

    info.addEventListener(
      'click',
      openPlaylist
    );

    closeMenu.addEventListener(
      'click',
      closePlaylist
    );

    menu.addEventListener(
      'click',
      event => {

        if (event.target === menu) {
          closePlaylist();
        }

      }
    );

    /*
     * SAVE BEFORE LEAVING
     */

    window.addEventListener(
      'beforeunload',
      saveState
    );

    /*
     * INITIALISE
     *
     * IMPORTANT:
     * No autoplay here — the very first
     * load of the site still needs a user
     * gesture before audio can play. Every
     * navigation after this is handled by
     * the router, so this only ever runs once.
     */

    loadTrack(index, false);
  }

  /* ================================
     PAGE-SWAP HOOK
     Called by router.js after it swaps
     #app-main content. Re-runs only the
     chrome bits — never the music player.
     ================================ */

  window.SakshiSite = window.SakshiSite || {};

  window.SakshiSite.onPageSwap = () => {
    updatePageChrome();
    initYear();

    const menu = $('.site-nav ul');
    const toggle = $('.nav-toggle');

    if (menu) menu.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  /* ================================
     START EVERYTHING
     ================================ */

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      initNavToggle();
      updatePageChrome();
      initYear();
      initMusicPlayer();

    }
  );

})();
