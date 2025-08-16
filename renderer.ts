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
  historyBtn: HTMLButtonElement;
  settingsBtn: HTMLButtonElement;
  titleBar: HTMLElement;
  formContainer: HTMLElement;
  historyModal: HTMLElement;
  conversationsList: HTMLElement;
  searchConversations: HTMLInputElement;
  closeHistoryModal: HTMLButtonElement;
  clearAllConversations: HTMLButtonElement;
  exportConversations: HTMLButtonElement;
  conversationCount: HTMLElement;
  noConversations: HTMLElement;
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
    const historyBtn = document.getElementById('history-btn') as HTMLButtonElement;
    const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement; // Botón de configuración
    console.log('settingsBtn element:', settingsBtn); // <-- Added log
    const titleBar = document.getElementById('title-bar') as HTMLElement;
    const formContainer = document.getElementById('form-container') as HTMLElement;
    
    // Elementos del modal de historial
    const historyModal = document.getElementById('history-modal') as HTMLElement;
    const conversationsList = document.getElementById('conversations-list') as HTMLElement;
    const searchConversations = document.getElementById('search-conversations') as HTMLInputElement;
    const closeHistoryModal = document.getElementById('close-history-modal') as HTMLButtonElement;
    const clearAllConversations = document.getElementById('clear-all-conversations') as HTMLButtonElement;
    const exportConversations = document.getElementById('export-conversations') as HTMLButtonElement;
    const conversationCount = document.getElementById('conversation-count') as HTMLElement;
    const noConversations = document.getElementById('no-conversations') as HTMLElement;

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

    // --- Funciones de historial de conversaciones ---
    
    // Mostrar modal de historial
    async function showHistoryModal(): Promise<void> {
        try {
            // Expandir la ventana para mostrar el modal correctamente
            if (!isExpanded) {
                toggleExpand(true);
            }
            
            // Redimensionar a un tamaño adecuado para el modal (más grande)
            const MODAL_HEIGHT = 600; // Altura suficiente para el modal
            window.api.resizeWindow({ height: MODAL_HEIGHT });
            
            historyModal.classList.remove('hidden');
            historyModal.classList.add('flex');
            await loadConversationsHistory();
        } catch (error) {
            console.error('Error al mostrar historial:', error);
        }
    }

    // Ocultar modal de historial
    function hideHistoryModal(): void {
        historyModal.classList.add('hidden');
        historyModal.classList.remove('flex');
        searchConversations.value = '';
        
        // Restaurar el tamaño de la ventana basado en el contenido del chat
        if (chatContainer.children.length > 0) {
            // Si hay mensajes, mantener la ventana expandida pero ajustar altura
            updateContentHeight();
        } else {
            // Si no hay mensajes, colapsar a tamaño inicial
            toggleExpand(false);
        }
    }

    // Cargar historial de conversaciones
    async function loadConversationsHistory(query?: string): Promise<void> {
        try {
            let conversations: any[];
            
            if (query && query.trim()) {
                conversations = await window.api.searchConversations(query);
            } else {
                conversations = await window.api.getAllConversations();
            }

            displayConversations(conversations);
            updateConversationCount(conversations.length);
            
        } catch (error) {
            console.error('Error al cargar conversaciones:', error);
            displayError('Error al cargar el historial de conversaciones');
        }
    }

    // Mostrar conversaciones en la lista
    function displayConversations(conversations: any[]): void {
        if (conversations.length === 0) {
            conversationsList.innerHTML = '';
            noConversations.classList.remove('hidden');
            return;
        }

        noConversations.classList.add('hidden');
        
        conversationsList.innerHTML = conversations.map(conv => `
            <div class="conversation-item bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 cursor-pointer transition-colors" data-conversation-id="${conv.id}">
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-gray-900 truncate">${conv.title}</h3>
                        <p class="text-sm text-gray-500 mt-1 line-clamp-2">${conv.lastMessage || 'Sin mensajes'}</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>${formatDate(new Date(conv.updatedAt))}</span>
                            <span>${conv.messageCount} mensajes</span>
                            <span class="text-indigo-500">${conv.model || 'gemini-pro'}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                        <button class="load-conversation p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Cargar conversación">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
                                <line x1="8" y1="1" x2="8" y2="4"/>
                                <line x1="16" y1="1" x2="16" y2="4"/>
                            </svg>
                        </button>
                        <button class="delete-conversation p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar conversación">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners a los botones
        conversationsList.querySelectorAll('.load-conversation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const conversationId = (btn.closest('.conversation-item') as HTMLElement)?.dataset['conversationId'];
                if (conversationId) {
                    loadConversationById(conversationId);
                }
            });
        });

        conversationsList.querySelectorAll('.delete-conversation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const conversationId = (btn.closest('.conversation-item') as HTMLElement)?.dataset['conversationId'];
                if (conversationId) {
                    deleteConversationById(conversationId);
                }
            });
        });

        // Hacer clic en la conversación también la carga
        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = (item as HTMLElement).dataset['conversationId'];
                if (conversationId) {
                    loadConversationById(conversationId);
                }
            });
        });
    }

    // Cargar conversación por ID
    async function loadConversationById(conversationId: string): Promise<void> {
        try {
            const conversation = await window.api.loadConversation(conversationId);
            
            if (conversation && conversation.messages) {
                // Limpiar chat actual
                chatContainer.innerHTML = '';
                chatHistory = [];
                
                // Cargar mensajes de la conversación
                conversation.messages.forEach((message: any) => {
                    if (message.role === 'user') {
                        const text = message.content || message.parts?.[0]?.text || '';
                        addMessage(text, 'user');
                        chatHistory.push({ role: 'user', parts: [{ text }] });
                    } else if (message.role === 'model' || message.role === 'assistant') {
                        const text = message.content || message.parts?.[0]?.text || '';
                        addMessage(text, 'gemini');
                        chatHistory.push({ role: 'model', parts: [{ text }] });
                    }
                });
                
                // Expandir ventana si hay mensajes
                if (conversation.messages.length > 0) {
                    toggleExpand(true);
                }
                
                hideHistoryModal();
            } else {
                displayError('No se pudo cargar la conversación');
            }
        } catch (error) {
            console.error('Error al cargar conversación:', error);
            displayError(`Error al cargar la conversación: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Eliminar conversación por ID
    async function deleteConversationById(conversationId: string): Promise<void> {
        if (confirm('¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.')) {
            try {
                await window.api.deleteConversation(conversationId);
                await loadConversationsHistory(); // Recargar lista
                console.log('Conversación eliminada exitosamente');
            } catch (error) {
                console.error('Error al eliminar conversación:', error);
                displayError('Error al eliminar la conversación');
            }
        }
    }

    // Formatear fecha
    function formatDate(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return 'Hoy ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Ayer ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (days < 7) {
            return `Hace ${days} días`;
        } else {
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }
    }

    // Actualizar contador de conversaciones
    function updateConversationCount(count: number): void {
        conversationCount.textContent = `${count} conversación${count !== 1 ? 'es' : ''}`;
    }

    // Mostrar error
    function displayError(message: string): void {
        // Crear elemento de error temporal
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.textContent = message;
        
        conversationsList.insertBefore(errorDiv, conversationsList.firstChild);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Event listeners para el historial
    historyBtn.addEventListener('click', showHistoryModal);
    closeHistoryModal.addEventListener('click', hideHistoryModal);
    
    // Cerrar modal al hacer clic fuera
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            hideHistoryModal();
        }
    });

    // Búsqueda en tiempo real
    let searchTimeout: number;
    searchConversations.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
            loadConversationsHistory(searchConversations.value);
        }, 300);
    });

    // Limpiar todas las conversaciones
    clearAllConversations.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres eliminar TODAS las conversaciones? Esta acción no se puede deshacer.')) {
            try {
                const result = await window.api.clearAllData();
                if (result.success) {
                    await loadConversationsHistory(); // Recargar lista
                    chatContainer.innerHTML = '';
                    chatHistory = [];
                    toggleExpand(false);
                    console.log('Todas las conversaciones eliminadas exitosamente');
                } else {
                    displayError('Error al eliminar las conversaciones');
                }
            } catch (error) {
                console.error('Error al limpiar conversaciones:', error);
                displayError('Error al eliminar las conversaciones');
            }
        }
    });

    // Exportar conversaciones
    exportConversations.addEventListener('click', async () => {
        try {
            const result = await window.api.exportAllData();
            if (result.success && result.data) {
                // Crear y descargar archivo JSON
                const blob = new Blob([result.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gemini-conversations-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('Conversaciones exportadas exitosamente');
            } else {
                displayError('Error al exportar las conversaciones');
            }
        } catch (error) {
            console.error('Error al exportar conversaciones:', error);
            displayError('Error al exportar las conversaciones');
        }
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
