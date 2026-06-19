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

          <!-- 左上角按钮组 -->
          <q-btn
            dense
            round
            size="md"
            color="white"
            text-color="dark"
            icon="keyboard_arrow_down"
            @click="toggleHide()"
            class="absolute-top-left q-ma-sm"
            style="z-index: 2"
          />

          <!-- 移动端字幕控制按钮组（左上角，最小化按钮旁） -->
          <template v-if="$q.screen.lt.sm">
            <q-btn
              dense
              round
              size="md"
              flat
              :icon="subtitleStore.visible ? 'closed_caption' : 'closed_caption_off'"
              @click="toggleSubtitle()"
              class="absolute-top-left q-mt-sm q-ml-sm text-white"
              style="left: 52px; z-index: 2"
            >
              <q-tooltip>{{ subtitleStore.visible ? '关闭字幕' : '显示字幕' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="subtitleStore.seekBeforeJump !== null"
              dense
              round
              size="md"
              flat
              icon="undo"
              @click="subtitleStore.UNDO_SEEK()"
              class="absolute-top-left q-mt-sm q-ml-sm text-white"
              style="left: 92px; z-index: 2"
            >
              <q-tooltip>撤销跳转</q-tooltip>
            </q-btn>
            <q-btn
              v-if="subtitleStore.mappings.length > 1"
              dense
              round
              size="md"
              flat
              icon="swap_horiz"
              class="absolute-top-left q-mt-sm q-ml-sm text-white"
              :style="{ left: subtitleStore.seekBeforeJump !== null ? '132px' : '92px', zIndex: 2 }"
            >
              <q-tooltip>切换字幕</q-tooltip>
              <q-menu anchor="bottom left" self="top left">
                <q-list dense style="min-width: 120px">
                  <q-item
                    v-for="m in subtitleStore.mappings"
                    :key="m.id"
                    clickable
                    v-ripple
                    :active="m.id === subtitleStore.activeMappingId"
                    active-class="bg-teal text-white"
                    @click="subtitleStore.LOAD_SUBTITLE(m.id)"
                  >
                    <q-item-section side>
                      <q-badge
                        :color="m.subtitleType === 'lrc' ? 'blue' : 'orange'"
                        :label="m.subtitleType.toUpperCase()"
                      />
                    </q-item-section>
                    <q-item-section>{{ m.subtitleFilename }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </template>

          <!-- 右上角菜单 -->
          <q-btn
            dense
            round
            size="md"
            color="white"
            text-color="dark"
            icon="more_vert"
            class="absolute-top-right q-ma-sm"
            style="z-index: 2"
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

              <!-- 桌面端：字幕开关在菜单中 -->
              <q-item v-if="!$q.screen.lt.sm" clickable v-ripple @click="toggleSubtitle()">
                <q-item-section avatar>
                  <q-icon :name="subtitleStore.visible ? 'done' : ''" />
                </q-item-section>
                <q-item-section>{{ subtitleStore.visible ? '关闭字幕' : '显示字幕' }}</q-item-section>
              </q-item>

              <!-- 移动端：自动滚动和字号在菜单中 -->
              <template v-if="$q.screen.lt.sm && subtitleStore.visible">
                <q-separator />
                <q-item dense>
                  <q-item-section side>
                    <q-toggle
                      dense
                      v-model="autoScrollModel"
                      label="自动滚动"
                      color="teal"
                    />
                  </q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section>
                    <div class="row items-center no-wrap" style="min-width: 160px">
                      <span class="text-caption q-mr-sm" style="min-width: 32px">字号</span>
                      <q-slider
                        v-model="fontSizeModel"
                        :min="12"
                        :max="40"
                        :step="1"
                        label
                        :label-value="fontSizeModel + 'px'"
                        color="teal"
                        class="col"
                      />
                    </div>
                  </q-item-section>
                </q-item>
              </template>
            </q-menu>
          </q-btn>

          <!-- 封面中间按钮 -->
          <div class="row absolute q-pl-md q-pr-md col-12 justify-between" style="z-index: 1">
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
              @click="swapSeekButton ? nextTrack() : forward(true)"
              :icon="swapSeekButton ? 'skip_next' : forwardIcon"
            />
          </div>

          <!-- 移动端字幕覆盖层（在封面区域内） -->
          <div
            v-if="$q.screen.lt.sm && subtitleStore.visible"
            class="mobile-subtitle-overlay"
            @touchmove.stop
          >
            <q-virtual-scroll
              ref="mobileVirtualScrollRef"
              :items="subtitleStore.cues"
              :virtual-scroll-item-size="mobileEstimatedItemSize"
              class="mobile-subtitle-scroll"
              separator
            >
              <template #default="{ item: cue, index }">
                <div
                  :key="index"
                  class="mobile-subtitle-line"
                  :class="{ 'mobile-subtitle-line-active': isMobileCueActive(cue) }"
                  :style="{ fontSize: subtitleStore.fontSizeMobile + 'px' }"
                  @click="onMobileCueClick(cue)"
                >
                  {{ cue.text }}
                </div>
              </template>
            </q-virtual-scroll>
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
            :max="2"
            :step="0.01"
            label-always
            :label-value="Math.round(store.volume * 100) + '%'"
            color="primary"
            class="col"
          />
          <q-icon name="volume_up" size="sm" class="col-auto" />
        </div>
      </q-card>
    </q-slide-transition>

    <!-- 桌面端浮动字幕窗口 + 移动端封面覆盖层 -->
    <SubtitlePanel />

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
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import draggable from 'vuedraggable';
import AudioElement from 'components/AudioElement.vue';
import SubtitlePanel from 'components/SubtitlePanel.vue';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useSubtitleStore } from '../stores/subtitle';
import type { AudioTrack } from '../types/audio';
import type { VttCue } from '../types/subtitle';
import { formatSeconds } from '../utils/audio';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const store = useAudioPlayerStore();
const subtitleStore = useSubtitleStore();

const audioElement = ref<{ seek: (seconds: number) => void }>();
const showCurrentPlayList = ref(false);
const editCurrentPlayList = ref(false);
const queueCopy = ref<AudioTrack[]>([]);
const hideSeekButton = ref(false);
const swapSeekButton = ref(false);
const innerTime = ref(0);
const isSeeking = ref(false);
const mobileVirtualScrollRef = ref<any>(null);
const mobileLastActiveIdx = ref(-1);

const getToken = (): string => {
  return String($q.localStorage.getItem('jwt-token') || '');
};

const autoScrollModel = computed({
  get: () => subtitleStore.autoScroll,
  set: (val: boolean) => subtitleStore.SET_AUTO_SCROLL(val),
});

const fontSizeModel = computed({
  get: () => subtitleStore.fontSizeMobile,
  set: (val: number) => subtitleStore.SET_FONT_SIZE_MOBILE(val),
});

const mobileEstimatedItemSize = computed(() => {
  return Math.ceil(subtitleStore.fontSizeMobile * 1.6 + 4);
});

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

const isMobileCueActive = (cue: VttCue): boolean => {
  const t = store.currentTime;
  return t >= cue.startTime && t < cue.endTime;
};

const onMobileCueClick = (cue: VttCue) => {
  subtitleStore.SEEK_TO(cue.startTime);
  nextTick(() => scrollMobileToActiveCue(true));
};

const scrollMobileToActiveCue = (force = false) => {
  if ((!force && !subtitleStore.autoScroll) || !$q.screen.lt.sm) return;
  const activeIdx = subtitleStore.cues.findIndex(isMobileCueActive);
  if (activeIdx < 0 || activeIdx === mobileLastActiveIdx.value) return;
  mobileLastActiveIdx.value = activeIdx;
  if (!mobileVirtualScrollRef.value) return;
  mobileVirtualScrollRef.value.scrollTo(activeIdx, 'center');
};

watch(() => store.currentTime, () => scrollMobileToActiveCue());

watch(
  () => subtitleStore.cues,
  () => {
    mobileLastActiveIdx.value = -1;
    nextTick(() => {
      if (mobileVirtualScrollRef.value) {
        mobileVirtualScrollRef.value.scrollTo(0);
      }
      scrollMobileToActiveCue();
    });
  },
);

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

const toggleSubtitle = () => {
  subtitleStore.TOGGLE_VISIBLE();
  if (subtitleStore.visible && currentPlayingFile.value.hash) {
    const workId = currentPlayingFile.value.hash?.split('/')[0] || '';
    const audioFilename = currentPlayingFile.value.title || '';
    if (workId && audioFilename) {
      subtitleStore.FETCH_MAPPINGS({ workId, audioFilename });
    }
  }
};

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
  @media (min-width: $breakpoint-sm-min) {
    width: 330px;
    margin: 0px 10px 10px 0px;
  }
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: 100%;
  }
}

.albumart {
  position: relative;

  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: calc(100% - 230px);
  }
}

.current-play-list {
  max-height: 500px;

  @media (min-width: $breakpoint-xs-max) {
    width: 450px;
  }
  @media (max-width: $breakpoint-xs-max) {
    min-width: 280px;
  }
}

.mobile-subtitle-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 48px;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  padding: 8px 12px;
  z-index: 1;
}

.mobile-subtitle-scroll {
  height: 100%;
}

.mobile-subtitle-scroll :deep(.q-virtual-scroll__content) {
  padding: 0 4px;
}

.mobile-subtitle-line {
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  padding: 2px 0;
  transition: color 0.2s;
  cursor: pointer;
}

.mobile-subtitle-line:hover {
  color: rgba(255, 255, 255, 0.85);
}

.mobile-subtitle-line-active {
  color: #fff;
  font-weight: 500;
}
</style>