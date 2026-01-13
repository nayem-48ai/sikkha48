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

// ইউটিলিটি
const isLoginPage = (path) => path.includes('/login.html') || path === '/' || path.endsWith('/');

// অনলি লগইন পেজের জন্য অথ স্টেট লিসেনার
// অন্য পেজগুলো (admin/exam) তাদের নিজস্ব লিসেনার ব্যবহার করবে
if (isLoginPage(window.location.pathname)) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // ইউজার যদি লগইন অবস্থায় লগইন পেজে আসে, তাকে ড্যাশবোর্ডে পাঠাও
            const userDocRef = doc(db, "users", user.uid);
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.role === 'admin') {
                        redirectTo('admin.html');
                    } else {
                        // ইউজার approved হোক বা না হোক, ড্যাশবোর্ডে পাঠাও
                        // ড্যাশবোর্ড (index.html) হ্যান্ডেল করবে সে পরীক্ষা দিতে পারবে কি না
                        redirectTo('index.html');
                    }
                }
            } catch (error) {
                console.error("Auth check error:", error);
                // এরর হলে কিছু করার দরকার নেই, লগইন পেজেই থাকুক
            }
        }
    });
}

// সাইন আপ
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

    showAlert("Sign up successful! Please wait for approval.", "success");
    // রিডাইরেক্ট onAuthStateChanged করবে
    return user;
  } catch (error) {
    console.error("Sign up error:", error);
    let msg = error.message;
    if(error.code === 'auth/email-already-in-use') msg = "Email already in use.";
    showAlert(msg, "danger");
    return null;
  } finally {
    hideSpinner();
  }
}

// সাইন ইন
async function signIn(email, password) {
  showSpinner();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // লগইন সফল, কিন্তু আমরা এখানে চেক করবো ইউজার approved কিনা
    // approved না হলে আমরা তাকে আটকাবো না, বরং ড্যাশবোর্ডে পাঠাবো
    // ড্যাশবোর্ড তাকে ব্লক করে মেসেজ দেখাবে। এতে UX ভালো হয়।
    
    return user;
  } catch (error) {
    console.error("Sign in error:", error);
    let msg = "Login failed. Check email and password.";
    if (error.code === 'auth/invalid-credential') msg = "Invalid Email or Password.";
    if (error.code === 'auth/user-not-found') msg = "User not found.";
    showAlert(msg, "danger");
    return null;
  } finally {
    hideSpinner();
  }
}

// লগআউট
// নোট: এটি রিডাইরেক্ট করবে না। যে পেজ থেকে কল হবে, সেই পেজের স্টেট চেঞ্জার রিডাইরেক্ট করবে।
async function logout() {
  showSpinner();
  try {
    await signOut(auth);
    showAlert("Logged out successfully.", "info"); 
    // কোনো redirectTo নেই এখানে। 
    // admin.js বা exam.js এর onAuthStateChanged ডিটেক্ট করবে ইউজার নেই, তখন login.html এ পাঠাবে।
  } catch (error) {
    console.error("Logout error:", error);
    showAlert("Logout failed.", "danger");
  } finally {
    hideSpinner();
  }
}

// ইভেন্ট লিসেনার (শুধুমাত্র লগইন পেজের জন্য)
document.addEventListener('DOMContentLoaded', () => {
    if (isLoginPage(window.location.pathname)) {
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
                if (user && loginTabBtn) {
                    const loginTab = new bootstrap.Tab(loginTabBtn);
                    loginTab.show(); 
                }
            });
        }
    }
});

export { signUp, signIn, logout, auth, db };