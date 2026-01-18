import Webamp from 'webamp';
import './webamp.d.ts'; // Type augmentation for missing Webamp methods
import { store } from './state';
import { LiveTrack, WebampTrack } from './types';

let webampInstance: Webamp | null = null;

// Convert our LiveTrack to Webamp's track format
function toWebampTrack(track: LiveTrack): WebampTrack {
  return {
    url: track.blobUrl,
    metaData: {
      artist: track.artist,
      title: track.title
    },
    duration: track.duration
  };
}

export async function initializeWebamp(container: HTMLElement): Promise<Webamp> {
  // Check browser support
  if (!Webamp.browserIsSupported()) {
    throw new Error('Your browser does not support Webamp. Please use a modern browser.');
  }

  const settings = store.getState().settings;

  // Configure Webamp options
  const options: ConstructorParameters<typeof Webamp>[0] = {
    zIndex: 100,
    enableHotkeys: true,
    // Custom file pickers for local files
    filePickers: [
      {
        contextMenuName: 'Load local files...',
        filePicker: async () => {
          return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.multiple = true;
            input.onchange = async () => {
              if (input.files) {
                const tracks = await processAudioFiles(Array.from(input.files));
                resolve(tracks.map(toWebampTrack));
              } else {
                resolve([]);
              }
            };
            input.click();
          });
        },
        requiresNetwork: false
      }
    ],
    // Type cast needed because Webamp expects React.DragEvent but we handle native DragEvent
    handleTrackDropEvent: (async (e: unknown) => {
      const event = e as DragEvent;
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
        if (audioFiles.length > 0) {
          const tracks = await processAudioFiles(audioFiles);
          return tracks.map(toWebampTrack);
        }
      }
      return null;
    }) as ConstructorParameters<typeof Webamp>[0]['handleTrackDropEvent']
  };

  // Set initial skin if saved
  if (settings.currentSkinUrl) {
    options.initialSkin = { url: settings.currentSkinUrl };
  }

  webampInstance = new Webamp(options);

  // Set up event listeners
  webampInstance.onTrackDidChange((track) => {
    if (track) {
      const playlist = (webampInstance as unknown as { _playlist?: { currentIndex?: number } })?._playlist;
      const index = playlist?.currentIndex ?? -1;
      store.setCurrentTrackIndex(index);
    }
  });

  webampInstance.onWillClose((cancel) => {
    // Prevent closing, just minimize instead
    cancel();
  });

  // Render Webamp
  await webampInstance.renderWhenReady(container);

  // Apply saved settings
  webampInstance.setVolume(settings.volume);
  if (settings.shuffle) {
    const isShuffled = webampInstance.isShuffleEnabled();
    if (!isShuffled) webampInstance.toggleShuffle();
  }
  if (settings.repeat) {
    const isRepeating = webampInstance.isRepeatEnabled();
    if (!isRepeating) webampInstance.toggleRepeat();
  }

  store.setWebampReady(true);

  // Poll for playing status (Webamp doesn't have a direct event for this)
  setInterval(() => {
    if (webampInstance) {
      const status = webampInstance.getMediaStatus();
      store.setIsPlaying(status === 'PLAYING');
    }
  }, 500);

  return webampInstance;
}

export function getWebamp(): Webamp | null {
  return webampInstance;
}

// Process audio files and create LiveTracks
export async function processAudioFiles(files: File[]): Promise<LiveTrack[]> {
  const tracks: LiveTrack[] = [];

  for (const file of files) {
    const blobUrl = URL.createObjectURL(file);
    const duration = await getAudioDuration(blobUrl);

    // Parse metadata from filename (Artist - Title.mp3)
    const nameParts = file.name.replace(/\.[^/.]+$/, '').split(' - ');
    const artist = nameParts.length > 1 ? nameParts[0].trim() : 'Unknown Artist';
    const title = nameParts.length > 1 ? nameParts.slice(1).join(' - ').trim() : nameParts[0].trim();

    const track: LiveTrack = {
      id: crypto.randomUUID(),
      name: file.name,
      artist,
      title,
      duration,
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
      blobUrl
    };

    store.setLiveTrack(track);
    tracks.push(track);
  }

  return tracks;
}

// Get audio duration using Web Audio API
function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(0);
    });
    audio.src = url;
  });
}

// Playback controls
export function play(): void {
  webampInstance?.play();
}

export function pause(): void {
  webampInstance?.pause();
}

export function stop(): void {
  webampInstance?.stop();
}

export function nextTrack(): void {
  webampInstance?.nextTrack();
}

export function previousTrack(): void {
  webampInstance?.previousTrack();
}

export function setVolume(volume: number): void {
  webampInstance?.setVolume(volume);
  store.updateSettings({ volume });
}

export function toggleShuffle(): void {
  webampInstance?.toggleShuffle();
  const isShuffled = webampInstance?.isShuffleEnabled() ?? false;
  store.updateSettings({ shuffle: isShuffled });
}

export function toggleRepeat(): void {
  webampInstance?.toggleRepeat();
  const isRepeating = webampInstance?.isRepeatEnabled() ?? false;
  store.updateSettings({ repeat: isRepeating });
}

export function seekToTime(seconds: number): void {
  webampInstance?.seekToTime(seconds);
}

// Playlist/track loading
export function setTracks(tracks: LiveTrack[]): void {
  if (!webampInstance) return;
  webampInstance.setTracksToPlay(tracks.map(toWebampTrack));
}

export function appendTracks(tracks: LiveTrack[]): void {
  if (!webampInstance) return;
  webampInstance.appendTracks(tracks.map(toWebampTrack));
}

// Skin management
export async function setSkin(url: string): Promise<void> {
  if (!webampInstance) return;
  webampInstance.setSkinFromUrl(url);
  await store.updateSettings({ currentSkinUrl: url });
}

export async function loadSkinFromFile(file: File): Promise<string> {
  const blobUrl = URL.createObjectURL(file);
  await setSkin(blobUrl);
  return blobUrl;
}
