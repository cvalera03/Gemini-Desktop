// Importa los módulos necesarios
import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import 'dotenv/config'; // Carga las variables de entorno desde .env
import { GoogleGenerativeAI } from '@google/generative-ai';

import { initializeStores, configStore, chatStore, uiStore, destroyStores } from './store';

// --- Gestión de la configuración y API Key con Store ---
let genAI: GoogleGenerativeAI | undefined;

function initializeGemini(): void {
    const apiKey = configStore.getApiKey();

    if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
        console.log("SDK de Gemini inicializado.");
    } else {
        console.log("API Key no configurada. Ve a configuración para añadir tu clave de Gemini.");
    }
}

// --- Fin de la gestión de configuración ---

// Función para convertir datos de imagen de Base64 a un formato que Gemini entiende
function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType
    },
  };
}

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null; // Referencia a la ventana de configuración
let tray: Tray | null = null; // Referencia al icono de la bandeja del sistema

// --- Función para crear la ventana de configuración ---
function createSettingsWindow(): void {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 500,
        height: 300,
        title: 'Configuración',
        center: true,
        frame: true,
        autoHideMenuBar: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    console.log('Attempting to load settings.html'); // <-- Added log
    settingsWindow.loadFile(path.join(app.getAppPath(), 'settings.html'));

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// --- Nuevas constantes para el tamaño de la ventana ---
const INITIAL_WIDTH: number = 700; // Ancho de la ventana
const INITIAL_HEIGHT: number = 80; // Alto inicial (solo para el input)

function createWindow(): void {
  // Obtiene las dimensiones de la pantalla principal
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Posición inicial: centrada horizontalmente y cerca de la parte inferior
  const x: number = Math.round((width - INITIAL_WIDTH) / 2);
  const y: number = height - INITIAL_HEIGHT - 60; // 60px de margen desde abajo

  mainWindow = new BrowserWindow({
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    x: x,
    y: y,
    frame: false,       // Sin bordes
    vibrancy: 'appearance-based' as any,   // Efecto de fondo para Windows 11 (o 'acrylic' para W10)
    alwaysOnTop: true,  // Siempre visible
    resizable: false,   // No permitimos redimensionar manualmente
    skipTaskbar: true,  // No mostrar en la barra de tareas
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'));

  // Cuando la ventana pierde el foco, simplemente la ocultamos
  mainWindow.on('blur', () => {
    if (mainWindow && mainWindow.isVisible()) {
        mainWindow.hide();
    }
  });
}

// Función para mostrar/ocultar la ventana
function toggleWindow(): void {
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        mainWindow.show();
        mainWindow.focus();
    }
}

app.whenReady().then(async () => {
  // Inicializar stores primero
  try {
    await initializeStores();
    console.log('Stores inicializados correctamente');
  } catch (error) {
    console.error('Error al inicializar stores:', error);
  }

  initializeGemini(); // Inicializa Gemini al arrancar
  
  // Verificar si necesita limpieza automática
  if (chatStore.needsCleanup()) {
    console.log('Ejecutando limpieza automática...');
    try {
      const cleanupResult = await chatStore.smartCleanup();
      console.log('Limpieza automática completada:', cleanupResult);
    } catch (error) {
      console.error('Error en limpieza automática:', error);
    }
  }
  
  createWindow();

  // --- Crear el icono de la bandeja del sistema ---
  const iconPath: string = path.join(__dirname, '..', 'build', 'icon.png');
  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Salir', type: 'normal', click: () => app.quit() }
    ]);

    tray.setToolTip('Asistente Gemini');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      toggleWindow();
    });
  } else {
    console.log('Icono de bandeja no encontrado en build/icon.png, la bandeja no será creada.');
  }
  // --- Fin de la lógica de la bandeja ---

  // Registra el atajo de teclado global 'Control+Space'
  globalShortcut.register('CommandOrControl+Space', () => {
    toggleWindow();
  });

  // Ocultar la ventana al inicio
  if (mainWindow) {
    mainWindow.hide();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Asegúrate de liberar el atajo cuando la aplicación se cierre
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  destroyStores(); // Limpiar stores
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Escucha la petición para ocultar la ventana desde el renderer
ipcMain.on('hide-window', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});

