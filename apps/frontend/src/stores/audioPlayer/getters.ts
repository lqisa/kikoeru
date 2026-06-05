import type { AudioPlayerState, AudioTrack } from '../../types/audio';

const getters = {
  currentPlayingFile: (state: AudioPlayerState): AudioTrack => {
    return (
      state.queue[state.queueIndex] || {
        hash: '',
        title: '',
        workTitle: '',
      }
    );
  },
};

export default getters;
