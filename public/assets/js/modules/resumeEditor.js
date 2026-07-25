/**
 * resumeEditor.js - Resume editor, dynamic forms, vault data management, and draft previews
 */

import { fetchVaultDataApi, deleteVaultItemApi, fetchProfileApi, saveVaultItemApi, fetchResumesApi, getSingleUserMode } from './api.js'
import { updateUI } from './auth.js'

let quill = null

export function initQuill() {
    if (!quill) {
        const container = document.getElementById('editor')
        if (container && window.Quill) {
            quill = new Quill('#editor', { theme: 'snow' })
        }
    }
    return quill
}

export function getQuill() {
    return quill
}

export function getQuillContent() {
    return quill ? quill.root.innerHTML : ''
}

export function setQuillContent(html) {
    if (quill) {
        if (!html) {
            quill.setContents([])
        } else {
            quill.root.innerHTML = html
        }
    }
}

export function pasteQuillHtml(html) {
    if (quill) {
        quill.clipboard.dangerouslyPasteHTML(html)
    }
}

export let currentTab = 'jobs'
export let arrExistingResumeNames = []

export function convertDateToReadable(strDate) {
    if (!strDate || strDate === "Present") {
        return strDate
    }
    if (!strDate.includes('-')) {
        return strDate
    }
    const objMonthMap = {
        "01": "January",
        "02": "February",
        "03": "March",
        "04": "April",
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

export function togglePresent(checkbox, dateInputId) {
    const dateInput = document.getElementById(dateInputId);
    if (!dateInput) return;
    if (checkbox.checked) {
        dateInput.value = ""
        dateInput.disabled = true
        dateInput.classList.remove('is-invalid')
    } else {
        dateInput.disabled = false
    }
}

export async function fetchVaultData(strCategory, strContainerId) {
    const container = document.getElementById(strContainerId)
    if (!container) return;

    try {
        const response = await fetchVaultDataApi(strCategory)
        const vaultItems = response.data?.data || response.data || []

        if (!Array.isArray(vaultItems) || vaultItems.length === 0) {
            container.innerHTML = `<p class="text-muted italic"><i class="fas fa-folder-open text-muted me-2"></i>No records found in your vault.</p>`
            return
        }

        let html = '<div class="list-group">'
        vaultItems.forEach(item => {
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
                        <p class="mb-1 fw-bold">${item.school_name} | <span class="fw-normal text-muted">${item.location}</span></p>
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
                const strLinkHtml = boolHasGitHubUrl ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github text-primary fs-3"></i></a>` : ''
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
                html += `
                    <div class="list-group-item list-group-item-action p-3 mb-2 shadow-sm border rounded d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1 text-success">${item.job_title}</h5>
                            <small class="text-muted">Target Description: ${(item.job_description || "").substring(0, 60)}...</small>
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
        container.innerHTML = `<p class="text-danger">Error loading vault data: ${err.message}</p>`
    }
}

export async function deleteVaultItem(category, id) {
    Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#22ba9c',
        confirmButtonText: 'Yes, delete it.'
    })
    .then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteVaultItemApi(category, id)
                Swal.fire({
                    title: 'Deleted',
                    text: 'The item has been deleted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                })
                const strContainerId = `vault-list-${category}`
                fetchVaultData(category, strContainerId)
            } catch (err) {
                console.error("Delete failed: ", err)
                Swal.fire('Error', err.message || 'Failed to delete item', 'error')
            }
        }
    })
}

export function previewCurrentDraft() {
    const outputDiv = document.getElementById('resume-output')
    const htmlContent = outputDiv && outputDiv.style.display !== 'none' && outputDiv.innerHTML.trim()
        ? outputDiv.innerHTML
        : getQuillContent()

    if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p><br></p>') {
        Swal.fire({
            icon: 'info',
            title: 'Empty Draft',
            text: 'There is no resume content to preview yet. Generate or type something first!',
            confirmButtonColor: '#22ba9c'
        })
        return
    }

    const overlay = document.createElement('div')
    overlay.id = 'resume-print-preview'
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 9999;
        display: block; overflow-y: auto; padding: 40px;
    `

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
    `
    document.body.appendChild(overlay)
}

export async function previewResume(id) {
    try {
        const response = await fetchResumesApi()
        const resumes = response.data?.data || response.data || []
        const resume = Array.isArray(resumes) ? resumes.find(r => r.id === id) : null

        if (resume) {
            const overlay = document.createElement('div')
            overlay.id = 'resume-print-preview'
            overlay.style = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); z-index: 9999; 
                display: block; overflow-y: auto; padding: 40px;
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
                <div class="resume-paper">
                    ${resume.resume_html}
                </div>
            `;
            document.body.appendChild(overlay)
        }
    } catch (err) {
        console.error("Preview failed:", err)
    }
}

export function switchTab(tab) {
    const sessionId = localStorage.getItem('sessionId')
    const isSingleUser = getSingleUserMode()

    if (!sessionId && !isSingleUser) {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'Please log in to access your Resume Vault.',
            confirmButtonColor: '#22ba9c'
        })
        updateUI()
        return
    }

    currentTab = tab

    const welcomeView = document.getElementById('view-welcome')
    const editorView = document.getElementById('view-editor')
    const title = document.getElementById('view-title')
    const formContainer = document.getElementById('divDynamicFormFields')
    const editorLabel = document.getElementById('lblEditor')
    const divQuill = document.getElementById('divQuill')
    const divActions = document.getElementById('divEditorActions')
    const saveBtn = document.querySelector('button[onclick="saveToVault()"]')

    if (welcomeView) welcomeView.classList.add('d-none')
    if (editorView) editorView.classList.remove('d-none')
    if (divQuill) divQuill.classList.remove('d-none')
    if (divActions) divActions.innerHTML = ''
    if (saveBtn) saveBtn.classList.remove('d-none')

    setQuillContent('')

    if (tab === 'profile') {
        if (title) title.innerText = "Update Personal Information"
        if (editorLabel) editorLabel.innerText = "Professional Summary / Bio"
        if (formContainer) {
            formContainer.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-12"><label class="form-label">Full Name <span class="text-danger">*</span></label><input type="text" id="profFullName" class="form-control" placeholder="First Last"><div class="invalid-feedback">Please enter your full name.</div></div>
                    <div class="col-md-6"><label class="form-label">Phone Number <span class="text-danger">*</span></label><input type="tel" id="profPhone" class="form-control" placeholder="(000) 000-0000"><div class="invalid-feedback">Please enter your phone number.</div></div>
                    <div class="col-md-6"><label class="form-label">LinkedIn URL</label><input type="url" id="profLinkedIn" class="form-control" placeholder="https://linkedin.com/in/..."></div>
                    <div class="col-md-6"><label class="form-label">GitHub URL</label><input type="url" id="profGitHub" class="form-control" placeholder="https://github.com/..."></div>
                    <div class="col-md-6"><label class="form-label">Professional Skills</label><input type="text" id="profSkills" class="form-control" placeholder="Python, Node.js, C++"></div>
                    <div class="col-md-12">
                        <label class="form-label">Custom Gemini API Key (Optional)</label>
                        <input type="password" id="profApiKey" class="form-control" placeholder="Paste your key here">
                        <small class="text-muted">Your key is encrypted before being saved to the vault.</small>
                    </div>
                </div>`
        }

        fetchProfileApi()
            .then(res => {
                const profile = res.data?.data || res.data
                if (profile) {
                    if (document.getElementById('profFullName')) document.getElementById('profFullName').value = profile.full_name || ''
                    if (document.getElementById('profPhone')) document.getElementById('profPhone').value = profile.phone || ''
                    if (document.getElementById('profLinkedIn')) document.getElementById('profLinkedIn').value = profile.linkedin_url || ''
                    if (document.getElementById('profGitHub')) document.getElementById('profGitHub').value = profile.github_url || ''
                    if (document.getElementById('profSkills')) document.getElementById('profSkills').value = profile.skills || ''
                    if (document.getElementById('profApiKey')) {
                        document.getElementById('profApiKey').value = profile.gemini_api_key === "STORED_ENCRYPTED" ? "***************************************" : ""
                    }
                    if (profile.summary) {
                        setQuillContent(profile.summary)
                    }
                }
            })
            .catch(err => console.error("Error loading profile:", err))

    } else if (tab === 'jobs') {
        if (title) title.innerText = "Work Experience"
        if (editorLabel) editorLabel.innerText = "Additional Details & Achievements"
        if (formContainer) {
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
        }
        fetchVaultData('jobs', 'vault-list-jobs')

    } else if (tab === 'education') {
        if (title) title.innerText = "Education History"
        if (editorLabel) editorLabel.innerText = "Additional Details & Achievements"
        if (formContainer) {
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
        }
        fetchVaultData('education', 'vault-list-education')

    } else if (tab === 'projects') {
        if (title) title.innerText = "Technical Projects"
        if (editorLabel) editorLabel.innerText = "Additional Details & Achievements"
        if (formContainer) {
            formContainer.innerHTML = `
                <div id="vault-list-projects" class="mb-4"></div> <hr>
                <h5 class="mb-3">Add New Project</h5>
                <div class="row g-3">
                    <div class="col-md-12"><label class="form-label">Project Title <span class="text-danger">*</span></label><input type="text" id="projTitle" class="form-control" placeholder="Project Name"><div class="invalid-feedback">Please enter the project title.</div></div>
                    <div class="col-md-6"><label class="form-label">Tech Stack <span class="text-danger">*</span></label><input type="text" id="projStack" class="form-control" placeholder="e.g., Node.js, ChartJS, SQLite"><div class="invalid-feedback">Please enter the tech stack.</div></div>
                    <div class="col-md-6"><label class="form-label">GitHub/Demo Link</label><input type="text" id="projLink" class="form-control" placeholder="https://github.com/..."></div>
                    <div class="col-md-6"><label class="form-label">Completion <span class="text-danger">*</span></label><input type="month" id="projCompletionDate" class="form-control"><div class="form-check mt-1"><input class="form-check-input" type="checkbox" id="chkProjectPresent" onchange="togglePresent(this, 'projCompletionDate')"><label class="form-check-label" for="chkProjectPresent">This project is in progress</label></div><div class="invalid-feedback">Please enter the completion date.</div></div>
                </div>`
        }
        fetchVaultData('projects', 'vault-list-projects')

    } else if (tab === 'generate') {
        if (title) title.innerText = "Tailor a New Resume"
        if (formContainer) {
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
                <div id="resume-output" class="border rounded p-3 bg-white mt-3" style="display:none;"></div>
            `
        }
        if (divActions) {
            divActions.innerHTML = `
                <div class="d-flex gap-2 mb-3">
                    <button class="btn btn-primary" onclick="previewCurrentDraft()">
                        <i class="fa-solid fa-eye me-2"></i>Preview Draft
                    </button>
                    <button class="btn btn-outline-primary" onclick="editResumeDraft()">
                        <i class="fa-solid fa-pen me-2"></i>Edit Draft
                    </button>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Name this Resume</label><span class="text-danger">*</span>
                    <input type="text" id="saveJobTitle" class="form-control" placeholder="Save as..."><div class="invalid-feedback">Please enter a name for this resume.</div>
                    <small class="text-muted">This is how it will appear in your vault.</small>
                </div>
            `
        }
        if (editorLabel) editorLabel.innerText = "AI-Generated Draft (Review & Edit)"
        setQuillContent('')
        if (divQuill) divQuill.classList.add('d-none')

        arrExistingResumeNames = []
        fetchResumesApi()
            .then(res => {
                const resumes = res.data?.data || res.data || []
                if (Array.isArray(resumes)) {
                    arrExistingResumeNames = resumes.map(resume => (resume.job_title ? resume.job_title.toLowerCase() : ""))
                }
            })
            .catch(err => console.error("Failed to fetch existing resume names:", err))

    } else if (tab === 'resumes') {
        if (title) title.innerText = "Resume History"
        if (formContainer) {
            formContainer.innerHTML = `
                <div id="vault-list-resumes" class="mt-3">
                    <p class="text-center text-muted">Fetching your saved resumes...</p>
                </div>
            `
        }
        if (divQuill) divQuill.classList.add('d-none')
        if (divActions) divActions.innerHTML = ''
        if (saveBtn) saveBtn.classList.add('d-none')

        fetchVaultData('resumes', 'vault-list-resumes')
    }

    const sidebar = document.getElementById('vaultSidebar')
    if (sidebar) {
        let instance = bootstrap.Offcanvas.getInstance(sidebar)
        if (!instance) {
            instance = new bootstrap.Offcanvas(sidebar)
        }
        instance.hide()
    }
}

export async function saveToVault() {
    const sessionId = localStorage.getItem('sessionId')
    const isSingleUser = getSingleUserMode()

    if (!sessionId && !isSingleUser) return;

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    })

    let objPayload = {}
    let strEndpoint = ''
    let arrRequiredFields = []
    const description = getQuillContent()

    if (currentTab === 'jobs') {
        strEndpoint = '/api/jobs'
        arrRequiredFields = ['jobCompany', 'jobLocation', 'jobRole', 'jobStartDate', 'jobEndDate']
        objPayload = {
            company: document.getElementById('jobCompany')?.value.trim() || '',
            location: document.getElementById('jobLocation')?.value.trim() || '',
            role: document.getElementById('jobRole')?.value.trim() || '',
            start_date: document.getElementById('jobStartDate')?.value || '',
            end_date: document.getElementById('jobEndDate')?.value === "" ? "Present" : document.getElementById('jobEndDate')?.value,
            description: description
        }
    } else if (currentTab === 'education') {
        strEndpoint = '/api/education'
        arrRequiredFields = ['eduSchool', 'eduLocation', 'eduDegree', 'eduMajor', 'eduStartDate', 'eduEndDate']
        objPayload = {
            school_name: document.getElementById('eduSchool')?.value.trim() || '',
            location: document.getElementById('eduLocation')?.value.trim() || '',
            degree: document.getElementById('eduDegree')?.value.trim() || '',
            major: document.getElementById('eduMajor')?.value.trim() || '',
            minor: document.getElementById('eduMinor')?.value.trim() || '',
            gpa: document.getElementById('eduGpa')?.value.trim() || '',
            start_date: document.getElementById('eduStartDate')?.value || '',
            end_date: document.getElementById('eduEndDate')?.value === "" ? "Present" : document.getElementById('eduEndDate')?.value,
            description: description
        }
    } else if (currentTab === 'projects') {
        strEndpoint = '/api/projects'
        arrRequiredFields = ['projTitle', 'projStack']
        objPayload = {
            title: document.getElementById('projTitle')?.value.trim() || '',
            link: document.getElementById('projLink')?.value.trim() || '',
            tech_stack: document.getElementById('projStack')?.value.trim() || '',
            proj_date: document.getElementById('projCompletionDate')?.value === "" ? "Present" : document.getElementById('projCompletionDate')?.value,
            description: description
        }
    } else if (currentTab === 'profile') {
        strEndpoint = '/api/profile'
        arrRequiredFields = ['profFullName', 'profPhone']
        objPayload = {
            full_name: document.getElementById('profFullName')?.value.trim() || '',
            phone: document.getElementById('profPhone')?.value.trim() || '',
            linkedin_url: document.getElementById('profLinkedIn')?.value.trim() || '',
            github_url: document.getElementById('profGitHub')?.value.trim() || '',
            skills: document.getElementById('profSkills')?.value.trim() || '',
            gemini_api_key: document.getElementById('profApiKey')?.value.trim() || '',
            summary: description
        }
    } else if (currentTab === 'generate') {
        strEndpoint = '/api/resumes'
        arrRequiredFields = ['saveJobTitle']
        const strJobTitle = document.getElementById('saveJobTitle')?.value.trim() || ''
        const strJobDesc = document.getElementById('jobTargetDesc')?.value.trim() || ''

        objPayload = {
            jobTitle: strJobTitle,
            jobDescription: strJobDesc,
            resumeHtml: description
        }
    }

    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'))

    let arrMissingFields = []
    arrRequiredFields.forEach(id => {
        const input = document.getElementById(id)
        if (input && input.value.trim() === "") {
            input.classList.add('is-invalid')
            arrMissingFields.push(id)
        }
    })

    if (arrMissingFields.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Fields',
            text: 'Please fill in all required fields marked with an asterisk (*).',
            confirmButtonColor: '#0d6efd'
        })
        return
    }

    if (currentTab === 'generate') {
        const strJobTitle = document.getElementById('saveJobTitle')?.value.trim().toLowerCase() || ''
        if (arrExistingResumeNames.includes(strJobTitle)) {
            Swal.fire({
                icon: 'error',
                title: 'Duplicate Name',
                text: 'You already have a resume with that name. Please choose a unique name.',
                confirmButtonColor: '#22ba9c'
            })
            document.getElementById('saveJobTitle')?.classList.add('is-invalid')
            return
        }
    }

    try {
        const method = (currentTab === 'profile') ? 'PUT' : 'POST'
        await saveVaultItemApi(strEndpoint, method, objPayload)

        Toast.fire({
            icon: 'success',
            title: `${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} saved`
        })

        if (currentTab !== 'profile') {
            setQuillContent('')
            document.querySelectorAll('#divDynamicFormFields input').forEach(input => input.value = '')
            const inputSaveTitle = document.getElementById('saveJobTitle')
            if (inputSaveTitle) inputSaveTitle.value = ''

            const containerId = `vault-list-${currentTab}`
            if (document.getElementById(containerId)) {
                fetchVaultData(currentTab, containerId)
            }
        }
    } catch (err) {
        console.error("Vault save failed: ", err)
        Swal.fire('Error Saving', err.message || 'Failed to save item', 'error')
    }
}
