require('dotenv').config()
const express = require('express')
const path = require('path')
const {v4: uuidv4} = require('uuid')
const bcrypt = require('bcrypt')
const sqlite3 = require('sqlite3')
const { error } = require('console')

const app = express()
const PORT = process.env.PORT || 8000

app.use(express.json())

// Serve all static files (CSS, JS, Vendor, Images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')))

const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.log(`Error opening database: ${err.message}`)
    } else {
        console.log("Connected to database.db")
    }
})


function authorize(req, res, next) {
    // look for the sessionId in the headers
    const sessionId = req.headers['x-session-id']
    if (!sessionId) {
        return res.status(401).json({error: "No session found. Please log in"})
    }
    const strQuery = "SELECT user_id FROM tblSessions WHERE session_id = ?"
    db.get(strQuery, [sessionId], (err, row) => {
        if (err || !row) {
            res.status(401).json({error: "Invalid or expired session"})
        } else {
            req.userId = row.user_id
            next()
        }
    })
}


// --- REGISTER ROUTE ---
app.post('/api/register', (req, res) => {
    const {email, password} = req.body
    const userId = uuidv4()
    try {
        const strHashedPassword = bcrypt.hashSync(password, 12)
        const strQuery = "INSERT INTO tblUsers (id, email, password_hash) VALUES (?, ?, ?)"
        db.run(strQuery, [userId, email, strHashedPassword], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    res.status(400).json({error: "An account is already registered with that email"})
                } else {
                    res.status(400).json({error: err.message})
                }
            } else {
                res.status(201).json({message: "User registered", userId: userId})
            }
        })
    } catch(err) {
        res.status(500).json({error: err.message})
    }
})


// --- LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    const {email, password} = req.body
    const strQuery = "SELECT * FROM tblUsers WHERE email = ?"
    db.get(strQuery, [email], (err, user) => {
        if (err) {
            return res.status(500).json({error: "Database error"})
        } 
        if (!user) {
            return res.status(401).json({error: "Invalid email or password"})
        }

        // check password
        const boolValidPassword = bcrypt.compareSync(password, user.password_hash)
        if (!boolValidPassword) {
            res.status(401).json({error: "Invalid email or password"})
        } else {
            // success
            const strSessionId = uuidv4()
            const strSessionQuery = "INSERT INTO tblSessions (session_id, user_id) VALUES (?, ?)"
            db.run(strSessionQuery, [strSessionId, user.id], (err) => {
                if (err) {
                    res.status(500).json({error: err.message})
                } else {
                    res.status(201).json({message: "Login successful", sessionId: strSessionId})
                }
            })
        }
    })
})


// --- LOGOUT ROUTE ---
app.delete('/api/logout', authorize, (req, res) => {
    const sessionId = req.headers['x-session-id']
    const strQuery = "DELETE FROM tblSessions WHERE session_id = ?"
    db.run(strQuery, [sessionId], (err) => {
        if (err) {
            return res.status(500).json({error: err.message})
        }
        res.status(200).json({message: "Successfully logged out"})
    })
})


// --- JOBS ROUTES ---
app.post('/api/jobs', authorize, (req, res) => {
    const {company, role, description, job_date} = req.body
    const userId = req.userId
    const jobId = uuidv4()

    if (!userId || !company || !role) {
        return res.status(400).json({error: "Missing required job fields"})
    }

    const strQuery = "INSERT INTO tblJobs (id, user_id, company, role, description, job_date) VALUES (?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [jobId, userId, company, role, description, job_date], (err) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(201).json({message: "Job saved to vault", jobId: jobId})
        }
    })
})

app.get('/api/jobs/', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblJobs WHERE user_id = ? ORDER BY created_at DESC"
    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(200).json(rows)
        }
    })
})


// --- EDUCATION ROUTES ---
app.post('/api/education', authorize, (req, res) => {
    const {school_name, degree, major, minor, gpa, location, start_date, end_date} = req.body
    const userId = req.userId
    const eduId = uuidv4()

    const strQuery = "INSERT INTO tblEducation (id, user_id, school_name, degree, major, minor, gpa, location, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [eduId, userId, school_name, degree, major, minor, gpa, location, start_date, end_date], function(err) {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(201).json({message: "Education record added", educationId: eduId})
        }
    })
})

app.get('/api/education/', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblEducation WHERE user_id = ? ORDER BY end_date DESC"
    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(200).json(rows)
        }
    })
})


// --- PROJECT ROUTES ---
app.post('/api/projects', authorize, (req, res) => {
    const {title, description, tech_stack, link} = req.body
    const userId = req.userId
    const projectId = uuidv4()

    const strQuery = "INSERT INTO tblProjects (id, user_id, title, description, tech_stack, link) VALUES (?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [projectId, userId, title, description, tech_stack, link], (err) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(201).json({message: "Project added", projectId: projectId})
        }
    })
})

app.get('/api/projects/', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblProjects WHERE user_id = ? ORDER by created_at DESC"

    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(200).json(rows)
        }
    })
})


//  --- EXTRA USER PROFILE FIELDS ROUTE ---
app.put('/api/users/profile', authorize, (req, res) => {
    const userId = req.userId
    const {full_name, skills, phone, linkedin_url, github_url, summary} = req.body

    const strQuery = "UPDATE tblUsers SET full_name=?, skills=?, phone=?, linkedin_url=?, github_url=?, summary=? WHERE id = ?"
    db.run(strQuery, [full_name, skills, phone, linkedin_url, github_url, summary, userId], (err) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(201).json({message: "Profile updated successfully"})
        }
    })
})

app.listen(PORT, () => {
    console.log(`GoCandidIt is live at http://localhost:${PORT}`)
})
