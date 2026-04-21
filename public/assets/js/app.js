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


let currentTab = 'jobs'
function switchTab(tab) {
    currentTab = tab
    const title = document.getElementById('view-title')
    const formContainer = document.getElementById('divDynamicFormFields')

    // clear previous editor content
    quill.setContents([])

    if (tab === 'jobs') {
        title.innerText = "Work Experience"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Company</label><input type="text" id="jobCompany" class="form-control" placeholder="e.g. Google"></div>
                <div class="col-md-6"><label class="form-label">Role</label><input type="text" id="jobRole" class="form-control" placeholder="e.g. Software Engineer"></div>
                <div class="col-md-6"><label class="form-label">Location</label><input type="text" id="jobLocation" class="form-control" placeholder="City, State"></div>
                <div class="col-md-6"><label class="form-label">Dates</label><input type="text" id="jobDate" class="form-control" placeholder="Month Year - Month Year"></div>
            </div>`
    } else if (tab === 'education') {
        title.innerText = "Education History"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">School</label><input type="text" id="eduSchool" class="form-control" placeholder="University Name"></div>
                <div class="col-md-6"><label class="form-label">Degree/Major</label><input type="text" id="eduDegree" class="form-control" placeholder="e.g. B.S. Computer Science"></div>
                <div class="col-md-6"><label class="form-label">GPA</label><input type="text" id="eduGpa" class="form-control" placeholder="0.00"></div>
                <div class="col-md-6"><label class="form-label">Dates</label><input type="text" id="eduDate" class="form-control" placeholder="Month Year - Month Year"></div>
            </div>`
    } else if (tab === 'projects') {
        title.innerText = "Technical Projects"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-12"><label class="form-label">Project Title</label><input type="text" id="projTitle" class="form-control" placeholder="Project Name"></div>
                <div class="col-md-6"><label class="form-label">GitHub/Demo Link</label><input type="text" id="projLink" class="form-control" placeholder="https://github.com/..."></div>
                <div class="col-md-6"><label class="form-label">Tech Stack</label><input type="text" id="projStack" class="form-control" placeholder="e.g., Node.js, ChartJS, SQLite"></div>
            </div>`
    }

    // auto close sidebar on mobile
    const sidebar = document.getElementById('vaultSidebar')
    const instance = bootstrap.Offcanvas.getInstance(sidebar)
    if (instance) instance.hide()
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