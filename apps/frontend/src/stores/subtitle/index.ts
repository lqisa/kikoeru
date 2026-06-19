import { defineStore, acceptHMRUpdate } from 'pinia';
import state from './state';
import getters from './getters';
import actions from './actions';

export const useSubtitleStore = defineStore('subtitle', {
  state,
  getters,
  actions,
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSubtitleStore, import.meta.hot));
}