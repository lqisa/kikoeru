<template>
  <vue-plyr
    ref="plyr"
    :options="{ controls: [] }"
    :emit="['canplay', 'timeupdate', 'ended', 'seeked', 'playing', 'waiting', 'pause']"
    @canplay="onCanplay()"
    @timeupdate="onTimeupdate()"
    @ended="onEnded()"
    @seeked="onSeeked()"
    @playing="onPlaying()"
    @waiting="onWaiting()"
    @pause="onPause()"
  >
    <audio crossorigin="anonymous">
      <source v-if="source" :src="source" />
    </audio>
  </vue-plyr>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, inject } from 'vue';
import { useQuasar } from 'quasar';
import Lyric from 'lrc-file-parser';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useNotification } from '../composables/useNotification';

interface PlyrPlayer {
  play: () => void;
  pause: () => void;
  duration: number;
  currentTime: number;
  volume: number;
  muted: boolean;
  media: HTMLMediaElement;
  rewind: (time: number) => void;
  forward: (time: number) => void;
}

interface PlyrComponent {
  player: PlyrPlayer;
}

interface AxiosInstance {
  get: (url: string) => Promise<{ data: unknown }>;
}

const $q = useQuasar();
const $axios = inject<AxiosInstance>('axios');
const store = useAudioPlayerStore();
const { showErrNotif } = useNotification();

// Refs
const plyr = ref<PlyrComponent>();
const lrcObj = ref<{
  setLyric: (lyric: string) => void;
  play: (time: number) => void;
  pause: () => void;
} | null>(null);
const lrcAvailable = ref(false);

// Computed
const player = computed(() => plyr.value?.player);

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

// Watchers
watch(
  () => store.playing,
  (flag) => {
    if (player.value?.duration) {
      if (flag) {
        player.value?.play();
      } else {
        player.value?.pause();
      }
    }
  },
);

watch(source, (url) => {
  if (url) {
    player.value?.media.load();
    loadLrcFile();
  }
});

watch(
  () => store.muted,
  (flag) => {
    if (player.value) {
      player.value.muted = flag;
    }
  },
);

watch(
  () => store.volume,
  (val) => {
    if (val < 0 || val > 1) {
      return;
    }
    if (player.value) {
      player.value.volume = val;
    }
  },
);

watch(
  () => store.rewindSeekMode,
  (rewind) => {
    if (rewind && player.value) {
      player.value.rewind(store.rewindSeekTime);
      store.SET_REWIND_SEEK_MODE(false);
    }
  },
);

watch(
  () => store.forwardSeekMode,
  (forward) => {
    if (forward && player.value) {
      player.value.forward(store.forwardSeekTime);
      store.SET_FORWARD_SEEK_MODE(false);
    }
  },
);

// Methods
const onPause = () => {
  playLrc(false);
  store.PAUSE();
};

const onPlaying = () => {
  playLrc(true);
  store.PLAY();
};

const onWaiting = () => {
  playLrc(false);
  store.PLAY();
};

const onCanplay = () => {
  if (!player.value) return;
  store.SET_DURATION(player.value.duration);
  if (store.playing && player.value.currentTime !== player.value.duration) {
    player.value.play();
  }
};

const onTimeupdate = () => {
  if (!player.value) return;
  store.SET_CURRENT_TIME(player.value.currentTime);
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
};

const seek = (seconds: number) => {
  if (player.value) {
    player.value.currentTime = seconds;
  }
};

const onEnded = () => {
  switch (store.playMode.name) {
    case 'all repeat':
      if (store.queueIndex === store.queue.length - 1) {
        store.SET_TRACK(0);
      } else {
        store.NEXT_TRACK();
      }
      break;
    case 'repeat once':
      if (player.value) {
        player.value.currentTime = 0;
        player.value.play();
      }
      store.PLAY();
      break;
    case 'shuffle': {
      const index = Math.floor(Math.random() * store.queue.length);
      store.SET_TRACK(index);
      if (index === store.queueIndex && player.value) {
        player.value.currentTime = 0;
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
};

const onSeeked = () => {
  // Placeholder for future lyric sync
};

const playLrc = (playStatus: boolean) => {
  if (lrcAvailable.value && lrcObj.value && player.value) {
    if (playStatus) {
      lrcObj.value.play(player.value.currentTime * 1000);
    } else {
      lrcObj.value.pause();
    }
  }
};

const initLrcObj = () => {
  lrcObj.value = new Lyric({
    onPlay: (line: number, text: string) => {
      store.SET_CURRENT_LYRIC(text);
    },
  });
};

const loadLrcFile = () => {
  const token = getToken();
  const fileHash = store.queue[store.queueIndex]?.hash;
  if (!fileHash) return;
  const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

  void $axios
    ?.get(url)
    .then((response) => {
      const data = response.data as { result?: boolean; hash?: string };
      if (data.result) {
        lrcAvailable.value = true;
        console.log('读入歌词');
        const lrcUrl = `/api/media/stream/${data.hash}?token=${token}`;
        void $axios?.get(lrcUrl).then((lrcResponse) => {
          console.log('歌词读入成功');
          lrcObj.value?.setLyric(lrcResponse.data as string);
          if (player.value) {
            lrcObj.value?.play(player.value.currentTime * 1000);
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

// Lifecycle
onMounted(() => {
  if (player.value) {
    store.SET_VOLUME(player.value.volume);
  }
  initLrcObj();
  if (source.value) {
    loadLrcFile();
  }
});

// Expose methods for parent components
defineExpose({
  seek,
});
</script>
