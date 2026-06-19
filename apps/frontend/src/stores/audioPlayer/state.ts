import type { AudioPlayerState } from '../../types/audio';

export default function (): AudioPlayerState {
  return {
    hide: false,
    playing: false,
    currentTime: 0,
    duration: 0,
    source: '',
    queue: [],
    queueIndex: 0,
    playMode: {
      id: 0,
      name: 'order',
    },
    muted: false,
    volume: 0,
    sleepTime: null,
    sleepMode: false,
    rewindSeekTime: 5,
    forwardSeekTime: 30,
    rewindSeekMode: false,
    forwardSeekMode: false,
    seekTarget: null,
  };
}