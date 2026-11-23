
const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const connectDB = require("./config/db");
const initializeSocket = require("./config/socket");

// Routes
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const requestRoutes = require("./routes/requestRoutes");
const matchingRoutes = require("./routes/matchingRoutes");
const offerRoutes = require("./routes/offerRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminMonitoringRoutes = require("./routes/adminMonitoringRoutes");
const adminRecordsRoutes = require("./routes/adminRecordsRoutes");
const adminModerationRoutes = require("./routes/adminModerationRoutes");
const adminReportsRoutes = require("./routes/adminReportsRoutes");
// Services
const startOfferExpiryScheduler = require("./services/offerExpiryScheduler");

const app = express();

// CORS configuration
const allowedOrigins = [
  "https://common-sense-pi.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Commonsense API is running 🚀",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    database:
      require("mongoose").connection.readyState === 1
        ? "connected"
        : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/monitoring", adminMonitoringRoutes);
app.use("/api/admin/records", adminRecordsRoutes);
app.use("/api/admin/moderation", adminModerationRoutes);
app.use("/api/admin/reports", adminReportsRoutes);

// Create HTTP server using Express app
const httpServer = http.createServer(app);

// Initialize Socket.IO on the same HTTP server
const io = initializeSocket(httpServer);

// Make Socket.IO accessible inside controllers
app.set("io", io);

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    console.log("Database connected successfully");

    // 2. Start offer expiry scheduler
    startOfferExpiryScheduler(io);

    console.log("Offer expiry scheduler initialized");

    // 3. Start HTTP server
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Commonsense API running on port ${PORT}`);
      console.log("Socket.IO initialized successfully");
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
