import type { SubtitleState } from './state'

const getters = {
  activeMapping(this: SubtitleState) {
    return this.mappings.find((m) => m.id === this.activeMappingId) || null
  },
}

export default getters