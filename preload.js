// Este script actúa como un puente seguro entre el proceso principal (Node.js)
// y el proceso de renderizado (el navegador/HTML).
const { contextBridge, ipcRenderer } = require('electron');

// Expone funciones seguras al proceso de renderizado (nuestra página web)
contextBridge.exposeInMainWorld('api', {
  // Llama a la API de Gemini en el proceso principal
  callGemini: (prompt, base64ImageData) => 
    ipcRenderer.invoke('call-gemini-api', { prompt, base64ImageData }),
  
  // Pide al proceso principal que redimensione la ventana
  resizeWindow: (options) => ipcRenderer.invoke('resize-window', options),

  // Pide al proceso principal que oculte la ventana
  closeWindow: () => ipcRenderer.send('hide-window')
});
