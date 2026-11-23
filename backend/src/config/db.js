
const mongoose = require("mongoose");
const dns = require("node:dns");

// Work around the local DNS resolver issue.
// Render will continue using its default DNS configuration.
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8"]);
}

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

