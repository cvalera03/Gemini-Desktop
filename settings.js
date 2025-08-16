document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key-input');
    const saveBtn = document.getElementById('save-btn');
    const feedbackMessage = document.getElementById('feedback-message');

    // Al cargar la ventana, pide la clave actual al proceso principal y la muestra
    async function loadApiKey() {
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

    // Carga la clave cuando la página esté lista
    loadApiKey();
});
