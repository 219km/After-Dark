
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTY3yCOzL-uz0iq2qFMwLP5raJ3gltMko",
  authDomain: "after-dark-39761.firebaseapp.com",
  projectId: "after-dark-39761",
  storageBucket: "after-dark-39761.firebasestorage.app",
  messagingSenderId: "1024873321734",
  appId: "1:1024873321734:web:a4e3671bdacda6c56fba87",
  measurementId: "G-95MW13VHYX"
};
Are you using npm and a bundler like webpack or Rollup? Check out the modular SDK.

Learn more about Firebase for web: Get Started, Web SDK API Reference, Samples



const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
