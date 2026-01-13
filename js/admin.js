// js/admin.js

import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  setDoc, 
  deleteDoc 
} from './firebase-config.js';
import { showAlert, showSpinner, hideSpinner, setElementHTML, resetForm } from './ui.js';
import { isValidJson, redirectTo } from './utils.js';

// এডমিন ড্যাশবোর্ড লোড করার সময় অথেন্টিকেশন এবং অথরাইজেশন চেক করা
document.addEventListener('DOMContentLoaded', async () => {
    showSpinner(); // স্পিনার চালু করুন

    try {
        const user = auth.currentUser;
        if (!user) {
            showAlert('You are not logged in. Redirecting...', 'danger');
            redirectTo('index.html'); 
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists() || userDocSnap.data().role !== 'admin') {
            showAlert('Unauthorized access. Redirecting...', 'danger');
            await auth.signOut(); // অননুমোদিত অ্যাক্সেস হলে লগআউট করে দাও
            redirectTo('index.html'); 
            return;
        }

        // এডমিন হলে ড্যাশবোর্ড কন্টেন্ট লোড করা
        loadUsersForApproval();
        loadQuestionPapersForAdmin();

    } catch (error) {
        console.error("Error initializing admin dashboard:", error);
        showAlert('Failed to load admin dashboard: ' + error.message + ". Please check your internet connection.", 'danger');
        await auth.signOut(); // ত্রুটি হলে লগআউট করে দাও
        redirectTo('index.html'); 
    } finally {
        // লোডিং স্পিনার বন্ধ করুন - নিশ্চিত করুন যে এটি সবসময় চলে
        // প্রতিটি লোডিং ফাংশন শেষ হওয়ার পর hideSpinner() কল হবে।
        // এখানে একবার ইনিশিয়ালাইজেশনের জন্য hideSpinner কল করা হয়েছে।
        // অন্যান্য ফাংশন যেমন loadUsersForApproval, loadQuestionPapersForAdmin নিজেরা স্পিনার ম্যানেজ করবে।
         hideSpinner(); 
    }
});

// এডমিন ইউজারদের তালিকা এবং অনুমোদনের কার্যকারিতা হ্যান্ডেল করবে
async function loadUsersForApproval() {
    showSpinner();
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) {
        hideSpinner();
        return;
    }

    usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading users...</td></tr>';

    try {
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);

        let html = '';
        if (querySnapshot.empty) {
            html = '<tr><td colspan="4" class="text-center text-muted">No users found.</td></tr>';
        } else {
            querySnapshot.forEach((document) => {
                const userData = document.data();
                if (userData.role !== 'admin') { 
                    html += `
                        <tr>
                            <td>${userData.username || 'N/A'}</td>
                            <td>${userData.email}</td>
                            <td>
                                <span class="badge ${userData.isApproved ? 'bg-success' : 'bg-warning'}">
                                    ${userData.isApproved ? 'Approved' : 'Pending'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm ${userData.isApproved ? 'btn-danger' : 'btn-success'} toggle-approve-btn" data-uid="${document.id}" data-is-approved="${userData.isApproved}">
                                    ${userData.isApproved ? 'Deactivate' : 'Approve'}
                                </button>
                            </td>
                        </tr>
                    `;
                }
            });
            if (html === '') {
                html = '<tr><td colspan="4" class="text-center text-muted">No regular users found.</td></tr>';
            }
        }
        setElementHTML('users-table-body', html);

        document.querySelectorAll('.toggle-approve-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const uid = e.target.dataset.uid;
                const currentStatus = e.target.dataset.isApproved === 'true'; 
                await toggleUserApproval(uid, !currentStatus);
            });
        });

    } catch (error) {
        console.error("Error loading users:", error);
        showAlert('Failed to load users: ' + error.message, 'danger');
        setElementHTML('users-table-body', '<tr><td colspan="4" class="text-center text-danger">Error loading users.</td></tr>');
    } finally {
        hideSpinner();
    }
}

// ইউজার অনুমোদন স্ট্যাটাস পরিবর্তন করা
async function toggleUserApproval(uid, newStatus) {
    showSpinner();
    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, {
            isApproved: newStatus
        });
        showAlert(`User ${newStatus ? 'approved' : 'deactivated'} successfully!`, 'success');
        await loadUsersForApproval(); // তালিকা রিফ্রেশ করা
    } catch (error) {
        console.error("Error toggling user approval:", error);
        showAlert('Failed to update user approval: ' + error.message, 'danger');
    } finally {
        hideSpinner();
    }
}

