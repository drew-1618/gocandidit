let isLoginMode = true
const quill = new Quill('#editor', { theme: 'snow' })

// --- SPA VIEW CONTROLLER ---
function updateUI() {
    const sessionId = localStorage.getItem('sessionId')
    const authSection = document.getElementById('section-auth')
    const vaultSection = document.getElementById('section-vault')
    const logoutBtn = document.getElementById('btnLogout')
    const navButtons = document.querySelectorAll('.navbar .btn-outline')

    if (sessionId) {
        authSection.classList.add('d-none')
        vaultSection.classList.remove('d-none')
        logoutBtn.classList.remove('d-none')
        navButtons.forEach(btn => btn.classList.remove('d-none'))
    } else {
        authSection.classList.remove('d-none')
        vaultSection.classList.add('d-none')
        logoutBtn.classList.add('d-none')
        navButtons.forEach(btn => btn.classList.add('d-none'))

    }
}


function goHome() {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
        updateUI()
        return
    }
    // show welcome, hide editor
    document.getElementById('view-welcome').classList.remove('d-none')
    document.getElementById('view-editor').classList.add('d-none')
    
    // reset currentTab state
    currentTab = 'welcome'
}


let currentTab = 'jobs'
function switchTab(tab) {
    // prevent access if not logged in
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
        alert("Please log in to access the vault")
        updateUI()
        return
    }
    
    currentTab = tab

    document.getElementById('view-welcome').classList.add('d-none')
    document.getElementById('view-editor').classList.remove('d-none')

    const welcomeView = document.getElementById('view-welcome')
    const editorView = document.getElementById('view-editor')
    const title = document.getElementById('view-title')
    const formContainer = document.getElementById('divDynamicFormFields')
    const editorLabel = document.getElementById('lblEditor')

    // toggle welcome visibility
    welcomeView.classList.add('d-none')
    editorView.classList.remove('d-none')

    // clear previous editor content
    quill.setContents([])

    if (tab === 'profile') {
        title.innerText = "Personal Information"
        editorLabel.innerText = "Professional Summary / Bio"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-12"><label class="form-label">Full Name</label><input type="text" id="profFullName" class="form-control" placeholder="First Last"></div>
                <div class="col-md-6"><label class="form-label">Phone Number</label><input type="tel" id="profPhone" class="form-control" placeholder="(000) 000-0000"></div>
                <div class="col-md-6"><label class="form-label">LinkedIn URL</label><input type="url" id="profLinkedIn" class="form-control" placeholder="https://linkedin.com/in/..."></div>
                <div class="col-md-6"><label class="form-label">GitHub URL</label><input type="url" id="profGitHub" class="form-control" placeholder="https://github.com/..."></div>
                <div class="col-md-6"><label class="form-label">Professional Skills</label><input type="text" id="profSkills" class="form-control" placeholder="Python, Node.js, C++"></div>
            </div>`
    } else if (tab === 'jobs') {
        title.innerText = "Work Experience"
        editorLabel.innerText = "Additional Details & Achievements"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Company <span class="text-danger">*</span></label><input type="text" id="jobCompany" class="form-control" placeholder="e.g. Google"><div class="invalid-feedback">Please enter the company name.</div></div>
                <div class="col-md-6"><label class="form-label">Location <span class="text-danger">*</span></label><input type="text" id="jobLocation" class="form-control" placeholder="City, State"><div class="invalid-feedback">Please enter the company location.</div></div>
                <div class="col-md-6"><label class="form-label">Role <span class="text-danger">*</span></label><input type="text" id="jobRole" class="form-control" placeholder="e.g. Software Engineer"><div class="invalid-feedback">Please enter the job title.</div></div>
                <div class="col-md-6"><label class="form-label">Start Date <span class="text-danger">*</span></label><input type="text" id="jobStartDate" class="form-control" placeholder="Month Year"><div class="invalid-feedback">Please enter the start date.</div></div>
                <div class="col-md-6"><label class="form-label">End Date (or Present) <span class="text-danger">*</span></label><input type="text" id="jobEndDate" class="form-control" placeholder="Month Year"><div class="invalid-feedback">Please enter the end date or Present.</div></div>
                </div>`
    } else if (tab === 'education') {
        title.innerText = "Education History"
        editorLabel.innerText = "Additional Details & Achievements"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">School <span class="text-danger">*</span></label><input type="text" id="eduSchool" class="form-control" placeholder="University Name"><div class="invalid-feedback">Please enter the university name.</div></div>
                <div class="col-md-6"><label class="form-label">Location <span class="text-danger">*</span></label><input type="text" id="eduLocation" class="form-control" placeholder="City, State"><div class="invalid-feedback">Please enter the university location.</div></div>
                <div class="col-md-6"><label class="form-label">Degree Type <span class="text-danger">*</span></label>
                    <select id="eduDegree" class="form-select">
                        <option value="" selected disabled hidden>-- Select --</option>
                        <option value="B.S.">Bachelor of Science (B.S.)</option>
                        <option value="B.A.">Bachelor of Arts (B.A.)</option>
                        <option value="A.S.">Associate of Science (A.S.)</option>
                        <option value="A.A.">Associate of Arts (A.A.)</option>
                        <option value="M.S.">Master of Science (M.S.)</option>
                        <option value="Ph.D.">Doctorate (Ph.D.)</option>
                        <option value="Other">Other</option>
                    </select>
                    <div class="invalid-feedback">Please enter the degree type.</div>
                </div>
                <div class="col-md-6"><label class="form-label">Major <span class="text-danger">*</span></label><input type="text" id="eduMajor" class="form-control" placeholder="e.g. Computer Science"><div class="invalid-feedback">Please enter the major.</div></div>
                <div class="col-md-6"><label class="form-label">Minor</label><input type="text" id="eduMinor" class="form-control" placeholder="e.g. Mathematics"></div>
                <div class="col-md-6"><label class="form-label">Start Date <span class="text-danger">*</span></label><input type="text" id="eduStartDate" class="form-control" placeholder="Month Year"><div class="invalid-feedback">Please enter the start date.</div></div>
                <div class="col-md-6"><label class="form-label">End Date (or Expected) <span class="text-danger">*</span></label><input type="text" id="eduEndDate" class="form-control" placeholder="Month Year"><div class="invalid-feedback">Please enter the end date / expected graduation.</div></div>
                <div class="col-md-6"><label class="form-label">GPA</label><input type="text" id="eduGpa" class="form-control" placeholder="0.00"></div>
            </div>`
    } else if (tab === 'projects') {
        title.innerText = "Technical Projects"
        editorLabel.innerText = "Additional Details & Achievements"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-12"><label class="form-label">Project Title <span class="text-danger">*</span></label><input type="text" id="projTitle" class="form-control" placeholder="Project Name"><div class="invalid-feedback">Please enter the project title.</div></div>
                <div class="col-md-6"><label class="form-label">Tech Stack <span class="text-danger">*</span></label><input type="text" id="projStack" class="form-control" placeholder="e.g., Node.js, ChartJS, SQLite"><div class="invalid-feedback">Please enter the tech stack.</div></div>
                <div class="col-md-6"><label class="form-label">GitHub/Demo Link</label><input type="text" id="projLink" class="form-control" placeholder="https://github.com/..."></div>
            </div>`
    }

    // auto close sidebar on mobile
    const sidebar = document.getElementById('vaultSidebar')
    let instance = bootstrap.Offcanvas.getInstance(sidebar)
    if (!instance) {
        instance = new bootstrap.Offcanvas(sidebar)
    }
    instance.hide()
}


