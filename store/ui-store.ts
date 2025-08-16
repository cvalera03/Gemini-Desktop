// UI Store - Gestión de tema, colores y preferencias de interfaz
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BaseStore } from './base-store';

// Estado del store de UI
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  currentTheme: 'light' | 'dark'; // Tema resuelto (sin 'system')
  isMinimized: boolean;
  isSettingsOpen: boolean;
  isProcessing: boolean;
  windowState: {
    isExpanded: boolean;
    width: number;
    height: number;
    x: number;
    y: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  colorPresets: {
    [key: string]: UIState['colors'];
  };
  selectedColorPreset: string;
  customColors: boolean;
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  transparency: {
    enabled: boolean;
    level: number; // 0-100
  };
  fontSize: number; // 12-24
  fontFamily: string;
  compactMode: boolean;
  showTimestamps: boolean;
  showMessageCount: boolean;
  autoScroll: boolean;
}

export class UIStore extends BaseStore<UIState> {
  private uiDataPath: string;
  private preferencesPath: string;

  constructor() {
    super(UIStore.getDefaultState());
    const userDataPath = app.getPath('userData');
    this.uiDataPath = path.join(userDataPath, 'ui-preferences');
    this.preferencesPath = path.join(this.uiDataPath, 'ui-preferences.json');
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.uiDataPath)) {
      fs.mkdirSync(this.uiDataPath, { recursive: true });
    }

    // Detectar tema del sistema
    this.detectSystemTheme();
  }

  // Estado por defecto
  private static getDefaultState(): UIState {
    return {
      theme: 'system',
      currentTheme: 'light',
      isMinimized: false,
      isSettingsOpen: false,
      isProcessing: false,
      windowState: {
        isExpanded: false,
        width: 700,
        height: 80,
        x: 0,
        y: 0
      },
      colors: {
        primary: '#6366f1',
        secondary: '#818cf8',
        accent: '#a855f7',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      colorPresets: {
        default: {
          primary: '#6366f1',
          secondary: '#818cf8',
          accent: '#a855f7',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        dark: {
          primary: '#6366f1',
          secondary: '#818cf8',
          accent: '#a855f7',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#94a3b8',
          border: '#334155',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        ocean: {
          primary: '#0891b2',
          secondary: '#06b6d4',
          accent: '#0284c7',
          background: '#ffffff',
          surface: '#f0f9ff',
          text: '#0c4a6e',
          textSecondary: '#0369a1',
          border: '#bae6fd',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626'
        },
        forest: {
          primary: '#16a34a',
          secondary: '#22c55e',
          accent: '#15803d',
          background: '#ffffff',
          surface: '#f0fdf4',
          text: '#14532d',
          textSecondary: '#166534',
          border: '#bbf7d0',
          success: '#059669',
          warning: '#ca8a04',
          error: '#dc2626'
        },
        sunset: {
          primary: '#ea580c',
          secondary: '#f97316',
          accent: '#c2410c',
          background: '#ffffff',
          surface: '#fff7ed',
          text: '#9a3412',
          textSecondary: '#c2410c',
          border: '#fed7aa',
          success: '#16a34a',
          warning: '#eab308',
          error: '#dc2626'
        }
      },
      selectedColorPreset: 'default',
      customColors: false,
      animations: {
        enabled: true,
        duration: 300,
        easing: 'ease-in-out'
      },
      transparency: {
        enabled: true,
        level: 85
      },
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      compactMode: false,
      showTimestamps: true,
      showMessageCount: false,
      autoScroll: true
    };
  }

  protected getInitialState(): UIState {
    return UIStore.getDefaultState();
  }

  // Detectar tema del sistema
  private detectSystemTheme(): void {
    // En Electron, podemos detectar el tema del sistema
    try {
      const { nativeTheme } = require('electron');
      const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      
      if (this.state.theme === 'system') {
        this.setState({ currentTheme: systemTheme });
      }

      // Escuchar cambios del tema del sistema
      nativeTheme.on('updated', () => {
        if (this.state.theme === 'system') {
          const newSystemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
          this.setState({ currentTheme: newSystemTheme });
        }
      });
    } catch (error) {
      console.warn('No se pudo detectar el tema del sistema:', error);
    }
  }

  // Cargar preferencias desde archivo
  protected async load(): Promise<void> {
    try {
      if (fs.existsSync(this.preferencesPath)) {
        const preferencesData = fs.readFileSync(this.preferencesPath, 'utf-8');
        const loadedPreferences = JSON.parse(preferencesData);
        
        // Merge con preferencias por defecto
        const mergedPreferences = {
          ...UIStore.getDefaultState(),
          ...loadedPreferences,
          // Asegurar que los presets por defecto estén siempre disponibles
          colorPresets: {
            ...UIStore.getDefaultState().colorPresets,
            ...loadedPreferences.colorPresets
          }
        };
        
        this.setState(mergedPreferences);
        console.log('Preferencias de UI cargadas');
      } else {
        console.log('No se encontraron preferencias de UI, usando valores por defecto');
      }
    } catch (error) {
      console.error('Error al cargar preferencias de UI:', error);
      this.setState(UIStore.getDefaultState());
    }
  }

  // Guardar preferencias en archivo
  protected async save(): Promise<void> {
    try {
      // No guardar estados temporales
      const { isMinimized, isSettingsOpen, isProcessing, ...preferencesToSave } = this.state;
      
      fs.writeFileSync(this.preferencesPath, JSON.stringify(preferencesToSave, null, 2));
      console.log('Preferencias de UI guardadas');
    } catch (error) {
      console.error('Error al guardar preferencias de UI:', error);
      throw error;
    }
  }

  // Métodos públicos para gestión de UI

  // Cambiar tema
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    const updates: Partial<UIState> = { theme };
    
    if (theme === 'system') {
      // Detectar tema actual del sistema
      try {
        const { nativeTheme } = require('electron');
        updates.currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      } catch {
        updates.currentTheme = 'light';
      }
    } else {
      updates.currentTheme = theme;
    }

    // Cambiar preset de colores automáticamente según el tema
    if (!this.state.customColors) {
      if (updates.currentTheme === 'dark' && this.state.selectedColorPreset === 'default') {
        updates.selectedColorPreset = 'dark';
        const darkPreset = this.state.colorPresets['dark'];
        if (darkPreset) {
          updates.colors = darkPreset;
        }
      } else if (updates.currentTheme === 'light' && this.state.selectedColorPreset === 'dark') {
        updates.selectedColorPreset = 'default';
        const defaultPreset = this.state.colorPresets['default'];
        if (defaultPreset) {
          updates.colors = defaultPreset;
        }
      }
    }

    this.setState(updates);
    await this.save();
  }

  // Cambiar preset de colores
  async setColorPreset(presetName: string): Promise<void> {
    const preset = this.state.colorPresets[presetName];
    if (preset) {
      this.setState({
        selectedColorPreset: presetName,
        colors: { ...preset },
        customColors: false
      });
      await this.save();
    }
  }

  // Actualizar colores personalizados
  async setCustomColors(colors: Partial<UIState['colors']>): Promise<void> {
    this.setState({
      colors: { ...this.state.colors, ...colors },
      customColors: true,
      selectedColorPreset: 'custom'
    });
    await this.save();
  }

  // Crear preset personalizado
  async createColorPreset(name: string, colors: UIState['colors']): Promise<void> {
    this.setState({
      colorPresets: {
        ...this.state.colorPresets,
        [name]: { ...colors }
      },
      selectedColorPreset: name,
      colors: { ...colors },
      customColors: false
    });
    await this.save();
  }

  // Eliminar preset personalizado
  async deleteColorPreset(name: string): Promise<boolean> {
    // No permitir eliminar presets por defecto
    const defaultPresets = ['default', 'dark', 'ocean', 'forest', 'sunset'];
    if (defaultPresets.includes(name)) {
      return false;
    }

    const newPresets = { ...this.state.colorPresets };
    delete newPresets[name];

    const updates: Partial<UIState> = {
      colorPresets: newPresets
    };

    // Si estamos usando el preset que se va a eliminar, cambiar a default
    if (this.state.selectedColorPreset === name) {
      updates.selectedColorPreset = 'default';
      const defaultPreset = this.state.colorPresets['default'];
      if (defaultPreset) {
        updates.colors = defaultPreset;
      }
      updates.customColors = false;
    }

    this.setState(updates);
    await this.save();
    return true;
  }

  // Actualizar estado de ventana
  setWindowState(state: Partial<UIState['windowState']>): void {
    this.setState({
      windowState: { ...this.state.windowState, ...state }
    });
  }

  // Cambiar estado de procesamiento
  setProcessing(isProcessing: boolean): void {
    this.setState({ isProcessing });
  }

  // Cambiar estado de configuración
  setSettingsOpen(isOpen: boolean): void {
    this.setState({ isSettingsOpen: isOpen });
  }

  // Cambiar estado minimizado
  setMinimized(isMinimized: boolean): void {
    this.setState({ isMinimized });
  }

  // Actualizar configuración de animaciones
  async setAnimations(animations: Partial<UIState['animations']>): Promise<void> {
    this.setState({
      animations: { ...this.state.animations, ...animations }
    });
    await this.save();
  }

  // Actualizar configuración de transparencia
  async setTransparency(transparency: Partial<UIState['transparency']>): Promise<void> {
    this.setState({
      transparency: { ...this.state.transparency, ...transparency }
    });
    await this.save();
  }

  // Cambiar tamaño de fuente
  async setFontSize(fontSize: number): Promise<void> {
    const clampedSize = Math.max(12, Math.min(24, fontSize));
    this.setState({ fontSize: clampedSize });
    await this.save();
  }

  // Cambiar familia de fuente
  async setFontFamily(fontFamily: string): Promise<void> {
    this.setState({ fontFamily });
    await this.save();
  }

  // Cambiar modo compacto
  async setCompactMode(enabled: boolean): Promise<void> {
    this.setState({ compactMode: enabled });
    await this.save();
  }

  // Cambiar visibilidad de timestamps
  async setShowTimestamps(enabled: boolean): Promise<void> {
    this.setState({ showTimestamps: enabled });
    await this.save();
  }

  // Cambiar visibilidad de contador de mensajes
  async setShowMessageCount(enabled: boolean): Promise<void> {
    this.setState({ showMessageCount: enabled });
    await this.save();
  }

  // Cambiar auto-scroll
  async setAutoScroll(enabled: boolean): Promise<void> {
    this.setState({ autoScroll: enabled });
    await this.save();
  }

  // Exportar configuración de UI
  exportUIConfig(): Omit<UIState, 'isMinimized' | 'isSettingsOpen' | 'isProcessing'> {
    const { isMinimized, isSettingsOpen, isProcessing, ...exportableState } = this.state;
    return exportableState;
  }

  // Importar configuración de UI
  async importUIConfig(config: Partial<UIState>): Promise<void> {
    // Filtrar estados temporales
    const { isMinimized, isSettingsOpen, isProcessing, ...importableConfig } = config;
    
    const safeConfig = {
      ...UIStore.getDefaultState(),
      ...importableConfig,
      // Preservar presets por defecto
      colorPresets: {
        ...UIStore.getDefaultState().colorPresets,
        ...importableConfig.colorPresets
      }
    };
    
    this.setState(safeConfig);
    await this.save();
  }

  // Resetear a configuración por defecto
  async resetToDefaults(): Promise<void> {
    const defaultState = UIStore.getDefaultState();
    this.setState({
      ...defaultState,
      // Preservar estados temporales actuales
      isMinimized: this.state.isMinimized,
      isSettingsOpen: this.state.isSettingsOpen,
      isProcessing: this.state.isProcessing
    });
    await this.save();
  }

  // Obtener CSS variables para el tema actual
  getCSSVariables(): Record<string, string> {
    const colors = this.state.colors;
    const animations = this.state.animations;
    const transparency = this.state.transparency;
    
    return {
      '--color-primary': colors.primary,
      '--color-secondary': colors.secondary,
      '--color-accent': colors.accent,
      '--color-background': colors.background,
      '--color-surface': colors.surface,
      '--color-text': colors.text,
      '--color-text-secondary': colors.textSecondary,
      '--color-border': colors.border,
      '--color-success': colors.success,
      '--color-warning': colors.warning,
      '--color-error': colors.error,
      '--animation-duration': `${animations.duration}ms`,
      '--animation-easing': animations.easing,
      '--transparency-level': `${transparency.level}%`,
      '--font-size': `${this.state.fontSize}px`,
      '--font-family': this.state.fontFamily
    };
  }
}
