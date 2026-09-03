(() => {
  'use strict';

  /*
   * Single source of truth for site content.
   * Keep asset paths relative to the site root so GitHub Pages
   * works when the repository is deployed under /<repo-name>/.
   */

  window.SAKSHI = {
    identity: {
      name: 'Sakshi',
      nicknames: ['Malkin', 'Bauni'],
      dob: '02 Oct 2009',
      height: '5\'5" (165 cm approx.)',
      metIn: '2025',
      mbti: 'ISFP',
      dream: 'Pilot'
    },

    favorites: {
      colors: ['Black', 'Pink'],
      food: 'Biryani',
      movies: [
        'The Amazing Spider-Man',
        'The Amazing Spider-Man 2'
      ],
      manhwa: 'Lookism',
      kdrama: 'True Beauty',
      games: ['Roblox', 'Free Fire'],
      place: 'Japan',
      subject: 'Mathematics',
      sport: 'Volleyball'
    },

    hobbies: [
      'Drawing',
      'Dancing',
      'Volleyball'
    ],

    music: [
      {
        id: 'elvis',
        artist: 'Elvis Presley',
        title: "Can't Help Falling in Love",
        src: 'assets/music/elvis/cant-help-falling-in-love.mp3',
        art: 'assets/images/profile/sakshi.jpg'
      },
      {
        id: 'mj-human',
        artist: 'Michael Jackson',
        title: 'Human Nature',
        src: 'assets/music/mj/human-nature.mp3',
        art: 'assets/images/gallery/michael-jackson.jpg'
      },
      {
        id: 'mj-beat',
        artist: 'Michael Jackson',
        title: 'Beat It',
        src: 'assets/music/mj/beat-it.mp3',
        art: 'assets/images/gallery/michael-jackson.jpg'
      },
      {
        id: 'mj-thriller',
        artist: 'Michael Jackson',
        title: 'Thriller',
        src: 'assets/music/mj/thriller.mp3',
        art: 'assets/images/gallery/michael-jackson.jpg'
      },
      {
        id: 'mj-billie',
        artist: 'Michael Jackson',
        title: 'Billie Jean',
        src: 'assets/music/mj/billie-jean.mp3',
        art: 'assets/images/gallery/michael-jackson.jpg'
      },
      {
        id: 'x-hope',
        artist: 'XXXTENTACION',
        title: 'HOPE',
        src: 'assets/music/xxxtentacion/hope.mp3',
        art: 'assets/images/gallery/xxxtentacion.jpg'
      },
      {
        id: 'x-changes',
        artist: 'XXXTENTACION',
        title: 'changes',
        src: 'assets/music/xxxtentacion/changes.mp3',
        art: 'assets/images/gallery/xxxtentacion.jpg'
      }
    ]
  };
})();
