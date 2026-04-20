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
            res.status(500).json({error: "Database error"})
        }
        if (!user) {
            res.status(401).json({error: "Invalid email or password"})
        }

        // check password
        const boolValidPassword = bcrypt.compareSync(password, user.password_hash)
        if (!boolValidPassword) {
            res.status(401).json({error: "Invalid email or password"})
        }

        // success
        res.status(200).json({message: "Login successful", userId: user.id, email: user.email})
    })
})


// --- JOBS ROUTES ---
app.post('/api/jobs', (req, res) => {
    const {userId, company, role, description, job_date} = req.body
    const jobId = uuidv4()

    if (!userId || !company || !role) {
        res.status(400).json({error: "Missing required job fields"})
    }

    const strQuery = "INSERT INTO tblJobs (id, user_id, company, role, description, job_date) VALUES (?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [jobId, userId, company, role, description, job_date], function(err) {
        if (err) {
            res.status(500).json({error: err.message})
        }
        res.status(201).json({message: "Job saved to vault", jobId: jobId})
    })
})

app.get('/api/jobs/:userId', (req, res) => {
    const {userId} = req.params
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


app.listen(PORT, () => {
    console.log(`GoCandidIt is live at http://localhost:${PORT}`)
})
