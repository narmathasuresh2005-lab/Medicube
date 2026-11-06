
require("dotenv").config();

const mongoose = require("mongoose");
const Token = require("./src/models/Token");
const QueueEvent = require("./src/models/QueueEvent");

async function clearTestQueue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const tokenResult = await Token.deleteMany({});
    const eventResult = await QueueEvent.deleteMany({});

    console.log("Tokens deleted:", tokenResult.deletedCount);
    console.log("Queue events deleted:", eventResult.deletedCount);
  } catch (error) {
    console.error("Cleanup failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

clearTestQueue();
