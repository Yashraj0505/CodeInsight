import admin from "firebase-admin";
import { createRequire } from "module";

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production (Render): service account stored as env var
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  credential = admin.credential.cert(serviceAccount);
} else {
  // Local development: use serviceAccountKey.json file
  const require = createRequire(import.meta.url);
  const serviceAccount = require("./serviceAccountKey.json");
  credential = admin.credential.cert(serviceAccount);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

export default admin;