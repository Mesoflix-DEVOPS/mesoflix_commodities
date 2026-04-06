import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as jose from 'jose';
import dotenv from 'dotenv';
import cors from 'cors';
import { getValidSession } from './capital-service';
import { getAccounts, getPositions, getMarketTickers, getHistory } from './capital';
import { supabase } from './supabase';
import { sql } from 'drizzle-orm';
import { encrypt } from './crypto';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json()); // Essential for processing AI payloads

// Health check for Render.com
app.get('/health', (req, res) => res.status(200).send('OK'));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// --- INSTITUTIONAL BRIDGE ROUTES ---

// 1. AI Chat Bridge (Bypasses Vercel Networking with Auto-Failover)
app.post('/api/onboarding/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return res.json({ message: "Institutional AI Offline (Missing Key)." });
        }

        const systemPrompt = `You are the Mesoflix Institutional Onboarding Engine. Onboard users by collecting Full Name, Email, API Key, and API Password for their Capital.com brokerage account. Be elite and professional.`;

        const chatContents = (history || []).map((item: any) => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.parts?.[0]?.text || item.text || '') }]
        }));

        const payload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [...chatContents, { role: "user", parts: [{ text: message }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        // Resilient Tiering: Try 2.0 First, Failover to 1.5
        const tryAI = async (version: string, model: string) => {
            const fetchBody = version === 'v1' ? { 
                contents: [{ role: "user", parts: [{ text: `SYSTEM: ${systemPrompt}\n\nUSER: ${message}` }] }, ...chatContents] 
            } : payload;

            return await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fetchBody)
            });
        };

        let aiRes = await tryAI('v1beta', 'gemini-2.0-flash');
        let data: any = await aiRes.json();

        // If Quota Exceeded (429) or Service Overloaded (503), switch to High-Quota 2.0 Lite
        if (aiRes.status === 429 || aiRes.status === 503 || data.error?.code === 429) {
            console.warn("[Bridge AI] Primary Tier Throttled. Falling back to 2.0 Flash Lite...");
            aiRes = await tryAI('v1beta', 'gemini-2.0-flash-lite');
            data = await aiRes.json();
        }
        
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return res.json({ message: `Institutional AI is currently in high-demand. Please use our standard portal or retry in 60 seconds. [Error: ${data.error.message}]` });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            return res.json({ message: "Institutional AI is currently calibrating. Please retry your message." });
        }
        
        res.json({ message: text });
    } catch (err: any) {
        console.error("Bridge AI Error:", err.message);
        res.status(500).json({ error: "Bridge Link Failed" });
    }
});

// 2. Identity Verification Bridge
app.post('/api/auth/check-user', async (req, res) => {
    try {
        const { email } = req.body;
        const { data: existing, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
            
        res.json({ exists: !!existing });
    } catch (err: any) {
        console.error("Check User Error:", err.message);
        res.status(500).json({ error: "SDK Bridge Failure" });
    }
});

// 3. Human Onboarding Concierge (Meet Requests)
app.post('/api/onboarding/request-session', async (req, res) => {
    try {
        const { email, preferredTime, phone } = req.body;
        
        const { error: ticketError } = await supabase
            .from('tickets')
            .insert({
                email: email || "pending@onboarding.user",
                subject: "Onboarding Session Requested (Google Meet)",
                description: `User requested a live Google Meet walkthrough. \nPreferred Time: ${preferredTime || 'ASAP'} \nPhone: ${phone || 'Not provided'}`,
                category: 'ONBOARDING',
                onboarding_status: 'REQUESTED',
                created_at: new Date()
            });

        if (ticketError) throw ticketError;

        res.json({ success: true, message: "Handshake Successful. Our Brokerage Desk will reach out via Google Meet shortly." });
    } catch (err: any) {
        console.error("Concierge Error:", err.message);
        res.status(500).json({ error: `Concierge Bridge Failure: ${err.message}` });
    }
});

// 4. Registration & Credential Linkage Bridge
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, fullName, apiKey, apiPassword, accountType } = req.body;
        
        // 1. Create User with Hashed Password for Unified Login
        const hashedPassword = bcrypt.hashSync(apiPassword || 'temporary_default_key', 10);

        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                email,
                full_name: fullName,
                password_hash: hashedPassword,
                role: 'user',
                created_at: new Date()
            })
            .select()
            .single();

        if (userError) throw userError;

        // 2. Link Capital Credentials (Secured with Institutional Encryption)
        // Create Capital Account with correct identifier mapping
        const { error: capitalError } = await supabase
            .from('capital_accounts')
            .insert({
                user_id: newUser.id,
                capital_account_id: email, // Critical: Map login identifier for brokerage
                encrypted_api_key: encrypt(apiKey),
                encrypted_api_password: encrypt(apiPassword),
                account_type: accountType || 'demo',
                is_active: true,
                created_at: new Date()
            });

        if (capitalError) throw capitalError;

        res.json({ success: true, userId: newUser.id });
    } catch (err: any) {
        console.error("Registration Bridge Error:", err.message);
        res.status(500).json({ error: `Registration Bridge Failure: ${err.message}` });
    }
});

