<template>
  <div ref="plyrContainer">
    <audio ref="audioEl" crossorigin="anonymous">
      <source v-if="source" :src="source" />
    </audio>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useQuasar } from 'quasar';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const $q = useQuasar();
const store = useAudioPlayerStore();

const plyrContainer = ref<HTMLDivElement>();
const audioEl = ref<HTMLAudioElement>();
let player: Plyr | null = null;
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

const getToken = (): string => {
  return String($q.localStorage.getItem('jwt-token') || '');
};

const source = computed(() => {
  const token = getToken();
  if (store.currentPlayingFile.mediaStreamUrl) {
    return `${store.currentPlayingFile.mediaStreamUrl}?token=${token}`;
  } else if (store.currentPlayingFile.hash) {
    return `/api/media/stream/${store.currentPlayingFile.hash}?token=${token}`;
  } else {
    return '';
  }
});

const initPlayer = () => {
  if (!audioEl.value) return;
  player = new Plyr(audioEl.value, {
    controls: [],
  });
  player.on('canplay', () => {
    if (!player) return;
    store.SET_DURATION(player.duration);
    if (store.playing && player.currentTime !== player.duration) {
      player.play();
    }
  });

  player.on('timeupdate', () => {
    if (!player) return;
    store.SET_CURRENT_TIME(player.currentTime);
    if (store.sleepMode && store.sleepTime) {
      const currentTime = new Date();
      const currentHourStr = currentTime.getHours().toString().padStart(2, '0');
      const currentMinuteStr = currentTime.getMinutes().toString().padStart(2, '0');
      const sleepHourStr = store.sleepTime.match(/\d+/g)?.[0];
      const sleepMinuteStr = store.sleepTime.match(/\d+/g)?.[1];
      if (currentHourStr === sleepHourStr && currentMinuteStr === sleepMinuteStr) {
        store.PAUSE();
        store.CLEAR_SLEEP_MODE();
        $q.sessionStorage.set('sleepTime', null);
        $q.sessionStorage.set('sleepMode', false);
      }
    }
  });

  player.on('ended', () => {
    switch (store.playMode.name) {
      case 'all repeat':
        if (store.queueIndex === store.queue.length - 1) {
          store.SET_TRACK(0);
        } else {
          store.NEXT_TRACK();
        }
        break;
      case 'repeat once':
        if (player) {
          player.currentTime = 0;
          player.play();
        }
        store.PLAY();
        break;
      case 'shuffle': {
        const index = Math.floor(Math.random() * store.queue.length);
        store.SET_TRACK(index);
        if (index === store.queueIndex && player) {
          player.currentTime = 0;
        }
        break;
      }
      default:
        if (store.queueIndex === store.queue.length - 1) {
          store.PAUSE();
        } else {
          store.NEXT_TRACK();
        }
    }
  });

  player.on('seeked', () => {});

  player.on('playing', () => {
    ensureAudioContext();
    store.PLAY();
  });

  player.on('waiting', () => {
    ensureAudioContext();
    store.PLAY();
  });

  player.on('pause', () => {
    store.PAUSE();
  });
};

const ensureAudioContext = () => {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return;
  }
  if (!audioEl.value) return;
  try {
    audioCtx = new AudioContext();
    sourceNode = audioCtx.createMediaElementSource(audioEl.value);
    gainNode = audioCtx.createGain();
    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    applyVolume(store.volume);
  } catch {
    audioCtx = null;
    gainNode = null;
    sourceNode = null;
  }
};

watch(
  () => store.playing,
  (flag) => {
    if (!player || !player.duration) return;
    if (flag) {
      ensureAudioContext();
      player.play();
    } else {
      player.pause();
    }
  },
);

watch(source, (url) => {
  if (url && audioEl.value) {
    audioEl.value.load();
  }
});

watch(
  () => store.muted,
  (flag) => {
    if (player) {
      player.muted = flag;
    }
  },
);

const applyVolume = (val: number) => {
  if (gainNode) {
    gainNode.gain.value = val;
    if (player) player.volume = Math.min(val, 1);
  } else if (player) {
    player.volume = Math.min(val, 1);
  }
};

watch(
  () => store.volume,
  (val) => {
    if (val < 0 || val > 2) return;
    applyVolume(val);
  },
);

watch(
  () => store.rewindSeekMode,
  (rewind) => {
    if (rewind && player && player.duration) {
      const newTime = Math.max(0, player.currentTime - store.rewindSeekTime);
      player.currentTime = newTime;
      store.SET_REWIND_SEEK_MODE(false);
    }
  },
);

watch(
  () => store.forwardSeekMode,
  (forward) => {
    if (forward && player && player.duration) {
      const newTime = Math.min(player.duration, player.currentTime + store.forwardSeekTime);
      player.currentTime = newTime;
      store.SET_FORWARD_SEEK_MODE(false);
    }
  },
);

watch(
  () => store.seekTarget,
  (target) => {
    if (target !== null && player && player.duration) {
      player.currentTime = Math.max(0, Math.min(player.duration, target));
      store.CLEAR_SEEK_TARGET();
    }
  },
);

const seek = (seconds: number) => {
  if (player) {
    player.currentTime = seconds;
  }
};

onMounted(() => {
  initPlayer();
  if (player) {
    store.SET_VOLUME(player.volume || 1);
  }
});

onBeforeUnmount(() => {
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
  if (player) {
    player.destroy();
    player = null;
  }
});

defineExpose({
  seek,
});
</script>