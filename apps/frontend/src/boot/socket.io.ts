import { boot } from 'quasar/wrappers';
import { createSocketManager } from '../composables/useSocket';

export default boot(() => {
  createSocketManager();
});
