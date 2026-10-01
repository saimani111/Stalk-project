const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, default: "password-reset" },
  attempts: { type: Number, default: 0 },
  // single-use codes expire quickly; TTL index removes docs 15 min after creation
  createdAt: { type: Date, default: Date.now, expires: 900 },
});

module.exports =
  mongoose.models.otp || mongoose.model("otp", otpSchema);
