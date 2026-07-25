const express = require('express')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const { db } = require('../config/db')
const authorize = require('../middleware/auth')
const { sendSuccess, sendError } = require('../utils/response')

const router = express.Router()

// --- REGISTER ROUTE ---
router.post(['/register', '/api/register'], (req, res) => {
    const { email, password } = req.body
    const userId = uuidv4()
    try {
        const strHashedPassword = bcrypt.hashSync(password, 12)
        const strQuery = "INSERT INTO tblUsers (id, email, password_hash) VALUES (?, ?, ?)"
        db.run(strQuery, [userId, email, strHashedPassword], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    return sendError(res, "An account is already registered with that email", err, 400)
                }
                return sendError(res, "Failed to register user", err, 400)
            }

            // create a session immediately after registration
            const strSessionId = uuidv4()
            const strSessionQuery = "INSERT INTO tblSessions (session_id, user_id) VALUES (?, ?)"
            db.run(strSessionQuery, [strSessionId, userId], (sessionErr) => {
                if (sessionErr) {
                    return sendError(res, "User registered, but session creation failed", sessionErr, 500)
                }
                return sendSuccess(res, { userId: userId, sessionId: strSessionId }, "User registered and logged in", 201)
            })
        })
    } catch(err) {
        return sendError(res, "Failed to register user", err, 500)
    }
})

// --- LOGIN ROUTE ---
router.post(['/login', '/api/login'], (req, res) => {
    const { email, password } = req.body
    const strQuery = "SELECT * FROM tblUsers WHERE email = ?"
    db.get(strQuery, [email], (err, user) => {
        if (err) {
            return sendError(res, "Database error during login", err, 500)
        }
        if (!user) {
            return sendError(res, "Invalid email or password", null, 401)
        }

        // check password
        const boolValidPassword = bcrypt.compareSync(password, user.password_hash)
        if (!boolValidPassword) {
            return sendError(res, "Invalid email or password", null, 401)
        } else {
            // success
            const strSessionId = uuidv4()
            const strSessionQuery = "INSERT INTO tblSessions (session_id, user_id) VALUES (?, ?)"
            db.run(strSessionQuery, [strSessionId, user.id], (err) => {
                if (err) {
                    return sendError(res, "Failed to create session", err, 500)
                } else {
                    return sendSuccess(res, { sessionId: strSessionId }, "Login successful", 201)
                }
            })
        }
    })
})

// --- LOGOUT ROUTE ---
router.delete(['/logout', '/api/logout'], authorize, (req, res) => {
    const sessionId = req.headers['x-session-id']
    const strQuery = "DELETE FROM tblSessions WHERE session_id = ?"
    db.run(strQuery, [sessionId], (err) => {
        if (err) {
            return sendError(res, "Failed to logout", err, 500)
        }
        return sendSuccess(res, null, "Successfully logged out", 200)
    })
})

module.exports = router
