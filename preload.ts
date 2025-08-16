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
  openPrivacyWindow: () => void;
  closeSettingsWindow: () => void;
  saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
  getApiKey: () => Promise<string>;
  
  // --- Funciones de conversaciones ---
  getAllConversations: () => Promise<any[]>;
  loadConversation: (conversationId: string) => Promise<any>;
  deleteConversation: (conversationId: string) => Promise<void>;
  searchConversations: (query: string) => Promise<any[]>;
  
  // --- Funciones de privacidad ---
  setIncognitoMode: (enabled: boolean) => Promise<{ success: boolean }>;
  getPrivacySettings: () => Promise<any>;
  setDataRetention: (days: number) => Promise<{ success: boolean }>;
  setAutoCleanup: (enabled: boolean, schedule?: 'daily' | 'weekly' | 'monthly') => Promise<{ success: boolean }>;
  runCleanup: () => Promise<any>;
  clearAllData: () => Promise<{ success: boolean }>;
  getStorageInfo: () => Promise<any>;
  exportAllData: () => Promise<{ success: boolean; data?: string }>;
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
  openPrivacyWindow: () => ipcRenderer.send('open-privacy-window'),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  
  // --- Funciones de conversaciones ---
  getAllConversations: () => ipcRenderer.invoke('get-all-conversations'),
  loadConversation: (conversationId: string) => ipcRenderer.invoke('load-conversation', conversationId),
  deleteConversation: (conversationId: string) => ipcRenderer.invoke('delete-conversation', conversationId),
  searchConversations: (query: string) => ipcRenderer.invoke('search-conversations', query),
  
  // --- Funciones de privacidad ---
  setIncognitoMode: (enabled: boolean) => ipcRenderer.invoke('set-incognito-mode', enabled),
  getPrivacySettings: () => ipcRenderer.invoke('get-privacy-settings'),
  setDataRetention: (days: number) => ipcRenderer.invoke('set-data-retention', days),
  setAutoCleanup: (enabled: boolean, schedule?: 'daily' | 'weekly' | 'monthly') => 
    ipcRenderer.invoke('set-auto-cleanup', enabled, schedule),
  runCleanup: () => ipcRenderer.invoke('run-cleanup'),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  exportAllData: () => ipcRenderer.invoke('export-all-data')
});
