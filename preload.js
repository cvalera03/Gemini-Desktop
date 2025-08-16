// Este script actúa como un puente seguro entre el proceso principal (Node.js)
// y el proceso de renderizado (el navegador/HTML).
const { contextBridge, ipcRenderer } = require('electron');

// Expone funciones seguras al proceso de renderizado (nuestra página web)
contextBridge.exposeInMainWorld('api', {
  // --- Funciones de la ventana principal ---
  callGemini: (prompt, base64ImageData, history) => 
    ipcRenderer.invoke('call-gemini-api', { prompt, base64ImageData, history }),
  resizeWindow: (options) => ipcRenderer.invoke('resize-window', options),
  closeWindow: () => ipcRenderer.send('hide-window'),

  // --- Funciones para la ventana de configuración ---
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key')
});
