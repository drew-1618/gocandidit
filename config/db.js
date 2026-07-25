const path = require('path')
const sqlite3 = require('sqlite3')

// attempt electron app
const isElectron = process.versions.hasOwnProperty('electron')
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

// connect to database
let dbPath
function getDbPath() {
    if (dbPath) return dbPath
    if (electronApp) {
        // use Roaming App Data for desktop app
        dbPath = path.join(electronApp.getPath('userData'), 'database.db')
    } else {
        // use project root for the browser/server env
        dbPath = path.join(__dirname, '..', 'database.db')
    }
    return dbPath
}

const BUSY_TIMEOUT = 5000
const db = new sqlite3.Database(getDbPath(), (err) => {
    if (err) {
        console.log(`Error opening database: ${err.message}`)
    } else {
        console.log(`Connected to local database at: ${getDbPath()}`)

        // enable write-ahead logging for better concurrency
        db.run("PRAGMA journal_mode = WAL;", (err) => {
            if (err) console.error("Failed to enable WAL mode:", err.message)
        })

        // wait up to X seconds if db is locked before throwing busy error
        db.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT};`, (err) => {
            if (err) console.error("Failed to set busy timeout:", err.message)
        })
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
        summary TEXT,
        gemini_api_key TEXT
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

    // create indexes for faster lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON tblSessions(user_id);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_user ON tblJobs(user_id);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_education_user ON tblEducation(user_id);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_user ON tblProjects(user_id);`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_resumes_user ON tblResumes(user_id);`)

    console.log("Database schema verified/created.");
});

// delete sessions older than 12 hours
const strCleanupQuery = "DELETE FROM tblSessions WHERE created_at <= datetime('now', '-12 hours')"
db.run(strCleanupQuery, (err) => {
    if (err) {
        console.error("Session cleanup failed: ", err.message)
    } else {
        console.log("Old sessions cleared")
    }
})

// safely close db connection
function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                console.error("Error closing database: ", err.message)
                reject(err)
            } else {
                console.log("Database connection closed gracefully.")
                resolve()
            }
        })
    })
}

module.exports = {
    db,
    getDbPath,
    closeDatabase
}
