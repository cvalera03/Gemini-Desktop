document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
    const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    const privacyBtn = document.getElementById('privacy-btn') as HTMLButtonElement;
    const feedbackMessage = document.getElementById('feedback-message') as HTMLElement;

    // Al cargar la ventana, pide la clave actual al proceso principal y la muestra
    async function loadApiKey(): Promise<void> {
        try {
            const apiKey = await window.api.getApiKey();
            if (apiKey) {
                apiKeyInput.value = apiKey;
            }
        } catch (error) {
            console.error('Error al cargar la API Key:', error);
            feedbackMessage.textContent = 'Error al cargar la clave.';
            feedbackMessage.classList.add('text-red-500');
        }
    }

    saveBtn.addEventListener('click', async () => {
        const newApiKey = apiKeyInput.value.trim();
        if (!newApiKey) {
            feedbackMessage.textContent = 'Por favor, introduce una clave.';
            feedbackMessage.classList.add('text-red-500');
            return;
        }

        try {
            await window.api.saveApiKey(newApiKey);
            feedbackMessage.textContent = '¡Clave guardada correctamente!';
            feedbackMessage.classList.remove('text-red-500');
            feedbackMessage.classList.add('text-green-600');

            // Cierra la ventana después de 1.5 segundos
            setTimeout(() => {
                window.close();
            }, 1500);

        } catch (error) {
            console.error('Error al guardar la API Key:', error);
            feedbackMessage.textContent = 'Error al guardar la clave.';
            feedbackMessage.classList.add('text-red-500');
        }
    });

    // Botón de privacidad con debounce
    let privacyButtonTimeout: number | null = null;
    
    privacyBtn.addEventListener('click', () => {
        console.log('Botón de privacidad clickeado');
        
        // Evitar múltiples clics
        if (privacyButtonTimeout) {
            console.log('Botón de privacidad en cooldown, ignorando clic');
            return;
        }
        
        console.log('window.api disponible:', !!window.api);
        console.log('openPrivacyWindow disponible:', !!window.api?.openPrivacyWindow);
        
        try {
            // Deshabilitar botón temporalmente
            privacyBtn.disabled = true;
            privacyBtn.textContent = 'Abriendo...';
            
            // Abrir ventana de configuración de privacidad como ventana de Electron
            window.api.openPrivacyWindow();
            console.log('openPrivacyWindow llamado exitosamente');
            
            // Cooldown de 2 segundos
            privacyButtonTimeout = window.setTimeout(() => {
                privacyBtn.disabled = false;
                privacyBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Privacidad
                `;
                privacyButtonTimeout = null;
            }, 2000);
            
        } catch (error) {
            console.error('Error al abrir ventana de privacidad:', error);
            feedbackMessage.textContent = 'Error al abrir configuración de privacidad';
            feedbackMessage.classList.add('text-red-500');
            
            // Restaurar botón en caso de error
            privacyBtn.disabled = false;
            privacyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Privacidad
            `;
            if (privacyButtonTimeout) {
                clearTimeout(privacyButtonTimeout);
                privacyButtonTimeout = null;
            }
        }
    });

    // Carga la clave cuando la página esté lista
    loadApiKey();
});
