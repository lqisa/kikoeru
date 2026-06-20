import { inject } from 'vue';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

export function useApi() {
  const axios = inject<AxiosInstance>('axios')!;

  return {
    get: <T>(url: string, config?: AxiosRequestConfig) => axios.get<T>(url, config),
    post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      axios.post<T>(url, data, config),
    put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      axios.put<T>(url, data, config),
    patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      axios.patch<T>(url, data, config),
    delete: <T>(url: string, config?: AxiosRequestConfig) => axios.delete<T>(url, config),
  };
}