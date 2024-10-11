const express = require('express');
const session = require('express-session');
const { Pool } = require('pg'); // Use pg for PostgreSQL
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

const allowedOrigins = ['https://apsitarnav-website.onrender.com', 'https://ar-navigation-website.onrender.com'];

app.use(cors({
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies and headers
    methods: ['GET', 'POST', 'OPTIONS'], // Allow preflight OPTIONS method
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow the headers you're using
}));


app.options('*', cors()); // Enable preflight requests for all routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Set up session middleware with secure options
app.use(session({
    secret: 'your_secret_key', // Use an environment variable in production
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 86400000, // 24 hours
        secure: false, // Set to true in production if using HTTPS
        httpOnly: true // Helps prevent cross-site scripting (XSS) attacks
    }
}));

// PostgreSQL Database Connection using a connection pool
const pool = new Pool({
    host: 'dpg-cs0m6brtq21c73eg0u60-a',
    user: 'arcredentials_user',
    password: 'YaCDakA5ojzAdDPGpNWUu4H7NYXUp4Vj',
    database: 'arcredentials',
    port: 5432,  // Default PostgreSQL port, change if necessary
    ssl: false  // Set to true if using SSL for DB
});

// Connect to the database and verify connection
pool.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        throw err;
    }
    console.log('Connected to PostgreSQL database');
});

// Login Route
app.post('/login', (req, res) => {
    const { moodleid, password } = req.body;

    if (!moodleid || !password) {
        return res.json({ success: false, message: 'moodleid and password are required' });
    }

    // Query to find the user with encrypted password
    const query = 'SELECT * FROM users WHERE "moodleid" = $1 AND "password" = crypt($2, "password")';
    
    pool.query(query, [moodleid, password], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.json({ success: false, message: 'Internal server error' });
        }

        if (result.rows.length > 0) {
            req.session.authenticated = true;
            req.session.user = result.rows[0];

            req.session.save(err => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.json({ success: false, message: 'Session save error' });
                }
                res.json({ success: true, message: 'Login successful' });
            });
        } else {
            res.json({ success: false, message: 'Invalid moodleid or password' });
        }
    });
});

// Auth Check Route
app.get('/check-auth', (req, res) => {
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);

    if (req.session.authenticated) {
        return res.json({ isAuthenticated: true, user: req.session.user });
    } else {
        return res.json({ isAuthenticated: false });
    }
});

// Define routes for serving HTML files
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'signin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
