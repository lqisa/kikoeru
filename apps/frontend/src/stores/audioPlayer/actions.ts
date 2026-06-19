import type { AudioPlayerState, AudioTrack } from '../../types/audio';

const PLAYBACK_STATE_KEY = 'playback-state';

type PlaybackRecord = {
  workId: string;
  audioTitle: string;
  currentTime: number;
  updatedAt: number;
};

function savePlaybackState(state: AudioPlayerState) {
  try {
    const track = state.queue[state.queueIndex];
    if (!track?.hash) return;
    const workId = track.hash.split('/')[0] || '';
    if (!workId) return;
    const record: PlaybackRecord = {
      workId,
      audioTitle: track.title || '',
      currentTime: state.currentTime,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(record));
  } catch {}
}

export function getPlaybackState(): PlaybackRecord | null {
  try {
    const raw = localStorage.getItem(PLAYBACK_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function clearPlaybackState() {
  try {
    localStorage.removeItem(PLAYBACK_STATE_KEY);
  } catch {}
}

const actions = {
  TOGGLE_HIDE(this: AudioPlayerState) {
    this.hide = !this.hide;
  },

  PLAY(this: AudioPlayerState) {
    this.playing = true;
  },
  PAUSE(this: AudioPlayerState) {
    this.playing = false;
  },
  TOGGLE_PLAYING(this: AudioPlayerState) {
    this.playing = !this.playing;
  },

  SET_TRACK(this: AudioPlayerState, index: number) {
    if (index >= this.queue.length || index < 0) {
      return;
    }

    this.playing = true;
    this.queueIndex = index;
  },
  NEXT_TRACK(this: AudioPlayerState) {
    if (this.queueIndex < this.queue.length - 1) {
      this.playing = true;
      this.queueIndex += 1;
    }
  },
  PREVIOUS_TRACK(this: AudioPlayerState) {
    if (this.queueIndex > 0) {
      this.playing = true;
      this.queueIndex -= 1;
    }
  },

  SET_QUEUE(
    this: AudioPlayerState,
    payload: { queue: AudioTrack[]; index: number; resetPlaying?: boolean },
  ) {
    this.queue = payload.queue;
    this.queueIndex = payload.index;

    if (payload.resetPlaying) {
      this.playing = true;
    }
  },
  EMPTY_QUEUE(this: AudioPlayerState) {
    this.playing = false;
    this.queue = [];
    this.queueIndex = 0;
  },
  ADD_TO_QUEUE(this: AudioPlayerState, file: AudioTrack) {
    this.queue.push(file);
  },
  REMOVE_FROM_QUEUE(this: AudioPlayerState, index: number) {
    this.queue.splice(index, 1);

    if (index === this.queueIndex) {
      this.playing = false;
      this.queueIndex = 0;
    } else if (index < this.queueIndex) {
      this.queueIndex -= 1;
    }
  },

  SET_DURATION(this: AudioPlayerState, second: number) {
    this.duration = second;
  },

  SET_CURRENT_TIME(this: AudioPlayerState, second: number) {
    const prev = Math.floor(this.currentTime);
    this.currentTime = second;
    const curr = Math.floor(second);
    if (this.playing && curr > 0 && curr % 10 === 0 && curr !== prev) {
      savePlaybackState(this);
    }
  },

  PLAY_NEXT(this: AudioPlayerState, file: AudioTrack) {
    this.queue.splice(this.queueIndex + 1, 0, file);
  },

  CHANGE_PLAY_MODE(this: AudioPlayerState) {
    const playModes = [
      {
        id: 0,
        name: 'order',
      },
      {
        id: 1,
        name: 'all repeat',
      },
      {
        id: 2,
        name: 'repeat once',
      },
      {
        id: 3,
        name: 'shuffle',
      },
    ] as const;
    const index = this.playMode.id >= playModes.length - 1 ? 0 : this.playMode.id + 1;

    this.playMode = playModes[index] || { id: 0, name: 'order' };
  },

  TOGGLE_MUTED(this: AudioPlayerState) {
    this.muted = !this.muted;
  },

  SET_VOLUME(this: AudioPlayerState, val: number) {
    if (val < 0 || val > 2) {
      return;
    }
    this.volume = val;
  },
  SET_REWIND_SEEK_TIME(this: AudioPlayerState, value: number) {
    this.rewindSeekTime = value;
  },
  SET_FORWARD_SEEK_TIME(this: AudioPlayerState, value: number) {
    this.forwardSeekTime = value;
  },
  SET_REWIND_SEEK_MODE(this: AudioPlayerState, value: boolean) {
    this.rewindSeekMode = value;
  },
  SET_FORWARD_SEEK_MODE(this: AudioPlayerState, value: boolean) {
    this.forwardSeekMode = value;
  },
  SET_SLEEP_TIMER(this: AudioPlayerState, time: string | null) {
    this.sleepTime = time;
    this.sleepMode = true;
  },

  CLEAR_SLEEP_MODE(this: AudioPlayerState) {
    this.sleepTime = null;
    this.sleepMode = false;
  },

  SEEK_TO(this: AudioPlayerState, seconds: number) {
    this.seekTarget = seconds;
  },

  CLEAR_SEEK_TARGET(this: AudioPlayerState) {
    this.seekTarget = null;
  },
};

export default actions;