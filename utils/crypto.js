const crypto = require('node:crypto')

const algorithm = 'aes-256-cbc'
const ivLength = 12  // AES block size for GCM mode

function getKey() {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY is missing from the environment.")
    }
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8')
    if (key.length !== 32) {
        throw new Error(`ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for aes-256-cbc. Current length: ${key.length} bytes.`)
    }
    return key
}

function encrypt(text) {
    const key = getKey()
    const iv = crypto.randomBytes(ivLength)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    const authTag = cipher.getAuthTag()
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text) {
    const key = getKey()
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift(), 'hex')
    const authTag = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
}

module.exports = {
    encrypt,
    decrypt
}
