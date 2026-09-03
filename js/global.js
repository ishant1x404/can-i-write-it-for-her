(() => {
  'use strict';

  /*
   * GLOBAL SITE CONTROLLER
   *
   * Responsibilities:
   * - navigation menu
   * - active navigation state
   * - previous/next page controls
   * - footer year
   * - persistent music player
   *
   * The player is initialized exactly once. router.js only calls
   * SakshiSite.onPageSwap() after replacing #app-main.
   */

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
    const value = Number(seconds);

    if (!Number.isFinite(value) || value < 0) {
      return '0:00';
    }

    const total = Math.floor(value);
    const minutes = Math.floor(total / 60);
    const secondsPart = String(total % 60).padStart(2, '0');

    return `${minutes}:${secondsPart}`;
  };

  const getCurrentPage = () => {
    const pathname = window.location.pathname;
    const file = pathname.split('/').pop();

    return file || 'index.html';
  };

  function initNavToggle() {
    const toggle = $('.nav-toggle');
    const menu = $('.site-nav ul');

    if (!toggle || !menu || toggle.dataset.initialized === 'true') {
      return;
    }

    toggle.dataset.initialized = 'true';

    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', event => {
      const link = event.target.closest('a');

      if (link) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function updatePageChrome() {
    const currentPage = getCurrentPage();

    document.querySelectorAll('.site-nav a').forEach(link => {
      const href = link.getAttribute('href');

      if (href === currentPage) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    const main = $('#app-main');

    if (!main) {
      return;
    }

    main.querySelectorAll('.page-navigation').forEach(element => {
      element.remove();
    });

    const pageIndex = PAGES.findIndex(
      page => page[0] === currentPage
    );

    if (pageIndex === -1) {
      return;
    }

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
    const year = String(new Date().getFullYear());

    document.querySelectorAll('[data-year]').forEach(element => {
      element.textContent = year;
    });
  }

  function createMusicPlayer() {
    const container = $('.music-player');

    if (!container) {
      return null;
    }

    const tracks =
      window.SAKSHI &&
      Array.isArray(window.SAKSHI.music)
        ? window.SAKSHI.music
        : [];

    if (!tracks.length) {
      console.warn('Music player: SAKSHI.music is empty.');
      return null;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.controls = false;

    const storedVolume = Number(
      localStorage.getItem(STORAGE.volume)
    );

    audio.volume =
      Number.isFinite(storedVolume)
        ? Math.min(Math.max(storedVolume, 0), 1)
        : 0.72;

    let index = Number(
      localStorage.getItem(STORAGE.track)
    );

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= tracks.length
    ) {
      index = 0;
    }

    let savedTime = Number(
      localStorage.getItem(STORAGE.time)
    );

    if (
      !Number.isFinite(savedTime) ||
      savedTime < 0
    ) {
      savedTime = 0;
    }

    let playerDestroyed = false;

    container.innerHTML = `
      <div class="player-inner">
        <img class="track-art" alt="" decoding="async">

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
          <button class="prev" type="button" aria-label="Previous song">◀</button>
          <button class="play" type="button" aria-label="Play">▶</button>
          <button class="next" type="button" aria-label="Next song">▶</button>
        </div>

        <input
          class="progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          value="0"
          aria-label="Song progress"
        >

        <span class="time current-time">0:00</span>
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
    const info = $('.track-info', container);
    const title = $('.track-title', container);
    const artist = $('.track-artist', container);

    const prev = $('.prev', container);
    const play = $('.play', container);
    const next = $('.next', container);

    const progress = $('.progress', container);
    const currentTime = $('.current-time', container);
    const duration = $('.duration', container);

    const queue = $('.queue', container);
    const menu = $('.track-menu', container);
    const closeMenuButton = $('.close-menu', container);
    const trackList = $('.track-list', container);

    function isValidDuration() {
      return Number.isFinite(audio.duration) && audio.duration > 0;
    }

    function saveState() {
      if (playerDestroyed) {
        return;
      }

      try {
        localStorage.setItem(STORAGE.track, String(index));
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
      } catch (error) {
        console.warn('Could not save player state:', error);
      }
    }

    function updatePlayButton() {
      const playing = !audio.paused && !audio.ended;

      play.textContent = playing ? 'Ⅱ' : '▶';
      play.setAttribute(
        'aria-label',
        playing ? 'Pause' : 'Play'
      );
    }

    function renderPlaylist() {
      trackList.replaceChildren();

      tracks.forEach((track, trackIndex) => {
        const button = document.createElement('button');
        const name = document.createElement('b');
        const performer = document.createElement('small');
        const text = document.createElement('span');

        button.type = 'button';
        button.className =
          trackIndex === index
            ? 'track-item active'
            : 'track-item';

        name.textContent = track.title || 'Untitled';
        performer.textContent = track.artist || 'Unknown artist';

        text.append(name, performer);
        button.append(text);

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

    function setArtwork(track) {
      if (!track.art) {
        art.removeAttribute('src');
        art.alt = '';
        return;
      }

      try {
        art.src = new URL(
          track.art,
          document.baseURI
        ).href;
        art.alt = `${track.title || 'Track'} artwork`;
      } catch (error) {
        art.removeAttribute('src');
        art.alt = '';
        console.warn('Invalid artwork URL:', track.art, error);
      }
    }

    function loadTrack(trackIndex, autoplay = false) {
      if (playerDestroyed) {
        return;
      }

      index =
        (trackIndex + tracks.length) % tracks.length;

      const track = tracks[index];

      if (!track || !track.src) {
        console.error('Invalid music track:', track);
        return;
      }

      audio.pause();

      title.textContent = track.title || 'Untitled';
      artist.textContent = track.artist || 'Unknown artist';

      setArtwork(track);

      let source;

      try {
        source = new URL(
          track.src,
          document.baseURI
        ).href;
      } catch (error) {
        console.error('Invalid music URL:', track.src, error);
        return;
      }

      progress.value = '0';
      currentTime.textContent = '0:00';
      duration.textContent = '0:00';

      /*
       * Only restore the saved time for the track that was
       * actually playing when the page was previously closed.
       */
      const savedTrack = Number(
        localStorage.getItem(STORAGE.track)
      );

      if (
        Number.isInteger(savedTrack) &&
        savedTrack === index
      ) {
        const storedTime = Number(
          localStorage.getItem(STORAGE.time)
        );

        savedTime =
          Number.isFinite(storedTime) && storedTime >= 0
            ? storedTime
            : 0;
      } else {
        savedTime = 0;
      }

      localStorage.setItem(STORAGE.track, String(index));

      audio.src = source;
      audio.load();

      renderPlaylist();
      updatePlayButton();

      console.log('Music source:', source);

      if (autoplay) {
        playTrack();
      }
    }

    async function playTrack() {
      if (playerDestroyed) {
        return;
      }

      try {
        if (isValidDuration()) {
          if (
            !Number.isFinite(savedTime) ||
            savedTime < 0 ||
            savedTime >= audio.duration
          ) {
            savedTime = 0;
          }

          if (Math.abs(audio.currentTime - savedTime) > 0.25) {
            audio.currentTime = savedTime;
          }
        }

        await audio.play();

        updatePlayButton();
        saveState();
      } catch (error) {
        updatePlayButton();

        console.error('Music playback failed:', {
          error,
          name: error?.name,
          message: error?.message,
          source: audio.currentSrc || audio.src
        });
      }
    }

    play.addEventListener('click', () => {
      if (audio.paused || audio.ended) {
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

    info.addEventListener('click', openPlaylist);
    queue.addEventListener('click', openPlaylist);
    closeMenuButton.addEventListener('click', closePlaylist);

    menu.addEventListener('click', event => {
      if (event.target === menu) {
        closePlaylist();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closePlaylist();
      }
    });

    progress.addEventListener('input', () => {
      if (!isValidDuration()) {
        return;
      }

      const percentage = Number(progress.value) / 100;

      audio.currentTime =
        Math.min(
          Math.max(percentage, 0),
          1
        ) * audio.duration;

      savedTime = audio.currentTime;
      currentTime.textContent =
        formatTime(audio.currentTime);

      saveState();
    });

    audio.addEventListener('loadedmetadata', () => {
      if (!isValidDuration()) {
        console.error(
          'Audio loaded without a valid duration:',
          audio.currentSrc || audio.src
        );
        return;
      }

      duration.textContent = formatTime(audio.duration);

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
    });

    audio.addEventListener('timeupdate', () => {
      if (!isValidDuration()) {
        return;
      }

      progress.value = String(
        (audio.currentTime / audio.duration) * 100
      );

      currentTime.textContent =
        formatTime(audio.currentTime);

      savedTime = audio.currentTime;
    });

    audio.addEventListener('play', updatePlayButton);

    audio.addEventListener('pause', () => {
      updatePlayButton();
      saveState();
    });

    audio.addEventListener('volumechange', saveState);

    audio.addEventListener('ended', () => {
      savedTime = 0;
      localStorage.setItem(STORAGE.time, '0');
      loadTrack(index + 1, true);
    });

    audio.addEventListener('error', () => {
      const mediaError = audio.error;

      console.error('MUSIC ERROR:', {
        code: mediaError?.code,
        message: mediaError?.message,
        source: audio.currentSrc || audio.src
      });

      updatePlayButton();
    });

    audio.addEventListener('stalled', () => {
      console.warn(
        'Music download stalled:',
        audio.currentSrc || audio.src
      );
    });

    audio.addEventListener('waiting', () => {
      play.setAttribute('aria-label', 'Loading');
    });

    audio.addEventListener('canplay', updatePlayButton);

    loadTrack(index, false);

    return {
      audio,
      loadTrack,
      play: playTrack,
      destroy() {
        playerDestroyed = true;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    };
  }

  let musicPlayer = null;

  function initMusicPlayer() {
    if (musicPlayer) {
      return;
    }

    musicPlayer = createMusicPlayer();
  }

  function updateAfterRoute() {
    updatePageChrome();
    initYear();
    initNavToggle();
  }

  function init() {
    initNavToggle();
    updateAfterRoute();
    initMusicPlayer();
  }

  /*
   * router.js calls this after replacing #app-main.
   * It intentionally does NOT recreate the music player.
   */
  window.SakshiSite = {
    onPageSwap: updateAfterRoute,
    getMusicPlayer: () => musicPlayer
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {
      once: true
    });
  } else {
    init();
  }
})();
