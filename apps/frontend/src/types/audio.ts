/**
 * Audio-related types
 */

export type AudioTrack = {
  hash?: string | null;
  title?: string | null;
  workTitle?: string | null;
  mediaStreamUrl?: string | undefined;
};

export type PlayMode = {
  id: number;
  name: 'order' | 'all repeat' | 'repeat once' | 'shuffle';
};

export type AudioPlayerState = {
  hide: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  source: string;
  queue: AudioTrack[];
  queueIndex: number;
  playMode: PlayMode;
  muted: boolean;
  volume: number;
  currentLyric: string;
  sleepTime: string | null;
  sleepMode: boolean;
  rewindSeekTime: number;
  forwardSeekTime: number;
  rewindSeekMode: boolean;
  forwardSeekMode: boolean;
};
