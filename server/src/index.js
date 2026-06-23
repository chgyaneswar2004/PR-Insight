import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { createRouter } from './routes/api.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new SocketIO(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Anthropic client (optional - works without API key too)
let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log('✓ Claude AI connected');
} else {
  console.log('⚠ Running without Claude AI (set ANTHROPIC_API_KEY for AI features)');
}

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Routes
app.use('/api', createRouter(io, anthropicClient));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('subscribe:notifications', () => {
    socket.join('notifications');
  });
});

// Periodic notifications simulation
setInterval(() => {
  const events = [
    { type: 'new_pr', severity: 'info', title: 'New PR Opened', message: 'A new pull request was opened in frontend-dashboard' },
    { type: 'security', severity: 'warning', title: 'Security Scan Complete', message: 'Security scan completed for api-gateway' },
    { type: 'review_complete', severity: 'success', title: 'Review Complete', message: 'AI review finished for latest PR' },
  ];
  const event = events[Math.floor(Math.random() * events.length)];
  io.emit('notification:new', { ...event, id: Date.now().toString(), timestamp: new Date().toISOString(), read: false });
}, 30000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 PR Insight AI Server running on port ${PORT}`);
});
