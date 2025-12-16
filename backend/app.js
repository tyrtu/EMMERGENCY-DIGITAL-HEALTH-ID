// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import { verifyToken } from "./src/middleware/auth.js";
import { identifyUser } from "./src/middleware/identifyUser.js"; 
import { requireRole } from "./src/middleware/requireRole.js";   
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import { apiLimiter, qrLimiter, analyticsLimiter, authLimiter } from "./src/middleware/rateLimiter.js";
import { sanitizeBody } from "./src/middleware/validation.js";

//Routes
import qrRoutes from "./src/routes/qrRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";
import patientRoutes from "./src/routes/patientRoutes.js";
import emergencyContactRoutes from "./src/routes/emergencyContactRoutes.js";
import medicRoutes from "./src/routes/medicRoutes.js";
import analyticRoutes from "./src/routes/analyticRoutes.js";
import medicalRecordRoutes from "./src/routes/medicalRecordRoutes.js";
import medicationLogRoutes from "./src/routes/medicationLogRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow ngrok URLs
    if (origin.includes('ngrok-free.app') || origin.includes('ngrok.io')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-id', 'Cache-Control']
}));
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For file uploads
app.use(sanitizeBody); // Sanitize all inputs

// Serve static files (patient photos)
app.use('/uploads', express.static('uploads'));

// Apply rate limiting
app.use(apiLimiter);

// Public routes (with specific rate limiters)
app.use("/api/qr", qrLimiter, qrRoutes);
app.use("/api/analytics", analyticsLimiter, analyticRoutes);
app.use("/api/emergency-contacts", emergencyContactRoutes);

//Protected routes (with RBAC support)
app.use(verifyToken);   //  Verify JWT once globally
app.use(identifyUser);  //  Attach req.userType or req.profile

// Now, routes automatically get req.userType available:
app.use("/api/profiles", profileRoutes);
app.use("/api/patients", apiLimiter, patientRoutes); // Rate limit patient routes
app.use("/api/medics", medicRoutes);
app.use("/api/records", medicalRecordRoutes);
app.use("/api/medication-log", medicationLogRoutes);

// Connect DB (skip automatic DB connection during tests)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Health check
app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "Emergency Health ID API is running",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Export app for testing and start server when not in test mode
export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Server running on port ${port}`);
    }
  });
}
