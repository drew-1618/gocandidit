/**
 * auth.js - Authentication and SPA access state management module
 */

import { fetchConfig, loginApi, registerApi, logoutApi } from './api.js'

let isLoginMode = true

export function updateUI() {
    const sessionId = localStorage.getItem('sessionId')
    const authSection = document.getElementById('section-auth')
    const vaultSection = document.getElementById('section-vault')
    const logoutBtn = document.getElementById('btnLogout')
    const navButtons = document.querySelectorAll('.navbar .btn-outline')

    if (sessionId) {
        if (authSection) authSection.classList.add('d-none')
        if (vaultSection) vaultSection.classList.remove('d-none')
        if (logoutBtn) logoutBtn.classList.remove('d-none')
        navButtons.forEach(btn => btn.classList.remove('d-none'))
    } else {
        if (authSection) authSection.classList.remove('d-none')
        if (vaultSection) vaultSection.classList.add('d-none')
        if (logoutBtn) logoutBtn.classList.add('d-none')
        navButtons.forEach(btn => btn.classList.add('d-none'))
    }
}

export function goHome() {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
        updateUI()
        return
    }
    const welcomeView = document.getElementById('view-welcome')
    const editorView = document.getElementById('view-editor')
    if (welcomeView) welcomeView.classList.remove('d-none')
    if (editorView) editorView.classList.add('d-none')
}

export function clearAuthFields() {
    const emailField = document.getElementById('txtEmail')
    const passwordField = document.getElementById('txtPassword')
    const confirmField = document.getElementById('txtConfirmPassword')

    if (emailField) emailField.value = ''
    if (passwordField) passwordField.value = ''
    if (confirmField) confirmField.value = ''
}

export function toggleAuthMode() {
    isLoginMode = !isLoginMode
    const confirmPassword = document.getElementById('divConfirmPassword')
    const authTitle = document.getElementById('auth-title')
    const btnPrimaryAuth = document.getElementById('btnPrimaryAuth')
    const btnToggleAuth = document.getElementById('btnToggleAuth')

    clearAuthFields()

    if (authTitle) authTitle.innerText = isLoginMode ? 'Login' : 'Register'
    if (btnPrimaryAuth) btnPrimaryAuth.innerText = isLoginMode ? 'Login' : 'Create Account'

    if (confirmPassword) {
        if (isLoginMode) {
            confirmPassword.classList.add('d-none')
        } else {
            confirmPassword.classList.remove('d-none')
        }
    }

    if (btnToggleAuth) {
        btnToggleAuth.innerText = isLoginMode
            ? 'Need an account? Register'
            : 'Already have an account? Login'
    }
}

export async function handleAuth() {
    const emailField = document.getElementById('txtEmail')
    const passwordField = document.getElementById('txtPassword')

    const email = emailField ? emailField.value.trim() : ''
    const password = passwordField ? passwordField.value.trim() : ''

    if (!email || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please enter both an email and password.',
            confirmButtonColor: '#22ba9c'
        })
        return
    }

    if (!isLoginMode) {
        const confirmPassword = document.getElementById('txtConfirmPassword')?.value.trim()
        if (password !== confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Passwords Mismatch',
                text: 'The passwords you entered do not match. Please try again.',
                confirmButtonColor: '#22ba9c'
            })
            return
        }
    }

    try {
        const res = isLoginMode ? await loginApi(email, password) : await registerApi(email, password)
        const data = res.data

        if (res.ok && data && data.success && data.data && data.data.sessionId) {
            localStorage.setItem('sessionId', data.data.sessionId)
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            })
            Toast.fire({
                icon: 'success',
                title: isLoginMode ? 'Signed in successfully' : 'Account created successfully'
            })
            updateUI()
            goHome()
        } else {
            Swal.fire({
                icon: 'error',
                title: isLoginMode ? 'Login Failed' : 'Registration Failed',
                text: (data && data.error) || 'Please check your credentials and try again.',
                confirmButtonColor: '#22ba9c'
            })
        }
    } catch (err) {
        console.error("Authentication failed:", err)
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Unable to reach the server. Please check your internet connection.',
            confirmButtonColor: '#22ba9c'
        })
    }
}

export async function logout() {
    Swal.fire({
        title: 'Logout?',
        text: "Are you sure you want to logout?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#22ba9c',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, logout'
    })
    .then(async (result) => {
        if (result.isConfirmed) {
            const sessionId = localStorage.getItem('sessionId')
            if (sessionId) {
                try {
                    await logoutApi()
                } catch (e) {
                    console.error("Logout API call error:", e)
                }
            }
            localStorage.removeItem('sessionId')
            window.location.reload()
        }
    })
}

export async function checkAppConfig() {
    try {
        const res = await fetchConfig()
        if (res.ok && res.data && res.data.singleUserMode) {
            const authSection = document.getElementById('section-auth')
            if (authSection) {
                authSection.classList.add('d-none')
            }
            const toggleBtn = document.getElementById('btnToggleAuth')
            if (toggleBtn) {
                toggleBtn.classList.add('d-none')
            }
        }
    } catch (err) {
        console.error("Failed to check app config:", err)
    }
}