async function saveToVault() {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
        return
    }

    let objPayload = {}
    let strEndpoint = ''
    let arrRequiredFields = []

    const description = quill.root.innerHTML

    if (currentTab === 'jobs') {
        strEndpoint = '/api/jobs'
        arrRequiredFields = ['jobCompany', 'jobLocation', 'jobRole', 'jobStartDate', 'jobEndDate']
        objPayload = {
            company: document.getElementById('jobCompany').value.trim(),
            location: document.getElementById('jobLocation').value.trim(),
            role: document.getElementById('jobRole').value.trim(),
            location: document.getElementById('jobLocation').value.trim(),
            start_date: document.getElementById('jobStartDate').value.trim(),
            end_date: document.getElementById('jobEndDate').value.trim(),
            description: description
        }
    } else if (currentTab === 'education') {
        strEndpoint = '/api/education'
        arrRequiredFields = ['eduSchool', 'eduLocation', 'eduDegree', 'eduMajor', 'eduStartDate', 'eduEndDate']
        objPayload = {
            school_name: document.getElementById('eduSchool').value.trim(),
            location: document.getElementById('eduLocation').value.trim(),
            degree: document.getElementById('eduDegree').value.trim(),
            major: document.getElementById('eduMajor').value.trim(),
            minor: document.getElementById('eduMinor').value.trim(),
            gpa: document.getElementById('eduGpa').value.trim(),
            start_date: document.getElementById('eduStartDate').value.trim(),
            end_date: document.getElementById('eduEndDate').value.trim(),
            description: description
        }
    } else if (currentTab === 'projects') {
        strEndpoint = '/api/projects'
        arrRequiredFields = ['projTitle', 'projStack']
        objPayload = {
            title: document.getElementById('projTitle').value.trim(),
            link: document.getElementById('projLink').value.trim(),
            tech_stack: document.getElementById('projStack').value.trim(),
            description: description
        }
    } else if (currentTab === 'profile') {
        strEndpoint = '/api/profile'
        objPayload = {
            full_name: document.getElementById('profFullName').value.trim(),
            phone: document.getElementById('profPhone').value.trim(),
            linkedin_url: document.getElementById('profLinkedIn').value.trim(),
            github_url: document.getElementById('profGitHub').value.trim(),
            skills: document.getElementById('profSkills').value.trim(),
            description: description
        }
    }

    // clear previous errors so the user can fill them in
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'))

    let arrMissingFields = []
    arrRequiredFields.forEach(id => {
        const input = document.getElementById(id)
        if (input && input.value.trim() == "") {
            input.classList.add('is-invalid')
            arrMissingFields.push(id)
        }
    })

    if (arrMissingFields.length > 0) {
        alert("Please fill in all required fields (*)")
        return
    }

    try {
        const response = await fetch(strEndpoint, {
            // profile is the only one that updates rather than creates new entry
            method: (currentTab === 'profile') ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json', 'x-session-id': sessionId},
            body: JSON.stringify(objPayload)
        })

        if (response.ok) {
            alert(`${currentTab} saved successfully`)
            // clear input fields automatically (except for profile)
            // in case user wants to add multiple entries back to back (likely scenario)
            if (currentTab !== 'profile') {
                quill.setContents([])
                document.querySelectorAll('#divDynamicFormFields input').forEach(input => input.value = '')
            }
        } else {
            const errorData = await response.json()
            alert(`Error saving: ${errorData.error}`)
        }
    } catch (err) {
        console.error("Vault save failed: ", err)
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

// remove red highlight as soon as the user starts typing/selecting
document.getElementById('divDynamicFormFields').addEventListener('input', (event) => {
    if (event.target.classList.contains('is-invalid')) {
        event.target.classList.remove('is-invalid')
    }
})

// Initialize the view on page load
window.onload = updateUI