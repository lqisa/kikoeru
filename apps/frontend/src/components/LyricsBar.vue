<template>
  <q-card
    id="draggable"
    @mousedown="onCursorDown"
    @mouseup="onCursorUp"
    @touchstart="onCursorDown"
    @touchend="onCursorUp"
  >
    <div
      id="lyricsBar"
      class="text-center text-h6 text-bold ellipsis-2-lines text-purple q-mb-md absolute-bottom"
    >
      <span id="lyric">
        {{ currentLyric }}
      </span>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted } from 'vue';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const store = useAudioPlayerStore();

const currentLyric = computed(() => store.currentLyric);

const state = reactive({
  beTouched: false,
  startX: 0,
  startY: 0,
});

const getTouch = (ev: MouseEvent | TouchEvent) => {
  return (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0] : (ev as MouseEvent);
};

const onCursorMove = (ev: MouseEvent | TouchEvent) => {
  if (!state.beTouched) return;
  const touch = getTouch(ev);
  if (!touch) return;
  const draggable = document.getElementById('draggable');
  if (!draggable) return;
  const eleX = touch.clientX - state.startX;
  const eleY = touch.clientY - state.startY;
  draggable.style.left = eleX + 'px';
  draggable.style.top = eleY + 'px';
};

const onCursorDown = (ev: MouseEvent | TouchEvent) => {
  ev.preventDefault();
  state.beTouched = true;
  const touch = getTouch(ev);
  if (!touch) return;
  const draggable = document.getElementById('draggable');
  if (!draggable) return;
  state.startX = touch.clientX - draggable.offsetLeft;
  state.startY = touch.clientY - draggable.offsetTop;
};

const onCursorUp = (ev: MouseEvent | TouchEvent) => {
  ev.preventDefault();
  state.beTouched = false;
};

onMounted(() => {
  addEventListener('mousemove', onCursorMove, false);
  addEventListener('touchmove', onCursorMove, false);
});
</script>

<style lang="scss">
.moveable-line {
  background-color: transparent !important;
}
#lyricsBar {
  background-color: rgba($grey-4, $alpha: 0.6);
  min-width: 1vw;
  position: absolute;
}
</style>
