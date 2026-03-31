// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import { verifyToken } from "./src/middleware/auth.js";
import { identifyUser } from "./src/middleware/identifyUser.js"; 
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
// import { apiLimiter, qrLimiter, analyticsLimiter } from "./src/middleware/rateLimiter.js";
import { sanitizeBody } from "./src/middleware/validation.js";

//Routes
import qrRoutes from "./src/routes/qrRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";
import patientRoutes from "./src/routes/patientRoutes.js";
import emergencyContactRoutes from "./src/routes/emergencyContactRoutes.js";
import medicRoutes from "./src/routes/medicRoutes.js";
import analyticRoutes from "./src/routes/AnalyticRoutes.js";
import medicalRecordRoutes from "./src/routes/medicalRecordRoutes.js";
import medicationLogRoutes from "./src/routes/medicationLogRoutes.js";
import llmTriageRoutes from "./src/routes/llmTriageRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (origin.includes('ngrok-free.app') || origin.includes('ngrok.io')) {
      return callback(null, true);
    }

    // Allow Vercel preview/prod frontend domains when backend runs on Vercel.
    if (process.env.VERCEL === '1' && origin.includes('.vercel.app')) {
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody);

// Add cache headers for images in /uploads
app.use('/uploads', express.static('uploads', {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));

// app.use(apiLimiter); // Disabled for testing


app.use("/api/llm-triage", llmTriageRoutes);
app.use("/api/qr", /* qrLimiter, */ qrRoutes); // Disabled qrLimiter for testing
app.use("/api/analytics", /* analyticsLimiter, */ analyticRoutes); // Disabled analyticsLimiter for testing
app.use("/api/emergency-contacts", emergencyContactRoutes);

app.use(verifyToken);
app.use(identifyUser);

app.use("/api/profiles", profileRoutes);
app.use("/api/patients", /* apiLimiter, */ patientRoutes); // Disabled apiLimiter for testing
app.use("/api/medics", medicRoutes);
app.use("/api/records", medicalRecordRoutes);
app.use("/api/medication-log", medicationLogRoutes);

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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

if (process.env.NODE_ENV !== 'test' && process.env.VERCEL !== '1') {
  app.listen(port, () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Server running on port ${port}`);
    }
  });
}
