const path = require('path')
const isElectron = process.versions.hasOwnProperty('electron')
const isPackaged = !process.defaultApp && isElectron
require('dotenv').config({
    path: isPackaged ? path.join(process.resourcesPath, '.env') : path.join(__dirname, '.env')
})

const {GoogleGenerativeAI} = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({model: "gemini-3-flash-preview"})

const express = require('express')
const {v4: uuidv4} = require('uuid')
const bcrypt = require('bcrypt')
const sqlite3 = require('sqlite3')
const crypto = require('node:crypto')
const { buffer } = require('node:stream/consumers')
const algorithm = 'aes-256-cbc'

const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8')
const ivLength = 16

// attempt electron app
let electronApp
try {
    if (isElectron) {
        const electron = require('electron')
        electronApp = electron.app
    }
} catch (err) {
    // running it in a browser
    electronApp = null
}

const app = express()
const PORT = process.env.PORT || 8000

app.use(express.json())

// Serve all static files (CSS, JS, Vendor, Images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')))

// connect to database
let dbPath
function getDbPath() {
    if (dbPath) return dbPath
    if (electronApp) {
        // use Roaming App Data for desktop app
        dbPath = path.join(electronApp.getPath('userData'), 'database.db')
    } else {
        // use project root for the browser/server env
        dbPath = path.join(__dirname, 'database.db')
    }
    return dbPath
}

const db = new sqlite3.Database(getDbPath(), (err) => {
    if (err) {
        console.log(`Error opening database: ${err.message}`)
    } else {
        console.log(`Connected to local database at: ${dbPath}`)
    }
})

