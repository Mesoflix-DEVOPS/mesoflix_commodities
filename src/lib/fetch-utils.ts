import { useRouter } from "next/navigation";

// Global promise to track an ongoing refresh attempt
let refreshPromise: Promise<Response | null> | null = null;

/**
 * A wrapper around fetch that handles silent token refresh on 401 errors.
 * If refresh fails, it redirects to the login page.
 * 
 * @param url The URL to fetch
 * @param router The Next.js router instance
 * @param options Standard fetch options
 * @returns The fetch Response, or null if redirected to login
 */
export async function authedFetch(
    url: string,
    router: ReturnType<typeof useRouter>,
    options?: RequestInit
): Promise<Response | null> {
    try {
        let res = await fetch(url, options);

        if (res.status === 401) {
            // Concurrent refresh protection:
            // If another request is already refreshing the token, wait for it.
            if (!refreshPromise) {
                console.log("[authedFetch] 401 encountered, starting silent refresh...");
                refreshPromise = fetch('/api/auth/refresh', { method: 'POST' })
                    .then(r => {
                        refreshPromise = null; // reset for next time
                        return r;
                    })
                    .catch(e => {
                        refreshPromise = null;
                        throw e;
                    });
            } else {
                console.log("[authedFetch] 401 encountered, waiting for existing refresh promise...");
            }

            const refreshRes = await refreshPromise;

            if (refreshRes && refreshRes.ok) {
                // Refresh succeeded! Retry the original request
                console.log("[authedFetch] Refresh succeeded, retrying original request:", url);
                res = await fetch(url, options);
            } else {
                // Refresh truly failed — user needs to log in again
                console.warn("[authedFetch] Session expired/Revoked, redirecting to login");
                router.push('/login?reason=session_expired');
                return null;
            }
        }

        return res;
    } catch (error) {
        console.error(`[authedFetch] Network error for ${url}:`, error);
        throw error;
    }
}
