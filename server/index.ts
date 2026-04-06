import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as jose from 'jose';
import dotenv from 'dotenv';
import cors from 'cors';
import { getValidSession } from '../src/lib/capital-service';
import { getAccounts, getPositions, getMarketTickers } from '../src/lib/capital';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());

// Health check for Render.com
app.get('/health', (req, res) => res.status(200).send('OK'));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
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
