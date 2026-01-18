import { store } from './state';
import { TabId, Playlist, StoredTrack } from './types';
import * as webamp from './webamp-controller';

// Format duration as MM:SS
function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Create the main app UI
export function createAppUI(): HTMLElement {
  const app = document.createElement('div');
  app.className = 'app';
  app.innerHTML = `
    <header class="app-header">
      <h1 class="app-title">SeekerPlay</h1>
    </header>

    <nav class="tab-nav">
      <button class="tab-btn active" data-tab="player">
        <span class="tab-icon">&#127925;</span>
        Player
      </button>
      <button class="tab-btn" data-tab="playlists">
        <span class="tab-icon">&#128203;</span>
        Playlists
      </button>
    </nav>

    <main class="tab-content player-tab active" id="player-tab">
      <div class="action-row">
        <button class="action-btn primary" id="load-files-btn">
          <span>&#128190;</span> Load Music
        </button>
        <button class="action-btn" id="load-skin-btn">
          <span>&#127912;</span> Load Skin
        </button>
      </div>

      <div class="external-controls">
        <div class="controls-row">
          <button class="ctrl-btn" id="prev-btn" title="Previous">&#9198;</button>
          <button class="ctrl-btn" id="stop-btn" title="Stop">&#9632;</button>
          <button class="ctrl-btn play-btn" id="play-btn" title="Play/Pause">&#9654;</button>
          <button class="ctrl-btn" id="next-btn" title="Next">&#9197;</button>
        </div>
        <div class="volume-control">
          <span class="volume-icon">&#128264;</span>
          <input type="range" class="volume-slider" id="volume-slider" min="0" max="100" value="75">
          <span class="volume-icon">&#128266;</span>
        </div>
        <div class="toggles-row">
          <button class="toggle-btn" id="shuffle-btn">Shuffle</button>
          <button class="toggle-btn" id="repeat-btn">Repeat</button>
        </div>
      </div>

      <div class="webamp-container" id="webamp-container">
        <div class="loading">
          <div class="spinner"></div>
        </div>
      </div>
    </main>

    <main class="tab-content playlists-tab" id="playlists-tab">
      <div class="playlists-header">
        <button class="action-btn primary" id="create-playlist-btn">
          <span>+</span> New Playlist
        </button>
      </div>
      <div class="playlists-content">
        <div class="playlist-list" id="playlist-list"></div>
        <div class="track-list-container" id="track-list-container">
          <div class="empty-state">
            <div class="empty-state-icon">&#128203;</div>
            <p class="empty-state-text">Select a playlist to view its tracks</p>
          </div>
        </div>
      </div>
    </main>

    <input type="file" class="hidden-input" id="audio-input" accept="audio/*" multiple>
    <input type="file" class="hidden-input" id="skin-input" accept=".wsz,.zip">
  `;

  return app;
}

// Set up event listeners
export function setupEventListeners(): void {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab') as TabId;
      switchTab(tab);
    });
  });

  // Load music button
  document.getElementById('load-files-btn')?.addEventListener('click', () => {
    document.getElementById('audio-input')?.click();
  });

  // Load skin button
  document.getElementById('load-skin-btn')?.addEventListener('click', () => {
    document.getElementById('skin-input')?.click();
  });

  // Audio file input
  document.getElementById('audio-input')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const tracks = await webamp.processAudioFiles(Array.from(input.files));
      webamp.setTracks(tracks);
      input.value = ''; // Reset for re-selection
    }
  });

  // Skin file input
  document.getElementById('skin-input')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await webamp.loadSkinFromFile(input.files[0]);
      input.value = '';
    }
  });

  // Playback controls
  document.getElementById('play-btn')?.addEventListener('click', () => {
    const state = store.getState();
    if (state.isPlaying) {
      webamp.pause();
    } else {
      webamp.play();
    }
  });

  document.getElementById('stop-btn')?.addEventListener('click', () => webamp.stop());
  document.getElementById('prev-btn')?.addEventListener('click', () => webamp.previousTrack());
  document.getElementById('next-btn')?.addEventListener('click', () => webamp.nextTrack());

  // Volume slider
  document.getElementById('volume-slider')?.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    webamp.setVolume(value);
  });

  // Shuffle/Repeat toggles
  document.getElementById('shuffle-btn')?.addEventListener('click', () => {
    webamp.toggleShuffle();
    updateToggleButtons();
  });

  document.getElementById('repeat-btn')?.addEventListener('click', () => {
    webamp.toggleRepeat();
    updateToggleButtons();
  });

  // Create playlist button
  document.getElementById('create-playlist-btn')?.addEventListener('click', () => {
    showCreatePlaylistModal();
  });

  // Subscribe to state changes
  store.subscribe(() => {
    updateUI();
  });
}

