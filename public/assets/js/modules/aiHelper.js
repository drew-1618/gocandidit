/**
 * aiHelper.js - Module for handling AI resume generation UI and draft editing
 */

import { generateResumeApi } from './api.js'
import { quill } from './resumeEditor.js'

export async function generateResume() {
    const jobDescInput = document.getElementById('jobTargetDesc')
    const strJobDesc = jobDescInput ? jobDescInput.value.trim() : ''
    const divLoading = document.getElementById('ai-loading')

    if (!strJobDesc) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Description',
            text: 'Please paste a job description first so the resume can be tailored for the job you want.',
            confirmButtonColor: '#22ba9c'
        })
        return
    }

    if (divLoading) divLoading.classList.remove('d-none')
    if (quill) quill.setContents([])

    try {
        const response = await generateResumeApi(strJobDesc)
        const data = response.data

        if (response.ok && data && data.data && data.data.resumeHtml) {
            const outputDiv = document.getElementById('resume-output')
            if (outputDiv) {
                outputDiv.innerHTML = data.data.resumeHtml
                outputDiv.style.display = 'block'
            }

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            })
            Toast.fire({
                icon: 'success',
                title: 'Resume tailored successfully'
            })
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Generation Failed',
                text: (data && data.error) || 'Failed to generate resume.',
                confirmButtonColor: '#22ba9c'
            })
        }
    } catch (err) {
        console.error("AI Generation Error: ", err)
        Swal.fire({
            icon: 'error',
            title: 'System Error',
            text: 'Could not connect to the AI service. Please check your connection.',
            confirmButtonColor: '#22ba9c'
        })
    } finally {
        if (divLoading) divLoading.classList.add('d-none')
    }
}

export function editResumeDraft() {
    const outputDiv = document.getElementById('resume-output')
    const divQuill = document.getElementById('divQuill')

    if (outputDiv && quill) {
        quill.clipboard.dangerouslyPasteHTML(outputDiv.innerHTML)
        outputDiv.style.display = 'none'
    }
    if (divQuill) {
        divQuill.classList.remove('d-none')
    }
}
