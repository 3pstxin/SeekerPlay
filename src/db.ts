import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Playlist, AppSettings, DEFAULT_SETTINGS } from './types';

interface SeekerPlayDB extends DBSchema {
  playlists: {
    key: string;
    value: Playlist;
    indexes: { 'by-updated': number };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'seekerplay-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SeekerPlayDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<SeekerPlayDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SeekerPlayDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Playlists store
      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('by-updated', 'updatedAt');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    }
  });

  return dbInstance;
}

// Playlist operations
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  const playlists = await db.getAllFromIndex('playlists', 'by-updated');
  return playlists.reverse(); // Most recent first
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  playlist.updatedAt = Date.now();
  await db.put('playlists', playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const playlist: Playlist = {
    id: crypto.randomUUID(),
    name,
    tracks: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await savePlaylist(playlist);
  return playlist;
}

// Settings operations
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'settings');
  return settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDB();
  const current = await getSettings();
  const updated = { ...current, ...settings, id: 'settings' as const };
  await db.put('settings', updated);
  return updated;
}