// Escucha la petición para redimensionar la ventana desde el renderer process
ipcMain.handle('resize-window', async (_event, { height: newHeight }: { height: number }) => {
    if (!mainWindow || typeof newHeight !== 'number') return;

    const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const newY: number = screenHeight - newHeight - 60;

    // La animación de Electron se usa para suavizar el redimensionamiento.
    mainWindow.setBounds({
        y: newY,
        height: Math.round(newHeight),
        width: INITIAL_WIDTH,
    }, true); // Animación básica
});

// --- IPC Handlers para Configuración ---
ipcMain.on('open-settings-window', () => {
    createSettingsWindow();
});

// Variables para las ventanas
let privacyWindow: BrowserWindow | null = null;

// Crear ventana de configuración de privacidad
function createPrivacyWindow(): void {
    console.log('createPrivacyWindow llamada, privacyWindow existe:', !!privacyWindow);
    
    if (privacyWindow) {
        console.log('Ventana de privacidad ya existe, enfocando...');
        privacyWindow.focus();
        return;
    }

    console.log('Creando nueva ventana de privacidad...');
    privacyWindow = new BrowserWindow({
        width: 900,
        height: 800,
        title: 'Configuración de Privacidad',
        center: true,
        frame: true,
        autoHideMenuBar: true,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    console.log('Attempting to load privacy-settings.html');
    privacyWindow.loadFile(path.join(app.getAppPath(), 'privacy-settings.html'));

    privacyWindow.on('closed', () => {
        console.log('Ventana de privacidad cerrada');
        privacyWindow = null;
    });
    
    privacyWindow.on('ready-to-show', () => {
        console.log('Ventana de privacidad lista para mostrar');
        privacyWindow?.show();
    });
}

ipcMain.on('open-privacy-window', () => {
    console.log('Recibido evento open-privacy-window');
    createPrivacyWindow();
});

// Cerrar ventana de configuración
ipcMain.on('close-settings-window', () => {
    console.log('Recibido evento close-settings-window');
    if (settingsWindow) {
        console.log('Cerrando ventana de configuración principal');
        settingsWindow.close();
    }
    if (privacyWindow) {
        console.log('Cerrando ventana de privacidad');
        privacyWindow.close();
    }
});

ipcMain.handle('get-api-key', async (): Promise<string> => {
    return configStore.getApiKey();
});

ipcMain.handle('save-api-key', async (_event, apiKey: string): Promise<{ success: boolean }> => {
    try {
        await configStore.setApiKey(apiKey);
        
        // Re-inicializa el SDK de Gemini con la nueva clave
        initializeGemini();
        
        return { success: true };
    } catch (error) {
        console.error('Error al guardar API key:', error);
        return { success: false };
    }
});

// Escucha las peticiones de la API desde el renderer process
ipcMain.handle('call-gemini-api', async (_event, { prompt, base64ImageData, history }: { 
    prompt: string; 
    base64ImageData?: string; 
    history?: any[] 
}): Promise<string> => {
    console.log("Recibida petición para la API de Gemini:", { prompt, image: !!base64ImageData, history_length: history?.length || 0 });
    
    // Marcar como procesando
    chatStore.setProcessing(true);
    
    if (!genAI) {
        chatStore.setProcessing(false);
        return "Error: La API Key de Gemini no ha sido configurada. Por favor, ve a la configuración y añade tu clave.";
    }

    try {
        // Obtener configuración del modelo
        const modelConfig = configStore.get('selectedModel');
        
        const model = genAI.getGenerativeModel({
            model: modelConfig || "gemini-2.5-flash",
            systemInstruction: "Responde siempre en español, de forma clara y concisa.",
        });

        // Usar historial del store si no se proporciona
        const chatHistory = history || chatStore.getApiHistory();
        const chat = model.startChat({ history: chatHistory });
        const messageParts: any[] = [prompt];

        if (base64ImageData) {
            messageParts.push(fileToGenerativePart(base64ImageData, "image/png"));
        }

        // Agregar mensaje del usuario al store
        await chatStore.addMessage(prompt, 'user', modelConfig);

        const result = await chat.sendMessage(messageParts);
        const response = await result.response;
        const responseText = response.text();

        // Agregar respuesta al store
        await chatStore.addMessage(responseText, 'assistant', modelConfig);
        
        chatStore.setProcessing(false);
        return responseText;

    } catch (error) {
        console.error("Error al llamar a la API de Gemini:", error);
        chatStore.setProcessing(false);
        
        const errorMessage = `Error: No se pudo obtener una respuesta de Gemini. ${error instanceof Error ? error.message : 'Error desconocido'}`;
        
        // Agregar error al historial si había un mensaje del usuario
        if (prompt) {
            const currentModel = configStore.get('selectedModel') || "gemini-2.5-flash";
            await chatStore.addMessage(errorMessage, 'assistant', currentModel);
        }
        
        return errorMessage;
    }
});

// --- Handlers adicionales para stores ---

// Obtener conversaciones
ipcMain.handle('get-conversations', async (): Promise<any[]> => {
    return chatStore.get('conversations');
});

// Crear nueva conversación
ipcMain.handle('new-conversation', async (): Promise<string> => {
    chatStore.clearCurrentConversation();
    return 'new';
});

// Obtener configuración completa
ipcMain.handle('get-config', async (): Promise<any> => {
    return configStore.getState();
});

// Obtener estado de UI
ipcMain.handle('get-ui-state', async (): Promise<any> => {
    return uiStore.getState();
});

// Actualizar tema
ipcMain.handle('set-theme', async (_event, theme: 'light' | 'dark' | 'system'): Promise<{ success: boolean }> => {
    try {
        await uiStore.setTheme(theme);
        return { success: true };
    } catch (error) {
        console.error('Error al cambiar tema:', error);
        return { success: false };
    }
});

// --- IPC Handlers para Conversaciones ---

// Obtener todas las conversaciones
ipcMain.handle('get-all-conversations', async (): Promise<any[]> => {
    return chatStore.getAllConversations();
});

// Cargar una conversación específica
ipcMain.handle('load-conversation', async (_event, conversationId: string): Promise<any> => {
    return chatStore.loadConversation(conversationId);
});

// Eliminar una conversación
ipcMain.handle('delete-conversation', async (_event, conversationId: string): Promise<void> => {
    chatStore.deleteConversation(conversationId);
});

// Buscar conversaciones
ipcMain.handle('search-conversations', async (_event, query: string): Promise<any[]> => {
    return chatStore.searchConversations(query);
});

// --- Handlers para funcionalidades de privacidad ---

// Activar/desactivar modo incógnito
ipcMain.handle('set-incognito-mode', async (_event, enabled: boolean): Promise<{ success: boolean }> => {
    try {
        await configStore.setIncognitoMode(enabled);
        
        if (enabled) {
            console.log('Modo incógnito activado - las conversaciones no se guardarán');
        } else {
            console.log('Modo incógnito desactivado - las conversaciones se guardarán normalmente');
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error al cambiar modo incógnito:', error);
        return { success: false };
    }
});

// Obtener configuración de privacidad
ipcMain.handle('get-privacy-settings', async (): Promise<any> => {
    return configStore.getPrivacySettings();
});

// Actualizar configuración de retención de datos
ipcMain.handle('set-data-retention', async (_event, days: number): Promise<{ success: boolean }> => {
    try {
        await configStore.setDataRetention(days);
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar retención de datos:', error);
        return { success: false };
    }
});

// Configurar limpieza automática
ipcMain.handle('set-auto-cleanup', async (_event, enabled: boolean, schedule?: 'daily' | 'weekly' | 'monthly'): Promise<{ success: boolean }> => {
    try {
        await configStore.setAutoCleanup(enabled, schedule);
        return { success: true };
    } catch (error) {
        console.error('Error al configurar limpieza automática:', error);
        return { success: false };
    }
});

// Ejecutar limpieza manual
ipcMain.handle('run-cleanup', async (): Promise<any> => {
    try {
        const result = await chatStore.smartCleanup();
        return { success: true, ...result };
    } catch (error) {
        console.error('Error al ejecutar limpieza:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
});

// Limpiar todos los datos
ipcMain.handle('clear-all-data', async (): Promise<{ success: boolean }> => {
    try {
        await chatStore.clearAllData();
        return { success: true };
    } catch (error) {
        console.error('Error al limpiar todos los datos:', error);
        return { success: false };
    }
});

// Obtener información de almacenamiento
ipcMain.handle('get-storage-info', async (): Promise<any> => {
    return chatStore.getStorageInfo();
});

// Exportar todos los datos
ipcMain.handle('export-all-data', async (): Promise<{ success: boolean; data?: string }> => {
    try {
        const data = await chatStore.exportAllData();
        return { success: true, data };
    } catch (error) {
        console.error('Error al exportar datos:', error);
        return { success: false };
    }
});
