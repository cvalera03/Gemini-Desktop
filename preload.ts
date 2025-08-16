// Este script actúa como un puente seguro entre el proceso principal (Node.js)
// y el proceso de renderizado (el navegador/HTML).
import { contextBridge, ipcRenderer } from 'electron';

// Definir la interfaz de la API expuesta al renderer
interface WindowAPI {
  // --- Funciones de la ventana principal ---
  callGemini: (prompt: string, base64ImageData?: string, history?: any[]) => Promise<string>;
  resizeWindow: (options: { height: number }) => Promise<void>;
  closeWindow: () => void;

  // --- Funciones para la ventana de configuración ---
  openSettingsWindow: () => void;
  saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
  getApiKey: () => Promise<string>;
}

// Extender la interfaz Window para incluir nuestra API
declare global {
  interface Window {
    api: WindowAPI;
  }
}

// Expone funciones seguras al proceso de renderizado (nuestra página web)
contextBridge.exposeInMainWorld('api', {
  // --- Funciones de la ventana principal ---
  callGemini: (prompt: string, base64ImageData?: string, history?: any[]) => 
    ipcRenderer.invoke('call-gemini-api', { prompt, base64ImageData, history }),
  resizeWindow: (options: { height: number }) => ipcRenderer.invoke('resize-window', options),
  closeWindow: () => ipcRenderer.send('hide-window'),

  // --- Funciones para la ventana de configuración ---
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key')
});
