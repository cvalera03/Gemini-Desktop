# Asistente de Escritorio Gemini

<p align="center">
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
</p>

<p align="center">
  Un asistente de escritorio flotante para interactuar con la API de Google Gemini, construido con Electron.
</p>

---

## ✨ Características

- **Ventana Flotante:** Accede a Gemini rápidamente a través de una pequeña ventana que está siempre encima de las demás.
- **Atajo Global:** Muestra u oculta la ventana instantáneamente con el atajo `Ctrl+Space`. Ahora también puedes iniciar una nueva conversación rápidamente con `Ctrl+T` cuando la ventana está visible.
- **Interfaz Adaptable:** La ventana cambia de tamaño para ajustarse al contenido de la conversación.
- **Soporte Multimedia:** Envía consultas de texto o pega imágenes directamente en el campo de texto para realizar consultas visuales.
- **Historial de Conversación:** La aplicación recuerda el contexto de la conversación actual.
- **Instrucción de Sistema:** Configurado para que Gemini responda siempre en español.
- **Icono en Bandeja del Sistema:** La aplicación permanece en la bandeja del sistema con un menú para salir completamente.
- **Configuración Sencilla:** Configura tu API Key de Gemini a través de una ventana de ajustes.
- **Gestión de Chat:** Inicia una nueva conversación en cualquier momento con el botón de limpiar chat.

## 🚀 Instalación y Uso (Desarrollo)

Sigue estos pasos para ejecutar la aplicación en tu entorno de desarrollo.

1.  **Clonar el repositorio (si aplica):**
    ```bash
    git clone <url-del-repositorio>
    cd <nombre-del-directorio>
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar API Key (Opcional para desarrollo):**
    -   Crea un archivo llamado `.env` en la raíz del proyecto.
    -   Añade tu API Key de Google Gemini de la siguiente manera:
        ```
        GEMINI_API_KEY=TU_API_KEY_AQUI
        ```

4.  **Ejecutar la aplicación:**
    ```bash
    npm start
    ```

## 📦 Compilación

Para empaquetar la aplicación en un archivo `.exe` para Windows, puedes usar el script de compilación configurado.

1.  **Añadir un icono (Recomendado):**
    -   Crea una carpeta llamada `build` en la raíz del proyecto.
    -   Coloca un icono en formato `.ico` (para el `.exe`) y `.png` (para la bandeja del sistema) dentro de la carpeta `build`.
        -   `build/icon.ico` (usado para el ejecutable)
        -   `build/icon.png` (usado para la bandeja del sistema)

2.  **Ejecutar el script de compilación:**
    ```bash
    npm run build
    ```
    > **Nota:** En Windows, puede que necesites ejecutar este comando en una terminal con **privilegios de administrador** para evitar errores relacionados con la creación de enlaces simbólicos.

3.  **Encontrar el instalador:**
    -   Una vez finalizada la compilación, encontrarás el instalador del programa (ej. `Gemini Assistant Setup 1.0.0.exe`) en la nueva carpeta `dist`.

## ⚙️ Configuración

Una vez instalada la aplicación, puedes (y debes) configurar tu propia API Key de Gemini:

1.  Abre la aplicación.
2.  Haz clic en el icono de engranaje (⚙️) al lado del campo de texto.
3.  Introduce tu API Key en la ventana de configuración y haz clic en "Guardar".

La clave se guardará de forma segura en la carpeta de datos de la aplicación de tu sistema operativo.
