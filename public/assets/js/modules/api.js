/**
 * api.js - Centralized API request helper module for GoCandidIt
 */

export async function apiRequest(endpoint, options = {}) {
    const sessionId = localStorage.getItem('sessionId')
    const headers = { ...(options.headers || {}) }

    // Automatically attach x-session-id if present
    if (sessionId && !headers['x-session-id']) {
        headers['x-session-id'] = sessionId
    }

    // Automatically stringify JSON body if provided as object
    let body = options.body
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json'
        }
        body = JSON.stringify(body)
    }

    const config = {
        ...options,
        headers,
        body
    }

    try {
        const response = await fetch(endpoint, config)
        let data = null
        try {
            data = await response.json()
        } catch (e) {
            data = null
        }

        return {
            ok: response.ok,
            status: response.status,
            data: data
        }
    } catch (error) {
        console.error(`API Request failed for ${endpoint}:`, error)
        throw error
    }
}

// Named API Helper endpoints
export async function fetchConfig() {
    return apiRequest('/api/config')
}

export async function loginApi(email, password) {
    return apiRequest('/api/login', {
        method: 'POST',
        body: { email, password }
    })
}

export async function registerApi(email, password) {
    return apiRequest('/api/register', {
        method: 'POST',
        body: { email, password }
    })
}

export async function logoutApi() {
    return apiRequest('/api/logout', {
        method: 'DELETE'
    })
}

export async function fetchProfileApi() {
    return apiRequest('/api/profile')
}

export async function updateProfileApi(payload) {
    return apiRequest('/api/profile', {
        method: 'PUT',
        body: payload
    })
}

export async function fetchVaultDataApi(category) {
    return apiRequest(`/api/${category}`)
}

export async function saveVaultItemApi(endpoint, method, payload) {
    return apiRequest(endpoint, {
        method,
        body: payload
    })
}

export async function deleteVaultItemApi(category, id) {
    return apiRequest(`/api/${category}/${id}`, {
        method: 'DELETE'
    })
}

export async function generateResumeApi(jobDescription) {
    return apiRequest('/api/generate-resume', {
        method: 'POST',
        body: { jobDescription }
    })
}

export async function fetchResumesApi() {
    return apiRequest('/api/resumes')
}