// --- IDENTITY GUARD & SECURE ENGINES ---

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'mesoflix-commodity-terminal-internal-fallback-v1'
);

// 0. Login Engine (Stabilized on Render)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Credentials required' });

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user || !user.password_hash) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid email or password' });

        const token = await new jose.SignJWT({ userId: user.id, email: user.email, role: user.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('3d')
            .sign(JWT_SECRET);

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, name: user.full_name }
        });
    } catch (err: any) {
        console.error("Login Bridge Failed:", err.message);
        res.status(500).json({ error: "Institutional Login Offline" });
    }
});

// Express Middleware for JWT Verification
const authGuard = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing Token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const { payload } = await jose.jwtVerify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }
};

// 0.5 User Alias (For Dashboard legacy compat)
app.get('/api/user', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', userId)
            .single();

        if (error || !user) return res.status(401).json({ error: "User Not Found" });

        res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
    } catch (err: any) {
        console.error("[Identity Bridge] Failed:", err.message);
        res.status(500).json({ error: "Identity Bridge Failed" });
    }
});

// 5. Moved Dashboard Engine (Stabilized on Render)
app.get('/api/dashboard', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const modeInput = req.query.mode || 'demo';
        const isDemo = modeInput === 'demo';

        // 1. Fetch User Profile via Supabase SDK (Ported from Drizzle)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email, role')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error(`[Dashboard Bridge] User Lookup Error:`, userError?.message);
            return res.status(404).json({ error: 'User Not Found' });
        }

        const userData = { fullName: user.full_name || 'Trader' };

        try {
            const session = await getValidSession(userId, isDemo);
            if (!session) throw new Error("Brokerage Link Unavailable");

            const [accountsData, positionsData, historyData] = await Promise.all([
                getAccounts(session.cst, session.xSecurityToken, isDemo, session.serverUrl),
                getPositions(session.cst, session.xSecurityToken, isDemo, session.serverUrl),
                getHistory(session.cst, session.xSecurityToken, isDemo, { max: 50 }, session.serverUrl)
            ]) as [any, any, any];

            // Filter accounts strictly by the requested mode (Fixes "Demo in Real" bug)
            const targetType = isDemo ? 'demo' : 'live';
            const accounts = (accountsData.accounts || [])
                .filter((a: any) => (a.accountType || '').toLowerCase() === targetType)
                .map((a: any) => ({
                    ...a,
                    balance: {
                        ...(a.balance || {}),
                        availableToWithdraw: a.balance?.available ?? a.balance?.availableToWithdraw ?? 0,
                        equity: (a.balance?.balance ?? 0) + (a.balance?.pnl ?? 0),
                    }
                }));

            res.json({
                ...accountsData,
                accounts,
                positions: positionsData?.positions || [],
                history: historyData?.activityHistory || [],
                user: userData
            });
        } catch (capitalErr: any) {
            console.warn(`[Bridge Dashboard] Capital Connection Lag for ${userId}:`, capitalErr.message);
            res.json({
                accounts: [], positions: [], history: [],
                warning: `Institutional Connection Lag: ${capitalErr.message}`,
                user: userData
            });
        }
    } catch (err: any) {
        console.error("Dashboard Bridge Critical Failure:", err.message);
        res.status(500).json({ error: "Institutional Dashboard Offline" });
    }
});

