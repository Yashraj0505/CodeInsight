import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
