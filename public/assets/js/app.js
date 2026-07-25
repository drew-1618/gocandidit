/**
 * app.js - Main entry point module for GoCandidIt frontend application
 */

import { fetchProfileApi } from './modules/api.js'
import { updateUI, goHome, toggleAuthMode, handleAuth, logout, checkAppConfig } from './modules/auth.js'
import { initQuill, switchTab, fetchVaultData, deleteVaultItem, togglePresent, previewCurrentDraft, previewResume, convertDateToReadable, saveToVault } from './modules/resumeEditor.js'
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
    // 1. Initialize scoped Quill instance
    initQuill()

    // 2. Listen for global unauthorized events to reset UI
    window.addEventListener('auth:unauthorized', () => {
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
    })

    // 3. Check initial configuration (singleUserMode check)
    const isSingleUser = await checkAppConfig()
    if (isSingleUser) {
        // Single-user fallback: bypass session token validation and load workspace UI directly
        updateUI()
        goHome()
        return
    }

    // 4. Session validation for multi-user mode
    const sessionId = localStorage.getItem('sessionId')
    if (sessionId) {
        try {
            const response = await fetchProfileApi()
            if (response.ok) {
                updateUI()
                goHome()
            }
        } catch (err) {
            console.error("Auto-login failed: ", err)
            updateUI()
        }
    } else {
        updateUI()
    }
})