// if db is not present, create the tables needed
db.serialize(() => {
    // Users Table
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

    // Sessions Table
    db.run(`CREATE TABLE IF NOT EXISTS tblSessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    // Jobs Table
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

    // Education Table
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

    // Projects Table
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

    // Resumes Table
    db.run(`CREATE TABLE IF NOT EXISTS tblResumes (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        job_title TEXT,
        job_description TEXT,
        resume_html TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES tblUsers(id)
    )`);

    // add gemini_api_key column
    db.run(`ALTER TABLE tblUsers ADD COLUMN gemini_api_key TEXT`, (err) => {
        if (err) {
            console.log("NOTE: gemini_api_key column might already exist or: ", err.message)
        } else {
            console.log("Added gemini_api_key column to tblUsers")
        }
    })

    console.log("Database schema verified/created.");
});

function encrypt(text) {
    const iv = crypto.randomBytes(ivLength)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text) {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
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
    const {full_name, skills, phone, linkedin_url, github_url, summary, gemini_api_key} = req.body
    // only encrypt if an api key is given
    const encryptedKey = gemini_api_key ? encrypt(gemini_api_key) : null

    const strQuery = "UPDATE tblUsers SET full_name=?, skills=?, phone=?, linkedin_url=?, github_url=?, summary=?, gemini_api_key=? WHERE id = ?"
    db.run(strQuery, [full_name, skills, phone, linkedin_url, github_url, summary, encryptedKey, userId], (err) => {
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
            if (row && row.gemini_api_key) {
                // mask from ui
                row.gemini_api_key = "STORED_ENCRYPTED"
            }
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
        // get profile with encrypted api key
        const profile = await new Promise((res, rej) => db.get("SELECT email, skills, phone, linkedin_url, summary, github_url, full_name, gemini_api_key FROM tblUsers WHERE id = ?", [userId], (e, r) => e ? rej(e) : res(r)))
        // default to model from .env
        let activeModel = model

        // if user provided their key, overwrite activeModel
        if (profile.gemini_api_key) {
            try {
                const decryptedKey = decrypt(profile.gemini_api_key)
                const userGenAI = new GoogleGenerativeAI(decryptedKey)
                activeModel = userGenAI.getGenerativeModel({model: "gemini-3-flash-preview"})
            } catch (decryptionError) {
                console.error("Decryption failed, falling back to default key:", decryptionError)
            }
        }

        // get all data from db
        // for tblUsers, don't get bcrypted passwords. AI does not need that
        // call res(r) if it successfully got the data, otherwise call rej(e) to show something went wrong
        const jobs = await new Promise((res, rej) => db.all("SELECT company, role, location, start_date, end_date, description FROM tblJobs WHERE user_id = ? ORDER BY start_date DESC", [userId], (e, r) => e ? rej(e) : res(r)));
        const education = await new Promise((res, rej) => db.all("SELECT school_name, degree, major, minor, gpa, location, start_date, end_date FROM tblEducation WHERE user_id = ? ORDER BY end_date DESC", [userId], (e, r) => e ? rej(e) : res(r)));
        const projects = await new Promise((res, rej) => db.all("SELECT title, description, tech_stack, link, proj_date FROM tblProjects WHERE user_id = ? ORDER BY proj_date DESC", [userId], (e, r) => e ? rej(e) : res(r)));
    
        // format into a more readable string for AI to reduce errors
        const formatExperience = (arr) => arr.map(item => `
            - ROLE/TITLE: ${item.role || item.title}
            - ORGANIZATION: ${item.company || 'Personal Project'}
            - DATES: ${convertDateToReadable(item.start_date) || ''} - ${convertDateToReadable(item.end_date) || convertDateToReadable(item.proj_date) || ''}
            - RAW DETAILS (HTML): ${item.description || 'No description provided'}
        `).join("\n---\n")

        // build prompt with personalized data
        const strPrompt = `
            ROLE: Expert ATS-Optimization Resume Architect
            TASK: Generate a high-impact, professional HTML resume.

            CRITICAL INSTRUCTIONS:
            1. EXHAUSTIVE BULLETS: For every Experience and Project entry, you MUST parse the 'RAW DETAILS' field. Extract technical achievements and transform them into 3-5 high-impact bullet points. Use action verbs (e.g., 'Optimized', 'Architected').
            2. SKILLS SECTION: Create a dedicated 'Technical Skills' section. Use these specific skills from the user profile: ${profile.skills}. If any match the Target Job Description, BOLD them.
            3. CONTACT INTEGRATION: Use exact contact info: Email: ${profile.email}, Phone: ${profile.phone}, LinkedIn: ${profile.linkedin_url}, GitHub: ${profile.github_url}.
            4. ATS OPTIMIZATION: Tailor the professional summary and bullet points to match keywords found in the Target Job Description.
            5. HTML FORMATTING: Return ONLY the inner HTML fragment. Your response must begin directly with an HTML tag like <h2> or <div>. DO NOT include \`\`\`html, <html>, <head>, <body>, or any markdown formatting of any kind.

            USER PROFILE:
            ${JSON.stringify(profile)}

            WORK HISTORY:
            ${formatExperience(jobs)}

            PROJECT HISTORY:
            ${formatExperience(projects)}

            EDUCATION HISTORY:
            ${JSON.stringify(education)}

            TARGET JOB DESCRIPTION:
            ${jobDescription}
        `

        const result = await activeModel.generateContent(strPrompt)
        const response = await result.response
        const text = response.text()

        // cleanup response (markdown code blocks that AI typically inserts and unnecessary HTML artifacts)
        const cleanHtml = text
            .replace(/^```[a-zA-Z]*\n?/m, "")   // strip opening code fence
            .replace(/```\s*$/m, "")             // strip closing code fence
            .replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, "")  // strip full doc header if present
            .replace(/<\/body>[\s\S]*$/i, "")    // strip closing body/html tags
            .trim()

        res.status(200).json({resumeHtml: cleanHtml})
        
    } catch (err) {
        console.error("AI API Error: ", err);
        res.status(500).json({error: "Resume generationg failed. Check your API key. " + err.message})
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
        res.status(200).json(rows || [])
    })
})

app.listen(PORT, () => {
    console.log(`GoCandidIt is live at http://localhost:${PORT}`)
})
