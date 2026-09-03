(() => {
  'use strict';

  // Your data.js uses window.SAKSHI.music
  const DATA = window.SAKSHI || {};
  const TRACKS = Array.isArray(DATA.music) ? DATA.music : [];

  const STORAGE = {
    index: 'sakshiTrackIndex',
    time: 'sakshiTrackTime',
    volume: 'sakshiTrackVolume'
  };

  let audio = null;
  let currentIndex = 0;
  let initialized = false;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  }

  /*
   * IMPORTANT:
   * Never restore a saved volume of 0.
   * This was one of the causes of the silent-player problem.
   */
  function getSavedVolume() {
    const saved = Number(
      localStorage.getItem(STORAGE.volume)
    );

    if (!Number.isFinite(saved) || saved <= 0) {
      return 0.8;
    }

    return Math.min(saved, 1);
  }

  function getPlayer() {
    return document.querySelector('.music-player');
  }

  function setStatus(message) {
    const player = getPlayer();

    if (player) {
      player.dataset.status = message;
    }

    console.log(`[Music Player] ${message}`);
  }

  function saveState() {
    if (!audio) return;

    localStorage.setItem(
      STORAGE.index,
      String(currentIndex)
    );

    if (Number.isFinite(audio.currentTime)) {
      localStorage.setItem(
        STORAGE.time,
        String(audio.currentTime)
      );
    }

    if (audio.volume > 0) {
      localStorage.setItem(
        STORAGE.volume,
        String(audio.volume)
      );
    }
  }

  function createAudio() {
    if (audio) return audio;

    audio = document.createElement('audio');

    audio.id = 'global-audio-player';
    audio.preload = 'auto';
    audio.controls = false;
    audio.autoplay = false;

    // Explicitly make the player audible.
    audio.muted = false;
    audio.volume = getSavedVolume();

    audio.setAttribute('playsinline', '');
    audio.setAttribute(
      'webkit-playsinline',
      ''
    );

    /*
     * Keep this audio element outside the PJAX/page
     * content so navigation cannot destroy playback.
     */
    document.body.appendChild(audio);

    audio.addEventListener(
      'loadedmetadata',
      () => {
        updateDuration();
        updateProgress();
        setStatus('Ready');
      }
    );

    audio.addEventListener(
      'canplay',
      () => {
        setStatus('Ready');
      }
    );

    audio.addEventListener(
      'playing',
      () => {
        setStatus('Playing');
        updatePlayerUI();
      }
    );

    audio.addEventListener(
      'pause',
      () => {
        setStatus('Paused');
        updatePlayerUI();
      }
    );

    audio.addEventListener(
      'timeupdate',
      () => {
        updateProgress();
        saveState();
      }
    );

    audio.addEventListener(
      'ended',
      () => {
        playNext(true);
      }
    );

    audio.addEventListener(
      'error',
      () => {
        console.error(
          '[Music Player] Audio error:',
          audio.error,
          audio.src
        );

        setStatus('Audio failed to load');
        updatePlayerUI();
      }
    );

    return audio;
  }

  function getTrack(index) {
    if (!TRACKS.length) {
      return null;
    }

    return TRACKS[
      ((index % TRACKS.length) +
        TRACKS.length) %
        TRACKS.length
    ];
  }

  function getTrackSource(track) {
    if (!track) return '';

    const source =
      track.src ||
      track.audio ||
      track.url ||
      '';

    if (!source) {
      return '';
    }

    try {
      return new URL(
        source,
        document.baseURI
      ).href;
    } catch (error) {
      console.error(
        '[Music Player] Invalid audio URL:',
        source,
        error
      );

      return source;
    }
  }

  function loadTrack(
    index,
    {
      autoplay = false,
      restoreTime = false
    } = {}
  ) {
    if (!TRACKS.length) {
      setStatus('No tracks available');
      return;
    }

    currentIndex =
      ((index % TRACKS.length) +
        TRACKS.length) %
      TRACKS.length;

    const track = getTrack(currentIndex);
    const playerAudio = createAudio();

    const source =
      getTrackSource(track);

    if (!source) {
      console.error(
        '[Music Player] Missing audio source:',
        track
      );

      setStatus('Missing audio source');
      return;
    }

    playerAudio.pause();

    // Force audible state whenever a track changes.
    playerAudio.muted = false;

    if (!(playerAudio.volume > 0)) {
      playerAudio.volume =
        getSavedVolume();

      if (!(playerAudio.volume > 0)) {
        playerAudio.volume = 0.8;
      }
    }

    const savedIndex = Number(
      localStorage.getItem(STORAGE.index)
    );

    const savedTime = Number(
      localStorage.getItem(STORAGE.time)
    );

    const shouldRestore =
      restoreTime &&
      savedIndex === currentIndex &&
      Number.isFinite(savedTime) &&
      savedTime > 0;

    if (playerAudio.src !== source) {
      playerAudio.src = source;
      playerAudio.load();
    }

    if (shouldRestore) {
      const restore = () => {
        if (
          Number.isFinite(
            playerAudio.duration
          ) &&
          savedTime <
            playerAudio.duration
        ) {
          try {
            playerAudio.currentTime =
              savedTime;
          } catch (error) {
            console.warn(
              '[Music Player] Could not restore position:',
              error
            );
          }
        }
      };

      if (
        playerAudio.readyState >= 1
      ) {
        restore();
      } else {
        playerAudio.addEventListener(
          'loadedmetadata',
          restore,
          { once: true }
        );
      }
    }

    localStorage.setItem(
      STORAGE.index,
      String(currentIndex)
    );

    updatePlayerUI();

    if (autoplay) {
      playCurrent();
    }
  }

  function playCurrent() {
    if (!TRACKS.length) {
      return;
    }

    const playerAudio =
      createAudio();

    if (!playerAudio.src) {
      loadTrack(currentIndex);
    }

    /*
     * Explicitly force audio output.
     */
    playerAudio.muted = false;

    if (!(playerAudio.volume > 0)) {
      playerAudio.volume = 0.8;
    }

    const playPromise =
      playerAudio.play();

    if (
      playPromise &&
      typeof playPromise.then ===
        'function'
    ) {
      playPromise
        .then(() => {
          setStatus('Playing');
          updatePlayerUI();
        })
        .catch(error => {
          console.error(
            '[Music Player] play() failed:',
            error
          );

          setStatus(
            'Tap play to start audio'
          );

          updatePlayerUI();
        });
    }
  }

  function togglePlay() {
    const playerAudio =
      createAudio();

    if (!playerAudio.src) {
      loadTrack(currentIndex);
    }

    if (playerAudio.paused) {
      playCurrent();
    } else {
      playerAudio.pause();
    }
  }

  function playNext(autoplay = false) {
    loadTrack(
      currentIndex + 1,
      {
        autoplay,
        restoreTime: false
      }
    );
  }

  function playPrevious() {
    if (
      audio &&
      audio.currentTime > 3
    ) {
      audio.currentTime = 0;
      return;
    }

    loadTrack(
      currentIndex - 1,
      {
        autoplay: true,
        restoreTime: false
      }
    );
  }

  function seek(event) {
    if (!audio) return;

    if (
      !Number.isFinite(
        audio.duration
      ) ||
      audio.duration <= 0
    ) {
      return;
    }

    const percentage =
      Number(event.target.value);

    if (!Number.isFinite(percentage)) {
      return;
    }

    audio.currentTime =
      (percentage / 100) *
      audio.duration;

    updateProgress();
    saveState();
  }

  function updateProgress() {
    const player =
      getPlayer();

    if (!player || !audio) {
      return;
    }

    const progress =
      $('.progress', player);

    const currentTime =
      $('.current-time', player);

    if (
      progress &&
      Number.isFinite(
        audio.duration
      ) &&
      audio.duration > 0
    ) {
      progress.value = String(
        (audio.currentTime /
          audio.duration) *
          100
      );
    }

    if (currentTime) {
      currentTime.textContent =
        formatTime(
          audio.currentTime
        );
    }
  }

  function updateDuration() {
    const player =
      getPlayer();

    if (!player || !audio) {
      return;
    }

    const duration =
      $('.duration', player);

    if (duration) {
      duration.textContent =
        formatTime(
          audio.duration
        );
    }
  }

  function toggleMute() {
    const playerAudio =
      createAudio();

    if (
      playerAudio.muted ||
      playerAudio.volume === 0
    ) {
      playerAudio.muted = false;

      playerAudio.volume =
        getSavedVolume();

      if (
        !(playerAudio.volume > 0)
      ) {
        playerAudio.volume = 0.8;
      }

      setStatus('Unmuted');
    } else {
      localStorage.setItem(
        STORAGE.volume,
        String(
          playerAudio.volume
        )
      );

      playerAudio.muted = true;

      setStatus('Muted');
    }

    updatePlayerUI();
  }

  function setVolume(value) {
    const playerAudio =
      createAudio();

    let volume = Number(value);

    if (!Number.isFinite(volume)) {
      volume = 0.8;
    }

    volume = Math.max(
      0,
      Math.min(volume, 1)
    );

    playerAudio.volume = volume;

    playerAudio.muted =
      volume === 0;

    if (volume > 0) {
      localStorage.setItem(
        STORAGE.volume,
        String(volume)
      );
    }

    updatePlayerUI();
  }

  function updatePlayerUI() {
    const player =
      getPlayer();

    const track =
      getTrack(currentIndex);

    if (!player || !track) {
      return;
    }

    const title =
      $('.track-title', player);

    const artist =
      $('.track-artist', player);

    const artwork =
      $('.track-art', player);

    const playButton =
      $('.play', player);

    const volumeButton =
      $('.volume', player);

    const volumeSlider =
      $('.volume-slider', player);

    if (title) {
      title.textContent =
        track.title ||
        track.name ||
        'Unknown track';
    }

    if (artist) {
      artist.textContent =
        track.artist ||
        track.author ||
        '';
    }

    if (artwork) {
      artwork.src =
        track.art ||
        track.cover ||
        'assets/images/profile/sakshi.jpg';

      artwork.alt =
        `${track.title || 'Track'} artwork`;
    }

    if (playButton) {
      const playing =
        audio &&
        !audio.paused;

      playButton.textContent =
        playing
          ? '❚❚'
          : '▶';

      playButton.setAttribute(
        'aria-label',
        playing
          ? 'Pause'
          : 'Play'
      );
    }

    if (volumeButton) {
      const muted =
        !audio ||
        audio.muted ||
        audio.volume === 0;

      volumeButton.textContent =
        muted
          ? '🔇'
          : '🔊';

      volumeButton.setAttribute(
        'aria-label',
        muted
          ? 'Unmute'
          : 'Mute'
      );
    }

    if (
      volumeSlider &&
      audio
    ) {
      volumeSlider.value =
        String(
          audio.volume
        );
    }

    updatePlaylist();
  }

  function updatePlaylist() {
    const list =
      $('.track-list');

    if (!list) {
      return;
    }

    list.innerHTML = '';

    TRACKS.forEach(
      (track, index) => {
        const button =
          document.createElement(
            'button'
          );

        button.type = 'button';

        button.className =
          `track-item${
            index === currentIndex
              ? ' active'
              : ''
          }`;

        const title =
          track.title ||
          track.name ||
          'Unknown track';

        const artist =
          track.artist ||
          track.author ||
          '';

        button.innerHTML = `
          <span class="track-item-text">
            <b></b>
            <small></small>
          </span>
        `;

        $('.track-item-text b', button)
          .textContent = title;

        $('.track-item-text small', button)
          .textContent = artist;

        button.addEventListener(
          'click',
          () => {
            loadTrack(
              index,
              {
                autoplay: true,
                restoreTime: false
              }
            );
          }
        );

        list.appendChild(button);
      }
    );
  }

  function createPlaylistMenu() {
    if ($('.track-menu')) {
      return;
    }

    const menu =
      document.createElement(
        'div'
      );

    menu.className =
      'track-menu';

    menu.setAttribute(
      'aria-hidden',
      'true'
    );

    menu.innerHTML = `
      <div
        class="track-menu-inner"
        role="dialog"
        aria-label="Playlist"
      >
        <div class="menu-head">
          <span>PLAYLIST</span>

          <button
            class="close-menu"
            type="button"
            aria-label="Close playlist"
          >
            ×
          </button>
        </div>

        <div class="track-list"></div>
      </div>
    `;

    document.body.appendChild(menu);

    $('.close-menu', menu)
      ?.addEventListener(
        'click',
        closePlaylist
      );

    menu.addEventListener(
      'click',
      event => {
        if (
          event.target === menu
        ) {
          closePlaylist();
        }
      }
    );
  }

  function openPlaylist() {
    createPlaylistMenu();

    const menu =
      $('.track-menu');

    if (!menu) return;

    menu.classList.add('open');

    menu.setAttribute(
      'aria-hidden',
      'false'
    );

    updatePlaylist();
  }

  function closePlaylist() {
    const menu =
      $('.track-menu');

    if (!menu) return;

    menu.classList.remove(
      'open'
    );

    menu.setAttribute(
      'aria-hidden',
      'true'
    );
  }

  function ensureVolumeControls() {
    const player =
      getPlayer();

    if (!player) return;

    let volumeButton =
      $('.volume', player);

    if (!volumeButton) {
      volumeButton =
        document.createElement(
          'button'
        );

      volumeButton.className =
        'volume';

      volumeButton.type =
        'button';

      const queue =
        $('.queue', player);

      if (queue) {
        queue.before(
          volumeButton
        );
      } else {
        player.appendChild(
          volumeButton
        );
      }

      volumeButton.addEventListener(
        'click',
        toggleMute
      );
    }

    let slider =
      $('.volume-slider', player);

    if (!slider) {
      slider =
        document.createElement(
          'input'
        );

      slider.className =
        'volume-slider';

      slider.type = 'range';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.01';

      slider.value =
        String(
          createAudio().volume
        );

      slider.setAttribute(
        'aria-label',
        'Volume'
      );

      const queue =
        $('.queue', player);

      if (queue) {
        queue.before(slider);
      } else {
        player.appendChild(
          slider
        );
      }

      slider.addEventListener(
        'input',
        event => {
          setVolume(
            event.target.value
          );
        }
      );
    }
  }

  function bindPlayer() {
    const player =
      getPlayer();

    if (!player) {
      return;
    }

    if (
      player.dataset.bound !==
      'true'
    ) {
      player.dataset.bound =
        'true';

      createAudio();
      createPlaylistMenu();
      ensureVolumeControls();

      $('.play', player)
        ?.addEventListener(
          'click',
          togglePlay
        );

      $('.prev', player)
        ?.addEventListener(
          'click',
          playPrevious
        );

      $('.next', player)
        ?.addEventListener(
          'click',
          () => playNext(true)
        );

      $('.progress', player)
        ?.addEventListener(
          'input',
          seek
        );

      $('.queue', player)
        ?.addEventListener(
          'click',
          openPlaylist
        );

      $('.track-info', player)
        ?.addEventListener(
          'click',
          openPlaylist
        );
    }

    const savedIndex =
      Number(
        localStorage.getItem(
          STORAGE.index
        )
      );

    currentIndex =
      Number.isInteger(
        savedIndex
      ) &&
      savedIndex >= 0 &&
      savedIndex <
        TRACKS.length
        ? savedIndex
        : 0;

    loadTrack(
      currentIndex,
      {
        autoplay: false,
        restoreTime: true
      }
    );

    updatePlayerUI();
  }

  function bindNavigation() {
    const toggle =
      $('.nav-toggle');

    const menu =
      $('.site-nav ul');

    if (
      toggle &&
      menu &&
      toggle.dataset.bound !==
        'true'
    ) {
      toggle.dataset.bound =
        'true';

      toggle.addEventListener(
        'click',
        () => {
          const open =
            menu.classList.toggle(
              'open'
            );

          toggle.setAttribute(
            'aria-expanded',
            String(open)
          );
        }
      );
    }
  }

  function closeMobileNav() {
    $('.site-nav ul')
      ?.classList.remove(
        'open'
      );

    $('.nav-toggle')
      ?.setAttribute(
        'aria-expanded',
        'false'
      );
  }

  function updateYears() {
    document
      .querySelectorAll(
        '[data-year]'
      )
      .forEach(element => {
        element.textContent =
          new Date().getFullYear();
      });
  }

  function onPageSwap() {
    closeMobileNav();
    bindNavigation();
    bindPlayer();
    updateYears();
  }

  function init() {
    if (initialized) {
      return;
    }

    initialized = true;

    onPageSwap();
  }

  window.SakshiSite = {
    onPageSwap,
    saveState,
    togglePlay,
    playNext,
    playPrevious,
    toggleMute,
    setVolume
  };

  window.addEventListener(
    'pagehide',
    saveState
  );

  document.addEventListener(
    'visibilitychange',
    () => {
      if (
        document.visibilityState ===
        'hidden'
      ) {
        saveState();
      }
    }
  );

  if (
    document.readyState ===
    'loading'
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
