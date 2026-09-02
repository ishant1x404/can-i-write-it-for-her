document.addEventListener('DOMContentLoaded',()=>{
  const toggle=document.querySelector('.nav-toggle'), menu=document.querySelector('.site-nav ul');
  if(toggle&&menu) toggle.onclick=()=>menu.classList.toggle('open');
  const current=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.site-nav a').forEach(a=>{if(a.getAttribute('href')===current)a.setAttribute('aria-current','page')});
  // Page-to-page navigation buttons
  const pages=[
    ['index.html','Home'],
    ['about.html','About'],
    ['interests.html','Interests'],
    ['favorites.html','Favorites'],
    ['memories.html','Memories'],
    ['timeline.html','Timeline'],
    ['birthday.html','Birthday']
  ];
  const here=pages.findIndex(([href])=>href===current);
  if(here>=0){
    const wrap=document.createElement('nav');
    wrap.className='page-navigation';
    wrap.setAttribute('aria-label','Page navigation');
    const prev=pages[here-1], next=pages[here+1];
    wrap.innerHTML=`<a class="${prev?'':'disabled'}" ${prev?`href="${prev[0]}"`:''}>← ${prev?prev[1]:'Previous'}</a><span class="page-current">${pages[here][1]}</span><a class="${next?'':'disabled'}" ${next?`href="${next[0]}"`:''}>${next?next[1]:'Next'} →</a>`;
    const main=document.querySelector('main');
    if(main) main.appendChild(wrap);
  }

  document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
  initMusicPlayer();
});

function initMusicPlayer(){
  const shell=document.querySelector('.music-player');
  if(!shell || !window.SAKSHI?.music?.length) return;
  const tracks=SAKSHI.music;
  let savedIndex=Number(localStorage.getItem('sakshiTrackIndex'));
  if(!Number.isInteger(savedIndex)||savedIndex<0||savedIndex>=tracks.length) savedIndex=0;
  let index=savedIndex;
  let audio=new Audio(); audio.preload='metadata'; audio.volume=0.72;
  let userStarted=false;
  let resumeTime=Number(localStorage.getItem('sakshiTrackTime'))||0;
  let lastSaved=0;

  shell.innerHTML=`<div class="player-inner">
    <img class="track-art" alt="Track artwork">
    <button class="track-info" aria-label="Open song list"><b class="track-title"></b><span class="track-artist"></span></button>
    <div class="player-controls">
      <button class="prev" aria-label="Previous song">◀</button>
      <button class="play" aria-label="Play or pause">▶</button>
      <button class="next" aria-label="Next song">▶</button>
    </div>
    <span class="time current-time">0:00</span>
    <input class="progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Song progress">
    <span class="time duration">0:00</span>
    <button class="queue" aria-label="Choose song">☰</button>
  </div>
  <div class="track-menu" aria-hidden="true"><div class="track-menu-inner"><div class="menu-head"><b>HER SOUNDTRACK</b><button class="close-menu" aria-label="Close">×</button></div><div class="track-list"></div></div></div>`;

  const art=shell.querySelector('.track-art'), title=shell.querySelector('.track-title'), artist=shell.querySelector('.track-artist');
  const play=shell.querySelector('.play'), prev=shell.querySelector('.prev'), next=shell.querySelector('.next');
  const progress=shell.querySelector('.progress'), currentTime=shell.querySelector('.current-time'), duration=shell.querySelector('.duration');
  const queue=shell.querySelector('.queue'), info=shell.querySelector('.track-info'), menu=shell.querySelector('.track-menu');
  const list=shell.querySelector('.track-list');

  const fmt=s=>{s=Math.max(0,Math.floor(s||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  function renderList(){list.innerHTML=tracks.map((t,i)=>`<button class="track-option ${i===index?'selected':''}" data-index="${i}"><img src="${t.art}" alt=""><span><b>${t.title}</b><small>${t.artist}</small></span>${i===index?'<i>●</i>':''}</button>`).join('');
    list.querySelectorAll('.track-option').forEach(b=>b.onclick=()=>{selectTrack(Number(b.dataset.index),true);closeMenu()});}
  function openMenu(){renderList();menu.classList.add('open');menu.setAttribute('aria-hidden','false')}
  function closeMenu(){menu.classList.remove('open');menu.setAttribute('aria-hidden','true')}
  queue.onclick=openMenu; info.onclick=openMenu; shell.querySelector('.close-menu').onclick=closeMenu;
  menu.addEventListener('click',e=>{if(e.target===menu)closeMenu()});

  function save(){localStorage.setItem('sakshiTrackIndex',index);localStorage.setItem('sakshiTrackTime',String(audio.currentTime||0))}
  function loadTrack(i,fromSelection=false){
    index=(i+tracks.length)%tracks.length; const t=tracks[index];
    audio.src=t.src; audio.load(); art.src=t.art; title.textContent=t.title; artist.textContent=t.artist;
    localStorage.setItem('sakshiTrackIndex',index);
    resumeTime=fromSelection?t.start:(index===savedIndex?resumeTime:t.start);
    play.textContent='▶'; renderList();
  }
  function selectTrack(i,fromSelection){loadTrack(i,fromSelection); audio.addEventListener('loadedmetadata',()=>{audio.currentTime=Math.min(resumeTime||tracks[i].start,audio.duration-0.5); startPlayback();},{once:true});}
  function startPlayback(){userStarted=true;audio.play().then(()=>play.textContent='Ⅱ').catch(()=>play.textContent='▶')}
  loadTrack(index,false);
  audio.addEventListener('loadedmetadata',()=>{audio.currentTime=Math.min(resumeTime||tracks[index].start,audio.duration-0.5);duration.textContent=fmt(audio.duration);});
  audio.addEventListener('timeupdate',()=>{currentTime.textContent=fmt(audio.currentTime); if(audio.duration)progress.value=(audio.currentTime/audio.duration)*100; if(Math.abs(audio.currentTime-lastSaved)>2){save();lastSaved=audio.currentTime}});
  audio.addEventListener('ended',()=>{next.click()});
  play.onclick=()=>audio.paused?startPlayback():(audio.pause(),play.textContent='▶',save());
  prev.onclick=()=>selectTrack(index-1,true);
  next.onclick=()=>selectTrack(index+1,true);
  progress.oninput=()=>{if(audio.duration)audio.currentTime=(Number(progress.value)/100)*audio.duration;save()};
  window.addEventListener('beforeunload',save);
  document.addEventListener('pointerdown',()=>{if(!userStarted&&audio.paused)startPlayback()},{once:true});
  document.addEventListener('keydown',()=>{if(!userStarted&&audio.paused)startPlayback()},{once:true});
}
