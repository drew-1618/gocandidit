/**
 * api.js - Centralized API request helper module for GoCandidIt
 */

let isSingleUserMode = false

export function setSingleUserMode(value) {
    isSingleUserMode = !!value
}

export function getSingleUserMode() {
    return isSingleUserMode
}

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

    let response
    try {
        response = await fetch(endpoint, config)
    } catch (networkError) {
        console.error(`Network error for ${endpoint}:`, networkError)
        const error = new Error('Unable to reach the server. Please check your connection.')
        error.ok = false
        throw error
    }

    let data = null
    try {
        data = await response.json()
    } catch (e) {
        data = null
    }

    if (!response.ok) {
        // Handle 401 Unauthorized for multi-user mode
        if (response.status === 401 && !isSingleUserMode) {
            localStorage.removeItem('sessionId')
            window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }

        const errorMessage = (data && (data.error || data.message)) || response.statusText || `HTTP Error ${response.status}`
        const error = new Error(errorMessage)
        error.status = response.status
        error.data = data
        error.ok = false
        throw error
    }

    return {
        ok: true,
        status: response.status,
        data: data
    }
}

// Named API Helper endpoints
export async function fetchConfig() {
    const res = await apiRequest('/api/config')
    if (res && res.data && typeof res.data.singleUserMode === 'boolean') {
        setSingleUserMode(res.data.singleUserMode)
    }
    return res
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
