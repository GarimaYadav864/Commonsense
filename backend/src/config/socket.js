
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "https://common-sense-pi.vercel.app",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      // Auth controller signs the token with { userId }.
      const user = await User.findById(decoded.userId)
        .select("_id role");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication failed:", error.message);
      next(new Error("Invalid socket authentication"));
    }
  });

  io.on("connection", (socket) => {
    const userRoom = `user:${socket.user._id.toString()}`;

    socket.join(userRoom);

    console.log(`Socket connected: ${userRoom}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${userRoom}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
