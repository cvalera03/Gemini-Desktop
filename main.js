// Importa los módulos necesarios
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
require('dotenv').config(); // Carga las variables de entorno desde .env
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Inicialización de la API de Gemini ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Escucha las peticiones de la API desde el renderer process
ipcMain.handle('call-gemini-api', async (event, { prompt, base64ImageData }) => {
    console.log("Recibida petición para la API de Gemini:", { prompt, image: base64ImageData ? 'Sí' : 'No' });
    
    try {
        if (base64ImageData) {
            // --- Lógica para peticiones con imagen (Gemini Pro Vision) ---
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const imageParts = [
                fileToGenerativePart(base64ImageData, "image/png"), // Asumimos PNG, se podría mejorar para detectar el tipo
            ];

            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = response.text();
            return text;

        } else {
            // --- Lógica para peticiones solo de texto (Gemini Pro) ---
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;
        }

    } catch (error) {
        console.error("Error al llamar a la API de Gemini:", error);
        // Devuelve un mensaje de error claro a la interfaz
        return `Error: No se pudo obtener una respuesta de Gemini. Revisa la consola para más detalles.`;
    }
});
