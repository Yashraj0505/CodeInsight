import { initializeApp } from "firebase/app";
import { getAuth, browserSessionPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZyg5LlqdSW1w3zUTEqovp2E1-vCfAdm4",
  authDomain: "codeinsight-404.firebaseapp.com",
  projectId: "codeinsight-404",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Session ends when the tab/browser is closed
setPersistence(auth, browserSessionPersistence);