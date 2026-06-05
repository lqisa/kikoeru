import { defineStore, acceptHMRUpdate } from 'pinia';
import state from './state';
import getters from './getters';
import actions from './actions';

export const useAudioPlayerStore = defineStore('audioPlayer', {
  state,
  getters,
  actions,
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAudioPlayerStore, import.meta.hot));
}
