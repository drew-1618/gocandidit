require('dotenv').config()
const express = require('express')
const path = require('path')
const {v4: uuidv4} = require('uuid')
const bcrypt = require('bcrypt')
const sqlite3 = require('sqlite3')
const { error, table } = require('console')
const {GoogleGenerativeAI} = require("@google/generative-ai")
const {app: electronApp} = require('electron')

const app = express()
const PORT = process.env.PORT || 8000

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"})

app.use(express.json())

// Serve all static files (CSS, JS, Vendor, Images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')))

// connect to database
// AppData/Roaming/gocandidit
const dbPath = path.join(electronApp.getPath('userData'), 'database.db')

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log(`Error opening database: ${err.message}`)
    } else {
        console.log(`Connected to local database at: ${dbPath}`)
    }
})

db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS tblUsers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        full_name TEXT,
        skills TEXT,
        phone TEXT,
        linkedin_url TEXT,
        github_url TEXT,
        summary TEXT
    )`);

    // 2. Sessions Table
    db.run(`CREATE TABLE IF NOT EXISTS tblSessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    // 3. Jobs Table
    db.run(`CREATE TABLE IF NOT EXISTS tblJobs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        company TEXT,
        location TEXT,
        role TEXT,
        start_date TEXT,
        end_date TEXT,
        description TEXT,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    // 4. Education Table
    db.run(`CREATE TABLE IF NOT EXISTS tblEducation (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        school_name TEXT,
        degree TEXT,
        major TEXT,
        minor TEXT,
        gpa TEXT,
        location TEXT,
        start_date TEXT,
        end_date TEXT,
        description TEXT,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    // 5. Projects Table
    db.run(`CREATE TABLE IF NOT EXISTS tblProjects (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        description TEXT,
        tech_stack TEXT,
        link TEXT,
        proj_date TEXT,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    // 6. Resumes Table
    db.run(`CREATE TABLE IF NOT EXISTS tblResumes (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        job_title TEXT,
        job_description TEXT,
        resume_html TEXT,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    console.log("Database schema verified/created.");
});

// delete sessions older than 12 hours
const strCleanupQuery = "DELETE FROM tblSessions WHERE created_at <= datetime('now', '-30 days')"
db.run(strCleanupQuery, (err) => {
    if (err) {
        console.error("Session cleanup failed: ", err.message)
    } else {
        console.log("Old sessions cleared")
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
                    return res.status(400).json({error: "An account is already registered with that email"})
                }
                return res.status(400).json({error: err.message})
                
            }

            // create a session immediately after registration
            const strSessionId = uuidv4()
            const strSessionQuery = "INSERT INTO tblSessions (session_id, user_id) VALUES (?, ?)"
            db.run(strSessionQuery, [strSessionId, userId], (sessionErr) => {
                if (sessionErr) {
                    return res.status(500).json({error: "User registered, but session creation failed"})
                }
                res.status(201).json({message: "User registered and logged in", userId: userId, sessionId: strSessionId})
            })            
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
    const {company, location, role, start_date, end_date, description} = req.body
    const userId = req.userId
    const jobId = uuidv4()

    if (!userId || !company || !role) {
        return res.status(400).json({error: "Missing required job fields"})
    }

    const strQuery = "INSERT INTO tblJobs (id, user_id, company, location, role, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [jobId, userId, company, location, role, start_date, end_date, description], (err) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(201).json({message: "Job saved to vault", jobId: jobId})
        }
    })
})

app.get('/api/jobs/', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblJobs WHERE user_id = ? ORDER BY end_date DESC"
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
    const {school_name, degree, major, minor, gpa, location, start_date, end_date, description} = req.body
    const userId = req.userId
    const eduId = uuidv4()

    const strQuery = "INSERT INTO tblEducation (id, user_id, school_name, degree, major, minor, gpa, location, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [eduId, userId, school_name, degree, major, minor, gpa, location, start_date, end_date, description], function(err) {
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
    const {title, description, tech_stack, link, proj_date} = req.body
    const userId = req.userId
    const projectId = uuidv4()

    const strQuery = "INSERT INTO tblProjects (id, user_id, title, description, tech_stack, link, proj_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    db.run(strQuery, [projectId, userId, title, description, tech_stack, link, proj_date], (err) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(201).json({message: "Project added", projectId: projectId})
        }
    })
})

app.get('/api/projects/', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblProjects WHERE user_id = ? ORDER by proj_date DESC"

    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(200).json(rows)
        }
    })
})


