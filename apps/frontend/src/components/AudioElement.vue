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
import Lyric from 'lrc-file-parser';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import type { LrcCheckResponse } from '../types';

const $q = useQuasar();
const api = useApi();
const store = useAudioPlayerStore();
const { showErrNotif } = useNotification();

const plyrContainer = ref<HTMLDivElement>();
const audioEl = ref<HTMLAudioElement>();
let player: Plyr | null = null;

const lrcObj = ref<{
  setLyric: (lyric: string) => void;
  play: (time: number) => void;
  pause: () => void;
} | null>(null);
const lrcAvailable = ref(false);

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
    playLrc(true);
    store.PLAY();
  });

  player.on('waiting', () => {
    playLrc(false);
    store.PLAY();
  });

  player.on('pause', () => {
    playLrc(false);
    store.PAUSE();
  });
};

watch(
  () => store.playing,
  (flag) => {
    if (!player || !player.duration) return;
    if (flag) {
      player.play();
    } else {
      player.pause();
    }
  },
);

watch(source, (url) => {
  if (url && audioEl.value) {
    audioEl.value.load();
    loadLrcFile();
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

watch(
  () => store.volume,
  (val) => {
    if (val < 0 || val > 1) return;
    if (player) {
      player.volume = val;
    }
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

const playLrc = (playStatus: boolean) => {
  if (lrcAvailable.value && lrcObj.value && player) {
    if (playStatus) {
      lrcObj.value.play(player.currentTime * 1000);
    } else {
      lrcObj.value.pause();
    }
  }
};

const initLrcObj = () => {
  lrcObj.value = new Lyric({
    onPlay: (_line: number, text: string) => {
      store.SET_CURRENT_LYRIC(text);
    },
  });
};

const loadLrcFile = () => {
  const token = getToken();
  const fileHash = store.queue[store.queueIndex]?.hash;
  if (!fileHash) return;
  const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

  void api
    .get<LrcCheckResponse>(url)
    .then((response) => {
      if (response.data.result) {
        lrcAvailable.value = true;
        const lrcUrl = `/api/media/stream/${response.data.hash}?token=${token}`;
        void api.get<string>(lrcUrl).then((lrcResponse) => {
          lrcObj.value?.setLyric(lrcResponse.data);
          if (player) {
            lrcObj.value?.play(player.currentTime * 1000);
          }
        });
      } else {
        lrcAvailable.value = false;
        lrcObj.value?.setLyric('');
        store.SET_CURRENT_LYRIC('');
      }
    })
    .catch((error: unknown) => {
      const err = error as {
        response?: { status: number; data?: { error?: string }; statusText?: string };
        message?: string;
      };
      if (err.response) {
        if (err.response.status !== 401) {
          showErrNotif(
            err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
          );
        }
      } else {
        showErrNotif(err.message || 'unknown');
      }
    });
};

const seek = (seconds: number) => {
  if (player) {
    player.currentTime = seconds;
  }
};

onMounted(() => {
  initPlayer();
  if (player) {
    store.SET_VOLUME(player.volume);
  }
  initLrcObj();
  if (source.value) {
    loadLrcFile();
  }
});

onBeforeUnmount(() => {
  if (player) {
    player.destroy();
    player = null;
  }
});

defineExpose({
  seek,
});
</script>