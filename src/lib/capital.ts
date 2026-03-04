const LIVE_API_URL = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API_URL = 'https://demo-api-capital.backend-capital.com/api/v1';

const getApiUrl = (isDemo: boolean) => isDemo ? DEMO_API_URL : LIVE_API_URL;

export interface SessionResponse {
    cst: string;
    xSecurityToken: string;
    /** The account currently active after session creation */
    currentAccountId: string;
    /** All accounts available (CFD = live, SPREADBET = demo — varies by region) */
    accounts: Array<{
        accountId: string;
        accountName: string;
        accountType: string;
        preferred: boolean;
        currency: string;
        balance?: {
            balance: number;
            deposit: number;
            profitLoss: number;
            available: number;
        };
    }>;
    hasActiveDemoAccounts: boolean;
    hasActiveLiveAccounts: boolean;
    /** Raw body for debugging */
    [key: string]: any;
}

/**
 * POST /api/v1/session — creates a new trading session.
 * Returns the full body (accounts list + currentAccountId) PLUS
 * the CST and X-SECURITY-TOKEN headers.
 *
 * Sessions expire after 10 minutes of inactivity.
 */
export const createSession = async (
    identifier: string,
    password: string,
    apiKey: string,
    isDemo: boolean = false
): Promise<SessionResponse> => {
    const API_URL = getApiUrl(isDemo);
    const response = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CAP-API-KEY': apiKey,
        },
        body: JSON.stringify({ identifier, password, encryptedPassword: false }),
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
        xSecurityToken,
        // Ensure accounts is always an array
        accounts: data.accounts || [],
        currentAccountId: data.currentAccountId || '',
    };
};

/**
 * PUT /api/v1/session — switches the active account within the current session.
 * This is the CORRECT way to toggle between Demo and Live sub-accounts.
 *
 * After calling this, the same CST/XST tokens remain valid but all subsequent
 * API calls operate on the newly-switched account.
 */
