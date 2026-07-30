const path = require('path')
const isElectron = process.versions.hasOwnProperty('electron')
const isPackaged = !process.defaultApp && isElectron
require('dotenv').config({
    path: isPackaged ? path.join(process.resourcesPath, '.env') : path.join(__dirname, '.env')
})

// check existence of env variables
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is missing from the environment.")
    process.exit(1)
}
if (!process.env.ENCRYPTION_KEY) {
    console.error("FATAL ERROR: ENCRYPTION_KEY is missing from the environment.")
    process.exit(1)
}

// validate encryption key length (32 bytes for AES-256-cbc)
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8')
if (key.length !== 32) {
    console.error(`FATAL ERROR: ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for aes-256-cbc. Current length: ${key.length} bytes.`)
    process.exit(1)
}

const express = require('express')
const { closeDatabase } = require('./config/db')

// Import Router Modules
const authRoutes = require('./routes/authRoutes')
const resumeRoutes = require('./routes/resumeRoutes')
const aiRoutes = require('./routes/aiRoutes')
const configRoutes = require('./routes/configRoutes')

const app = express()
const PORT = process.env.PORT || 8000

// Global Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// Mount Router Modules
app.use('/api/auth', authRoutes)
app.use('/api/resumes', resumeRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/config', configRoutes)

// Mount routers under /api for top-level endpoint support
app.use('/api', authRoutes)
app.use('/api', resumeRoutes)
app.use('/api', aiRoutes)
app.use('/api', configRoutes)

// SPA Fallback Route
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

function startServer() {
    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`GoCandidIt is live at http://localhost:${PORT}`)
            resolve(PORT)
        })

        // catch port binding errors
        server.on('error', (err) => {
            reject(err)
        })
    })
}

// if running server.js directly instead of electron, start the server
if (require.main === module) {
    startServer().catch(console.error)
}

// export for electron to consume
module.exports = { startServer, closeDatabase, app }