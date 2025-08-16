// Tipos básicos para la aplicación Gemini Desktop Assistant

// Configuración de la aplicación
export interface AppConfig {
  apiKey?: string;
  theme?: 'light' | 'dark';
  windowSize?: {
    width: number;
    height: number;
  };
  windowPosition?: {
    x: number;
    y: number;
  };
  autoHide?: boolean;
  incognitoMode?: boolean;
  dataRetention?: number; // días
}

// Configuración de Gemini
export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Mensaje del chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
}

// Conversación completa
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

// Estado de la UI
export interface UIState {
  theme: 'light' | 'dark';
  isMinimized: boolean;
  isSettingsOpen: boolean;
  isProcessing: boolean;
}

// Eventos IPC
export interface IPCEvents {
  'send-message': {
    content: string;
    model?: string;
  };
  'receive-response': {
    content: string;
    model?: string;
  };
  'open-settings': void;
  'close-settings': void;
  'update-config': Partial<AppConfig>;
  'get-config': void;
  'config-updated': AppConfig;
  'error': {
    message: string;
    code?: string;
  };
}

// Respuesta de la API de Gemini
export interface GeminiResponse {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
}

// Archivo de imagen
export interface ImageFile {
  data: string; // base64
  mimeType: string;
  name?: string;
  size?: number;
}

// Eventos de la ventana
export interface WindowEvents {
  'window-created': void;
  'window-closed': void;
  'window-minimized': void;
  'window-restored': void;
  'window-moved': {
    x: number;
    y: number;
  };
  'window-resized': {
    width: number;
    height: number;
  };
}

// Configuración de build
export interface BuildConfig {
  appId: string;
  productName: string;
  version: string;
  files: string[];
  directories?: {
    output?: string;
    buildResources?: string;
  };
  win?: {
    target: string;
    icon?: string;
  };
  nsis?: {
    oneClick: boolean;
    allowToChangeInstallationDirectory: boolean;
  };
}
