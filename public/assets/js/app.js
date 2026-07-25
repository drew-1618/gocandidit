/**
 * app.js - Main entry point module for GoCandidIt frontend application
 */

import { fetchProfileApi } from './modules/api.js'
import { updateUI, goHome, toggleAuthMode, handleAuth, logout, checkAppConfig } from './modules/auth.js'
import { switchTab, fetchVaultData, deleteVaultItem, togglePresent, previewCurrentDraft, previewResume, convertDateToReadable, saveToVault } from './modules/resumeEditor.js'
import { generateResume, editResumeDraft } from './modules/aiHelper.js'

// Bind functions to window so existing inline HTML event attributes (onclick, onchange) work seamlessly
window.goHome = goHome
window.handleAuth = handleAuth
window.toggleAuthMode = toggleAuthMode
window.logout = logout
window.switchTab = switchTab
window.saveToVault = saveToVault
window.generateResume = generateResume
window.previewCurrentDraft = previewCurrentDraft
window.editResumeDraft = editResumeDraft
window.togglePresent = togglePresent
window.deleteVaultItem = deleteVaultItem
window.previewResume = previewResume
window.convertDateToReadable = convertDateToReadable

// Input listener to remove validation highlights dynamically
document.addEventListener('input', (event) => {
    if (event.target.classList.contains('is-invalid')) {
        event.target.classList.remove('is-invalid')
    }
})

// Initialize application state on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check initial configuration (e.g. singleUserMode)
    await checkAppConfig()

    const sessionId = localStorage.getItem('sessionId')
    if (sessionId) {
        try {
            const response = await fetchProfileApi()
            if (response.ok) {
                updateUI()
                goHome()
            } else {
                // Session expired or invalid
                localStorage.removeItem('sessionId')
                updateUI()

                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                })
                Toast.fire({
                    icon: 'info',
                    title: 'Session expired. Please log in again.'
                })
            }
        } catch (err) {
            console.error("Auto-login failed: ", err)
            updateUI()
        }
    } else {
        updateUI()
    }
})