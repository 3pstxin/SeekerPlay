// Type augmentation for Webamp methods that exist but aren't in the bundled types
// These methods are documented at https://docs.webamp.org/docs/api/instance-methods/

import 'webamp';

declare module 'webamp' {
  export default interface Webamp {
    /**
     * Set the volume (0-100)
     */
    setVolume(volume: number): void;

    /**
     * Toggle shuffle mode
     */
    toggleShuffle(): void;

    /**
     * Toggle repeat mode
     */
    toggleRepeat(): void;

    /**
     * Check if shuffle is enabled
     */
    isShuffleEnabled(): boolean;

    /**
     * Check if repeat is enabled
     */
    isRepeatEnabled(): boolean;

    /**
     * Get the current playlist tracks
     */
    getPlaylistTracks(): Array<{
      url: string;
      metaData: {
        artist: string | null;
        title: string | null;
      };
    }>;

    /**
     * Set the current track by index
     */
    setCurrentTrack(index: number): void;
  }
}
