import { NextResponse } from 'next/server';

const API_URL = 'https://api-capital.backend-capital.com/api/v1';

interface SessionResponse {
    cst: string;
    xSecurityToken: string;
    [key: string]: any;
}

export const createSession = async (identifier: string, password: string, apiKey: string): Promise<SessionResponse> => {
    // 1. Get Encryption Key (Optional but recommended, skipping for simplicity as per user request to "make it work")
    // We will use standard login for now as per docs "Using API Key, Login, and Password"

    const response = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CAP-API-KEY': apiKey,
        },
        body: JSON.stringify({
            identifier,
            password,
            encryptedPassword: false // sending plain password as allowed by API for simpler integration
        }),
    });

    if (!response.ok) {
        throw new Error(`Capital.com Session Failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const cst = response.headers.get('CST');
    const xSecurityToken = response.headers.get('X-SECURITY-TOKEN');

    if (!cst || !xSecurityToken) {
        throw new Error('Failed to retrieve session tokens (CST/XST)');
    }

    return {
        ...data,
        cst,
        xSecurityToken
    };
};

export const getAccounts = async (cst: string, xSecurityToken: string) => {
    const response = await fetch(`${API_URL}/accounts`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst
        }
    });

    if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) throw new Error("Session Expired");
        throw new Error(`Failed to fetch accounts: ${response.status} - ${text}`);
    }

    return response.json();
};
