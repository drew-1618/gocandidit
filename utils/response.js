// Standardize successful API response
function sendSuccess(res, data = null, message = null, statusCode = 200) {
    const payload = { success: true }
    if (data) payload.data = data
    if (message) payload.message = message
    return res.status(statusCode).json(payload)
}

// Standardize error API response
function sendError(res, userMessage, rawError = null, statusCode = 500) {
    // Log raw error for debugging
    if (rawError) {
        console.error(`API Error ${statusCode} ${userMessage}: ${rawError.message || rawError}`)
    }

    // Only send safe message to client
    return res.status(statusCode).json({
        success: false,
        error: userMessage
    })
}

module.exports = {
    sendSuccess,
    sendError
}
