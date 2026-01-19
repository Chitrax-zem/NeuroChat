require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const connectDB = require('./config/db');
const { rateLimiterMiddleware } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const voiceRoutes = require('./routes/voice');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 8888;
const isDev = process.env.NODE_ENV === 'development';

/* ===========================
   Required ENV validation
   =========================== */
if (!process.env.MONGO_URI) {
  console.error('Missing MONGO_URI in environment');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment');
  process.exit(1);
}
if (!process.env.JWT_EXPIRE) {
  console.warn('JWT_EXPIRE not set. Defaulting to 7d');
  process.env.JWT_EXPIRE = '7d';
}

/* ===========================
   Security Headers (Helmet)
   =========================== */
app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: [
          "'self'",
          'http://localhost:*',
          'https://*.devtunnels.ms',
          process.env.PUBLIC_URL || '',
          process.env.BACKEND_PUBLIC_URL || ''
        ].filter(Boolean),
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

/* ===========================
   CORS Allowlist
   =========================== */
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.PUBLIC_URL,
  process.env.BACKEND_PUBLIC_URL,
  'http://localhost:8888',
  'http://127.0.0.1:8888',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

/* ===========================
   JSON & URL-encoded Body Parsers
   =========================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ===========================
   Static Files
   =========================== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===========================
   Rate Limiting
   =========================== */
app.use(rateLimiterMiddleware);

/* ===========================
   Database Connection
   =========================== */
connectDB();

/* ===========================
   HTTP Server + Socket.IO
   =========================== */
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

/* ===========================
   Routes
   =========================== */
app.get('/', (req, res) => {
  res.send('Server running');
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'NeuroChat API is running',
    timestamp: new Date().toISOString()
  });
});

/* ===========================
   404 Fallback
   =========================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

/* ===========================
   Error Handler (must be last)
   =========================== */
app.use(errorHandler);

/* ===========================
   Start Server
   =========================== */
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ CSP: ${isDev ? 'disabled (dev mode)' : 'enabled (production)'}`);
});

module.exports = { app, server, io };
