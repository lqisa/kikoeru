<template>
  <q-slide-transition class="bordered elevated">
    <div v-show="currentPlayingFile.hash && hide" class="row bg-white text-black">
      <q-item
        clickable
        v-ripple
        @click="toggleHide()"
        style="padding: 0px 5px"
        class="col non-selectable"
      >
        <q-item-section avatar>
          <q-img
            transition="fade"
            :src="samCoverUrl"
            style="height: 50px; width: 50px"
            class="rounded-borders"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label lines="2">{{ currentPlayingFile.title }}</q-item-label>
          <q-item-label caption lines="1">{{ currentPlayingFile.workTitle }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-btn
        flat
        size="lg"
        icon="skip_previous"
        @click="previousTrack()"
        style="height: 60px; width: 60px"
        class="col-auto gt-sm"
      />
      <q-btn
        flat
        size="lg"
        :icon="playingIcon"
        @click="togglePlaying()"
        style="height: 60px; width: 60px"
        class="col-auto"
      />
      <q-btn
        flat
        size="lg"
        icon="skip_next"
        @click="nextTrack()"
        style="height: 60px; width: 60px"
        class="col-auto gt-sm"
      />
    </div>
  </q-slide-transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const $q = useQuasar();
const store = useAudioPlayerStore();

const getToken = (): string => {
  return String($q.localStorage.getItem('jwt-token') || '');
};

const samCoverUrl = computed(() => {
  const token = getToken();
  const hash = store.currentPlayingFile.hash;
  return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : '';
});

const playingIcon = computed(() => {
  return store.playing ? 'pause' : 'play_arrow';
});

const currentPlayingFile = computed(() => store.currentPlayingFile);
const hide = computed(() => store.hide);

const toggleHide = () => store.TOGGLE_HIDE();
const togglePlaying = () => store.TOGGLE_PLAYING();
const nextTrack = () => store.NEXT_TRACK();
const previousTrack = () => store.PREVIOUS_TRACK();
</script>
