
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videoRoutes from './routes/videoRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/video', videoRoutes);

// Base route for health check
app.get('/', (req, res) => {
    res.send('API Backend is running');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
