const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
    origin: '*',  // Allow all origins for testing
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));

// In-memory alarm storage
let alarms = { laciA: [], laciB: [], laciC: [] };

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'password') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Get current WIB time
function getCurrentWIBTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (7 * 60 * 60 * 1000));
    return wib;
}

// API Endpoints
app.get('/api/alarms', (req, res) => {
    res.json(alarms);
});

app.post('/api/alarms', (req, res) => {
    alarms = req.body;
    res.json({ message: 'Alarms updated successfully' });
});

app.get('/api/time', (req, res) => {
    const wibTime = getCurrentWIBTime();
    res.json({
        hour: wibTime.getHours(),
        minute: wibTime.getMinutes(),
        second: wibTime.getSeconds()
    });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        timezone: 'WIB'
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Medicine Reminder API Server',
        version: '1.0.0',
        endpoints: [
            '/api/login',
            '/api/alarms',
            '/api/time',
            '/health'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server time (WIB):`, getCurrentWIBTime().toISOString());
});
