// Base Store - Patrón Observer/Store simple para gestión de estado
import { EventEmitter } from 'events';

// Tipo base para todos los estados
export interface BaseState {
  [key: string]: any;
}

// Interfaz para los listeners de cambios
export type StateChangeListener<T = any> = (newState: T, oldState: T, changedKeys: string[]) => void;

// Clase base para todos los stores
export abstract class BaseStore<T extends BaseState> extends EventEmitter {
  protected state: T;
  private initialized = false;

  constructor(initialState: T) {
    super();
    this.state = { ...initialState };
  }

  // Obtener el estado actual
  getState(): T {
    return { ...this.state };
  }

  // Obtener un valor específico del estado
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  // Actualizar el estado
  protected setState(updates: Partial<T>): void {
    const oldState = { ...this.state };
    const changedKeys: string[] = [];

    // Identificar qué claves han cambiado
    Object.keys(updates).forEach(key => {
      if (this.state[key] !== updates[key]) {
        changedKeys.push(key);
      }
    });

    // Solo actualizar si hay cambios
    if (changedKeys.length > 0) {
      this.state = { ...this.state, ...updates };
      
      // Emitir evento de cambio
      this.emit('stateChange', this.state, oldState, changedKeys);
      
      // Emitir eventos específicos para cada clave cambiada
      changedKeys.forEach(key => {
        this.emit(`change:${key}`, this.state[key], oldState[key]);
      });
    }
  }

  // Suscribirse a cambios de estado
  subscribe(listener: StateChangeListener<T>): () => void {
    this.on('stateChange', listener);
    
    // Retornar función para desuscribirse
    return () => {
      this.removeListener('stateChange', listener);
    };
  }

  // Suscribirse a cambios de una clave específica
  subscribeToKey<K extends keyof T>(key: K, listener: (newValue: T[K], oldValue: T[K]) => void): () => void {
    const eventName = `change:${String(key)}`;
    this.on(eventName, listener);
    
    return () => {
      this.removeListener(eventName, listener);
    };
  }

  // Inicializar el store (para cargar datos persistentes)
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.load();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error(`Error initializing ${this.constructor.name}:`, error);
      throw error;
    }
  }

  // Verificar si el store está inicializado
  isInitialized(): boolean {
    return this.initialized;
  }

  // Resetear el estado a su valor inicial
  reset(): void {
    const initialState = this.getInitialState();
    this.setState(initialState);
  }

  // Métodos abstractos que deben implementar las clases derivadas
  protected abstract getInitialState(): T;
  protected abstract load(): Promise<void>;
  protected abstract save(): Promise<void>;

  // Destruir el store y limpiar listeners
  destroy(): void {
    this.removeAllListeners();
  }
}

// Interfaz para el manager de stores
export interface StoreManager {
  getStore<T extends BaseStore<any>>(name: string): T | undefined;
  initializeAll(): Promise<void>;
  destroyAll(): void;
}

// Manager centralizado para todos los stores
export class CentralStoreManager implements StoreManager {
  private stores = new Map<string, BaseStore<any>>();
  private static instance: CentralStoreManager;

  private constructor() {}

  static getInstance(): CentralStoreManager {
    if (!CentralStoreManager.instance) {
      CentralStoreManager.instance = new CentralStoreManager();
    }
    return CentralStoreManager.instance;
  }

  // Registrar un store
  registerStore<T extends BaseStore<any>>(name: string, store: T): T {
    this.stores.set(name, store);
    return store;
  }

  // Obtener un store por nombre
  getStore<T extends BaseStore<any>>(name: string): T | undefined {
    return this.stores.get(name) as T;
  }

  // Inicializar todos los stores
  async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.stores.values()).map(store => store.initialize());
    await Promise.all(initPromises);
  }

  // Destruir todos los stores
  destroyAll(): void {
    this.stores.forEach(store => store.destroy());
    this.stores.clear();
  }

  // Obtener todos los stores
  getAllStores(): Map<string, BaseStore<any>> {
    return new Map(this.stores);
  }
}
