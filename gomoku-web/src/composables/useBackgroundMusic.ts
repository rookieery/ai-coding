import { ref } from 'vue';
import unLoginMusic from '../music/unLogin.mp3';
import loginInMusic from '../music/login_in.mp3';

const isPlaying = ref(true);

let audio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;
let pendingPlay = false;

function getAudio(src: string): HTMLAudioElement {
  if (!audio || currentSrc !== src) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0.3;
    audio.src = src;
    currentSrc = src;
  }
  return audio;
}

function tryPlay(el: HTMLAudioElement) {
  el.play().then(() => {
    pendingPlay = false;
  }).catch(() => {
    pendingPlay = true;
  });
}

function setupInteractionListener() {
  const resume = () => {
    if (pendingPlay && audio) {
      audio.play().catch(() => {});
      pendingPlay = false;
    }
    document.removeEventListener('click', resume);
    document.removeEventListener('keydown', resume);
  };
  document.addEventListener('click', resume, { once: true });
  document.addEventListener('keydown', resume, { once: true });
}

function switchTrack(src: string) {
  if (currentSrc === src && audio) return;

  if (audio) {
    audio.pause();
  }

  const el = getAudio(src);
  currentSrc = src;

  if (isPlaying.value) {
    tryPlay(el);
  }
}

export function useBackgroundMusic() {
  const toggle = () => {
    if (!audio) return;
    if (isPlaying.value) {
      audio.pause();
      isPlaying.value = false;
      pendingPlay = false;
    } else {
      tryPlay(audio);
      isPlaying.value = true;
    }
  };

  const init = (isAuthenticated: boolean) => {
    const src = isAuthenticated ? loginInMusic : unLoginMusic;
    const el = getAudio(src);
    tryPlay(el);
    setupInteractionListener();
  };

  const onAuthChange = (isAuthenticated: boolean) => {
    const src = isAuthenticated ? loginInMusic : unLoginMusic;
    switchTrack(src);
  };

  return { isPlaying, toggle, init, onAuthChange };
}
