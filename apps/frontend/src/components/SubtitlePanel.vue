<template>
  <q-card
    v-if="subtitleStore.visible && !$q.screen.lt.sm"
    class="subtitle-panel fixed"
    :style="panelStyle"
  >
    <div class="subtitle-header row items-center no-wrap" @mousedown="startDrag">
      <q-btn
        dense
        flat
        round
        size="xs"
        icon="subtitles"
        color="white"
        class="q-ml-xs"
      >
        <q-menu>
          <q-list dense style="min-width: 120px">
            <q-item
              v-for="m in subtitleStore.mappings"
              :key="m.id"
              clickable
              v-ripple
              :active="m.id === subtitleStore.activeMappingId"
              active-class="bg-teal text-white"
              @click="selectMapping(m.id)"
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
      <div class="subtitle-title ellipsis text-white text-caption q-ml-xs">
        {{ activeFilename }}
      </div>
      <q-space />
      <q-btn
        v-if="subtitleStore.seekBeforeJump !== null"
        dense
        flat
        round
        size="xs"
        icon="undo"
        color="white"
        class="q-mr-xs"
        @click.stop="undoSeek"
      >
        <q-tooltip>撤销跳转</q-tooltip>
      </q-btn>
      <q-btn
        dense
        flat
        round
        size="xs"
        icon="more_vert"
        color="white"
        class="q-mr-xs"
      >
        <q-menu anchor="bottom right" self="top right">
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
          <q-separator />
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
        </q-menu>
      </q-btn>
      <q-btn
        dense
        flat
        round
        size="xs"
        icon="close"
        color="white"
        @click.stop="closePanel"
      />
    </div>
    <q-virtual-scroll
      ref="virtualScrollRef"
      :items="subtitleStore.cues"
      :virtual-scroll-item-size="estimatedItemSize"
      class="subtitle-content"
      separator
    >
      <template #default="{ item: cue, index }">
        <div
          :key="index"
          class="subtitle-line"
          :class="{ 'subtitle-line-active': isCueActive(cue) }"
          :style="{ fontSize: subtitleStore.fontSizeDesktop + 'px' }"
          @click="onCueClick(cue)"
        >
          {{ cue.text }}
        </div>
      </template>
    </q-virtual-scroll>
    <div v-if="subtitleStore.cues.length === 0 && !subtitleStore.loading" class="subtitle-empty">
      {{ subtitleStore.subtitleMissing ? '字幕库中缺少字幕' : '无字幕' }}
    </div>
    <div class="resize-handle" @mousedown="startResize" />
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { useSubtitleStore } from '../stores/subtitle'
import { useAudioPlayerStore } from '../stores/audioPlayer'
import type { VttCue } from '../types/subtitle'

const $q = useQuasar()
const subtitleStore = useSubtitleStore()
const audioStore = useAudioPlayerStore()

const virtualScrollRef = ref<any>(null)
const lastActiveIdx = ref(-1)

const position = ref({ ...subtitleStore.panelPos })
const panelSizeVal = ref({ ...subtitleStore.panelSize })

if (position.value.x === 0 && position.value.y === 0) {
  position.value = { x: window.innerWidth - panelSizeVal.value.width - 40, y: 20 }
}

const minWidth = 280
const minHeight = 120

const estimatedItemSize = computed(() => {
  return Math.ceil(subtitleStore.fontSizeDesktop * 1.6 + 4)
})

const panelStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  width: `${panelSizeVal.value.width}px`,
  height: `${panelSizeVal.value.height}px`,
}))

const autoScrollModel = computed({
  get: () => subtitleStore.autoScroll,
  set: (val: boolean) => subtitleStore.SET_AUTO_SCROLL(val),
})

const fontSizeModel = computed({
  get: () => subtitleStore.fontSizeDesktop,
  set: (val: number) => subtitleStore.SET_FONT_SIZE_DESKTOP(val),
})

const activeFilename = computed(() => {
  const mapping = subtitleStore.mappings.find(
    (m) => m.id === subtitleStore.activeMappingId,
  )
  return mapping?.subtitleFilename || ''
})

const isCueActive = (cue: VttCue): boolean => {
  const t = audioStore.currentTime
  return t >= cue.startTime && t < cue.endTime
}

const scrollToActiveCue = (force = false) => {
  if (!force && !subtitleStore.autoScroll) return
  const activeIdx = subtitleStore.cues.findIndex(isCueActive)
  if (activeIdx < 0 || activeIdx === lastActiveIdx.value) return
  lastActiveIdx.value = activeIdx
  if (!virtualScrollRef.value) return
  virtualScrollRef.value.scrollTo(activeIdx, 'center')
}

const onCueClick = (cue: VttCue) => {
  subtitleStore.SEEK_TO(cue.startTime)
  nextTick(() => scrollToActiveCue(true))
}

const undoSeek = () => {
  subtitleStore.UNDO_SEEK()
  nextTick(() => scrollToActiveCue(true))
}

watch(() => audioStore.currentTime, () => scrollToActiveCue())

watch(
  () => subtitleStore.cues,
  () => {
    lastActiveIdx.value = -1
    nextTick(() => {
      if (virtualScrollRef.value) {
        virtualScrollRef.value.scrollTo(0)
      }
      scrollToActiveCue()
    })
  },
)

const persistLayout = () => {
  subtitleStore.SET_PANEL_POS({ ...position.value })
  subtitleStore.SET_PANEL_SIZE({ ...panelSizeVal.value })
}

const startDrag = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('.q-btn') || target.closest('.q-menu') || target.closest('.q-toggle') || target.closest('.q-slider')) return
  const startX = e.clientX
  const startY = e.clientY
  const startPos = { ...position.value }
  const onMove = (ev: MouseEvent) => {
    position.value = {
      x: startPos.x + (ev.clientX - startX),
      y: startPos.y + (ev.clientY - startY),
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    persistLayout()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const startSize = { ...panelSizeVal.value }
  const onMove = (ev: MouseEvent) => {
    const maxWidth = Math.floor(window.innerWidth * 0.95)
    const maxHeight = 600
    panelSizeVal.value = {
      width: Math.min(maxWidth, Math.max(minWidth, startSize.width + (ev.clientX - startX))),
      height: Math.min(maxHeight, Math.max(minHeight, startSize.height + (ev.clientY - startY))),
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    persistLayout()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const selectMapping = (id: number) => {
  subtitleStore.LOAD_SUBTITLE(id)
}

const closePanel = () => {
  subtitleStore.SET_VISIBLE(false)
}
</script>

<style scoped>
.subtitle-panel {
  background: rgba(30, 30, 30, 0.85);
  border-radius: 8px;
  z-index: 3000;
  overflow: hidden;
  user-select: none;
  display: flex;
  flex-direction: column;
}

.subtitle-header {
  height: 28px;
  min-height: 28px;
  background: rgba(0, 0, 0, 0.4);
  cursor: move;
}

.subtitle-title {
  max-width: 200px;
}

.subtitle-content {
  flex: 1;
  padding: 8px 12px;
}

.subtitle-line {
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  padding: 2px 0;
  transition: color 0.2s;
  cursor: pointer;
}

.subtitle-line:hover {
  color: rgba(255, 255, 255, 0.85);
}

.subtitle-line-active {
  color: #fff;
  font-weight: 500;
}

.subtitle-empty {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 1;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid rgba(255, 255, 255, 0.4);
  border-bottom: 2px solid rgba(255, 255, 255, 0.4);
}
</style>