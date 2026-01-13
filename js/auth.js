// js/auth.js

import { 
  auth, 
  db,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from './firebase-config.js'; 
import { showAlert, showSpinner, hideSpinner } from './ui.js';
import { redirectTo } from './utils.js';

// Authentication স্টেট পরিবর্তনের জন্য লিসেনার
onAuthStateChanged(auth, async (user) => {
  // নিশ্চিত করুন যে DOMContentLoaded এর আগে এই লজিকটি না চলে,
  // অথবা অন্তত document.readyState == 'loading' না থাকলে
  // এখানে window.location.pathname চেক করার আগে document.readyState চেক করার প্রয়োজন নেই।
  // কারণ onAuthStateChanged অ্যাসিঙ্ক্রোনাস এবং সাধারণত DOM তৈরি হওয়ার পরেই এক্সিকিউট হয়।

  const currentPath = window.location.pathname;

  if (user) {
    // ইউজার লগইন করা থাকলে
    const userDocRef = doc(db, "users", user.uid);
    try {
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // এডমিন ইউজারদের জন্য
            if (userData.role === 'admin') {
                if (!currentPath.includes('/admin.html')) {
                    redirectTo('admin.html');
                }
            } 
            // সাধারণ ইউজারদের জন্য
            else { 
                if (!userData.isApproved) {
                    // অনুমোদিত না হলে, তাকে dashboard.html এ নিয়ে যাবে (যদি সে index.html এ না থাকে)
                    // dashboard.html এ "অপেক্ষায় থাকুন" মেসেজ দেখানো হবে।
                    if (!currentPath.includes('/dashboard.html') && !currentPath.includes('/index.html')) {
                         redirectTo('dashboard.html');
                    }
                    // যদি সে dashboard.html এ থাকে, তাহলে সেখানে থাকবে।
                    // যদি সে index.html এ থাকে, তাহলে সেখানেই থাকবে।
                } else {
                    // অনুমোদিত হলে dashboard.html এ রিডাইরেক্ট করবে
                    if (!currentPath.includes('/dashboard.html') && 
                        !currentPath.includes('/exam.html') && 
                        !currentPath.includes('/result.html')) {
                        redirectTo('dashboard.html');
                    }
                }
            }
        } else {
            // যদি user object থাকে কিন্তু Firestore এ ডকুমেন্ট না থাকে
            // এটি নির্দেশ করে যে সাইনআপ প্রক্রিয়া সম্পন্ন হয়নি বা ডেটা হারিয়ে গেছে।
            console.warn("User document not found for:", user.uid);
            // যদি index.html এ না থাকে, তাহলে তাকে index.html এ ফেরত পাঠাও
            if (!currentPath.includes('/index.html') && currentPath !== '/') {
                showAlert("Your user profile is incomplete. Please sign up again or contact admin.", "danger");
                await signOut(auth); // ইউজারকে লগআউট করিয়ে দাও
                redirectTo('index.html');
            }
        }
    } catch (error) {
        // Firestore সংযোগ বা ডেটা আনতে ব্যর্থ হলে
        console.error("Error fetching user data on auth state change:", error);
        showAlert("Failed to load user profile or connect to database. Please check your internet and try again.", "danger");
        await signOut(auth); // লগআউট করে লগইন পেজে ফেরত পাঠাও
        redirectTo('index.html');
    }
  } else {
    // ইউজার লগইন করা না থাকলে
    // শুধুমাত্র যদি বর্তমান পেজ login/signup (index.html) না হয়, তাহলে রিডাইরেক্ট করবে
    if (!currentPath.includes('/index.html') && currentPath !== '/') {
      redirectTo('index.html');
    }
  }
});

// নতুন ইউজার সাইন-আপ
async function signUp(email, password, username) {
  showSpinner();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: email,
      role: "user", 
      isApproved: false, 
      createdAt: serverTimestamp() 
    });

    showAlert("Sign up successful! Your account is awaiting admin approval.", "success");
    // Sign up সফল হলে onAuthStateChanged নিজেই রিডাইরেক্ট হ্যান্ডেল করবে।
    // এখানে এক্সপ্লিসিট রিডাইরেক্ট দরকার নেই।
    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    showAlert("Sign up failed: " + error.message, "danger");
    return null;
  } finally {
    hideSpinner();
  }
}

// ইউজার লগইন
async function signIn(email, password) {
  showSpinner();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showAlert("Login successful!", "success");
    // Login সফল হলে onAuthStateChanged নিজেই রিডাইরেক্ট হ্যান্ডেল করবে।
    // এখানে এক্সপ্লিসিট রিডাইরেক্ট দরকার নেই।
    return auth.currentUser;
  } catch (error) {
    console.error("Error signing in:", error);
    showAlert("Login failed: " + error.message, "danger");
    return null;
  } finally {
    hideSpinner();
  }
}

// ইউজার লগআউট
async function logout() {
  showSpinner();
  try {
    await signOut(auth);
    showAlert("Logged out successfully!", "success");
    redirectTo('index.html'); 
  } catch (error) {
    console.error("Error logging out:", error);
    showAlert("Logout failed: " + error.message, "danger");
  } finally {
    hideSpinner();
  }
}

// DOMContentLoaded ইভেন্টের উপর ভিত্তি করে ফর্ম লিসেনার যোগ করা
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;

    // Login/Signup page specific event listeners
    if (currentPath.includes('/index.html') || currentPath === '/') {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const loginTabBtn = document.getElementById('pills-login-tab');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = loginForm['login-email'].value;
                const password = loginForm['login-password'].value;
                await signIn(email, password);
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = signupForm['signup-username'].value;
                const email = signupForm['signup-email'].value;
                const password = signupForm['signup-password'].value;
                const user = await signUp(email, password, username);
                if (user) {
                    // Sign up সফল হলে, লগইন ট্যাবে ফিরে যাওয়ার লজিক
                    // Bootstrap 5 এর জন্য
                    if (loginTabBtn) {
                        const loginTab = new bootstrap.Tab(loginTabBtn);
                        loginTab.show(); 
                    }
                }
            });
        }
    }

    // Logout button (present on dashboard, admin, exam, result pages)
    const logoutButton = document.getElementById('logout-button'); 
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

export { signUp, signIn, logout, auth, db };