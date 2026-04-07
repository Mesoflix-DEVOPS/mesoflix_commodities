const LIVE_API_URL = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API_URL = 'https://demo-api-capital.backend-capital.com/api/v1';

const getApiUrl = (isDemo: boolean) => isDemo ? DEMO_API_URL : LIVE_API_URL;

// Unified Resilience Layer (Item 11)
async function capitalFetch(url: string, options: any = {}, retries = 3, backoff = 1000): Promise<Response> {
    const timeout = options.timeout || 15000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);

        // 🏁 INSTITUTIONAL GUARD: Strictly respect retry limits for 429 and 5xx (Item 11 Fix)
        if ((response.status === 429 || response.status >= 500) && retries > 0) {
            const delay = response.status === 429 ? 5000 : backoff;
            console.warn(`[Brokerage Backoff] Status ${response.status}. Retrying in ${delay}ms... (${retries} left)`);
            await new Promise(r => setTimeout(r, delay));
            return capitalFetch(url, options, retries - 1, backoff * 2);
        }

        return response;
    } catch (err: any) {
        clearTimeout(id);
        if (err.name === 'AbortError' && retries > 0) {
            console.warn(`[Capital API] Timeout. Retrying... (${retries} left)`);
            return capitalFetch(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

export const createSession = async (
    identifier: string,
    password: string,
    apiKey: string,
    isDemo: boolean = false
): Promise<any> => {
    const API_URL = getApiUrl(isDemo);
    const response = await capitalFetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CAP-API-KEY': apiKey,
        },
        body: JSON.stringify({ identifier, password, encryptedPassword: false }),
    });

    if (!response.ok) {
        throw new Error(`Capital.com Session Failed: ${response.status}`);
    }

    const data = await response.json() as { accounts: any[], currentAccountId: string, [key: string]: any };
    const cst = response.headers.get('CST');
    const xSecurityToken = response.headers.get('X-SECURITY-TOKEN');

    if (!cst || !xSecurityToken) {
        throw new Error('Failed to retrieve session tokens');
    }

    return {
        ...data,
        cst,
        xSecurityToken,
        accounts: data.accounts || [],
        currentAccountId: data.currentAccountId || '',
    };
};

export const switchActiveAccount = async (
    cst: string,
    xSecurityToken: string,
    accountId: string,
    isDemo: boolean = false
): Promise<void> => {
    const API_URL = getApiUrl(isDemo);
    const response = await capitalFetch(`${API_URL}/session`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'CST': cst,
            'X-SECURITY-TOKEN': xSecurityToken,
        },
        body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
        throw new Error(`Capital.com Account Switch Failed: ${response.status}`);
    }
};

export const getAccounts = async (cst: string, xSecurityToken: string, isDemo: boolean = false, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const response = await capitalFetch(`${API_URL}/accounts`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`);
    }

    return response.json();
};

export const getPositions = async (cst: string, xSecurityToken: string, isDemo: boolean = false, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const response = await capitalFetch(`${API_URL}/positions`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
    }

    return response.json();
};

export const getMarketTickers = async (cst: string, xSecurityToken: string, epics: string[], isDemo: boolean = false, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const marketResponse = await capitalFetch(`${API_URL}/markets?epics=${epics.join(',')}`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!marketResponse.ok) {
        throw new Error(`Failed to fetch market details: ${marketResponse.status}`);
    }

    return marketResponse.json();
};

export const getHistory = async (cst: string, xSecurityToken: string, isDemo: boolean = false, options: any = {}, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const { max = 50 } = options;
    const response = await capitalFetch(`${API_URL}/history/activity?pageSize=${max}`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
    }

    return response.json();
};
