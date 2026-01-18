# SeekerPlay

A frontend-only local music player built with [Webamp](https://github.com/captbaritone/webamp) - the browser-based Winamp 2 emulator. Features playlist management, .wsz skin support, and a mobile-friendly interface.

## Features

- **Webamp Integration**: Full Winamp 2 experience in the browser
- **Local Music Playback**: Load audio files from your device via file picker
- **.wsz Skin Support**: Load and switch custom Winamp skins
- **Playlist Management**: Create, rename, delete, and organize multiple playlists
- **Persistent Storage**: Playlists saved to IndexedDB (survives page reload)
- **Mobile-First Design**: Touch-friendly controls with responsive layout
- **External Controls**: Large play/pause/skip buttons outside the classic Webamp UI
- **Keyboard Shortcuts**: Webamp's built-in hotkeys enabled

---

## 1. Feasibility & Limitations

### What Webamp Supports
| Feature | Status | Notes |
|---------|--------|-------|
| .wsz skin loading | ✅ | `setSkinFromUrl()` method |
| Playlist management | ✅ | `setTracksToPlay()`, `appendTracks()`, `getPlaylistTracks()` |
| Playback control | ✅ | `play()`, `pause()`, `stop()`, `nextTrack()`, `previousTrack()` |
| Volume control | ✅ | `setVolume(0-100)` |
| Shuffle/Repeat | ✅ | `toggleShuffle()`, `toggleRepeat()` |
| Event callbacks | ✅ | `onTrackDidChange()`, `onClose()`, etc. |

### Browser Limitations
| Limitation | Impact | Solution |
|------------|--------|----------|
| No filesystem access | Cannot browse folders | File picker `<input type="file">` |
| CORS restrictions | `file://` URLs blocked | Convert to Blob URLs with `URL.createObjectURL()` |
| Autoplay policy | Audio requires user gesture | Play button requires click |
| File persistence | Cannot store actual audio | Store metadata only; re-select on reload |

### Mobile Considerations
- Webamp's UI uses small touch targets designed for mouse
- External controls provided for touch accessibility
- Skin rendering may lag on complex .wsz files
- iOS has stricter autoplay restrictions

---

## 2. Architecture Overview

```
src/
├── main.ts              # Entry point, app initialization
├── types.ts             # TypeScript interfaces and types
├── db.ts                # IndexedDB operations (playlists, settings)
├── state.ts             # Reactive state management (Zustand-like)
├── webamp-controller.ts # Webamp instance management
├── ui.ts                # DOM rendering and event handlers
└── styles.css           # Mobile-first responsive CSS
```

### Data Flow
```
User Action → UI Event → State Update → IndexedDB Persist → UI Re-render
                           ↓
                    Webamp API Call
```

---

## 3. UI/Navigation Design

### Tab Layout
- **Player Tab**: Webamp instance + external controls + file/skin loaders
- **Playlists Tab**: Sidebar list + track detail view

### Mobile (< 768px)
- Stacked tab content
- Bottom-accessible controls
- Full-width buttons (44px+ touch targets)

### Desktop (≥ 768px)
- Side-by-side playlist/tracks view
- Centered Webamp container
- Keyboard shortcut support

---

## 4. Webamp Integration

### Initialization
```typescript
import Webamp from 'webamp';

const webamp = new Webamp({
  initialSkin: { url: './skin.wsz' },  // Optional
  enableHotkeys: true,
  zIndex: 100,
  filePickers: [/* custom file picker */]
});

await webamp.renderWhenReady(container);
```

### Loading Local Files
```typescript
// Files selected via <input type="file">
const files: File[] = Array.from(input.files);
const tracks = files.map(file => ({
  url: URL.createObjectURL(file),  // Blob URL
  metaData: { artist: '...', title: '...' },
  duration: 180  // seconds
}));
webamp.setTracksToPlay(tracks);
```

### Changing Skins
```typescript
// Load .wsz from file picker
const file = input.files[0];
const blobUrl = URL.createObjectURL(file);
webamp.setSkinFromUrl(blobUrl);
```

---

## 5. Playlist Management

### Data Model
```typescript
interface Playlist {
  id: string;
  name: string;
  tracks: StoredTrack[];
  createdAt: number;
  updatedAt: number;
}

interface StoredTrack {
  id: string;
  name: string;
  artist: string;
  title: string;
  duration: number;
  fileName: string;    // For re-identification
  fileSize: number;
  lastModified: number;
}
```

### Persistence (IndexedDB)
- Playlists stored with full track metadata
- Settings (volume, skin URL, last playlist) persisted
- **Note**: Actual audio bytes are NOT stored (browser security)
- Users must re-select files when loading a saved playlist

---

## 6. Skin Handling (.wsz)

### What is .wsz?
- ZIP archive containing bitmap images and config
- Winamp 2 skin format, fully supported by Webamp

### Loading Process
1. User selects `.wsz` file via file picker
2. Create Blob URL: `URL.createObjectURL(file)`
3. Apply to Webamp: `webamp.setSkinFromUrl(blobUrl)`
4. Optionally persist URL in settings (only works for same-session blob URLs)

### Where to Get Skins
- [Winamp Skin Museum](https://skins.webamp.org/) - 90,000+ skins
- Skins must be served with CORS headers if loading from URL

---

## 7. Project Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd SeekerPlay

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development
```bash
npm run dev
# Opens at http://localhost:5173
```

### Production Build
```bash
npm run build
# Output in ./dist/
npm run preview  # Preview production build
```

---

## 8. Step-by-Step Build Plan

1. **Setup**: `npm init`, install Vite + TypeScript + Webamp
2. **Core Types**: Define Track, Playlist, AppState interfaces
3. **IndexedDB Layer**: CRUD operations for playlists/settings
4. **State Management**: Reactive store with subscriptions
5. **Webamp Controller**: Initialize, wrap API methods
6. **UI Shell**: Tab navigation, containers
7. **Player Tab**: External controls, file pickers, Webamp mount
8. **Playlist Tab**: List view, track management, drag-reorder
9. **Modals**: Create/rename/delete playlist dialogs
10. **Styling**: Mobile-first CSS with desktop breakpoints
11. **Testing**: Manual testing with local files and skins

---

## 9. UX & Legal Notes

### Touch UX Considerations
- Webamp's classic UI has ~20px buttons (below 44px accessibility minimum)
- External controls provided with proper touch targets
- Drag-to-reorder uses native HTML5 drag events (works on touch with polyfill)

### Trademark Notice
> Winamp is a trademark of Winamp SA. This project uses Webamp, an independent
> open-source reimplementation, and is not affiliated with or endorsed by Winamp SA.

### Skin Licensing
- Most .wsz skins were created by fans for free distribution
- Some skins may contain copyrighted imagery
- Use skins responsibly and respect original creators

---

## 10. API Reference

### Webamp Instance Methods (Subset)
```typescript
// Playback
play(): void
pause(): void
stop(): void
nextTrack(): void
previousTrack(): void

// Playlist
setTracksToPlay(tracks: Track[]): void
appendTracks(tracks: Track[]): void
getPlaylistTracks(): PlaylistTrack[]

// Volume & Modes
setVolume(volume: number): void  // 0-100
toggleShuffle(): void
toggleRepeat(): void
isShuffleEnabled(): boolean
isRepeatEnabled(): boolean

// Skin
setSkinFromUrl(url: string): void

// Events
onTrackDidChange(callback: (track) => void): () => void
onClose(callback: () => void): () => void

// Status
getMediaStatus(): 'PLAYING' | 'STOPPED' | 'PAUSED' | null

// Static
Webamp.browserIsSupported(): boolean
```

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome 66+ | ✅ |
| Firefox 60+ | ✅ |
| Safari 12+ | ✅ |
| Edge 79+ | ✅ |
| Internet Explorer | ❌ |

---

## License

MIT License - See [LICENSE](LICENSE) for details.

Webamp is MIT licensed. See [Webamp License](https://github.com/captbaritone/webamp/blob/master/LICENSE).
