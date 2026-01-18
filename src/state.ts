import { AppState, TabId, Playlist, LiveTrack, AppSettings, DEFAULT_SETTINGS, StoredTrack } from './types';
import * as db from './db';

type Listener = () => void;

// Simple reactive state store (Zustand-like pattern)
class Store {
  private state: AppState = {
    activeTab: 'player',
    playlists: [],
    currentPlaylistId: null,
    liveTracks: new Map(),
    settings: DEFAULT_SETTINGS,
    webampReady: false,
    isPlaying: false,
    currentTrackIndex: -1
  };

  private listeners: Set<Listener> = new Set();

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private setState(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  // Tab navigation
  setActiveTab(tab: TabId): void {
    this.setState({ activeTab: tab });
  }

  // Webamp status
  setWebampReady(ready: boolean): void {
    this.setState({ webampReady: ready });
  }

  setIsPlaying(playing: boolean): void {
    this.setState({ isPlaying: playing });
  }

  setCurrentTrackIndex(index: number): void {
    this.setState({ currentTrackIndex: index });
  }

  // Playlist operations
  async loadPlaylists(): Promise<void> {
    const playlists = await db.getAllPlaylists();
    this.setState({ playlists });
  }

  async createPlaylist(name: string): Promise<Playlist> {
    const playlist = await db.createPlaylist(name);
    await this.loadPlaylists();
    return playlist;
  }

  async updatePlaylist(playlist: Playlist): Promise<void> {
    await db.savePlaylist(playlist);
    await this.loadPlaylists();
  }

  async deletePlaylist(id: string): Promise<void> {
    await db.deletePlaylist(id);
    if (this.state.currentPlaylistId === id) {
      this.setState({ currentPlaylistId: null });
    }
    await this.loadPlaylists();
  }

  async renamePlaylist(id: string, name: string): Promise<void> {
    const playlist = await db.getPlaylist(id);
    if (playlist) {
      playlist.name = name;
      await db.savePlaylist(playlist);
      await this.loadPlaylists();
    }
  }

  setCurrentPlaylist(id: string | null): void {
    this.setState({ currentPlaylistId: id });
    if (id) {
      db.saveSettings({ lastPlaylistId: id });
    }
  }

  getCurrentPlaylist(): Playlist | undefined {
    return this.state.playlists.find(p => p.id === this.state.currentPlaylistId);
  }

  // Track operations - add tracks to a playlist
  async addTracksToPlaylist(playlistId: string, tracks: StoredTrack[]): Promise<void> {
    const playlist = await db.getPlaylist(playlistId);
    if (playlist) {
      playlist.tracks.push(...tracks);
      await db.savePlaylist(playlist);
      await this.loadPlaylists();
    }
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const playlist = await db.getPlaylist(playlistId);
    if (playlist) {
      playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
      await db.savePlaylist(playlist);
      await this.loadPlaylists();
    }
  }

  async reorderTracks(playlistId: string, fromIndex: number, toIndex: number): Promise<void> {
    const playlist = await db.getPlaylist(playlistId);
    if (playlist) {
      const [track] = playlist.tracks.splice(fromIndex, 1);
      playlist.tracks.splice(toIndex, 0, track);
      await db.savePlaylist(playlist);
      await this.loadPlaylists();
    }
  }

  // Live track management (blob URLs)
  setLiveTrack(track: LiveTrack): void {
    const liveTracks = new Map(this.state.liveTracks);
    liveTracks.set(track.id, track);
    this.setState({ liveTracks });
  }

  getLiveTrack(id: string): LiveTrack | undefined {
    return this.state.liveTracks.get(id);
  }

  clearLiveTracks(): void {
    // Revoke all blob URLs to free memory
    this.state.liveTracks.forEach(track => {
      URL.revokeObjectURL(track.blobUrl);
    });
    this.setState({ liveTracks: new Map() });
  }

  // Settings
  async loadSettings(): Promise<void> {
    const settings = await db.getSettings();
    this.setState({ settings, currentPlaylistId: settings.lastPlaylistId });
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    const settings = await db.saveSettings(partial);
    this.setState({ settings });
  }
}

// Export singleton instance
export const store = new Store();

// Initialize store
export async function initializeStore(): Promise<void> {
  await store.loadSettings();
  await store.loadPlaylists();
}
