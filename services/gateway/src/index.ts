import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { conversationsRouter } from './routes/conversations';
import { contactsRouter } from './routes/contacts';
import { messagesRouter } from './routes/messages';
import { knowledgeRouter } from './routes/knowledge';
import { aiAgentsRouter } from './routes/ai-agents';
import { dealsRouter } from './routes/deals';
import { channelsRouter } from './routes/channels';
import { analyticsRouter } from './routes/analytics';
import { webhooksRouter } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { setupSocketIO } from './socket';

const app = express();
const httpServer = createServer(app);

// ============ SOCKET.IO ============
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

setupSocketIO(io);

// Make io accessible to routes
app.set('io', io);

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ============ HEALTH CHECK ============
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'LeadsAI Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ============ PUBLIC ROUTES ============
app.use('/api/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);

// ============ PROTECTED ROUTES ============
app.use('/api', authMiddleware, tenantMiddleware);
app.use('/api/conversations', conversationsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/ai-agents', aiAgentsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/analytics', analyticsRouter);

// ============ ERROR HANDLER ============
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Gateway Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ============ START ============
const PORT = parseInt(process.env.PORT || process.env.GATEWAY_PORT || '4000', 10);
httpServer.listen(PORT, () => {
  console.log(`🚀 LeadsAI Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for real-time connections`);
});
