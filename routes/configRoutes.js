const express = require('express')
const router = express.Router()

router.get(['/', '/config', '/api/config'], (req, res) => {
    res.json({
        singleUserMode: process.env.SINGLE_USER_MODE === 'true'
    })
})

module.exports = router
