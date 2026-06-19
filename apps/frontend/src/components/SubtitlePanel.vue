<template>
  <q-card
    v-if="subtitleStore.visible"
    class="subtitle-panel fixed"
    :style="panelStyle"
    @mousedown="startDrag"
  >
    <div class="subtitle-header row items-center no-wrap">
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
        dense
        flat
        round
        size="xs"
        icon="close"
        color="white"
        @click="closePanel"
      />
    </div>
    <div class="subtitle-content scroll" ref="contentRef">
      <div
        v-for="(cue, idx) in subtitleStore.cues"
        :key="idx"
        class="subtitle-line"
        :class="{ 'subtitle-line-active': isCueActive(cue) }"
        :ref="(el) => setCueRef(el as HTMLElement, idx)"
      >
        {{ cue.text }}
      </div>
      <div v-if="subtitleStore.cues.length === 0 && !subtitleStore.loading" class="subtitle-empty">
        {{ subtitleStore.subtitleMissing ? '字幕库中缺少字幕' : '无字幕' }}
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSubtitleStore } from '../stores/subtitle'
import { useAudioPlayerStore } from '../stores/audioPlayer'
import type { VttCue } from '../types/subtitle'

const subtitleStore = useSubtitleStore()
const audioStore = useAudioPlayerStore()

const contentRef = ref<HTMLElement | null>(null)
const cueRefs = ref<Map<number, HTMLElement>>(new Map())

const position = ref({ x: window.innerWidth - 420, y: 20 })
const dragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const panelStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}))

const activeFilename = computed(() => {
  const mapping = subtitleStore.mappings.find(
    (m) => m.id === subtitleStore.activeMappingId,
  )
  return mapping?.subtitleFilename || ''
})

const setCueRef = (el: HTMLElement | null, idx: number) => {
  if (el) cueRefs.value.set(idx, el)
}

const isCueActive = (cue: VttCue): boolean => {
  const t = audioStore.currentTime
  return t >= cue.startTime && t < cue.endTime
}

const scrollToActiveCue = () => {
  const activeIdx = subtitleStore.cues.findIndex(isCueActive)
  if (activeIdx >= 0 && cueRefs.value.has(activeIdx) && contentRef.value) {
    const el = cueRefs.value.get(activeIdx)!
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

watch(() => audioStore.currentTime, scrollToActiveCue)

watch(
  () => subtitleStore.cues,
  () => {
    cueRefs.value.clear()
    nextTick(scrollToActiveCue)
  },
)

const startDrag = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('.subtitle-header') || target.closest('.q-menu')) {
    dragging.value = true
    dragOffset.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y,
    }
    const onMove = (ev: MouseEvent) => {
      if (!dragging.value) return
      position.value = {
        x: ev.clientX - dragOffset.value.x,
        y: ev.clientY - dragOffset.value.y,
      }
    }
    const onUp = () => {
      dragging.value = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
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
  width: 380px;
  max-height: 300px;
  background: rgba(30, 30, 30, 0.85);
  border-radius: 8px;
  z-index: 3000;
  overflow: hidden;
  user-select: none;
}

.subtitle-header {
  height: 28px;
  background: rgba(0, 0, 0, 0.4);
  cursor: move;
}

.subtitle-title {
  max-width: 200px;
}

.subtitle-content {
  max-height: 260px;
  padding: 8px 12px;
  overflow-y: auto;
}

.subtitle-line {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
  padding: 2px 0;
  transition: color 0.2s, font-size 0.2s;
}

.subtitle-line-active {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.subtitle-empty {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
}
</style>