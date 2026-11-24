require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const User = require("../src/models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => {
    rl.question(question, resolve);
  });

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const name = await ask("Admin name: ");
    const email = (await ask("Admin email: "))
      .trim()
      .toLowerCase();

    const password = await ask("Admin password (min 8 chars): ");
    const location = await ask("Admin location: ");

    if (!name.trim() || !location.trim() || password.length < 8) {
      throw new Error("Invalid admin details.");
    }

    const existingAdmin = await User.findOne({
      email,
      $or: [{ roles: "admin" }, { role: "admin" }],
    });

    if (existingAdmin) {
      console.log("An admin with this email already exists.");
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        "This email already belongs to another account."
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      location: location.trim(),
      role: "admin",
    });

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();