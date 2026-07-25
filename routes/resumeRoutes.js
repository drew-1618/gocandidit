const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { db } = require('../config/db')
const authorize = require('../middleware/auth')
const { sendSuccess, sendError } = require('../utils/response')
const { encrypt } = require('../utils/crypto')

const router = express.Router()

// Apply authentication middleware to all resume/vault routes
router.use(authorize)

// --- JOBS ROUTES ---
router.post(['/jobs', '/api/jobs'], (req, res) => {
    const { company, location, role, start_date, end_date, description } = req.body
    const userId = req.userId
    const jobId = uuidv4()

    if (!userId || !company || !role) {
        return sendError(res, "Missing required job fields", null, 400)
    }

    const strQuery = "INSERT INTO tblJobs (id, user_id, company, location, role, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [jobId, userId, company, location, role, start_date, end_date, description], (err) => {
        if (err) {
            return sendError(res, "Failed to save job", err, 500)
        }
        return sendSuccess(res, { jobId: jobId }, "Job saved to vault", 201)
    })
})

router.get(['/jobs', '/api/jobs'], (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblJobs WHERE user_id = ? ORDER BY end_date DESC"
    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            return sendError(res, "Failed to retrieve jobs", err, 500)
        }
        return sendSuccess(res, rows, null, 200)
    })
})

// --- EDUCATION ROUTES ---
router.post(['/education', '/api/education'], (req, res) => {
    const { school_name, degree, major, minor, gpa, location, start_date, end_date, description } = req.body
    const userId = req.userId
    const eduId = uuidv4()

    const strQuery = "INSERT INTO tblEducation (id, user_id, school_name, degree, major, minor, gpa, location, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [eduId, userId, school_name, degree, major, minor, gpa, location, start_date, end_date, description], function(err) {
        if (err) {
            return sendError(res, "Failed to save education record", err, 500)
        }
        return sendSuccess(res, { educationId: eduId }, "Education saved to vault", 201)
    })
})

router.get(['/education', '/api/education'], (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblEducation WHERE user_id = ? ORDER BY end_date DESC"
    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            return sendError(res, "Failed to retrieve education records", err, 500)
        }
        return sendSuccess(res, rows, null, 200)
    })
})

// --- PROJECT ROUTES ---
router.post(['/projects', '/api/projects'], (req, res) => {
    const { title, description, tech_stack, link, proj_date } = req.body
    const userId = req.userId
    const projectId = uuidv4()

    const strQuery = "INSERT INTO tblProjects (id, user_id, title, description, tech_stack, link, proj_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [projectId, userId, title, description, tech_stack, link, proj_date], (err) => {
        if (err) {
            return sendError(res, "Failed to save project", err, 500)
        }
        return sendSuccess(res, { projectId: projectId }, "Project saved to vault", 201)
    })
})

router.get(['/projects', '/api/projects'], (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblProjects WHERE user_id = ? ORDER by proj_date DESC"

    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            return sendError(res, "Failed to retrieve project records", err, 500)
        }
        return sendSuccess(res, rows, null, 200)
    })
})

// --- PROFILE ROUTES ---
router.put(['/profile', '/api/profile'], (req, res) => {
    const userId = req.userId
    const { full_name, skills, phone, linkedin_url, github_url, summary, gemini_api_key } = req.body

    // if user provided a new key (not empty and not filled with asterisks)
    if (gemini_api_key && /^\*+$/.test(gemini_api_key)) {
        const encryptedKey = encrypt(gemini_api_key)
        const strQuery = "UPDATE tblUsers SET full_name=?, skills=?, phone=?, linkedin_url=?, github_url=?, summary=?, gemini_api_key=? WHERE id = ?"
        db.run(strQuery, [full_name, skills, phone, linkedin_url, github_url, summary, encryptedKey, userId], (err) => {
            if (err) return sendError(res, "Failed to update profile with new API key", err, 500)
            sendSuccess(res, null, "Profile and API key updated successfully", 200)
        })
    } else {
        // if the key field was left blank or just contained the asterisks, ignore the column entirely
        const strQuery = "UPDATE tblUsers SET full_name=?, skills=?, phone=?, linkedin_url=?, github_url=?, summary=? WHERE id = ?"
        db.run(strQuery, [full_name, skills, phone, linkedin_url, github_url, summary, userId], (err) => {
            if (err) return sendError(res, "Failed to update profile", err, 500)
            sendSuccess(res, null, "Profile updated successfully", 200)
        })
    }
})

router.get(['/profile', '/api/profile'], (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblUsers WHERE id = ?"
    db.get(strQuery, [userId], (err, row) => {
        if (err) {
            return sendError(res, "Failed to retrieve profile", err, 500)
        } else {
            if (row && row.gemini_api_key) {
                // mask from ui
                row.gemini_api_key = "STORED_ENCRYPTED"
            }
            return sendSuccess(res, row || {}, null, 200)
        }
    })
})

// --- RESUMES HISTORY ROUTES ---
router.post(['/', '/resumes', '/api/resumes'], (req, res) => {
    const { jobTitle, jobDescription, resumeHtml } = req.body
    const userId = req.userId
    const resumeId = uuidv4()

    const strQuery = "INSERT INTO tblResumes (id, user_id, job_title, job_description, resume_html) VALUES (?, ?, ?, ?, ?)"
    db.run(strQuery, [resumeId, userId, jobTitle, jobDescription, resumeHtml], (err) => {
        if (err) {
            return sendError(res, "Failed to save resume.", err, 500)
        }
        return sendSuccess(res, { id: resumeId }, "Resume saved to history", 201)
    })
})

router.get(['/', '/resumes', '/api/resumes'], (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT id, job_title, job_description, resume_html, created_at FROM tblResumes WHERE user_id = ? ORDER BY created_at DESC"
    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            return sendError(res, "Failed to fetch resumes.", err, 500)
        }
        return sendSuccess(res, rows || [], "Resumes fetched successfully", 200)
    })
})

// --- CATEGORY DELETE ROUTE ---
router.delete(['/:category/:id', '/api/:category/:id'], (req, res) => {
    const { category, id } = req.params
    const userId = req.userId
    // map category to correct table
    const objTableMap = {
        'jobs': 'tblJobs',
        'education': 'tblEducation',
        'projects': 'tblProjects',
        'resumes': 'tblResumes',
    }

    const strTableName = objTableMap[category]
    if (!strTableName) {
        return sendError(res, "Invalid category", null, 400)
    }

    const strQuery = `DELETE FROM ${strTableName} WHERE id = ? and user_id = ?`
    db.run(strQuery, [id, userId], function(err) {
        if (err) {
            return sendError(res, "Failed to delete record", err, 500)
        } else if (this.changes === 0) {
            return sendError(res, "Record not found or does not belong to a user", null, 404)
        } else {
            return sendSuccess(res, null, "Record deleted successfully", 200)
        }
    })
})

module.exports = router
