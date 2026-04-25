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

async function generateResume() {
    const strJobDesc = document.getElementById('jobTargetDesc').value.trim()
    const divLoading = document.getElementById('ai-loading')
    const sessionId = localStorage.getItem('sessionId')

    if (!strJobDesc) {
        alert("Please paste a job description first so the resume can be tailored for the job you want.")
        return
    }

    // show loading state
    divLoading.classList.remove('d-none')
    // remove previous draft
    quill.setContents([])

    try {
        const response = await fetch('/api/generate-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({jobDescription: strJobDesc})
        })

        const data = await response.json()

        if (response.ok) {
            new Notification('Resume Tailored!', {
                body: 'Your new resume is ready in the editor.',
                icon: 'assets/img/icon.ico'
            })
            quill.root.innerHTML = data.resumeHtml
        } else {
            alert("Generation failed: " + data.error)
        }
    } catch (err) {
        console.error("AI Generation Error: ", err)
    } finally {
        // always remove the loading div
        divLoading.classList.add('d-none')
    }
}

function togglePresent(checkbox, dateInputId) {
    const dateInput = document.getElementById(dateInputId);
    if (checkbox.checked) {
        // clear the date
        dateInput.value = ""
        dateInput.disabled = true
        // clear errors if it was required
        dateInput.classList.remove('is-invalid') 
    } else {
        dateInput.disabled = false
    }
}

async function fetchVaultData(strCategory, strContainerId) {
    const sessionId = localStorage.getItem('sessionId')
    const container = document.getElementById(strContainerId)
    if (!container) {
        return
    }

    try {
        const response = await fetch(`/api/${strCategory}`, {
            headers: {'x-session-id': sessionId}
        })
        const data = await response.json()

        if (data.length === 0) {
            container.innerHTML = `<p class="text-muted italic"/>No records found in your vault for this category.</p>`
            return
        }

        // build list of cards
        let html = '<div class="list-group">'
        data.forEach(item => {
            if (strCategory === 'jobs') {
                html += `
                    <div class="list-group-item list-group-item-action p-3 mb-2 shadow-sm border rounded">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1 text-primary me-6">${item.role}</h5>
                            <small class="text-muted">${convertDateToReadable(item.start_date)} - ${convertDateToReadable(item.end_date)}</small>
                        </div>
                        <p class="mb-1 fw-bold">${item.company} | <span class="fw-normal text-muted">${item.location}</span></p>
                        <div class="d-flex justify-content-between align-items-end mt-2">
                            <div class="small text-secondary mt-2">${item.description || ''}</div>
                            <div>
                                <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteVaultItem('jobs', '${item.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `
            } else if (strCategory === 'education') {
                html += `
                    <div class="list-group-item list-group-item-action p-3 mb-2 shadow-sm border rounded">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1 text-success">${item.degree} in ${item.major}</h5>
                            <small class="text-muted">${convertDateToReadable(item.end_date)}</small>
                        </div>
                        <p class="mb-1 fw-bold">${item.school_name} | <span class="fw-normal text-muted">${item.location}</span></p></p>
                        <div class="d-flex justify-content-between align-items-end mt-2">
                            <div class="small text-secondary mt-2">${item.description || ''}</div>
                            <div>
                                <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteVaultItem('education', '${item.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `
            } else if (strCategory === 'projects') {
                const boolHasGitHubUrl = (item.link !== null && item.link !== "")
                const strLinkHtml = boolHasGitHubUrl ? `<a href=${item.link}><i class="fa-brands fa-github text-primary fs-3"></i></a>` : ''
                html += `
                    <div class="list-group-item list-group-item-action p-3 mb-2 shadow-sm border rounded">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1 text-success">${item.title}</h5>
                            <small class="text-muted">${convertDateToReadable(item.proj_date)}</small>
                        </div>
                        <p class="mb-1 fw-bold">Tech Stack: ${item.tech_stack}</p>
                        <div class="d-flex justify-content-between align-items-end mt-2">
                            <div class="small text-secondary mt-2">${item.description || ''}</div>
                            <div class="d-flex gap-2 align-items-center">
                                ${strLinkHtml}
                                <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteVaultItem('projects', '${item.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `
            } else if (strCategory === 'resumes') {
                // only displaying a snippet of description
                html += `
                    <div class="list-group-item list-group-item-action p-3 mb-2 shadow-sm border rounded d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1 text-success">${item.job_title}</h5>
                            <small class="text-muted">Target Description: ${item.job_description.substring(0, 60)}...</small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary btn-md border-0" onclick="previewResume('${item.id}')" title="View Resume">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-md border-0" onclick="deleteVaultItem('resumes', '${item.id}')" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `
            }
        })
        html += '</div>'
        container.innerHTML = html
    } catch (err) {
        console.error(`Failed to fetch ${strCategory}: `, err)
        container.innerHTML = `<p class="text-danger">Error loading vault data.</p>`
    }
}

