// Preload script for context isolation and security
// This file runs in a special context that has access to both the renderer and main processes

const { contextBridge } = require('electron');

// Expose any safe APIs you want the renderer process to access
// For now, we're keeping it minimal since the app doesn't need special IPC communication
// The app runs fully in the renderer process with IndexedDB for local storage

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: '1.0.0',
  platform: process.platform
});
