require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const dbConnect = require('./lib/dbConnect');

// Import routes
const authRoutes = require('./routes/auth');
const pollRoutes = require('./routes/polls');
const publicRoutes = require('./routes/public');
const resultsRoutes = require('./routes/results');
const settingsRoutes = require('./routes/settings');
// 🆕 BOOKING SYSTEM ROUTES - Can be removed if system not needed
const bookingVenueRoutes = require('./routes/bookingVenues');
const bookingRoutes = require('./routes/bookings');

const app = express();

// Connect to database
dbConnect();

// Security Middleware
// 1. Helmet - Set security headers
app.use(helmet());

// 2. CORS - Use environment variable for allowed origins
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// 3. Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Data sanitization against NoSQL injection
// Note: express-mongo-sanitize has compatibility issues with Express 5
// Using a custom sanitization function
const sanitize = (obj) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      // Remove keys that start with $ or contain .
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  next();
});

// 5. Rate limiting - Prevent brute force attacks
const rateLimit = require('express-rate-limit');

// More generous rate limiting for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: (req) => process.env.NODE_ENV === 'development'
});

app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/settings', settingsRoutes);
// 🆕 BOOKING SYSTEM ROUTES - Can be removed if system not needed
app.use('/api/booking-venues', bookingVenueRoutes);
app.use('/api/bookings', bookingRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to EventPro API - Event Management & Booking System' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
