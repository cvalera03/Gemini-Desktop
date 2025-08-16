// Importa los módulos necesarios
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Carga las variables de entorno desde .env
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gestión de la configuración y API Key ---
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
let genAI;

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            return config;
        }
    } catch (error) {
        console.error('Error al leer el archivo de configuración:', error);
    }
    return {};
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error al guardar el archivo de configuración:', error);
    }
}

function initializeGemini() {
    const config = loadConfig();
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

    if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
        console.log("SDK de Gemini inicializado.");
    } else {
        console.error("La API Key de Gemini no está configurada. Por favor, guárdala en la configuración.");
        // Podríamos mostrar un diálogo de error aquí si fuera necesario
    }
}

// --- Fin de la gestión de configuración ---

// Función para convertir datos de imagen de Base64 a un formato que Gemini entiende
function fileToGenerativePart(base64, mimeType) {
  return {
    inlineData: {
      data: base64,
      mimeType
    },
  };
}

let mainWindow;
let settingsWindow; // Referencia a la ventana de configuración

// --- Función para crear la ventana de configuración ---
function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 450,
        height: 250,
        title: 'Configuración',
        parent: mainWindow,
        modal: true,
        frame: true,
        autoHideMenuBar: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    settingsWindow.loadFile('settings.html');

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// --- Nuevas constantes para el tamaño de la ventana ---
const INITIAL_WIDTH = 700; // Ancho de la ventana
const INITIAL_HEIGHT = 80; // Alto inicial (solo para el input)

function createWindow() {
  // Obtiene las dimensiones de la pantalla principal
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Posición inicial: centrada horizontalmente y cerca de la parte inferior
  const x = Math.round((width - INITIAL_WIDTH) / 2);
  const y = height - INITIAL_HEIGHT - 60; // 60px de margen desde abajo

  mainWindow = new BrowserWindow({
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    x: x,
    y: y,
    frame: false,       // Sin bordes
    vibrancy: 'mica',   // Efecto de fondo para Windows 11 (o 'acrylic' para W10)
    alwaysOnTop: true,  // Siempre visible
    resizable: false,   // No permitimos redimensionar manualmente
    skipTaskbar: true,  // No mostrar en la barra de tareas
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile('index.html');

  // Cuando la ventana pierde el foco, simplemente la ocultamos
  mainWindow.on('blur', () => {
    if (mainWindow && mainWindow.isVisible()) {
        mainWindow.hide();
    }
  });
}

// Función para mostrar/ocultar la ventana
function toggleWindow() {
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        mainWindow.show();
        mainWindow.focus();
    }
}

app.whenReady().then(() => {
  initializeGemini(); // Inicializa Gemini al arrancar
  createWindow();

  // Registra el atajo de teclado global 'Control+Space'
  const ret = globalShortcut.register('CommandOrControl+Space', () => {
    toggleWindow();
  });

  if (!ret) {
    console.log('No se pudo registrar el atajo de teclado');
  }

  // Ocultar la ventana al inicio
  mainWindow.hide();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Asegúrate de liberar el atajo cuando la aplicación se cierre
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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
ipcMain.handle('resize-window', async (event, { height: newHeight }) => {
    if (!mainWindow || typeof newHeight !== 'number') return;

    const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const newY = screenHeight - newHeight - 60;

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

ipcMain.handle('get-api-key', async () => {
    const config = loadConfig();
    return config.apiKey || '';
});

ipcMain.handle('save-api-key', async (event, apiKey) => {
    const config = loadConfig();
    config.apiKey = apiKey;
    saveConfig(config);

    // Re-inicializa el SDK de Gemini con la nueva clave
    initializeGemini();

    return { success: true };
});


// Escucha las peticiones de la API desde el renderer process
ipcMain.handle('call-gemini-api', async (event, { prompt, base64ImageData }) => {
    console.log("Recibida petición para la API de Gemini:", { prompt, image: base64ImageData ? 'Sí' : 'No' });
    
    // Verifica si el SDK está inicializado
    if (!genAI) {
        return "Error: La API Key de Gemini no ha sido configurada. Por favor, ve a la configuración y añade tu clave.";
    }

    try {
        const modelName = base64ImageData ? "gemini-pro-vision" : "gemini-pro";
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        if (base64ImageData) {
            // --- Lógica para peticiones con imagen ---
            const imageParts = [
                fileToGenerativePart(base64ImageData, "image/png"),
            ];
            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            return response.text();
        } else {
            // --- Lógica para peticiones solo de texto ---
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }

    } catch (error) {
        console.error("Error al llamar a la API de Gemini:", error);
        return `Error: No se pudo obtener una respuesta de Gemini. Revisa la consola para más detalles.`;
    }
});
