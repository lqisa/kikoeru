<template>
  <div>
    <!-- 播放器 -->
    <q-slide-transition>
      <q-card
        square
        v-show="currentPlayingFile.hash && !hide"
        class="fixed-bottom-right bg-white text-black audio-player"
        @mousewheel.prevent
        @touchmove.prevent
      >
        <!-- 音声封面 -->
        <div class="bg-dark row items-center albumart">
          <q-img contain transition="fade" :src="coverUrl" :ratio="4 / 3" />
          <q-btn
            dense
            round
            size="md"
            color="white"
            text-color="dark"
            icon="keyboard_arrow_down"
            @click="toggleHide()"
            class="absolute-top-left q-ma-sm"
          />
          <q-btn
            dense
            round
            size="md"
            color="white"
            text-color="dark"
            icon="more_vert"
            class="absolute-top-right q-ma-sm"
          >
            <q-menu anchor="bottom right" self="top right">
              <q-item clickable v-ripple @click="hideSeekButton = !hideSeekButton">
                <q-item-section avatar>
                  <q-icon :name="hideSeekButton ? 'done' : ''" />
                </q-item-section>
                <q-item-section>隐藏封面按钮</q-item-section>
              </q-item>

              <q-item clickable v-ripple @click="swapSeekButton = !swapSeekButton">
                <q-item-section avatar>
                  <q-icon :name="swapSeekButton ? 'done' : ''" />
                </q-item-section>
                <q-item-section>交换进度按钮与切换按钮</q-item-section>
              </q-item>

              <q-item clickable v-ripple @click="openWorkDetail()" v-close-popup>
                <q-item-section avatar><!-- placeholder --></q-item-section>
                <q-item-section>打开作品详情</q-item-section>
              </q-item>
            </q-menu>
          </q-btn>
          <div class="row absolute q-pl-md q-pr-md col-12 justify-between">
            <q-btn
              v-if="!hideSeekButton"
              round
              size="lg"
              color="white"
              text-color="dark"
              style="opacity: 0.8"
              @click="swapSeekButton ? previousTrack() : rewind(true)"
              :icon="swapSeekButton ? 'skip_previous' : rewindIcon"
            />
            <q-btn
              v-if="!hideSeekButton"
              round
              size="lg"
              color="white"
              text-color="dark"
              style="opacity: 0.8"
              @click="swapSeekButton ? forward(true) : nextTrack()"
              :icon="swapSeekButton ? 'skip_next' : forwardIcon"
            />
          </div>
        </div>

        <!-- 进度条控件 -->
        <div class="row items-center q-mx-sm q-my-sm" style="height: 40px">
          <div class="col-auto">{{ formatSeconds(store.currentTime) }}</div>
          <q-slider
            class="col q-mx-md"
            :model-value="innerTime"
            @update:model-value="(val: number | null) => val !== null && onSliderUpdate(val)"
            :min="0"
            :max="store.duration"
            :step="0.1"
            @pan="onSliderPan"
            @change="onSeek"
            color="primary"
          />
          <div class="col-auto">{{ formatSeconds(store.duration) }}</div>
        </div>
        <AudioElement ref="audioElement" v-show="false" />

        <!-- Place holder for iOS -->
        <div style="height: 5px" v-if="$q.platform.is.ios" />

        <q-item style="height: 55px; padding: 0px 15px" class="text-center non-selectable">
          <q-item-section>
            <q-item-label lines="2" class="text-bold">{{ currentPlayingFile.title }}</q-item-label>
            <q-item-label caption lines="1">{{ currentPlayingFile.workTitle }}</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Place holder for iOS -->
        <div style="height: 10px" v-if="$q.platform.is.ios" />

        <!-- 播放按钮控件 -->
        <div class="row justify-around" style="height: 65px">
          <q-btn
            flat
            dense
            size="md"
            icon="queue_music"
            @click="showCurrentPlayList = !showCurrentPlayList"
            style="width: 55px"
            class="col-auto"
          />
          <q-btn
            flat
            dense
            size="lg"
            :icon="swapSeekButton ? rewindIcon : 'skip_previous'"
            @click="swapSeekButton ? rewind(true) : previousTrack()"
            style="width: 55px"
            class="col-auto"
          />
          <q-btn
            flat
            dense
            size="28px"
            :icon="playingIcon"
            @click="togglePlaying()"
            style="width: 65px"
            class="col-auto"
          />
          <q-btn
            flat
            dense
            size="lg"
            :icon="swapSeekButton ? forwardIcon : 'skip_next'"
            @click="swapSeekButton ? forward(true) : nextTrack()"
            style="width: 55px"
            class="col-auto"
          />
          <q-btn
            flat
            dense
            size="md"
            :icon="playModeIcon"
            @click="changePlayMode()"
            style="width: 55px"
            class="col-auto"
          />
        </div>

        <!-- 音量控件 -->
        <div class="row items-center q-mx-lg" style="height: 50px" v-if="!$q.platform.is.ios">
          <q-icon name="volume_down" size="sm" class="col-auto" />
          <q-slider
            :model-value="store.volume"
            @update:model-value="(val: number | null) => val !== null && setVolume(val)"
            :min="0"
            :max="1"
            :step="0.01"
            label-always
            color="primary"
            class="col"
          />
          <q-icon name="volume_up" size="sm" class="col-auto" />
        </div>
      </q-card>
    </q-slide-transition>

    <!-- 当前播放列表 -->
    <q-dialog v-model="showCurrentPlayList">
      <q-card class="current-play-list">
        <!-- 操作当前播放列表的控制按钮 -->
        <div class="row" style="padding: 5px; height: 45px">
          <q-btn
            dense
            round
            size="md"
            icon="edit"
            color="primary"
            @click="editCurrentPlayList = !editCurrentPlayList"
            style="height: 35px; width: 35px"
            class="col-auto"
          />
          <q-btn
            dense
            round
            size="md"
            icon="save"
            color="teal"
            style="height: 35px; width: 35px"
            class="col-auto q-mx-sm"
          />
          <q-space />
          <q-btn
            dense
            round
            size="md"
            icon="delete_forever"
            color="red"
            @click="emptyQueue()"
            style="height: 35px; width: 35px"
            class="col-auto"
          />
        </div>

        <q-separator />

        <!-- 音频文件列表 -->
        <q-list style="max-height: 450px" class="scroll">
          <draggable
            v-model="queueCopy"
            handle=".handle"
            item-key="hash"
            @change="(val: { moved: MovedEvent | undefined }) => onMoved(val.moved)"
          >
            <template #item="{ element: track, index }">
              <q-item
                clickable
                v-ripple
                :active="store.queueIndex === index"
                active-class="text-white bg-teal"
                class="non-selectable"
                style="height: 48px; padding: 0px 10px"
                @click="onClickTrack(index)"
              >
                <q-item-section side v-show="editCurrentPlayList">
                  <q-icon
                    name="clear"
                    :color="store.queueIndex === index ? 'white' : 'red'"
                    @click="removeFromQueue(index)"
                  />
                </q-item-section>

                <q-item-section avatar>
                  <q-img
                    transition="fade"
                    :src="samCoverUrl(track.hash)"
                    style="height: 38px; width: 38px"
                    class="rounded-borders"
                  />
                </q-item-section>

                <q-item-section>
                  <q-item-label lines="1">{{ track.title }}</q-item-label>
                  <q-item-label caption lines="1">{{ track.workTitle }}</q-item-label>
                </q-item-section>

                <q-item-section side class="handle" v-show="editCurrentPlayList">
                  <q-icon name="reorder" :color="store.queueIndex === index ? 'white' : 'dark'" />
                </q-item-section>
              </q-item>
            </template>
          </draggable>
        </q-list>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import draggable from 'vuedraggable';