// এডমিন প্রশ্নপত্র লোড করবে এবং যোগ/মুছে ফেলার কার্যকারিতা হ্যান্ডেল করবে
async function loadQuestionPapersForAdmin() {
    showSpinner();
    const questionPapersList = document.getElementById('question-papers-list');
    if (!questionPapersList) {
        hideSpinner();
        return;
    }

    questionPapersList.innerHTML = '<p class="text-center">Loading question papers...</p>';

    try {
        const q = query(collection(db, "questionPapers"));
        const querySnapshot = await getDocs(q);

        let html = '';
        if (querySnapshot.empty) {
            html = '<p class="text-center text-muted">No question papers available.</p>';
        } else {
            querySnapshot.forEach((document) => {
                const data = document.data();
                const subjectId = document.id; 
                html += `
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title">${data.subjectName}</h5>
                                <p class="card-text">Total Questions: ${data.questions.length}</p>
                            </div>
                            <button class="btn btn-danger btn-sm delete-paper-btn" data-subject-id="${subjectId}">Delete</button>
                        </div>
                    </div>
                `;
            });
        }
        setElementHTML('question-papers-list', html);

        document.querySelectorAll('.delete-paper-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const subjectId = e.target.dataset.subjectId;
                if (confirm('Are you sure you want to delete this question paper?')) {
                    await deleteQuestionPaper(subjectId);
                }
            });
        });

    } catch (error) {
        console.error("Error loading question papers for admin:", error);
        showAlert('Failed to load question papers: ' + error.message, 'danger');
        setElementHTML('question-papers-list', '<p class="text-center text-danger">Error loading question papers.</p>');
    } finally {
        hideSpinner();
    }
}

// JSON ফরম্যাটে প্রশ্নপত্র যোগ করা
async function addQuestionPaper(jsonString) {
    showSpinner();
    try {
        if (!isValidJson(jsonString)) {
            showAlert('Invalid JSON format. Please check your input.', 'danger');
            return;
        }

        const questionPaperData = JSON.parse(jsonString);

        if (!questionPaperData.title || !questionPaperData.questions || !Array.isArray(questionPaperData.questions)) {
            showAlert('JSON must contain "title" and an array of "questions".', 'danger');
            return;
        }

        const subjectName = questionPaperData.title;
        const questions = questionPaperData.questions.map(q => ({
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || '' 
        }));

        const docRef = doc(db, "questionPapers", subjectName.replace(/\s+/g, '-').toLowerCase()); 
        await setDoc(docRef, {
            subjectName: subjectName,
            questions: questions,
            createdAt: serverTimestamp() // serverTimestamp ব্যবহার করা হয়েছে
        });

        showAlert(`Question paper "${subjectName}" added successfully!`, 'success');
        resetForm('add-question-form'); 
        await loadQuestionPapersForAdmin(); 
    } catch (error) {
        console.error("Error adding question paper:", error);
        showAlert('Failed to add question paper: ' + error.message, 'danger');
    } finally {
        hideSpinner();
    }
}

// প্রশ্নপত্র মুছে ফেলা
async function deleteQuestionPaper(subjectId) {
    showSpinner();
    try {
        const docRef = doc(db, "questionPapers", subjectId);
        await deleteDoc(docRef);
        showAlert('Question paper deleted successfully!', 'success');
        await loadQuestionPapersForAdmin(); 
    } catch (error) {
        console.error("Error deleting question paper:", error);
        showAlert('Failed to delete question paper: ' + error.message, 'danger');
    } finally {
        hideSpinner();
    }
}

// JSON ইনপুট ফর্ম সাবমিট ইভেন্ট লিসেনার
document.addEventListener('DOMContentLoaded', () => {
    const addQuestionForm = document.getElementById('add-question-form');
    if (addQuestionForm) {
        addQuestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const jsonInput = document.getElementById('question-json-input').value;
            await addQuestionPaper(jsonInput);
        });
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await logout(); // auth.js থেকে logout ফাংশন ব্যবহার করা হয়েছে
        });
    }
});