async function deleteVaultItem(category, id) {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return

    const sessionId = localStorage.getItem('sessionId')
    try {
        const response = await fetch(`/api/${category}/${id}`, {
            method: 'DELETE',
            headers: {'x-session-id': sessionId}
        })

        if (response.ok) {
            const strContainerId = `vault-list-${category}`
            fetchVaultData(category, strContainerId)
        } else {
            const data = await response.json()
            alert("Error: " + data.error)
        }
    } catch (err) {
        console.error("Delete failed: ", err)
    }
}

let arrExistingResumeNames = []
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

    // reset view state
    document.getElementById('view-welcome').classList.add('d-none')
    document.getElementById('view-editor').classList.remove('d-none')
    document.getElementById('divQuill').classList.remove('d-none')
    const saveBtn = document.querySelector('button[onclick="saveToVault()"]')
    if (saveBtn) {
        saveBtn.classList.remove('d-none')
    }

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
        title.innerText = "Update Personal Information"
        editorLabel.innerText = "Professional Summary / Bio"
        formContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-12"><label class="form-label">Full Name <span class="text-danger">*</span></label><input type="text" id="profFullName" class="form-control" placeholder="First Last"><div class="invalid-feedback">Please enter your full name.</div></div>
                <div class="col-md-6"><label class="form-label">Phone Number <span class="text-danger">*</span></label><input type="tel" id="profPhone" class="form-control" placeholder="(000) 000-0000"><div class="invalid-feedback">Please enter your phone number.</div></div>
                <div class="col-md-6"><label class="form-label">LinkedIn URL</label><input type="url" id="profLinkedIn" class="form-control" placeholder="https://linkedin.com/in/..."></div>
                <div class="col-md-6"><label class="form-label">GitHub URL</label><input type="url" id="profGitHub" class="form-control" placeholder="https://github.com/..."></div>
                <div class="col-md-6"><label class="form-label">Professional Skills</label><input type="text" id="profSkills" class="form-control" placeholder="Python, Node.js, C++"></div>
            </div>`

            // get data currently in db for user and auto fill
            fetch('/api/profile', {
                headers: {'x-session-id': localStorage.getItem('sessionId')}
            })
            .then (res => res.json())
            .then (data => {
                if (data) {
                    document.getElementById('profFullName').value = data.full_name || ''
                    document.getElementById('profPhone').value = data.phone || ''
                    document.getElementById('profLinkedIn').value = data.linkedin_url || ''
                    document.getElementById('profGitHub').value = data.github_url || ''
                    document.getElementById('profSkills').value = data.skills || ''
                    if (data.summary) {
                        quill.root.innerHTML = data.summary
                    }

                }
            })
    } else if (tab === 'jobs') {
        title.innerText = "Work Experience"
        editorLabel.innerText = "Additional Details & Achievements"
        formContainer.innerHTML = `
            <div id="vault-list-jobs" class="mb-4"></div> <hr>
            <h5 class="mb-3">Add New Experience</h5>
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Company <span class="text-danger">*</span></label><input type="text" id="jobCompany" class="form-control" placeholder="e.g. Google"><div class="invalid-feedback">Please enter the company name.</div></div>
                <div class="col-md-6"><label class="form-label">Location <span class="text-danger">*</span></label><input type="text" id="jobLocation" class="form-control" placeholder="City, State"><div class="invalid-feedback">Please enter the company location.</div></div>
                <div class="col-md-6"><label class="form-label">Role <span class="text-danger">*</span></label><input type="text" id="jobRole" class="form-control" placeholder="e.g. Software Engineer"><div class="invalid-feedback">Please enter the job title.</div></div>
                <div class="col-md-6"><label class="form-label">Start Date <span class="text-danger">*</span></label><input type="month" id="jobStartDate" class="form-control"><div class="invalid-feedback">Please enter the start date.</div></div>
                <div class="col-md-6"><label class="form-label">End Date (or Present) <span class="text-danger">*</span></label><input type="month" id="jobEndDate" class="form-control"><div class="form-check mt-1"><input class="form-check-input" type="checkbox" id="chkJobPresent" onchange="togglePresent(this, 'jobEndDate')"><label class="form-check-label" for="chkJobPresent">I currently work here</label></div><div class="invalid-feedback">Please enter the end date or Present.</div></div>
            </div>`
        // fetch and render
        fetchVaultData('jobs', 'vault-list-jobs') 
    } else if (tab === 'education') {
        title.innerText = "Education History"
        editorLabel.innerText = "Additional Details & Achievements"
        formContainer.innerHTML = `
            <div id="vault-list-education" class="mb-4"></div> <hr>
            <h5 class="mb-3">Add New Education</h5>
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
                <div class="col-md-6"><label class="form-label">Start Date <span class="text-danger">*</span></label><input type="month" id="eduStartDate" class="form-control"><div class="invalid-feedback">Please enter the start date.</div></div>
                <div class="col-md-6"><label class="form-label">End Date (or Expected) <span class="text-danger">*</span></label><input type="month" id="eduEndDate" class="form-control"><div class="invalid-feedback">Please enter the end date / expected graduation.</div></div>
                <div class="col-md-6"><label class="form-label">GPA</label><input type="text" id="eduGpa" class="form-control" placeholder="0.00"></div>
            </div>`
        // fetch and render
        fetchVaultData('education', 'vault-list-education') 
    } else if (tab === 'projects') {
        title.innerText = "Technical Projects"
        editorLabel.innerText = "Additional Details & Achievements"
        formContainer.innerHTML = `
            <div id="vault-list-projects" class="mb-4"></div> <hr>
            <h5 class="mb-3">Add New Project</h5>
            <div class="row g-3">
                <div class="col-md-12"><label class="form-label">Project Title <span class="text-danger">*</span></label><input type="text" id="projTitle" class="form-control" placeholder="Project Name"><div class="invalid-feedback">Please enter the project title.</div></div>
                <div class="col-md-6"><label class="form-label">Tech Stack <span class="text-danger">*</span></label><input type="text" id="projStack" class="form-control" placeholder="e.g., Node.js, ChartJS, SQLite"><div class="invalid-feedback">Please enter the tech stack.</div></div>
                <div class="col-md-6"><label class="form-label">GitHub/Demo Link</label><input type="text" id="projLink" class="form-control" placeholder="https://github.com/..."></div>
                <div class="col-md-6"><label class="form-label">Completion <span class="text-danger">*</span></label><input type="month" id="projCompletionDate" class="form-control"><div class="form-check mt-1"><input class="form-check-input" type="checkbox" id="chkProjectPresent" onchange="togglePresent(this, 'projCompletionDate')"><label class="form-check-label" for="chkProjectPresent">This project is in progress</label></div><div class="invalid-feedback">Please enter the completion date.</div></div>
            </div>`
        // fetch and render
        fetchVaultData('projects', 'vault-list-projects') 
    } else if (tab === 'generate') {
        title.innerText = "Tailor a New Resume"
        formContainer.innerHTML = `
            <div class="card p-3 mb-4 border-primary">
                <h5>Enter Target Job Details</h5>
                <p class="small text-muted">Paste the job description you are applying for below.</p>
                <textarea id="jobTargetDesc" class="form-control mb-3" rows="5" placeholder="Paste job description here..."></textarea>
                <button class="btn btn-primary w-100" onclick="generateResume()">
                    <i class="fa-solid fa-wand-magic-sparkles me-2"></i>Generate Tailored Resume
                </button>
            </div>
            <div id="ai-loading" class="d-none text-center my-3">
                <div class="spinner-border text-primary" role="status"></div>
                <p>AI is tailoring your resume...</p>
            </div>
        `

        document.getElementById('divEditorActions').innerHTML = `
            <div class="d-flex gap-2 mb-3">
                <button class="btn btn-primary" onclick="previewCurrentDraft()">
                    <i class="fa-solid fa-eye me-2"></i>Preview Draft
                </button>
            </div>
            <div class="mb-3">
                    <label class="form-label fw-bold">Name this Resume</label><span class="text-danger">*</span>
                    <input type="text" id="saveJobTitle" class="form-control" placeholder="Save as..."><div class="invalid-feedback">Please enter a name for this resume.</div>
                    <small class="text-muted">This is how it will appear in your vault.</small>
            </div>
        `
        editorLabel.innerText = "AI-Generated Draft (Review & Edit)"
        // start with blank slate
        quill.setContents([])

        // get all resume names
        arrExistingResumeNames = []
        // convert to lower case for consistency
        fetch('/api/resumes', {headers: {'x-session-id': sessionId}})
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
            arrExistingResumeNames = data.map(resume => {
                const title = resume.job_title
                return title ? title.toLowerCase() : ""

            })

            }
        })
    } else if (currentTab === 'resumes') {
        title.innerText = "Resume History"
        formContainer.innerHTML = `
            <div id="vault-list-resumes" class=mt-3">
                <p class="text-center text-muted">Fetching your saved resumes...</p>
            </div>
        `

        // hide quill editor and label
        document.getElementById('divQuill').classList.add('d-none')
        document.getElementById('divEditorActions').innerHTML = ''
        // hide save button
        const saveBtn = document.querySelector('button[onclick="saveToVault()"]')
        if (saveBtn) {
            saveBtn.classList.add('d-none')
        }

        // fetch and render resume history
        fetchVaultData('resumes', 'vault-list-resumes')

    }

    // auto close sidebar on mobile
    const sidebar = document.getElementById('vaultSidebar')
    let instance = bootstrap.Offcanvas.getInstance(sidebar)
    if (!instance) {
        instance = new bootstrap.Offcanvas(sidebar)
    }
    instance.hide()
}

function previewCurrentDraft() {
    const htmlContent = quill.root.innerHTML
    
    // don't preview if empty
    if (quill.getText().trim().length === 0) {
        alert("There is no resume content to preview yet. Generate or type something first!")
        return
    }

    // use same overlay as the history preview
    const overlay = document.createElement('div')
    overlay.id = 'resume-print-preview'    
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 9999; 
        display: flex; flex-direction: column; align-items: center; 
        overflow-y: auto; padding: 40px;
    `;

    overlay.innerHTML = `
        <div id="print-preview-header" class="d-flex gap-3 mb-3">
            <button class="btn btn-light" onclick="window.print()">
                <i class="fa-solid fa-print"></i> Print to PDF
            </button>
            <button class="btn btn-danger" onclick="document.getElementById('resume-print-preview').remove()">
                <i class="fa-solid fa-times"></i> Close Preview
            </button>
        </div>
        <div class="resume-paper">
            ${htmlContent}
        </div>
    `;
    document.body.appendChild(overlay)
}

