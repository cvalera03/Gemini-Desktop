// Config Store - Gestión de configuración y API keys
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BaseStore } from './base-store';
import { AppConfig } from '../types';

// Estado del store de configuración
export interface ConfigState {
  apiKey: string;
  theme: 'light' | 'dark' | 'system';
  windowSize: {
    width: number;
    height: number;
  };
  windowPosition: {
    x: number;
    y: number;
  };
  autoHide: boolean;
  incognitoMode: boolean;
  dataRetention: number; // días
  selectedModel: string;
  modelConfig: {
    temperature: number;
    maxTokens: number;
  };
  shortcuts: {
    toggleWindow: string;
    newChat: string;
  };
  lastSaved: number;
}

export class ConfigStore extends BaseStore<ConfigState> {
  private configPath: string;

  constructor() {
    super(ConfigStore.getDefaultState());
    this.configPath = path.join(app.getPath('userData'), 'config.json');
  }

  // Estado por defecto
  private static getDefaultState(): ConfigState {
    return {
      apiKey: '',
      theme: 'system',
      windowSize: {
        width: 700,
        height: 80
      },
      windowPosition: {
        x: 0,
        y: 0
      },
      autoHide: true,
      incognitoMode: false,
      dataRetention: 30, // 30 días por defecto
      selectedModel: 'gemini-2.5-flash',
      modelConfig: {
        temperature: 0.7,
        maxTokens: 2048
      },
      shortcuts: {
        toggleWindow: 'CommandOrControl+Space',
        newChat: 'Control+T'
      },
      lastSaved: Date.now()
    };
  }

  protected getInitialState(): ConfigState {
    return ConfigStore.getDefaultState();
  }

  // Cargar configuración desde archivo
  protected async load(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);
        
        // Merge con configuración por defecto para manejar nuevas propiedades
        const mergedConfig = {
          ...ConfigStore.getDefaultState(),
          ...loadedConfig,
          lastSaved: Date.now()
        };
        
        this.setState(mergedConfig);
        console.log('Configuración cargada desde:', this.configPath);
      } else {
        console.log('Archivo de configuración no encontrado, usando valores por defecto');
        await this.save(); // Crear archivo con valores por defecto
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      // En caso de error, usar configuración por defecto
      this.setState(ConfigStore.getDefaultState());
    }
  }

  // Guardar configuración en archivo
  protected async save(): Promise<void> {
    try {
      const configToSave = {
        ...this.state,
        lastSaved: Date.now()
      };
      
      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2));
      console.log('Configuración guardada en:', this.configPath);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      throw error;
    }
  }

  // Métodos públicos para actualizar configuración

  // Actualizar API Key
  async setApiKey(apiKey: string): Promise<void> {
    this.setState({ apiKey });
    await this.save();
  }

  // Obtener API Key
  getApiKey(): string {
    return this.state.apiKey || process.env['GEMINI_API_KEY'] || '';
  }

  // Actualizar tema
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    this.setState({ theme });
    await this.save();
  }

  // Actualizar tamaño de ventana
  async setWindowSize(width: number, height: number): Promise<void> {
    this.setState({ 
      windowSize: { width, height }
    });
    await this.save();
  }

  // Actualizar posición de ventana
  async setWindowPosition(x: number, y: number): Promise<void> {
    this.setState({ 
      windowPosition: { x, y }
    });
    await this.save();
  }

  // Actualizar configuración del modelo
  async setModelConfig(model: string, temperature?: number, maxTokens?: number): Promise<void> {
    const updates: Partial<ConfigState> = {
      selectedModel: model
    };

    if (temperature !== undefined || maxTokens !== undefined) {
      updates.modelConfig = {
        ...this.state.modelConfig,
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens })
      };
    }

    this.setState(updates);
    await this.save();
  }

  // Actualizar modo incógnito
  async setIncognitoMode(enabled: boolean): Promise<void> {
    this.setState({ incognitoMode: enabled });
    await this.save();
  }

  // Actualizar retención de datos
  async setDataRetention(days: number): Promise<void> {
    this.setState({ dataRetention: days });
    await this.save();
  }

  // Actualizar auto-hide
  async setAutoHide(enabled: boolean): Promise<void> {
    this.setState({ autoHide: enabled });
    await this.save();
  }

  // Actualizar atajos de teclado
  async setShortcuts(shortcuts: Partial<ConfigState['shortcuts']>): Promise<void> {
    this.setState({ 
      shortcuts: {
        ...this.state.shortcuts,
        ...shortcuts
      }
    });
    await this.save();
  }

  // Resetear configuración a valores por defecto
  async resetToDefaults(): Promise<void> {
    this.setState(ConfigStore.getDefaultState());
    await this.save();
  }

  // Exportar configuración
  exportConfig(): ConfigState {
    return { ...this.state };
  }

  // Importar configuración
  async importConfig(config: Partial<ConfigState>): Promise<void> {
    const safeConfig = {
      ...ConfigStore.getDefaultState(),
      ...config,
      lastSaved: Date.now()
    };
    
    this.setState(safeConfig);
    await this.save();
  }

  // Verificar si la configuración es válida
  isConfigValid(): boolean {
    return this.state.apiKey.length > 0;
  }

  // Obtener configuración compatible con la interfaz AppConfig
  getAppConfig(): AppConfig {
    return {
      apiKey: this.state.apiKey,
      theme: this.state.theme === 'system' ? 'light' : this.state.theme,
      windowSize: this.state.windowSize,
      windowPosition: this.state.windowPosition,
      autoHide: this.state.autoHide,
      incognitoMode: this.state.incognitoMode,
      dataRetention: this.state.dataRetention
    };
  }
}
