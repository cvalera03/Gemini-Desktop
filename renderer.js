// Este script se ejecuta en la página HTML (el proceso de renderizado).
// Gestiona toda la interacción del usuario en la ventana.
document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a elementos del DOM ---
    const promptForm = document.getElementById('prompt-form');
    const promptInput = document.getElementById('prompt-input');
    const submitBtn = document.getElementById('submit-btn');
    const sendIcon = document.getElementById('send-icon');
    const loadingSpinner = document.getElementById('loading-spinner');
    const chatContainer = document.getElementById('chat-container');
    const dropZone = document.getElementById('drop-zone');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const closeBtn = document.getElementById('close-btn');
    const settingsBtn = document.getElementById('settings-btn'); // Botón de configuración
    const titleBar = document.getElementById('title-bar');
    const formContainer = document.getElementById('form-container');

    let imageData = null; // Almacenará la imagen en base64
    let isExpanded = false; // Controla si la ventana está expandida

    // --- Constantes de tamaño ---
    const INITIAL_HEIGHT = 80;
    const MAX_HEIGHT = 600;

    // --- Lógica para redimensionar la ventana ---
    function setWindowHeight(newHeight) {
        const clampedHeight = Math.max(INITIAL_HEIGHT, Math.min(newHeight, MAX_HEIGHT));
        window.api.resizeWindow({ height: clampedHeight });
    }

    function updateContentHeight() {
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
    const toggleExpand = (expand) => {
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
            formContainer.classList.add('items-center');
            setWindowHeight(INITIAL_HEIGHT);
        }
    };

    // --- Lógica de arrastrar y soltar ---
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZone.classList.remove('hidden');
        dropZone.classList.add('flex');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.add('hidden');
        dropZone.classList.remove('flex');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.add('hidden');
        dropZone.classList.remove('flex');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    imageData = reader.result.split(',')[1];
                    imagePreview.src = reader.result;
                    imagePreviewContainer.classList.remove('hidden');
                    promptInput.focus();
                    if (!isExpanded) {
                        toggleExpand(true);
                    }
                    updateContentHeight();
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // --- Lógica del formulario ---
    promptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const promptText = promptInput.value.trim();

        if (!promptText && !imageData) return;

        if (!isExpanded) {
            toggleExpand(true);
        }

        const submittedImageData = imageData;
        addMessage(promptText, 'user', imageData ? imagePreview.src : null);
        
        promptInput.value = '';
        resetImage();
        setLoading(true);

        try {
            const response = await window.api.callGemini(promptText, submittedImageData);
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
    
    // El botón de cerrar ahora limpia y contrae la ventana antes de ocultarla
    closeBtn.addEventListener('click', () => {
        toggleExpand(false);
        window.api.closeWindow();
    });

    // El botón de configuración abre la ventana de ajustes
    settingsBtn.addEventListener('click', () => {
        window.api.openSettingsWindow();
    });

    // --- Funciones auxiliares ---
    function resetImage() {
        imageData = null;
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        if(isExpanded) {
            updateContentHeight();
        }
    }

    function setLoading(isLoading) {
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

    function addMessage(text, sender, imgSrc = null, isError = false) {
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
    }
});
