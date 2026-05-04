import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQ2NI_9nAjRUfLNpwgNWnCjASWcYnD6Eg",
  authDomain: "topbrsmulticla-ac19a.firebaseapp.com",
  projectId: "topbrsmulticla-ac19a",
  storageBucket: "topbrsmulticla-ac19a.firebasestorage.app",
  messagingSenderId: "624538877650",
  appId: "1:624538877650:web:32fc15477cbb7e7e9f370b",
  measurementId: "G-WV417Y14VP"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
