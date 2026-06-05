import { boot } from 'quasar/wrappers';
import axios from 'axios';
import { LocalStorage } from 'quasar';

axios.defaults.headers['Content-Type'] = 'application/json';
// 从 LocalStorage 中读取 token
axios.defaults.headers['Authorization'] = LocalStorage.getItem('jwt-token')
  ? 'Bearer ' + String(LocalStorage.getItem('jwt-token'))
  : '';

export function setAxiosHeaders(token: string) {
  axios.defaults.headers['Authorization'] = 'Bearer ' + token;
}

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.provide('axios', axios);
});
