import './styles.css';
import { initializeStore } from './state';
import { createAppUI, setupEventListeners } from './ui';
import { initializeWebamp } from './webamp-controller';
import Webamp from 'webamp';

async function main(): Promise<void> {
  // Check browser support first
  if (!Webamp.browserIsSupported()) {
    document.getElementById('app')!.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;
                  min-height: 100vh; padding: 24px; text-align: center; color: #fff; background: #0f0f1a;">
        <h1 style="color: #ef4444; margin-bottom: 16px;">Browser Not Supported</h1>
        <p style="max-width: 400px; color: #b0b0c0;">
          Your browser doesn't support the Web Audio API required by Webamp.
          Please use a modern browser like Chrome, Firefox, Safari, or Edge.
        </p>
      </div>
    `;
    return;
  }

  // Initialize the store (load from IndexedDB)
  await initializeStore();

  // Create and mount the UI
  const app = document.getElementById('app')!;
  app.appendChild(createAppUI());

  // Set up UI event listeners
  setupEventListeners();

  // Initialize Webamp
  try {
    const webampContainer = document.getElementById('webamp-container')!;
    webampContainer.innerHTML = ''; // Clear loading spinner
    await initializeWebamp(webampContainer);
  } catch (error) {
    console.error('Failed to initialize Webamp:', error);
    document.getElementById('webamp-container')!.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#9888;</div>
        <p class="empty-state-text">Failed to load Webamp. Please refresh the page.</p>
      </div>
    `;
  }

  // Handle drag-and-drop on the whole page
  setupGlobalDragDrop();

  console.log('SeekerPlay initialized successfully');
}

function setupGlobalDragDrop(): void {
  // Prevent default drag behaviors on the document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  // Visual feedback could be added here
}

// Start the app
main().catch(console.error);
