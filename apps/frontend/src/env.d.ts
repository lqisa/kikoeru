declare module 'vue-plyr' {
  const VuePlyr: any;
  export default VuePlyr;
}

declare module 'vuedraggable' {
  const draggable: any;
  export default draggable;
}

declare module 'lrc-file-parser' {
  interface LyricOptions {
    onPlay?: (line: number, text: string) => void;
    onSetLyric?: (lines: unknown[]) => void;
  }
  class Lyric {
    constructor(options?: LyricOptions);
    setLyric(lyric: string): void;
    play(startTime?: number): void;
    pause(): void;
    togglePlay(): void;
  }
  export default Lyric;
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: {
      get: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>;
      post: (
        url: string,
        data?: unknown,
        config?: Record<string, unknown>,
      ) => Promise<{ data: any }>;
      put: (
        url: string,
        data?: unknown,
        config?: Record<string, unknown>,
      ) => Promise<{ data: any }>;
      delete: (url: string, config?: Record<string, unknown>) => Promise<{ data: any }>;
    };
    $store: {
      state: {
        User: { name: string; group: string; auth: boolean };
      };
      commit: (type: string, payload?: unknown) => void;
    };
  }
}
export {};