export const switchActiveAccount = async (
    cst: string,
    xSecurityToken: string,
    accountId: string,
    isDemo: boolean = false
): Promise<void> => {
    const API_URL = getApiUrl(isDemo);
    const response = await fetch(`${API_URL}/session`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'CST': cst,
            'X-SECURITY-TOKEN': xSecurityToken,
        },
        body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Capital.com Account Switch Failed: ${response.status} - ${text}`);
    }
};

export const getAccounts = async (cst: string, xSecurityToken: string, isDemo: boolean = false, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const response = await fetch(`${API_URL}/accounts`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) throw new Error('Session Expired');
        throw new Error(`Failed to fetch accounts: ${response.status} - ${text}`);
    }

    return response.json();
};

export const getPositions = async (cst: string, xSecurityToken: string, isDemo: boolean = false, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const response = await fetch(`${API_URL}/positions`, {
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

export const getHistory = async (
    cst: string,
    xSecurityToken: string,
    isDemo: boolean = false,
    options?: { from?: string | Date; to?: string | Date; max?: number },
    apiUrl?: string
) => {
    const API_URL = apiUrl || LIVE_API_URL; // Always use unified live server for history unless specified

    const performFetch = async (currentFrom?: string | Date, currentTo?: string | Date) => {
        const params = new URLSearchParams();
        if (currentFrom) {
            const fromStr = typeof currentFrom === 'string' ? currentFrom : currentFrom.toISOString().split('.')[0];
            params.append('from', fromStr);
        }
        if (currentTo) {
            const toStr = typeof currentTo === 'string' ? currentTo : currentTo.toISOString().split('.')[0];
            params.append('to', toStr);
        }
        if (options?.max) {
            params.append('max', options.max.toString());
        }

        const queryStr = params.toString() ? `?${params.toString()}` : '';

        const response = await fetch(`${API_URL}/history/activity${queryStr}`, {
            headers: {
                'X-SECURITY-TOKEN': xSecurityToken,
                'CST': cst,
            },
        });

        if (!response.ok) {
            // Check specifically for datarange errors immediately out of the REST payload
            if (response.status === 400 || response.status === 500) {
                const text = await response.text();
                if (text.includes('error.invalid.daterange') || text.includes('error.history.invalid.daterange')) {
                    return { errorCode: 'error.invalid.daterange', originalText: text };
                }
                throw new Error(`Failed to fetch history: ${response.status} - ${text}`);
            }
            throw new Error(`Failed to fetch history: ${response.status}`);
        }

        return response.json();
    };

    let result = await performFetch(options?.from, options?.to);

    // If Capital.com rejects the date range (e.g. the 'from' date is before the account was created),
    // iteratively shrink the requested window size from the left until it succeeds or drops to 1 day.
    if (result && result.errorCode === 'error.invalid.daterange' && options?.from && options?.to) {
        let fromTime = typeof options.from === 'string' ? new Date(options.from).getTime() : options.from.getTime();
        const toTime = typeof options.to === 'string' ? new Date(options.to).getTime() : options.to.getTime();

        let distance = toTime - fromTime;
        const oneDay = 24 * 60 * 60 * 1000;

        while (distance > oneDay) {
            // Shrink the distance by half (binary search for the account inception date)
            distance = Math.floor(distance / 2);
            fromTime = toTime - distance;
            const newFromDate = new Date(fromTime);

            result = await performFetch(newFromDate, options.to);
            if (!result || result.errorCode !== 'error.invalid.daterange') {
                break; // Succeeded or failed with a different error
            }
        }
    }

    if (result && result.errorCode === 'error.invalid.daterange') {
        // If it still fails down to 1 day, drop the date requirement outright
        result = await performFetch(undefined, undefined);
    }

    return result;
};

export const getMarketTickers = async (cst: string, xSecurityToken: string, epics: string[], isDemo: boolean = false, apiUrl?: string) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const marketResponse = await fetch(`${API_URL}/markets?epics=${epics.join(',')}`, {
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

export const placeOrder = async (
    cst: string,
    xSecurityToken: string,
    epic: string,
    direction: 'BUY' | 'SELL',
    size: number,
    accountIsDemo: boolean = false,
    options?: {
        takeProfit?: number | null;
        stopLoss?: number | null;
        trailingStop?: boolean;
    },
    apiUrl?: string
) => {
    const API_URL = apiUrl || getApiUrl(accountIsDemo);

    const body: Record<string, any> = {
        epic,
        direction,
        size,
        orderType: 'MARKET',
        guaranteedStop: false,
        forceOpen: true,
    };

    if (options?.takeProfit != null) body.profitLevel = options.takeProfit;
    if (options?.stopLoss != null) body.stopLevel = options.stopLoss;
    if (options?.trailingStop) body.trailingStop = true;

    const response = await fetch(`${API_URL}/positions`, {
        method: 'POST',
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to place order: ${response.status} - ${text}`);
    }

    return response.json();
};

export const closePosition = async (
    cst: string,
    xSecurityToken: string,
    dealId: string,
    accountIsDemo: boolean = false,
    apiUrl?: string
) => {
    const API_URL = apiUrl || getApiUrl(accountIsDemo);

    const response = await fetch(`${API_URL}/positions/${dealId}`, {
        method: 'DELETE',
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to close position: ${response.status} - ${text}`);
    }

    return response.json();
};

export const getMarketPrices = async (
    cst: string,
    xSecurityToken: string,
    epic: string,
    resolution: 'MINUTE' | 'MINUTE_5' | 'MINUTE_15' | 'HOUR' | 'HOUR_4' | 'DAY' = 'MINUTE_5',
    max: number = 200,
    isDemo: boolean = false,
    apiUrl?: string
) => {
    const API_URL = apiUrl || getApiUrl(isDemo);
    const response = await fetch(`${API_URL}/prices/${epic}?resolution=${resolution}&max=${max}`, {
        headers: {
            'X-SECURITY-TOKEN': xSecurityToken,
            'CST': cst,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch prices for ${epic}: ${response.status}`);
    }

    return response.json();
};
