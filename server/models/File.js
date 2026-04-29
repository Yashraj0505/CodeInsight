import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  savedPath: { type: String, required: true },
  analysis: {
    functions: { type: [String], default: [] },
    classes: { type: [String], default: [] },
    imports: { type: [String], default: [] },
  },
});

// Compound index for efficient project file queries
fileSchema.index({ projectId: 1, path: 1 });

export default mongoose.model("File", fileSchema);
