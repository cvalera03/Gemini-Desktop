// Store Index - Exportaciones y configuración central de stores
export { BaseStore, CentralStoreManager } from './base-store';
export { ConfigStore } from './config-store';
export { ChatStore } from './chat-store';
export { UIStore } from './ui-store';

export type { BaseState, StateChangeListener, StoreManager } from './base-store';
export type { ConfigState } from './config-store';
export type { ChatState } from './chat-store';
export type { UIState } from './ui-store';

import { CentralStoreManager } from './base-store';
import { ConfigStore } from './config-store';
import { ChatStore } from './chat-store';
import { UIStore } from './ui-store';

// Instancia global del manager de stores
export const storeManager = CentralStoreManager.getInstance();

// Instancias de los stores
export const configStore = storeManager.registerStore('config', new ConfigStore());
export const chatStore = storeManager.registerStore('chat', new ChatStore());
export const uiStore = storeManager.registerStore('ui', new UIStore());

// Función para inicializar todos los stores
export async function initializeStores(): Promise<void> {
  console.log('Inicializando stores...');
  
  try {
    await storeManager.initializeAll();
    console.log('Todos los stores inicializados correctamente');
  } catch (error) {
    console.error('Error al inicializar stores:', error);
    throw error;
  }
}

// Función para destruir todos los stores
export function destroyStores(): void {
  console.log('Destruyendo stores...');
  storeManager.destroyAll();
}

// Helper para obtener todos los stores
export function getAllStores() {
  return {
    config: configStore,
    chat: chatStore,
    ui: uiStore
  };
}

// Helper para obtener el estado completo de la aplicación
export function getAppState() {
  return {
    config: configStore.getState(),
    chat: chatStore.getState(),
    ui: uiStore.getState()
  };
}

// Helper para suscribirse a cambios en cualquier store
export function subscribeToAllStores(callback: (storeName: string, state: any) => void) {
  const unsubscribers: (() => void)[] = [];
  
  unsubscribers.push(
    configStore.subscribe(() => callback('config', configStore.getState())),
    chatStore.subscribe(() => callback('chat', chatStore.getState())),
    uiStore.subscribe(() => callback('ui', uiStore.getState()))
  );
  
  // Retornar función para desuscribirse de todos
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}
