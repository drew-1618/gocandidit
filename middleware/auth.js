const { db } = require('../config/db')
const { sendError } = require('../utils/response')

function authorize(req, res, next) {
    // look for the sessionId in the headers
    const sessionId = req.headers['x-session-id']
    if (!sessionId) {
        return sendError(res, "No session found. Please log in", null, 401)
    }
    const strQuery = "SELECT user_id FROM tblSessions WHERE session_id = ? AND created_at > datetime('now', '-12 hours')"
    db.get(strQuery, [sessionId], (err, row) => {
        if (err || !row) {
            return sendError(res, "Invalid or expired session", null, 401)
        } else {
            req.userId = row.user_id
            next()
        }
    })
}

module.exports = authorize
