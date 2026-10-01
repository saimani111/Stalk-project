// One-off: remove throwaway test accounts (@example.com) and all their data.
// Run: node test/cleanup-test-data.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Message = require("../models/message");
const Group = require("../models/group");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const testUsers = await User.find({ email: { $regex: /@example\.com$/i } }).select("_id name email");
  const ids = testUsers.map((u) => u._id);
  console.log("Test users found:", testUsers.map((u) => `${u.name} <${u.email}>`));

  if (ids.length === 0) {
    console.log("Nothing to clean.");
    await mongoose.disconnect();
    return;
  }

  const msgs = await Message.deleteMany({ $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }] });
  console.log("Messages deleted:", msgs.deletedCount);

  // Messages inside groups that only existed because of test users: pull them out of groups first
  await Group.updateMany({ users: { $in: ids } }, { $pull: { users: { $in: ids } } });
  const emptyGroups = await Group.deleteMany({ $or: [{ users: { $size: 0 } }, { admin: { $in: ids } }] });
  console.log("Groups removed (empty or test-administered):", emptyGroups.deletedCount);

  const users = await User.deleteMany({ _id: { $in: ids } });
  console.log("Test users deleted:", users.deletedCount);

  await mongoose.disconnect();
  console.log("Cleanup complete.");
})().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
