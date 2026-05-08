import { ref } from 'vue';
import bgMusic from '../music/bg.mp3';

const isPlaying = ref(true);

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(bgMusic);
    audio.loop = true;
    audio.volume = 0.3;
  }
  return audio;
}

export function useBackgroundMusic() {
  const toggle = () => {
    const el = getAudio();
    if (isPlaying.value) {
      el.pause();
      isPlaying.value = false;
    } else {
      el.play().catch(() => {});
      isPlaying.value = true;
    }
  };

  const init = () => {
    const el = getAudio();
    el.play().catch(() => {
      isPlaying.value = false;
    });
  };

  return { isPlaying, toggle, init };
}
