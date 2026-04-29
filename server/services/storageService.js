import { Readable } from "stream";
import getCloudinary from "../config/cloudinary.js";

export const uploadFile = (buffer, filePath) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { public_id: `projects/${filePath}`, resource_type: "raw" },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    Readable.from(buffer).pipe(stream);
  });

export const deleteProjectFiles = async (prefix) => {
  await getCloudinary().api.delete_resources_by_prefix(prefix);
};
