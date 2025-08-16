// Este script se ejecuta en la página HTML (el proceso de renderizado).
// Gestiona toda la interacción del usuario en la ventana.

// Definir tipos para los elementos del DOM
interface DOMElements {
  promptForm: HTMLFormElement;
  promptInput: HTMLInputElement;
  submitBtn: HTMLButtonElement;
  sendIcon: HTMLElement;
  loadingSpinner: HTMLElement;
  chatContainer: HTMLElement;
  imagePreviewContainer: HTMLElement;
  imagePreview: HTMLImageElement;
  removeImageBtn: HTMLButtonElement;
  newChatBtn: HTMLButtonElement;
  settingsBtn: HTMLButtonElement;
  titleBar: HTMLElement;
  formContainer: HTMLElement;
}

// Definir tipos para el historial del chat
interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a elementos del DOM ---
    const promptForm = document.getElementById('prompt-form') as HTMLFormElement;
    const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    const sendIcon = document.getElementById('send-icon') as HTMLElement;
    const loadingSpinner = document.getElementById('loading-spinner') as HTMLElement;
    const chatContainer = document.getElementById('chat-container') as HTMLElement;
    const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLElement;
    const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
    const removeImageBtn = document.getElementById('remove-image-btn') as HTMLButtonElement;
    const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
    const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement; // Botón de configuración
    console.log('settingsBtn element:', settingsBtn); // <-- Added log
    const titleBar = document.getElementById('title-bar') as HTMLElement;
    const formContainer = document.getElementById('form-container') as HTMLElement;

    let imageData: string | undefined = undefined; // Almacenará la imagen en base64
    let isExpanded: boolean = false; // Controla si la ventana está expandida
    let chatHistory: ChatMessage[] = []; // Almacena el historial de la conversación actual

    // --- Constantes de tamaño ---
    const INITIAL_HEIGHT: number = 80;
    const MAX_HEIGHT: number = 600;

    // --- Lógica para redimensionar la ventana ---
    function setWindowHeight(newHeight: number): void {
        const clampedHeight = Math.max(INITIAL_HEIGHT, Math.min(newHeight, MAX_HEIGHT));
        window.api.resizeWindow({ height: clampedHeight });
    }

    function updateContentHeight(): void {
        requestAnimationFrame(() => {
            if (!isExpanded) return;

            const titleBarHeight = titleBar.offsetHeight;
            const chatContainerHeight = chatContainer.scrollHeight;
            const formContainerHeight = formContainer.offsetHeight;
            
            const newHeight = titleBarHeight + chatContainerHeight + formContainerHeight;
            
            setWindowHeight(newHeight);
        });
    }

    // --- Lógica para expandir/contraer la ventana ---
    const toggleExpand = (expand: boolean): void => {
        if (isExpanded === expand) return;
        isExpanded = expand;
        
        if (expand) {
            titleBar.classList.remove('hidden');
            titleBar.classList.add('flex');
            chatContainer.classList.remove('hidden');
            formContainer.classList.remove('items-center');
        } else {
            titleBar.classList.add('hidden');
            chatContainer.classList.add('hidden');
            chatContainer.innerHTML = '';
            chatHistory = []; // Limpia el historial
            formContainer.classList.add('items-center');
            setWindowHeight(INITIAL_HEIGHT);
        }
    };

    // --- Lógica para pegar imágenes ---
    document.addEventListener('paste', (event: ClipboardEvent) => {
        const items = (event.clipboardData || (event as any).originalEvent?.clipboardData)?.items;
        if (!items) return;
        
        let imageFile: File | null = null;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                imageFile = item.getAsFile();
                break;
            }
        }

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                const dataUrl = e.target?.result as string;
                imageData = dataUrl.split(',')[1];
                imagePreview.src = dataUrl;
                imagePreviewContainer.classList.remove('hidden');
                promptInput.focus();

                if (!isExpanded) {
                    toggleExpand(true);
                }
                updateContentHeight();
            };
            reader.readAsDataURL(imageFile);
        }
    });

    // --- Atajo de teclado para nueva conversación (Ctrl+T) ---
    document.addEventListener('keydown', (event: KeyboardEvent) => {
        // Solo si la ventana está expandida y visible
        if (event.ctrlKey && event.key === 't' && isExpanded) {
            event.preventDefault(); // Evita el comportamiento por defecto del navegador (ej. abrir nueva pestaña)
            toggleExpand(false); // Limpia y contrae la conversación
        }
    });

    // --- Lógica del formulario ---
    promptForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const promptText = promptInput.value.trim();

        if (!promptText && !imageData) return;

        if (!isExpanded) {
            toggleExpand(true);
        }

        const submittedImageData = imageData;
        const historyForApi = [...chatHistory]; // Copia el historial ANTES de añadir el nuevo mensaje

        addMessage(promptText, 'user', imageData ? imagePreview.src : null);
        
        promptInput.value = '';
        resetImage();
        setLoading(true);

        try {
            const response = await window.api.callGemini(promptText, submittedImageData || undefined, historyForApi);
            addMessage(response, 'gemini');
        } catch (error) {
            console.error('Error:', error);
            addMessage('Hubo un error al contactar con la IA.', 'gemini', null, true);
        } finally {
            setLoading(false);
        }
    });

    // Botón para quitar la imagen seleccionada
    removeImageBtn.addEventListener('click', resetImage);
    
    // El botón de nueva conversación limpia y contrae la ventana
    newChatBtn.addEventListener('click', () => {
        toggleExpand(false);
    });

    // El botón de configuración abre la ventana de ajustes
    settingsBtn.addEventListener('click', () => {
        console.log('Settings button clicked in renderer.js'); // <-- Added log
        window.api.openSettingsWindow();
    });

    // --- Funciones auxiliares ---
    function resetImage(): void {
        imageData = undefined;
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        if(isExpanded) {
            updateContentHeight();
        }
    }

    function setLoading(isLoading: boolean): void {
        if (isLoading) {
            sendIcon.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
            submitBtn.disabled = true;
            promptInput.disabled = true;
        } else {
            sendIcon.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
            submitBtn.disabled = false;
            promptInput.disabled = false;
            promptInput.focus();
        }
    }

    function addMessage(text: string, sender: 'user' | 'gemini', imgSrc: string | null = null, isError: boolean = false): void {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `flex mb-4 ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `rounded-lg p-3 max-w-xs md:max-w-md shadow-md ${
            sender === 'user' 
            ? 'bg-blue-600 text-white' 
            : isError ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-800'
        }`;
        
        if (imgSrc) {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = 'rounded-md mb-2 h-32 w-auto object-cover';
            messageBubble.appendChild(img);
        }
        
        if (text) {
            const textElement = document.createElement('p');
            textElement.textContent = text;
            messageBubble.appendChild(textElement);
        }

        messageWrapper.appendChild(messageBubble);
        chatContainer.appendChild(messageWrapper);

        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Actualiza la altura después de añadir el mensaje
        updateContentHeight();

        // Añade el mensaje al historial para el contexto
        if (sender === 'user') {
            chatHistory.push({ role: 'user', parts: [{ text }] });
        } else if (sender === 'gemini' && !isError) {
            chatHistory.push({ role: 'model', parts: [{ text }] });
        }
    }
});