// Written with Gemini
async function previewResume(id) {
    const sessionId = localStorage.getItem('sessionId')
    
    try {
        const response = await fetch('/api/resumes', {
            headers: { 'x-session-id': sessionId }
        })
        const data = await response.json()
        const resume = data.find(r => r.id === id)

        if (resume) {
            // Create a temporary "Paper" overlay
            const overlay = document.createElement('div')
            overlay.id = 'resume-print-preview'
            overlay.style = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); z-index: 9999; 
                display: flex; flex-direction: column; align-items: center; 
                overflow-y: auto; padding: 40px;
            `;

            overlay.innerHTML = `
                <div id="print-preview-header" class="d-flex gap-3 mb-3">
                    <button class="btn btn-light" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Print to PDF
                    </button>
                    <button class="btn btn-danger" onclick="document.getElementById('resume-print-preview').remove()">
                        <i class="fa-solid fa-times"></i> Close
                    </button>
                </div>
                <div class="resume-paper" style="
                    background: white; width: 8.5in; min-height: 11in;
                    padding: 0.5in; box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    color: black; font-family: 'Times New Roman', serif;
                ">
                    ${resume.resume_html}
                </div>
            `;
            document.body.appendChild(overlay)
        }
    } catch (err) {
        console.error("Preview failed:", err)
    }
}


function convertDateToReadable(strDate) {
    if (!strDate || strDate === "Present") {
        return strDate
    }
    if (!strDate.includes('-')) {
        return strDate
    }
    objMonthMap = {
        "01": "January",
        "02": "February",
        "03": "March",
        "04": "April" ,
        "05": "May",
        "06": "June",
        "07": "July",
        "08": "August",
        "09": "September",
        "10": "October",
        "11": "November",
        "12": "December"
    }
    const strYear = strDate.split('-')[0]
    const strMonth = objMonthMap[strDate.split('-')[1]]
    return `${strMonth} ${strYear}`
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
        arrRequiredFields = ['jobCompany', 'jobLocation', 'jobRole', 'jobStartDate']
        objPayload = {
            company: document.getElementById('jobCompany').value.trim(),
            location: document.getElementById('jobLocation').value.trim(),
            role: document.getElementById('jobRole').value.trim(),
            start_date: document.getElementById('jobStartDate').value,
            end_date: document.getElementById('jobEndDate').value == "" ? "Present" : document.getElementById('jobEndDate').value,
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
            start_date: document.getElementById('eduStartDate').value,
            end_date: document.getElementById('eduEndDate').value == "" ? "Present" : document.getElementById('eduEndDate').value,
            description: description
        }
    } else if (currentTab === 'projects') {
        strEndpoint = '/api/projects'
        arrRequiredFields = ['projTitle', 'projStack']
        objPayload = {
            title: document.getElementById('projTitle').value.trim(),
            link: document.getElementById('projLink').value.trim(),
            tech_stack: document.getElementById('projStack').value.trim(),
            proj_date: document.getElementById('projCompletionDate').value == "" ? "Present" : document.getElementById('projCompletionDate').value,
            description: description
        }
    } else if (currentTab === 'profile') {
        strEndpoint = '/api/profile'
        arrRequiredFields = ['profFullName', 'profPhone']
        objPayload = {
            full_name: document.getElementById('profFullName').value.trim(),
            phone: document.getElementById('profPhone').value.trim(),
            linkedin_url: document.getElementById('profLinkedIn').value.trim(),
            github_url: document.getElementById('profGitHub').value.trim(),
            skills: document.getElementById('profSkills').value.trim(),
            summary: description
        } 
    } else if (currentTab === 'generate') {
            strEndpoint = '/api/resumes'
            arrRequiredFields = ['saveJobTitle']
            const strJobTitle = document.getElementById('saveJobTitle').value.trim()
            const strJobDesc = document.getElementById('jobTargetDesc').value.trim()

            objPayload = {
                jobTitle: strJobTitle,
                jobDescription: strJobDesc,
                resumeHtml: description
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

    if (currentTab === 'generate') {
        const strJobTitle = document.getElementById('saveJobTitle').value.trim().toLowerCase()
        if (arrExistingResumeNames.includes(strJobTitle)) {
            alert("You already have a resume with that name. Please choose a unique name.")
            document.getElementById('saveJobTitle').classList.add('is-invalid')
            return
        }
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
                const inputSaveTitle = document.getElementById('saveJobTitle')
                if (inputSaveTitle) {
                    inputSaveTitle.value = ''
                }

                // refresh list
                const containerId = `vault-list-${currentTab}`
                if (document.getElementById(containerId)) {
                    fetchVaultData(currentTab, containerId)
                }
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
                goHome()
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
    // refresh to default state
    window.location.reload()
    clearAuthFields()
    updateUI()
}

// remove red highlight as soon as the user starts typing/selecting
document.addEventListener('input', (event) => {
    if (event.target.classList.contains('is-invalid')) {
        event.target.classList.remove('is-invalid')
    }
})

// Initialize the view on page load
window.onload = async () => {
    const sessionId = localStorage.getItem('sessionId')
    if (sessionId) {
        try {
            const response = await fetch('/api/profile', {
                headers: {'x-session-id': sessionId}
            })
            if (response.ok) {
                updateUI()
                goHome()
            } else {
                // session expired or invalid
                localStorage.removeItem('sessionId')
                updateUI()
            }
        } catch (err) {
            console.error("Auto-login failed: ", err)
            updateUI()
        }
    } else {
        updateUI()
    }
}