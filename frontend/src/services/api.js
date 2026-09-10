const API_BASE_URL = "http://localhost:8000/fin-ai";

// ==========================================
// TOKEN HELPERS
// ==========================================

function getAccessToken() {
    return sessionStorage.getItem("access_token");
}

function getRefreshToken() {
    return sessionStorage.getItem("refresh_token");
}

// ==========================================
// COMMON HEADERS
// ==========================================

function getHeaders() {
    const token = getAccessToken();

    if (!token) {
        throw new Error(
            "You are not logged in. Access token is missing."
        );
    }

    return {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
    };
}

// ==========================================
// REFRESH ACCESS TOKEN
// ==========================================

export async function refreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        throw new Error(
            "Refresh token is missing. Please login again."
        );
    }

    const response = await fetch(
        `${API_BASE_URL}/token/refresh/`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },

            body: JSON.stringify({
                refresh: refreshToken,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        clearAuthSession();

        throw new Error(
            "Your session has expired. Please login again."
        );
    }

    sessionStorage.setItem(
        "access_token",
        data.access
    );

    return data.access;
}

// ==========================================
// COMMON RESPONSE HANDLER
// ==========================================

async function parseResponse(response) {
    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            throw new Error(
                `Server returned invalid response (${response.status})`
            );
        }
    }

    return data;
}

// ==========================================
// AUTHENTICATED REQUEST
// Automatically refreshes expired access token
// ==========================================

async function authenticatedFetch(
    url,
    options = {},
    retry = true
) {
    const token = getAccessToken();

    if (!token) {
        throw new Error(
            "You are not logged in. Access token is missing."
        );
    }

    const response = await fetch(
        url,
        {
            ...options,

            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );

    // Access token expired
    if (response.status === 401 && retry) {
        try {
            const newAccessToken =
                await refreshAccessToken();

            return await authenticatedFetch(
                url,
                {
                    ...options,

                    headers: {
                        ...options.headers,

                        Authorization:
                            `Bearer ${newAccessToken}`,

                        Accept: "application/json",
                    },
                },
                false
            );

        } catch (error) {
            throw error;
        }
    }

    const data = await parseResponse(response);

    if (!response.ok) {

        if (response.status === 401) {
            throw new Error(
                "Your session has expired. Please login again."
            );
        }

        throw new Error(
            data.message ||
            data.detail ||
            data.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

// ==========================================
// UPLOAD BANK STATEMENT
// ==========================================

export async function uploadBankStatement(file) {

    const token = getAccessToken();

    if (!token) {
        throw new Error(
            "You are not logged in. Access token is missing."
        );
    }

    if (!file) {
        throw new Error(
            "Please select an Excel file."
        );
    }

    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    const response = await fetch(
        `${API_BASE_URL}/statements/upload/`,
        {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${token}`,

                Accept: "application/json",
            },

            body: formData,
        }
    );

    // Access token expired during upload
    if (response.status === 401) {

        try {

            const newAccessToken =
                await refreshAccessToken();

            const retryResponse =
                await fetch(
                    `${API_BASE_URL}/statements/upload/`,
                    {
                        method: "POST",

                        headers: {
                            Authorization:
                                `Bearer ${newAccessToken}`,

                            Accept: "application/json",
                        },

                        body: formData,
                    }
                );

            const data =
                await parseResponse(
                    retryResponse
                );

            if (!retryResponse.ok) {
                throw new Error(
                    data.message ||
                    data.detail ||
                    "Upload failed"
                );
            }

            return data;

        } catch (error) {
            throw error;
        }
    }

    const data =
        await parseResponse(response);

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.detail ||
            `Upload failed (${response.status})`
        );
    }

    return data;
}

// ==========================================
// DASHBOARD
// ==========================================

export async function getDashboard() {

    return await authenticatedFetch(
        `${API_BASE_URL}/dashboard/`,
        {
            method: "GET",
        }
    );
}

// ==========================================
// TRANSACTIONS
// ==========================================

export async function getTransactions() {

    return await authenticatedFetch(
        `${API_BASE_URL}/transactions/`,
        {
            method: "GET",
        }
    );
}

// ==========================================
// CATEGORIES
// ==========================================

export async function getCategories() {

    return await authenticatedFetch(
        `${API_BASE_URL}/categories/`,
        {
            method: "GET",
        }
    );
}

// ==========================================
// MONTHLY DATA
// ==========================================

export async function getMonthlyData() {

    return await authenticatedFetch(
        `${API_BASE_URL}/monthly/`,
        {
            method: "GET",
        }
    );
}

// ==========================================
// INSIGHTS
// ==========================================

export async function getInsights() {

    return await authenticatedFetch(
        `${API_BASE_URL}/insights/`,
        {
            method: "GET",
        }
    );
}

// ==========================================
// STATEMENT STATUS
// ==========================================

export async function getStatementStatus(statementId) {
    if (!statementId) {
        throw new Error("Statement ID is required.");
    }

    // return await authenticatedFetch(
    //     `${API_BASE_URL}/statements/${statementId}/status/`,
    //     {
    //         method: "GET",
    //     }
    // );
}

// ==========================================
// CLEAR AUTH SESSION
// ==========================================

export function clearAuthSession() {

    sessionStorage.removeItem(
        "access_token"
    );

    sessionStorage.removeItem(
        "refresh_token"
    );

    sessionStorage.removeItem(
        "user"
    );
}

// ==========================================
// EXPORT
// ==========================================

export {
    API_BASE_URL,
    getAccessToken,
    getRefreshToken,
    getHeaders,
};
