import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RideTrack Server is running' });
});

// TODO: Add your Express routes here (Auth, Rides, etc.)
// app.use('/api/auth', authRoutes);

export default app;