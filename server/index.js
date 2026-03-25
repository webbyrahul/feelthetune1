import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import musicRoutes from './routes/musicRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import likeRoutes from './routes/likeRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/music', musicRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/likes', likeRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error('Error handler:', {
    message: err.message,
    status,
    code: err.code,
    name: err.name
  });
  res.status(status).json({ message: err.message || 'Server error' });
});

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
