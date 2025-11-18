// Load environment variables FIRST
require('dotenv').config();

const app = require('./app');
const { createServer } = require('http');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 8000;
const server = createServer(app);


const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

startServer();

module.exports = server;
