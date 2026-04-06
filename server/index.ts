import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as jose from 'jose';
import dotenv from 'dotenv';
import cors from 'cors';
import { getValidSession } from './capital-service';
import { getAccounts, getPositions, getMarketTickers } from './capital';

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

import { db } from './db';
import { users, tickets, capitalAccounts } from './schema';
import { eq } from 'drizzle-orm';

// --- INSTITUTIONAL BRIDGE ROUTES ---

// 1. AI Chat Bridge (Bypasses Vercel Networking)
app.post('/api/onboarding/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return res.json({ message: "Institutional AI Offline (Missing Key)." });
        }

        const systemPrompt = `You are the Mesoflix Institutional Onboarding Engine. Your goal is to onboard new users through a conversational interface instead of a form.

    **PROTOCOL OVERVIEW:**
    1. **Capital Check**: Ask if they have a Capital.com account. If NO, share the link: https://go.capital.com/visit/?bta=44529&brand=capital. Tell them to return when done.
    2. **Identity**: Collect Full Name and Email. 
       - **MANDATORY**: After getting the email, you MUST output a JSON action to check if the user exists: \`ACTION: CHECK_USER(email)\`.
    3. **API Setup**: Provide instructions for creating an API Key and API Password in Capital.com Settings > API Integration.
    4. **Credential Collection**: Collect the API Key and API Password.
    5. **Finalization**: Once you have Email, Name, API Key, and API Password, output the final action: \`ACTION: COMPLETE_REGISTRATION(email, name, apiKey, apiPassword)\`.

    **TONE:** Institutional, elite, and high-end.`;

        const chatContents = (history || []).map((item: any) => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.parts?.[0]?.text || item.text || '') }]
        }));

        const payload = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: [
                ...chatContents,
                { role: "user", parts: [{ text: message }] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data: any = await aiRes.json();
        
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return res.json({ message: `AI Link Error: ${data.error.message || 'Unknown Protocol Failure'}` });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            console.warn("Gemini Safety Block or Empty Response:", data);
            return res.json({ message: "Institutional AI is currently calibrating its safety protocols. Please try rephrasing your request." });
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
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        res.json({ exists: !!existing });
    } catch (err) {
        res.status(500).json({ error: "DB Bridge Failure" });
    }
});

// 3. Support Ticket Bridge
app.post('/api/support/tickets', async (req, res) => {
    try {
        const { email, category, subject, description } = req.body;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (!user) return res.status(404).json({ error: "Client Not Found" });

        await db.insert(tickets).values({
            user_id: user.id,
            category: category || 'Onboarding',
            subject: subject || 'Manual Assistance Requested',
            description: description || 'User requested human intervention during AI onboarding.',
            status: 'OPEN',
            priority: 'HIGH'
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Ticket Bridge Failure" });
    }
});

// 4. Registration & Credential Linkage Bridge
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, fullName, apiKey, apiPassword, accountType } = req.body;
        
        // 1. Create User
        const [newUser] = await db.insert(users).values({
            email,
            full_name: fullName,
            role: 'user',
            created_at: new Date()
        }).returning();

        // 2. Link Capital Credentials (Placeholder for encryption)
        // In a real scenario, use the same encryption logic as the frontend
        await db.insert(capitalAccounts).values({
            user_id: newUser.id,
            encrypted_api_key: apiKey, // Should be encrypted in production
            encrypted_api_password: apiPassword,
            account_type: accountType || 'demo',
            is_active: true
        });

        res.json({ success: true, userId: newUser.id });
    } catch (err: any) {
        console.error("Registration Bridge Error:", err.message);
        res.status(500).json({ error: "Registration Bridge Failure" });
    }
});

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

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

                const [accountsData, positionsData, marketData]: [any, any, any] = await Promise.all([
                    getAccounts(currentSession.cst, currentSession.xSecurityToken, isDemo, currentSession.serverUrl),
                    getPositions(currentSession.cst, currentSession.xSecurityToken, isDemo, currentSession.serverUrl),
                    getMarketTickers(currentSession.cst, currentSession.xSecurityToken, epics, isDemo, currentSession.serverUrl)
                ]);

                // Emit Market Data
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

                // Emit Balances
                if (accountsData?.accounts) {
                    const activeAccountDetails = accountsData.accounts.find((a: any) => a.accountId === currentSession.activeAccountId);
                    if (activeAccountDetails) {
                        socket.emit('balance', {
                            balance: activeAccountDetails.balance,
                            isDemo
                        });
                    }
                }

                // Emit Positions
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

        // Poll immediately, then every 2 seconds
        await pollData();
        const timer = setInterval(pollData, 2000);
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Mesoflix Real-time Server active on port ${PORT}`);
});
