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
  deleteDoc,
  serverTimestamp,
  onAuthStateChanged
} from './firebase-config.js';
import { showAlert, showSpinner, hideSpinner, setElementHTML, resetForm } from './ui.js';
import { isValidJson, redirectTo } from './utils.js';
import { logout } from './auth.js'; 

document.addEventListener('DOMContentLoaded', () => {
    showSpinner(); 

    // অথেন্টিকেশন লিসেনার
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // ইউজার লগআউট করেছে বা লগইন নেই -> লগইন পেজে যাও
            // কোনো টোস্ট দেখানোর দরকার নেই এখানে, logout ফাংশন অলরেডি দেখিয়েছে
            redirectTo('login.html'); 
            return;
        }

        try {
            // রোল চেক
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists() || userDocSnap.data().role !== 'admin') {
                showAlert('Access Denied. Admins only.', 'danger');
                redirectTo('index.html'); 
                return;
            }

            // এডমিন কনফার্মড -> ডেটা লোড করো
            await loadUsersForApproval();
            await loadQuestionPapersForAdmin();

        } catch (error) {
            console.error("Admin dashboard error:", error);
            showAlert('Error loading dashboard: ' + error.message, 'danger');
        } finally {
            hideSpinner(); 
        }
    });

    // লগআউট বাটন লিসেনার (একবারই অ্যাড হবে)
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        // পুরনো লিসেনার রিমুভ করার দরকার নেই কারণ পেজ রিলোড হলে নতুন করেই হয়
        // কিন্তু ডুপ্লিকেট এড়াতে replaceWith ব্যবহার করা যেতে পারে, তবে সাধারণ click লিসেনার ঠিক আছে
        logoutButton.onclick = async () => {
            await logout();
        };
    }
});

// --- ফাংশনসমূহ ---

async function loadUsersForApproval() {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;

    usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

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
            if (html === '') html = '<tr><td colspan="4" class="text-center text-muted">No regular users found.</td></tr>';
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
        // Permission denied এরর হলে এটি ইউজারকে বলে দিবে
        let msg = "Failed to load users.";
        if(error.code === 'permission-denied') msg = "Permission Denied: Check Firestore Rules.";
        setElementHTML('users-table-body', `<tr><td colspan="4" class="text-center text-danger">${msg}</td></tr>`);
    }
}

async function toggleUserApproval(uid, newStatus) {
    showSpinner();
    try {
        await updateDoc(doc(db, "users", uid), { isApproved: newStatus });
        showAlert(`User updated!`, 'success');
        await loadUsersForApproval(); 
    } catch (error) {
        showAlert('Failed to update user.', 'danger');
    } finally {
        hideSpinner();
    }
}

async function loadQuestionPapersForAdmin() {
    const list = document.getElementById('question-papers-list');
    if (!list) return;
    list.innerHTML = '<p class="text-center">Loading...</p>';

    try {
        const querySnapshot = await getDocs(query(collection(db, "questionPapers")));
        let html = '';
        if (querySnapshot.empty) {
            html = '<p class="text-center text-muted">No papers found.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                html += `
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title">${data.subjectName}</h5>
                                <p class="card-text">Questions: ${data.questions.length}</p>
                            </div>
                            <button class="btn btn-danger btn-sm delete-paper-btn" data-subject-id="${doc.id}">Delete</button>
                        </div>
                    </div>`;
            });
        }
        setElementHTML('question-papers-list', html);

        document.querySelectorAll('.delete-paper-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Delete this paper?')) await deleteQuestionPaper(e.target.dataset.subjectId);
            });
        });
    } catch (error) {
        console.error("Error loading papers:", error);
        setElementHTML('question-papers-list', '<p class="text-center text-danger">Failed to load papers.</p>');
    }
}

async function addQuestionPaper(jsonString) {
    showSpinner();
    try {
        if (!isValidJson(jsonString)) throw new Error("Invalid JSON");
        const data = JSON.parse(jsonString);
        if (!data.title || !data.questions) throw new Error("Missing title or questions");

        await setDoc(doc(db, "questionPapers", data.title.replace(/\s+/g, '-').toLowerCase()), {
            subjectName: data.title,
            questions: data.questions,
            createdAt: serverTimestamp()
        });

        showAlert(`Paper "${data.title}" added!`, 'success');
        resetForm('add-question-form'); 
        await loadQuestionPapersForAdmin(); 
    } catch (error) {
        showAlert(error.message, 'danger');
    } finally {
        hideSpinner();
    }
}

async function deleteQuestionPaper(id) {
    showSpinner();
    try {
        await deleteDoc(doc(db, "questionPapers", id));
        showAlert('Deleted!', 'success');
        await loadQuestionPapersForAdmin(); 
    } catch (error) {
        showAlert('Delete failed.', 'danger');
    } finally {
        hideSpinner();
    }
}

// ফর্ম লিসেনার
const addQuestionForm = document.getElementById('add-question-form');
if (addQuestionForm) {
    addQuestionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addQuestionPaper(document.getElementById('question-json-input').value);
    });
}