// 6. Moved Notification Engine (Stabilized on Render)
app.get('/api/notifications', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { data: items, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const unreadCount = items?.filter((i: any) => !i.read).length || 0;
        res.json({ notifications: items || [], unreadCount });
    } catch (err: any) {
        console.error("Notification Bridge Failed:", err.message);
        res.status(500).json({ error: "Institutional Alerts Offline" });
    }
});

// 7. Identity Engine (Stabilized on Render)
app.get('/api/auth/me', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', userId)
            .single();

        if (error || !user) {
            console.warn(`[Identity Bridge] User ${userId} lookup failed.`);
            return res.status(401).json({ error: "Session Expired" });
        }

        res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
    } catch (err: any) {
        console.error("[Identity Bridge] Critical Failure:", err.message);
        res.status(500).json({ error: "Identity Bridge Link Offline" });
    }
});

// 8. Automation Registry (Stabilized on Render)
app.get('/api/automation/deploy', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { data: deps, error } = await supabase
            .from('automation_deployments')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ deployments: deps || [] });
    } catch (err: any) {
        console.error("Automation Registry Failed:", err.message);
        res.status(500).json({ error: "Automation Registry Offline" });
    }
});

app.post('/api/automation/deploy', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const body = req.body;
        const { engine_id, action, status } = body;

        if (action === "update_state") {
            const { error } = await supabase
                .from('automation_deployments')
                .update({ status, updated_at: new Date() })
                .eq('user_id', userId)
                .eq('engine_id', engine_id);
            if (error) throw error;
            return res.json({ success: true });
        }

        // New Deploy or Upsert
        const { data: existing } = await supabase
            .from('automation_deployments')
            .select('id')
            .eq('user_id', userId)
            .eq('engine_id', engine_id)
            .single();

        if (existing) {
            const { error } = await supabase
                .from('automation_deployments')
                .update({
                    allocated_capital: body.allocated_capital?.toString(),
                    risk_multiplier: body.risk_multiplier?.toString(),
                    stop_loss_cap: body.stop_loss_cap?.toString(),
                    target_profit: body.target_profit?.toString(),
                    daily_stop_loss: body.daily_stop_loss?.toString(),
                    risk_level: body.risk_level,
                    status: 'Running',
                    mode: body.mode || 'demo',
                    updated_at: new Date()
                })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('automation_deployments')
                .insert({
                    user_id: userId,
                    engine_id,
                    commodity: body.commodity,
                    allocated_capital: body.allocated_capital?.toString(),
                    risk_multiplier: body.risk_multiplier?.toString() || "1.0",
                    stop_loss_cap: body.stop_loss_cap?.toString(),
                    target_profit: body.target_profit?.toString(),
                    daily_stop_loss: body.daily_stop_loss?.toString(),
                    risk_level: body.risk_level || "Balanced",
                    status: 'Running',
                    mode: body.mode || 'demo'
                });
            if (error) throw error;
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error("Automation Deploy Failed:", err.message);
        res.status(500).json({ error: "Automation Deploy Failure" });
    }
});

// 9. Heartbeat Runner (Stabilized on Render)
app.post('/api/automation/runner', authGuard, async (req: any, res) => {
    res.json({ success: true, message: "Heartbeat Acknowledged by Render" });
});

