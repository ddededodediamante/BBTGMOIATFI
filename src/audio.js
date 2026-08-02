if (localStorage.getItem("effects") === null) localStorage.setItem("effects", "true");

let soundEffectsEnabled = localStorage.getItem("effects") !== "false";

const audioCache = new Map();

export function playSoundEffect(path, volume = 0.6) {
  if (!soundEffectsEnabled) return;
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audioCache.set(path, audio);
  }
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function isSoundEffectsEnabled() {
  return soundEffectsEnabled;
}

export function setSoundEffectsEnabled(enabled) {
  soundEffectsEnabled = enabled;
}
