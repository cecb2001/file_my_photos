import express from 'express';
import cors from 'cors';
import config from './config.js';
import { initDatabase, closeDatabase } from './database/index.js';
import filesRouter from './routes/files.js';
import scanRouter from './routes/scan.js';
import organizeRouter from './routes/organize.js';
import operationsRouter from './routes/operations.js';
import searchRouter from './routes/search.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/files', filesRouter);
app.use('/api/scan', scanRouter);
app.use('/api/organize', organizeRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/search', searchRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      type: err.name || 'Error'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

// Initialize database and start server
function startServer() {
  try {
    initDatabase();
    console.log('Database initialized successfully');

    const server = app.listen(config.port, config.host, () => {
      console.log(`Server running at http://${config.host}:${config.port}`);
      console.log(`Environment: ${config.env}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down gracefully...');
      server.close(() => {
        closeDatabase();
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\nSIGTERM received, shutting down...');
      server.close(() => {
        closeDatabase();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
