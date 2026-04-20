let isLoginMode = true
const quill = new Quill('#editor', { theme: 'snow' })

// --- SPA VIEW CONTROLLER ---
function updateUI() {
    const sessionId = localStorage.getItem('sessionId')
    const authSection = document.getElementById('section-auth')
    const vaultSection = document.getElementById('section-vault')
    const logoutBtn = document.getElementById('btnLogout')

    if (sessionId) {
        authSection.classList.add('d-none')
        vaultSection.classList.remove('d-none')
        logoutBtn.classList.remove('d-none')
    } else {
        authSection.classList.remove('d-none')
        vaultSection.classList.add('d-none')
        logoutBtn.classList.add('d-none')
    }
}

// --- CLEAR AUTH FIELDS ---
function clearAuthFields() {
    document.getElementById('txtEmail').value = ''
    document.getElementById('txtPassword').value = ''
    // Use the ID from your updated index.html for the confirm field
    const confirmField = document.getElementById('txtConfirmPassword')
    if (confirmField) {
        confirmField.value = ''
    }
}

// --- TOGGLE LOGIN/REGISTER ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode
    const confirmPassword = document.getElementById('divConfirmPassword')

    clearAuthFields()

    document.getElementById('auth-title').innerText = isLoginMode ? 'Login' : 'Register'
    document.getElementById('btnPrimaryAuth').innerText = isLoginMode ? 'Login' : 'Create Account'
    if (isLoginMode) {
        confirmPassword.classList.add('d-none')
    } else {
        confirmPassword.classList.remove('d-none')
    }
    document.getElementById('btnToggleAuth').innerText = isLoginMode 
        ? 'Need an account? Register' 
        : 'Already have an account? Login'
}

// --- AUTH LOGIC ---
async function handleAuth() {
    const email = document.getElementById('txtEmail').value
    const password = document.getElementById('txtPassword').value

    // password confirmation check
    if (!isLoginMode) {
        const confirmPassword = document.getElementById('txtConfirmPassword').value
        if (password !== confirmPassword) {
            alert("Passwords do not match")
            return
        }
    }

    const endpoint = isLoginMode ? '/api/login' : '/api/register'

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        const data = await response.json()

        if (response.ok) {
            if (data.sessionId) {
                // save sessionId to localStorage
                localStorage.setItem('sessionId', data.sessionId)
                updateUI()
            } else {
                alert("Error: " + data.error)
            }
        }
    } catch (err) {
        console.error("Authentication failed:", err)
    }
}

async function logout() {
    const sessionId = localStorage.getItem('sessionId')
    if (sessionId) {
        // Notify server to delete session from tblSessions
        await fetch('/api/logout', {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        })
    }
    
    localStorage.removeItem('sessionId')
    clearAuthFields()
    updateUI()
}

// Initialize the view on page load
window.onload = updateUI