const API_URL = 'https://api-capital.backend-capital.com/api/v1';

export const loginCapitalCom = async (identifier: string, password: string) => {
    const apiKey = process.env.CAPITAL_API_KEY || 'NyjIrILs6Uw6zD2f'; // Fallback to PRD key for dev

    const response = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CAP-API-KEY': apiKey,
        },
        body: JSON.stringify({
            identifier,
            password,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Capital.com login failed:', errorBody);
        throw new Error(`Capital.com login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const cst = response.headers.get('CST');
    const xSecurityToken = response.headers.get('X-SECURITY-TOKEN');

    return {
        ...data,
        cst,
        xSecurityToken,
    };
};

export const getAccounts = async (cst: string, xSecurityToken: string) => {
    const response = await fetch(`${API_URL}/accounts`, {
        headers: {
            'cst': cst,
            'x-security-token': xSecurityToken,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text(); // Debugging
        try {
            // sometimes session expired
            if (response.status === 401) {
                throw new Error("Session Expired");
            }
        } catch (e) { }
        throw new Error(`Failed to fetch accounts: ${response.status}`);
    }

    return response.json();
};