function switchTab(tab: TabId): void {
  store.setActiveTab(tab);

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tab}-tab`);
  });
}

function updateUI(): void {
  const state = store.getState();

  // Update play button icon
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.innerHTML = state.isPlaying ? '&#10074;&#10074;' : '&#9654;';
  }

  // Update volume slider
  const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
  if (volumeSlider && document.activeElement !== volumeSlider) {
    volumeSlider.value = state.settings.volume.toString();
  }

  updateToggleButtons();
  renderPlaylistList();
  renderTrackList();
}

function updateToggleButtons(): void {
  const webampInstance = webamp.getWebamp();
  if (!webampInstance) return;

  const shuffleBtn = document.getElementById('shuffle-btn');
  const repeatBtn = document.getElementById('repeat-btn');

  if (shuffleBtn) {
    shuffleBtn.classList.toggle('active', webampInstance.isShuffleEnabled());
  }
  if (repeatBtn) {
    repeatBtn.classList.toggle('active', webampInstance.isRepeatEnabled());
  }
}

function renderPlaylistList(): void {
  const container = document.getElementById('playlist-list');
  if (!container) return;

  const state = store.getState();
  const playlists = state.playlists;

  if (playlists.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128203;</div>
        <p class="empty-state-text">No playlists yet. Create one to get started!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = playlists.map(playlist => `
    <div class="playlist-item ${state.currentPlaylistId === playlist.id ? 'selected' : ''}"
         data-playlist-id="${playlist.id}">
      <span class="playlist-icon">&#127926;</span>
      <div class="playlist-info">
        <div class="playlist-name">${escapeHtml(playlist.name)}</div>
        <div class="playlist-count">${playlist.tracks.length} track${playlist.tracks.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="playlist-actions">
        <button class="playlist-action-btn" data-action="play" title="Play">&#9654;</button>
        <button class="playlist-action-btn" data-action="rename" title="Rename">&#9998;</button>
        <button class="playlist-action-btn danger" data-action="delete" title="Delete">&#128465;</button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  container.querySelectorAll('.playlist-item').forEach(item => {
    const playlistId = item.getAttribute('data-playlist-id')!;

    // Click to select
    item.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.playlist-action-btn')) {
        store.setCurrentPlaylist(playlistId);
      }
    });

    // Action buttons
    item.querySelectorAll('.playlist-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const playlist = state.playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        switch (action) {
          case 'play':
            playPlaylist(playlist);
            break;
          case 'rename':
            showRenamePlaylistModal(playlist);
            break;
          case 'delete':
            showDeletePlaylistModal(playlist);
            break;
        }
      });
    });
  });
}

