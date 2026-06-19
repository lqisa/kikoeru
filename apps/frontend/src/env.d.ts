export {};

declare module 'plyr' {
  export { Plyr as default } from 'plyr';
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare global {
  interface ImportMeta {
    readonly hot?: {
      accept(cb: (mod?: unknown) => void): void;
      accept(dep: string, cb: (mod?: unknown) => void): void;
      accept(deps: string[], cb: (mods: unknown[]) => void): void;
      dispose(cb: (data: Record<string, unknown>) => void): void;
      decline(): void;
      invalidate(): void;
      on(event: string, cb: (...args: unknown[]) => void): void;
      off(event: string, cb: (...args: unknown[]) => void): void;
      send(event: string, ...args: unknown[]): void;
      data: Record<string, unknown>;
    };
  }
}

declare module 'vuedraggable' {
  import type { DefineComponent } from 'vue';
  const draggable: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default draggable;
}

declare module 'vue' {
  import type { AxiosInstance } from 'axios';
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}