import AudioElement from 'components/AudioElement.vue';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import type { AudioTrack } from '../types/audio';
import { formatSeconds } from '../utils/audio';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const store = useAudioPlayerStore();

// Refs
const audioElement = ref<{ seek: (seconds: number) => void }>();
const showCurrentPlayList = ref(false);
const editCurrentPlayList = ref(false);
const queueCopy = ref<AudioTrack[]>([]);
const hideSeekButton = ref(false);
const swapSeekButton = ref(false);
const innerTime = ref(0);
const isSeeking = ref(false);

const getToken = (): string => {
  return String($q.localStorage.getItem('jwt-token') || '');
};

// Computed
const coverUrl = computed(() => {
  const token = getToken();
  const hash = store.currentPlayingFile.hash;
  return hash ? `/api/cover/${hash.split('/')[0]}?token=${token}` : '';
});

const workDetailUrl = computed(() => {
  const hash = store.currentPlayingFile.hash;
  return hash ? `/work/${hash.split('/')[0]}` : '';
});

const playModeIcon = computed(() => {
  switch (store.playMode.name) {
    case 'all repeat':
      return 'repeat';
    case 'repeat once':
      return 'repeat_one';
    case 'shuffle':
      return 'shuffle';
    default:
      return 'playlist_play';
  }
});

const playingIcon = computed(() => {
  return store.playing ? 'pause' : 'play_arrow';
});

