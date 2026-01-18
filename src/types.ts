// Track metadata stored in IndexedDB (without actual file data)
export interface StoredTrack {
  id: string;
  name: string;
  artist: string;
  title: string;
  duration: number; // seconds
  // We cannot persist actual audio files, so we store identifying info
  // User must re-select files on page reload
  fileName: string;
  fileSize: number;
  lastModified: number;
}

// Track with live blob URL (runtime only)
export interface LiveTrack extends StoredTrack {
  blobUrl: string;
}

// Playlist stored in IndexedDB
export interface Playlist {
  id: string;
  name: string;
  tracks: StoredTrack[];
  createdAt: number;
  updatedAt: number;
}

// App settings stored in IndexedDB
export interface AppSettings {
  id: 'settings';
  currentSkinUrl: string | null;
  lastPlaylistId: string | null;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
}

// Webamp track format
export interface WebampTrack {
  url: string;
  metaData?: {
    artist: string;
    title: string;
  };
  duration?: number;
}

// Tab types
export type TabId = 'player' | 'playlists';

// App state
export interface AppState {
  activeTab: TabId;
  playlists: Playlist[];
  currentPlaylistId: string | null;
  liveTracks: Map<string, LiveTrack>; // id -> LiveTrack with blobUrl
  settings: AppSettings;
  webampReady: boolean;
  isPlaying: boolean;
  currentTrackIndex: number;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  currentSkinUrl: null,
  lastPlaylistId: null,
  volume: 75,
  shuffle: false,
  repeat: false
};
