import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    // Stored as String now — swap to ObjectId ref:"User" once auth is implemented
    name: { type: String, required: true },
    userId: { type: String, default: "anonymous", index: true },
    fileCount: { type: Number, default: 0 },
    uploadTime: { type: Number, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);