const rewindIcon = computed(() => {
  switch (store.rewindSeekTime) {
    case 5:
      return 'replay_5';
    case 10:
      return 'replay_10';
    case 30:
      return 'replay_30';
    default:
      return 'replay_5';
  }
});

const forwardIcon = computed(() => {
  switch (store.forwardSeekTime) {
    case 5:
      return 'forward_5';
    case 10:
      return 'forward_10';
    case 30:
      return 'forward_30';
    default:
      return 'forward_5';
  }
});

const currentPlayingFile = computed(() => store.currentPlayingFile);
const hide = computed(() => store.hide);

// Watchers
watch(
  () => store.queue,
  (val) => {
    queueCopy.value = val.concat();
    if (queueCopy.value.length === 0) {
      showCurrentPlayList.value = false;
    }
  },
);

watch(showCurrentPlayList, (flag) => {
  if (flag === false) {
    editCurrentPlayList.value = false;
  }
});

watch(hideSeekButton, (option) => {
  $q.localStorage.set('hideSeekButton', option);
});

watch(swapSeekButton, (option) => {
  $q.localStorage.set('swapSeekButton', option);
});

watch(
  () => store.currentTime,
  (val) => {
    if (!isSeeking.value) {
      innerTime.value = val;
    }
  },
);

// Methods
const toggleHide = () => store.TOGGLE_HIDE();
const togglePlaying = () => store.TOGGLE_PLAYING();
const nextTrack = () => store.NEXT_TRACK();
const previousTrack = () => store.PREVIOUS_TRACK();
const changePlayMode = () => store.CHANGE_PLAY_MODE();
const setVolume = (val: number) => store.SET_VOLUME(val);
const rewind = (val: boolean) => store.SET_REWIND_SEEK_MODE(val);
const forward = (val: boolean) => store.SET_FORWARD_SEEK_MODE(val);

const onSliderUpdate = (val: number) => {
  isSeeking.value = true;
  innerTime.value = val;
};

const onSliderPan = (phase: string) => {
  isSeeking.value = phase !== 'end';
};

const onSeek = (val: number) => {
  audioElement.value?.seek(val);
  setTimeout(() => {
    isSeeking.value = false;
  }, 500);
};

const samCoverUrl = (hash: string) => {
  const token = getToken();
  return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : '';
};

const onClickTrack = (index: number) => {
  if (!editCurrentPlayList.value) {
    store.SET_TRACK(index);
    showCurrentPlayList.value = false;
  }
};

interface MovedEvent {
  oldIndex: number;
  newIndex: number;
}

const onMoved = (moved: MovedEvent | undefined) => {
  if (!moved) return;
  let index: number | null = null;
  if (moved.oldIndex === store.queueIndex) {
    index = moved.newIndex;
  } else if (moved.oldIndex < store.queueIndex && moved.newIndex >= store.queueIndex) {
    index = store.queueIndex - 1;
  } else if (moved.oldIndex > store.queueIndex && moved.newIndex <= store.queueIndex) {
    index = store.queueIndex + 1;
  } else {
    index = store.queueIndex;
  }

  store.SET_QUEUE({
    queue: queueCopy.value.concat(),
    index: index,
    resetPlaying: false,
  });
};

const removeFromQueue = (index: number) => {
  store.REMOVE_FROM_QUEUE(index);
};

const emptyQueue = () => {
  store.EMPTY_QUEUE();
};

const openWorkDetail = () => {
  if (workDetailUrl.value && route.path !== workDetailUrl.value) {
    void router.push(workDetailUrl.value);
  }
  if ($q.screen.lt.sm) {
    toggleHide();
  }
};

// Lifecycle
onMounted(() => {
  if ($q.localStorage.has('hideSeekButton')) {
    const hideButton = $q.localStorage.getItem('hideSeekButton');
    if (typeof hideButton === 'boolean') {
      hideSeekButton.value = hideButton;
    }
  }
  if ($q.localStorage.has('swapSeekButton')) {
    const swapButton = $q.localStorage.getItem('swapSeekButton');
    if (typeof swapButton === 'boolean') {
      swapSeekButton.value = swapButton;
    }
  }
  queueCopy.value = store.queue.concat();
});
</script>

<style lang="scss" scoped>
.audio-player {
  // 宽度 > $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    width: 330px;
    margin: 0px 10px 10px 0px;
  }
  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: 100%;
  }
}

.albumart {
  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: calc(100% - 230px);
  }
}

.current-play-list {
  max-height: 500px;

  // 宽度 > $breakpoint-xs-max
  @media (min-width: $breakpoint-xs-max) {
    width: 450px;
  }
  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    min-width: 280px;
  }
}
</style>
