// js/auth.js

import { 
  auth, 
  db,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail, // ইমপোর্ট করা হয়েছে
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
if (isLoginPage(window.location.pathname)) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.role === 'admin') {
                        redirectTo('admin.html');
                    } else {
                        redirectTo('index.html');
                    }
                }
            } catch (error) {
                console.error("Auth check error:", error);
            }
        }
    });
}

// সাইন আপ ফাংশন
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

// সাইন ইন ফাংশন
async function signIn(email, password) {
  showSpinner();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
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

// লগআউট ফাংশন
async function logout() {
  showSpinner();
  try {
    await signOut(auth);
    showAlert("Logged out successfully.", "info"); 
  } catch (error) {
    console.error("Logout error:", error);
    showAlert("Logout failed.", "danger");
  } finally {
    hideSpinner();
  }
}

// পাসওয়ার্ড রিসেট ফাংশন (নতুন)
async function resetPassword(email) {
    showSpinner();
    try {
        await sendPasswordResetEmail(auth, email);
        
        // ইনপুট মডালটি বন্ধ করা
        const forgotModalEl = document.getElementById('forgotPasswordModal');
        const forgotModal = bootstrap.Modal.getInstance(forgotModalEl);
        if (forgotModal) forgotModal.hide();

        // সাকসেস মডালটি ওপেন করা (যেখানে Spam ফোল্ডারের কথা বলা আছে)
        const successModal = new bootstrap.Modal(document.getElementById('resetSuccessModal'));
        successModal.show();

    } catch (error) {
        console.error("Reset Password Error:", error);
        let msg = "Failed to send reset email.";
        if (error.code === 'auth/user-not-found') msg = "No user found with this email.";
        if (error.code === 'auth/invalid-email') msg = "Invalid email format.";
        showAlert(msg, "danger");
    } finally {
        hideSpinner();
    }
}

// ইভেন্ট লিসেনার
document.addEventListener('DOMContentLoaded', () => {
    if (isLoginPage(window.location.pathname)) {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const loginTabBtn = document.getElementById('pills-login-tab');

        // Forgot Password Form Listener (নতুন)
        const resetForm = document.getElementById('reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('reset-email').value;
                await resetPassword(email);
            });
        }

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

export { signUp, signIn, logout, resetPassword, auth, db };