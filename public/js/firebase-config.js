// public/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXNlO2Sn-lS43fycyqWcFkX-kNHCInb_Q",
  authDomain: "watch-list-public.firebaseapp.com",
  projectId: "watch-list-public",
  storageBucket: "watch-list-public.appspot.com",
  messagingSenderId: "1036809609612",
  appId: "1:1036809609612:web:89578168cb3b72726236a9",
  measurementId: "G-DKHLSL80Q8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
