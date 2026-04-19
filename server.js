require('dotenv').config()
const express = require('express')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 8000

// Middleware to handle JSON data (for Gemini API calls later)
app.use(express.json())

// Serve all static files (CSS, JS, Vendor, Images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')))

app.listen(PORT, () => {
    console.log(`GoCandidIt is live at http://localhost:${PORT}`)
})