function renderTrackList(): void {
  const container = document.getElementById('track-list-container');
  if (!container) return;

  const playlist = store.getCurrentPlaylist();

  if (!playlist) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128203;</div>
        <p class="empty-state-text">Select a playlist to view its tracks</p>
      </div>
    `;
    return;
  }

  if (playlist.tracks.length === 0) {
    container.innerHTML = `
      <div class="track-list-header">
        <span class="track-list-title">${escapeHtml(playlist.name)}</span>
        <button class="action-btn" id="add-tracks-btn">
          <span>+</span> Add Tracks
        </button>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">&#127925;</div>
        <p class="empty-state-text">No tracks yet. Add some music!</p>
      </div>
    `;
    setupAddTracksButton(playlist.id);
    return;
  }

  container.innerHTML = `
    <div class="track-list-header">
      <span class="track-list-title">${escapeHtml(playlist.name)}</span>
      <button class="action-btn" id="add-tracks-btn">
        <span>+</span> Add Tracks
      </button>
    </div>
    <div class="track-list" id="track-list">
      ${playlist.tracks.map((track, index) => `
        <div class="track-item" data-track-id="${track.id}" data-index="${index}" draggable="true">
          <span class="track-number">${index + 1}</span>
          <div class="track-info">
            <div class="track-title">${escapeHtml(track.title)}</div>
            <div class="track-artist">${escapeHtml(track.artist)}</div>
          </div>
          <span class="track-duration">${formatDuration(track.duration)}</span>
          <button class="track-remove-btn" title="Remove">&#10005;</button>
        </div>
      `).join('')}
    </div>
  `;

  setupAddTracksButton(playlist.id);
  setupTrackListInteractions(playlist.id);
}

function setupAddTracksButton(playlistId: string): void {
  const btn = document.getElementById('add-tracks-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = async () => {
      if (input.files && input.files.length > 0) {
        const liveTracks = await webamp.processAudioFiles(Array.from(input.files));
        // Convert to StoredTracks (without blobUrl)
        const storedTracks: StoredTrack[] = liveTracks.map(({ blobUrl: _, ...stored }) => stored);
        await store.addTracksToPlaylist(playlistId, storedTracks);
      }
    };
    input.click();
  });
}

function setupTrackListInteractions(playlistId: string): void {
  const trackList = document.getElementById('track-list');
  if (!trackList) return;

  let draggedItem: HTMLElement | null = null;

  trackList.querySelectorAll('.track-item').forEach(item => {
    const trackId = item.getAttribute('data-track-id')!;

    // Remove button
    item.querySelector('.track-remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      store.removeTrackFromPlaylist(playlistId, trackId);
    });

    // Drag and drop for reordering
    item.addEventListener('dragstart', (e) => {
      draggedItem = item as HTMLElement;
      (item as HTMLElement).classList.add('dragging');
      (e as DragEvent).dataTransfer!.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      (item as HTMLElement).classList.remove('dragging');
      draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      (e as DragEvent).dataTransfer!.dropEffect = 'move';
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!draggedItem || draggedItem === item) return;

      const fromIndex = parseInt(draggedItem.getAttribute('data-index')!);
      const toIndex = parseInt((item as HTMLElement).getAttribute('data-index')!);

      await store.reorderTracks(playlistId, fromIndex, toIndex);
    });
  });
}

async function playPlaylist(playlist: Playlist): Promise<void> {
  if (playlist.tracks.length === 0) return;

  // Need to have user re-select files since we can't persist actual audio data
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.multiple = true;

  showModal(
    'Load Playlist Files',
    `<p style="margin-bottom: 16px; color: var(--text-secondary);">
      Due to browser security, please re-select the audio files for "${escapeHtml(playlist.name)}".
      <br><br>
      Expected files: ${playlist.tracks.map(t => t.fileName).join(', ')}
    </p>`,
    [
      { text: 'Cancel', className: 'cancel', action: () => {} },
      {
        text: 'Select Files',
        className: 'confirm',
        action: async () => {
          input.click();
        }
      }
    ]
  );

  input.onchange = async () => {
    hideModal();
    if (input.files && input.files.length > 0) {
      const liveTracks = await webamp.processAudioFiles(Array.from(input.files));
      webamp.setTracks(liveTracks);
      switchTab('player');
    }
  };
}

// Modal functions
function showModal(title: string, content: string, buttons: Array<{text: string, className: string, action: () => void}>): void {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2 class="modal-title">${title}</h2>
      <div class="modal-content">${content}</div>
      <div class="modal-actions">
        ${buttons.map(btn => `<button class="modal-btn ${btn.className}">${btn.text}</button>`).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Set up button handlers
  modal.querySelectorAll('.modal-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      buttons[index].action();
      hideModal();
    });
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });
}

function hideModal(): void {
  document.querySelector('.modal-overlay')?.remove();
}

function showCreatePlaylistModal(): void {
  showModal(
    'Create New Playlist',
    '<input type="text" class="modal-input" id="playlist-name-input" placeholder="Playlist name" autofocus>',
    [
      { text: 'Cancel', className: 'cancel', action: () => {} },
      {
        text: 'Create',
        className: 'confirm',
        action: async () => {
          const input = document.getElementById('playlist-name-input') as HTMLInputElement;
          const name = input.value.trim();
          if (name) {
            const playlist = await store.createPlaylist(name);
            store.setCurrentPlaylist(playlist.id);
          }
        }
      }
    ]
  );

  // Focus input and handle enter key
  setTimeout(() => {
    const input = document.getElementById('playlist-name-input') as HTMLInputElement;
    input?.focus();
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.querySelector('.modal-btn.confirm')?.dispatchEvent(new Event('click'));
      }
    });
  }, 100);
}

function showRenamePlaylistModal(playlist: Playlist): void {
  showModal(
    'Rename Playlist',
    `<input type="text" class="modal-input" id="playlist-name-input" value="${escapeHtml(playlist.name)}" autofocus>`,
    [
      { text: 'Cancel', className: 'cancel', action: () => {} },
      {
        text: 'Rename',
        className: 'confirm',
        action: async () => {
          const input = document.getElementById('playlist-name-input') as HTMLInputElement;
          const name = input.value.trim();
          if (name && name !== playlist.name) {
            await store.renamePlaylist(playlist.id, name);
          }
        }
      }
    ]
  );

  setTimeout(() => {
    const input = document.getElementById('playlist-name-input') as HTMLInputElement;
    input?.focus();
    input?.select();
  }, 100);
}

function showDeletePlaylistModal(playlist: Playlist): void {
  showModal(
    'Delete Playlist',
    `<p>Are you sure you want to delete "<strong>${escapeHtml(playlist.name)}</strong>"?</p>
     <p style="color: var(--text-secondary); margin-top: 8px;">This action cannot be undone.</p>`,
    [
      { text: 'Cancel', className: 'cancel', action: () => {} },
      {
        text: 'Delete',
        className: 'danger',
        action: async () => {
          await store.deletePlaylist(playlist.id);
        }
      }
    ]
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
