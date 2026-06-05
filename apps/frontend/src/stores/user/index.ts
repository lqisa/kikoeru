import { defineStore, acceptHMRUpdate } from 'pinia';
import state from './state';
import * as getters from './getters';
import actions from './actions';

export const useUserStore = defineStore('user', {
  state,
  getters,
  actions,
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot));
}
