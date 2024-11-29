const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    
    // For demo purposes - replace with proper user authentication
    if (username === 'admin' && password === 'password') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// File untuk menyimpan data alarm
const ALARMS_FILE = path.join(__dirname, 'alarms.json');

// Fungsi untuk membaca data alarm
async function readAlarms() {
    try {
        const data = await fs.readFile(ALARMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultAlarms = {
                laciA: [],
                laciB: [],
                laciC: []
            };
            await saveAlarms(defaultAlarms);
            return defaultAlarms;
        }
        throw error;
    }
}

// Fungsi untuk menyimpan data alarm
async function saveAlarms(alarms) {
    await fs.writeFile(ALARMS_FILE, JSON.stringify(alarms, null, 2));
}

// Fungsi untuk mendapatkan waktu WIB saat ini
function getCurrentWIBTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibOffset = 7;
    const wib = new Date(utc + (3600000 * wibOffset));
    return wib;
}

// Protect API endpoints
app.get('/api/alarms', authenticateToken, async (req, res) => {
    try {
        const alarms = await readAlarms();
        res.json(alarms);
    } catch (error) {
        console.error('Error reading alarms:', error);
        res.status(500).json({ error: 'Gagal membaca data alarm' });
    }
});

app.post('/api/alarms', authenticateToken, async (req, res) => {
    try {
        const newAlarms = req.body;
        await saveAlarms(newAlarms);
        console.log('Alarms updated:', newAlarms);
        res.json({ message: 'Alarm berhasil diperbarui' });
    } catch (error) {
        console.error('Error saving alarms:', error);
        res.status(500).json({ error: 'Gagal menyimpan alarm' });
    }
});

// Route untuk mendapatkan waktu server
app.get('/api/time', authenticateToken, (req, res) => {
    const wibTime = getCurrentWIBTime();
    const response = {
        hour: wibTime.getHours(),
        minute: wibTime.getMinutes(),
        second: wibTime.getSeconds(),
        timestamp: wibTime.toISOString()
    };
    console.log('Current WIB time:', response);
    res.json(response);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Serve index.html for authenticated users
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Waktu server (WIB):`, getCurrentWIBTime().toISOString());
});
