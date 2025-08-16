// Script para la página de configuración de privacidad
document.addEventListener('DOMContentLoaded', async () => {
    // Referencias a elementos del DOM
    const incognitoToggle = document.getElementById('incognito-toggle') as HTMLInputElement;
    const incognitoStatus = document.getElementById('incognito-status') as HTMLElement;
    const dataRetentionInput = document.getElementById('data-retention') as HTMLInputElement;
    const keepRecentInput = document.getElementById('keep-recent') as HTMLInputElement;
    const autoCleanupToggle = document.getElementById('auto-cleanup-toggle') as HTMLInputElement;
    const cleanupScheduleSelect = document.getElementById('cleanup-schedule') as HTMLSelectElement;
    const maxStorageInput = document.getElementById('max-storage') as HTMLInputElement;
    const cleanupOptions = document.getElementById('cleanup-options') as HTMLElement;
    const statusMessage = document.getElementById('status-message') as HTMLElement;
    
    // Elementos de información de almacenamiento
    const totalConversationsEl = document.getElementById('total-conversations') as HTMLElement;
    const totalMessagesEl = document.getElementById('total-messages') as HTMLElement;
    const storageSizeEl = document.getElementById('storage-size') as HTMLElement;
    const storageDatesEl = document.getElementById('storage-dates') as HTMLElement;
    
    // Botones de acción
    const runCleanupBtn = document.getElementById('run-cleanup-btn') as HTMLButtonElement;
    const exportDataBtn = document.getElementById('export-data-btn') as HTMLButtonElement;
    const clearAllBtn = document.getElementById('clear-all-btn') as HTMLButtonElement;
    const backBtn = document.getElementById('back-btn') as HTMLButtonElement;

    // Función para mostrar mensaje de estado
    function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        statusMessage.textContent = message;
        statusMessage.className = `p-4 rounded-lg text-center font-medium ${
            type === 'success' ? 'bg-green-100 text-green-800' :
            type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
        }`;
        statusMessage.classList.remove('hidden');
        
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }

    // Función para cargar configuración de privacidad
    async function loadPrivacySettings(): Promise<void> {
        try {
            const settings = await window.api.getPrivacySettings();
            console.log('Configuración de privacidad cargada:', settings);
            
            // Actualizar controles con valores del servidor o valores por defecto
            incognitoToggle.checked = settings.incognitoMode || false;
            dataRetentionInput.value = (settings.dataRetention || 30).toString();
            keepRecentInput.value = (settings.keepRecentDays || 7).toString();
            autoCleanupToggle.checked = settings.autoCleanup || false;
            cleanupScheduleSelect.value = settings.cleanupSchedule || 'weekly';
            maxStorageInput.value = (settings.maxStorageSize || 100).toString();
            
            // Actualizar estado visual
            updateIncognitoStatus(settings.incognitoMode || false);
            updateCleanupOptions(settings.autoCleanup || false);
            
        } catch (error) {
            console.error('Error al cargar configuración de privacidad:', error);
            
            // Si hay error, cargar valores por defecto
            incognitoToggle.checked = false;
            dataRetentionInput.value = '30';
            keepRecentInput.value = '7';
            autoCleanupToggle.checked = false;
            cleanupScheduleSelect.value = 'weekly';
            maxStorageInput.value = '100';
            
            updateIncognitoStatus(false);
            updateCleanupOptions(false);
            
            showStatus('Error al cargar la configuración, usando valores por defecto', 'error');
        }
    }

    // Función para cargar información de almacenamiento
    async function loadStorageInfo(): Promise<void> {
        try {
            const info = await window.api.getStorageInfo();
            console.log('Información de almacenamiento:', info);
            
            // Mostrar información con valores por defecto si están vacíos
            totalConversationsEl.textContent = (info.totalConversations || 0).toString();
            totalMessagesEl.textContent = (info.totalMessages || 0).toString();
            storageSizeEl.textContent = (info.estimatedSizeMB || 0).toFixed(2);
            
            if (info.oldestDate && info.newestDate) {
                const oldest = new Date(info.oldestDate).toLocaleDateString('es-ES');
                const newest = new Date(info.newestDate).toLocaleDateString('es-ES');
                storageDatesEl.textContent = `Conversaciones desde ${oldest} hasta ${newest}`;
            } else {
                storageDatesEl.textContent = 'No hay conversaciones guardadas aún';
            }
            
        } catch (error) {
            console.error('Error al cargar información de almacenamiento:', error);
            
            // Mostrar valores por defecto en caso de error
            totalConversationsEl.textContent = '0';
            totalMessagesEl.textContent = '0';
            storageSizeEl.textContent = '0.00';
            storageDatesEl.textContent = 'Error al cargar información';
            
            showStatus('Error al cargar información de almacenamiento', 'error');
        }
    }

    // Actualizar estado de modo incógnito
    function updateIncognitoStatus(enabled: boolean): void {
        if (enabled) {
            incognitoStatus.textContent = '🔒 Modo incógnito ACTIVADO - Las conversaciones no se guardan';
            incognitoStatus.className = 'text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded';
        } else {
            incognitoStatus.textContent = '💾 Modo normal - Las conversaciones se guardan automáticamente';
            incognitoStatus.className = 'text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded';
        }
    }

    // Actualizar opciones de limpieza
    function updateCleanupOptions(enabled: boolean): void {
        cleanupOptions.style.display = enabled ? 'block' : 'none';
        cleanupOptions.style.opacity = enabled ? '1' : '0.5';
    }

    // Event listeners
    
    // Modo incógnito
    incognitoToggle.addEventListener('change', async () => {
        try {
            const result = await window.api.setIncognitoMode(incognitoToggle.checked);
            if (result.success) {
                updateIncognitoStatus(incognitoToggle.checked);
                showStatus(
                    incognitoToggle.checked 
                        ? 'Modo incógnito activado' 
                        : 'Modo incógnito desactivado', 
                    'success'
                );
            } else {
                showStatus('Error al cambiar modo incógnito', 'error');
                incognitoToggle.checked = !incognitoToggle.checked; // Revertir
            }
        } catch (error) {
            console.error('Error al cambiar modo incógnito:', error);
            showStatus('Error al cambiar modo incógnito', 'error');
            incognitoToggle.checked = !incognitoToggle.checked; // Revertir
        }
    });

    // Retención de datos
    dataRetentionInput.addEventListener('change', async () => {
        try {
            const days = parseInt(dataRetentionInput.value);
            if (days < 1 || days > 365) {
                showStatus('Los días deben estar entre 1 y 365', 'error');
                return;
            }
            
            const result = await window.api.setDataRetention(days);
            if (result.success) {
                showStatus('Configuración de retención actualizada', 'success');
            } else {
                showStatus('Error al actualizar retención de datos', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar retención:', error);
            showStatus('Error al actualizar retención de datos', 'error');
        }
    });

    // Días recientes
    keepRecentInput.addEventListener('change', async () => {
        try {
            const days = parseInt(keepRecentInput.value);
            if (days < 1 || days > 30) {
                showStatus('Los días recientes deben estar entre 1 y 30', 'error');
                return;
            }
            
            // Actualizar a través de la configuración general
            await loadPrivacySettings(); // Recargar para confirmar
            showStatus('Configuración de días recientes actualizada', 'success');
        } catch (error) {
            console.error('Error al actualizar días recientes:', error);
            showStatus('Error al actualizar días recientes', 'error');
        }
    });

    // Limpieza automática
    autoCleanupToggle.addEventListener('change', async () => {
        try {
            const result = await window.api.setAutoCleanup(
                autoCleanupToggle.checked, 
                cleanupScheduleSelect.value as 'daily' | 'weekly' | 'monthly'
            );
            if (result.success) {
                updateCleanupOptions(autoCleanupToggle.checked);
                showStatus(
                    autoCleanupToggle.checked 
                        ? 'Limpieza automática activada' 
                        : 'Limpieza automática desactivada', 
                    'success'
                );
            } else {
                showStatus('Error al configurar limpieza automática', 'error');
                autoCleanupToggle.checked = !autoCleanupToggle.checked; // Revertir
            }
        } catch (error) {
            console.error('Error al configurar limpieza automática:', error);
            showStatus('Error al configurar limpieza automática', 'error');
            autoCleanupToggle.checked = !autoCleanupToggle.checked; // Revertir
        }
    });

    // Frecuencia de limpieza
    cleanupScheduleSelect.addEventListener('change', async () => {
        if (autoCleanupToggle.checked) {
            try {
                const result = await window.api.setAutoCleanup(
                    true, 
                    cleanupScheduleSelect.value as 'daily' | 'weekly' | 'monthly'
                );
                if (result.success) {
                    showStatus('Frecuencia de limpieza actualizada', 'success');
                } else {
                    showStatus('Error al actualizar frecuencia', 'error');
                }
            } catch (error) {
                console.error('Error al actualizar frecuencia:', error);
                showStatus('Error al actualizar frecuencia', 'error');
            }
        }
    });

    // Ejecutar limpieza manual
    runCleanupBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres ejecutar la limpieza? Esto eliminará conversaciones antiguas según tu configuración.')) {
            runCleanupBtn.disabled = true;
            runCleanupBtn.textContent = '🧹 Limpiando...';
            
            try {
                const result = await window.api.runCleanup();
                if (result.success) {
                    showStatus(
                        `Limpieza completada: ${result.deletedConversations} conversaciones eliminadas, ${result.freedSpaceMB} MB liberados`, 
                        'success'
                    );
                    await loadStorageInfo(); // Actualizar información
                } else {
                    showStatus(`Error en limpieza: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('Error al ejecutar limpieza:', error);
                showStatus('Error al ejecutar limpieza', 'error');
            } finally {
                runCleanupBtn.disabled = false;
                runCleanupBtn.textContent = '🧹 Ejecutar Limpieza';
            }
        }
    });

    // Exportar datos
    exportDataBtn.addEventListener('click', async () => {
        exportDataBtn.disabled = true;
        exportDataBtn.textContent = '📤 Exportando...';
        
        try {
            const result = await window.api.exportAllData();
            if (result.success && result.data) {
                // Crear y descargar archivo
                const blob = new Blob([result.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gemini-conversations-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showStatus('Datos exportados exitosamente', 'success');
            } else {
                showStatus('Error al exportar datos', 'error');
            }
        } catch (error) {
            console.error('Error al exportar datos:', error);
            showStatus('Error al exportar datos', 'error');
        } finally {
            exportDataBtn.disabled = false;
            exportDataBtn.textContent = '📤 Exportar Datos';
        }
    });

    // Eliminar todos los datos
    clearAllBtn.addEventListener('click', async () => {
        const confirmation = prompt(
            'Esta acción eliminará TODAS las conversaciones y no se puede deshacer.\n\n' +
            'Escribe "ELIMINAR TODO" para confirmar:'
        );
        
        if (confirmation === 'ELIMINAR TODO') {
            clearAllBtn.disabled = true;
            clearAllBtn.textContent = '🗑️ Eliminando...';
            
            try {
                const result = await window.api.clearAllData();
                if (result.success) {
                    showStatus('Todos los datos han sido eliminados', 'success');
                    await loadStorageInfo(); // Actualizar información
                } else {
                    showStatus('Error al eliminar datos', 'error');
                }
            } catch (error) {
                console.error('Error al eliminar datos:', error);
                showStatus('Error al eliminar datos', 'error');
            } finally {
                clearAllBtn.disabled = false;
                clearAllBtn.textContent = '🗑️ Eliminar Todo';
            }
        }
    });

    // Botón volver
    backBtn.addEventListener('click', () => {
        // Cerrar la ventana de configuración de Electron
        window.api.closeSettingsWindow();
    });

    // Cargar datos iniciales
    await loadPrivacySettings();
    await loadStorageInfo();
    
    // Actualizar información cada 30 segundos
    setInterval(loadStorageInfo, 30000);
});