//  --- EXTRA USER PROFILE FIELDS ROUTE ---
app.put('/api/profile', authorize, (req, res) => {
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

app.get('/api/profile', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT * FROM tblUsers WHERE id = ?"
    db.get(strQuery, [userId], (err, row) => {
        if (err) {
            res.status(500).json({error: err.message})
        } else {
            res.status(200).json(row || {})
        }
    })
})


app.delete('/api/:category/:id', authorize, (req,res) => {
    const {category, id} = req.params
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
        return res.status(400).json({error: "Invalid category"})
    }

    const strQuery = `DELETE FROM ${strTableName} WHERE id = ? and user_id = ?`
    db.run(strQuery, [id, userId], function(err) {
        if (err) {
            res.status(500).json({error: err.message})
        } else if (this.changes === 0) {
            res.status(404).json({error: "Record not found"})
        } else {
            res.status(200).json({message: "Record deleted successfully"})
        }
    })
})


app.post('/api/generate-resume', authorize, async (req, res) => {
    const userId = req.userId
    const {jobDescription} = req.body

    try {
        // get all data from db
        // for tblUsers, don't get bycrypted passwords. AI does not need that
        const profile = await new Promise((res, rej) => db.get("SELECT email, skills, phone, linkedin_url, summary, github_url, full_name FROM tblUsers WHERE id = ?", [userId], (e, r) => e ? rej(e) : res(r)))
        const jobs = await new Promise((res, rej) => db.all("SELECT * FROM tblJobs WHERE user_id = ? ORDER BY start_date DESC", [userId], (e, r) => e ? rej(e) : res(r)));
        const education = await new Promise((res, rej) => db.all("SELECT * FROM tblEducation WHERE user_id = ? ORDER BY end_date DESC", [userId], (e, r) => e ? rej(e) : res(r)));
        const projects = await new Promise((res, rej) => db.all("SELECT * FROM tblProjects WHERE user_id = ? ORDER BY proj_date DESC", [userId], (e, r) => e ? rej(e) : res(r)));
    
        // build prompt with personalized data
        const strPrompt = `
            ROLE: Expert resume architect
            TASK: Create a tailored HTML resume that passes ATS

            STRICT RULES: 
            1. ZERO HALLUCINATION: Use ONLY the data provided below. 
            2. NO PLACEHOLDERS: Do not use "@email.com" or "(000) 000-0000" if the real data is present. Use the exact email and phone from the User Profile.
            3. EXHAUSTIVE BULLETS: For Jobs and Projects, you MUST transform the 'description' field (which contains HTML) into a series of 2-5 high-impact bullet points in each work experience and projects. Do not just summarize; extract specific technical achievements.
            4. MATCHING: Explicitly highlight ${JSON.stringify(profile.skills)} that appear in the Job Description.
            5. EXACTNESS: Links, emails,  dates, etc. Must be exactly as stated.

            USER DATA:
            Profile: ${JSON.stringify(profile)}
            EXPERIENCE: ${JSON.stringify(jobs)}
            EDUCATION: ${JSON.stringify(education)}
            PROJECTS: ${JSON.stringify(projects)}

            TARGET JOB DESCRIPTION:
            ${JSON.stringify(jobDescription)}

            GENERAL INSTRUCTIONS: 
            1. Use clean HTML (h1, h2, h3, p, ul, li). Do not include <html> or <body> tags.
            2. Tailor the content: Emphasize the experience and projects that match the Job Description.
            3. Use action verbs (e.g., "Architected," "Optimized," "Spearheaded").
            4. If the job description asks for a skill the user has, make sure it is prominent.
            5. Use full professional names

            OUTPT FORMAT:
            Output should be approximately one page's worth length when printed
            Format the resume professionally with sections for Contact, Summary, Experience, Projects, Education, and Skills.
            Return only the inner HTML. Use <h2> for section headers, <strong> for titles, and <ul>/<li> for details.
        `

        const result = await model.generateContent(strPrompt)
        const response = await result.response
        const text = response.text()

        // cleanup response (markdown code blocks that AI typically inserts
        const cleanHtml = text.replace(/```html|```/g, "")

        res.status(200).json({resumeHtml: cleanHtml})
        
    } catch (err) {
        console.error("AI API Error: ", err);
        res.status(500).json({error: "Failed to gather vault data: " + err.message})
    }
})

app.post('/api/resumes', authorize, (req, res) => {
    const {jobTitle, jobDescription, resumeHtml} = req.body
    const userId = req.userId
    const resumeId = uuidv4()

    const strQuery = "INSERT INTO tblResumes (id, user_id, job_title, job_description, resume_html) VALUES (?, ?, ?, ?, ?)"
    db.run(strQuery, [resumeId, userId, jobTitle, jobDescription, resumeHtml], (err) => {
        if (err) {
            return res.status(500).json({error: err.message})
        }
        res.status(201).json({message: "Resume saved to history", id: resumeId})
    })
})

app.get('/api/resumes', authorize, (req, res) => {
    const userId = req.userId
    const strQuery = "SELECT id, job_title, job_description, resume_html FROM tblResumes WHERE user_id = ? ORDER BY created_at DESC"
    db.all(strQuery, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({error: err.message})
        }
        res.status(200).json(rows || {})
    })
})

app.listen(PORT, () => {
    console.log(`GoCandidIt is live at http://localhost:${PORT}`)
})
