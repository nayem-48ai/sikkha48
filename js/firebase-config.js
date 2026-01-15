// js/firebase-config.js

// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, 
         createUserWithEmailAndPassword, 
         signInWithEmailAndPassword, 
         signOut, 
         onAuthStateChanged,
         sendPasswordResetEmail // নতুন যুক্ত করা হয়েছে
       } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, 
         doc, 
         getDoc, 
         setDoc, 
         collection, 
         query, 
         where, 
         getDocs, 
         updateDoc, 
         deleteDoc,
         serverTimestamp 
       } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWeMQInzeVufl9gPk5xc5nqpWjnN0b7u0",
  authDomain: "sikkha48.firebaseapp.com",
  projectId: "sikkha48",
  storageBucket: "sikkha48.firebasestorage.app",
  messagingSenderId: "786363342806",
  appId: "1:786363342806:web:9aa2aeb6b2e9301d120e77",
  measurementId: "G-6VRFYC059P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app); 

export { 
  app, 
  auth, 
  db, 
  analytics,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail, // নতুন এক্সপোর্ট
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp 
};