// 10. Trade Execution Bridge (Stabilized on Render)
app.delete('/api/trade', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { dealId } = req.query;
        const modeInput = req.query.mode || 'demo';
        const isDemo = modeInput === 'demo';

        const session = await getValidSession(userId, isDemo);
        // Execute position closure via stable SDK library
        // Note: For now we proxy the request to ensure 100% driver stability
        const API_URL = isDemo ? 'https://demo-api-capital.backend-capital.com/api/v1' : 'https://api-capital.backend-capital.com/api/v1';
        
        const closeRes = await fetch(`${API_URL}/positions/${dealId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken
            }
        });

        if (!closeRes.ok) throw new Error("Broker rejected position closure");
        res.json({ success: true, message: "Trade closed successfully via Render Bridge" });
    } catch (err: any) {
        console.error("Trade Bridge Failed:", err.message);
        res.status(500).json({ error: "Trade Execution Offline" });
    }
});

// 11. Account Selection & Brokerage CRUD (Stabilized on Render)
app.get('/api/capital/connect', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { data: accounts, error } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map fields to match legacy frontend expectations
        const formatted = (accounts || []).map(a => ({
            id: a.id,
            label: a.account_type === 'demo' ? 'Demo Account' : 'Live Account',
            is_active: a.is_active,
            created_at: a.created_at
        }));
        
        res.json({ accounts: formatted });
    } catch (err: any) {
        console.error("Capital Link List Failed:", err.message);
        res.status(500).json({ error: "Brokerage Link Library Offline" });
    }
});

app.post('/api/capital/connect', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { label, apiKey, password, accountType } = req.body;
        
        const { error } = await supabase
            .from('capital_accounts')
            .insert({
                user_id: userId,
                encrypted_api_key: encrypt(apiKey),
                encrypted_api_password: encrypt(password),
                account_type: accountType || 'demo',
                is_active: false,
                created_at: new Date()
            });

        if (error) throw error;
        res.json({ success: true, message: "Institutional Link established" });
    } catch (err: any) {
        console.error("Capital Link Post Failed:", err.message);
        res.status(500).json({ error: "Brokerage Handshake Failed" });
    }
});

app.delete('/api/capital/connect', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { id } = req.query;
        const { error } = await supabase
            .from('capital_accounts')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, message: "Institutional Link Terminated" });
    } catch (err: any) {
        res.status(500).json({ error: "Deletion Failed" });
    }
});

app.post('/api/capital/select', authGuard, async (req: any, res) => {
    try {
        const userId = req.userId;
        const { accountId, accountType } = req.body;
        const isDemo = accountType === 'demo';

        const { error } = await supabase
            .from('capital_accounts')
            .update({
                [isDemo ? 'selected_demo_account_id' : 'selected_real_account_id']: accountId,
                updated_at: new Date()
            })
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true, message: "Institutional Account Switched" });
    } catch (err: any) {
        console.error("Account Selection Failed:", err.message);
        res.status(500).json({ error: "Account Selection Offline" });
    }
});

// Map to track active per-socket polling loops
const activePolls = new Map<string, NodeJS.Timeout>();

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized: Missing Token'));

    try {
        const { payload } = await jose.jwtVerify(token, JWT_SECRET);
        socket.data.userId = payload.userId;
        next();
    } catch (err) {
        next(new Error('Unauthorized: Invalid Token'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    socket.on('start-stream', async (config: { mode: string, epics?: string[] }) => {
        const { mode, epics = ['GOLD', 'OIL_CRUDE', 'BTCUSD'] } = config;
        const isDemo = mode === 'demo';

        // Clear existing poll for this socket
        if (activePolls.has(socket.id)) {
            clearInterval(activePolls.get(socket.id));
        }

        const pollData = async () => {
            try {
                // Use the same logic as the SSE stream but emit via Socket.io
                const currentSession = await getValidSession(userId, isDemo);

                // CRITICAL CRASH GUARD: If session is null, don't attempt to use .cst
                if (!currentSession) {
                    console.warn(`[Socket Poll] Brokerage Session Unavailable for ${userId} (Mode: ${mode})`);
                    return; 
                }

                const [accountsData, positionsData, marketData] = await Promise.all([
                    getAccounts(currentSession.cst, currentSession.xSecurityToken, isDemo, currentSession.serverUrl),
                    getPositions(currentSession.cst, currentSession.xSecurityToken, isDemo, currentSession.serverUrl),
                    getMarketTickers(currentSession.cst, currentSession.xSecurityToken, epics, isDemo, currentSession.serverUrl)
                ]) as [any, any, any];

                // 1. Unified Market Data Emission (matching UI field names)
                if (marketData?.marketDetails) {
                    const formattedMarket = marketData.marketDetails.map((detail: any) => ({
                        epic: detail.instrument.epic,
                        bid: detail.snapshot.bid,
                        offer: detail.snapshot.offer,
                        high: detail.snapshot.high,
                        low: detail.snapshot.low,
                        netChange: detail.snapshot.netChange,
                        percentageChange: detail.snapshot.percentageChange
                    }));
                    socket.emit('market-data', formattedMarket);
                }

                // 2. Separate Balance & Positions (as expected by Frontend listeners)
                if (accountsData?.accounts) {
                    // Strict filtering: Only use the account that matches our current stream mode
                    const targetType = isDemo ? 'demo' : 'live';
                    const activeAccount = accountsData.accounts.find((a: any) => 
                        a.accountId === currentSession.activeAccountId && 
                        (a.accountType || '').toLowerCase() === targetType
                    ) || accountsData.accounts.find((a: any) => (a.accountType || '').toLowerCase() === targetType);

                    if (activeAccount) {
                        socket.emit('balance', {
                            ...activeAccount.balance,
                            profitLoss: activeAccount.balance.pnl, // Sync for UI 'parseBalance'
                            isDemo,
                            accountId: activeAccount.accountId,
                            accountName: activeAccount.accountName,
                        });
                    }
                }

                if (positionsData?.positions) {
                    socket.emit('positions', positionsData.positions);
                }

            } catch (error: any) {
                console.error(`[Socket Poll Error] ${userId}:`, error.message);
                if (error.message?.includes('401') || error.message?.toLowerCase().includes('session')) {
                    socket.emit('stream-error', { message: 'Session expired' });
                    clearInterval(activePolls.get(socket.id));
                }
            }
        };

        // Complete Real-Time: 1s heartbeat
        await pollData();
        const timer = setInterval(pollData, 1000);
        activePolls.set(socket.id, timer);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
        if (activePolls.has(socket.id)) {
            clearInterval(activePolls.get(socket.id));
            activePolls.delete(socket.id);
        }
    });
});

// 5. Bridge Health Diagnostic (Verification Tool)
app.get('/api/bridge/health', async (req, res) => {
    const health: any = {
        status: "OPERATIONAL",
        ai_handshake: "PENDING",
        database_handshake: "PENDING",
        timestamp: new Date().toISOString()
    };

    try {
        // 1. Test Database (Supabase SDK)
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        health.database_handshake = "SUCCESS (Render SDK -> Supabase HTTPS Stable)";
    } catch (err: any) {
        health.database_handshake = `FAILED: ${err.message}`;
        health.status = "DEGRADED";
    }

    try {
        // 2. Test AI (Simple check)
        const API_KEY = process.env.GEMINI_API_KEY;
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
        });
        if (aiRes.ok) {
            health.ai_handshake = "SUCCESS (Render -> Gemini 2.0 Stable)";
        } else {
            const errData: any = await aiRes.json();
            health.ai_handshake = `FAILED: ${errData.error?.message || 'API rejected'}`;
            health.status = "DEGRADED";
        }
    } catch (err: any) {
        health.ai_handshake = `FAILED: ${err.message}`;
        health.status = "DEGRADED";
    }

    res.json(health);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Mesoflix Real-time Server active on port ${PORT}`);
});
