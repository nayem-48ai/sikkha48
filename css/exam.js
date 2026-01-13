// js/exam.js

import { 
    db, 
    auth, 
    getDoc, 
    doc, 
    collection, 
    getDocs, 
    query, 
    onAuthStateChanged 
} from './firebase-config.js';
import { showAlert, showSpinner, hideSpinner, setElementHTML } from './ui.js';
import { redirectTo } from './utils.js';
import { logout } from './auth.js';

let currentQuestions = [];
let currentSubject = '';
let userAnswers = {};

document.addEventListener('DOMContentLoaded', () => {
    showSpinner();
    
    // অথেন্টিকেশন চেক
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // ইউজার লগআউট হলে login.html এ যাবে
            redirectTo('login.html');
            return;
        }

        try {
            // রাউটিং লজিক
            const path = window.location.pathname;
            if (path.includes('index.html')) {
                await loadDashboard(user);
            } else if (path.includes('exam.html')) {
                await loadExamQuestions(user);
            } else if (path.includes('result.html')) {
                await displayResults(user);
            }
        } catch (error) {
            console.error("Page load error:", error);
            showAlert("Something went wrong.", "danger");
        } finally {
            hideSpinner();
        }
    });

    // লগআউট বাটন
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.onclick = async () => {
            await logout();
        };
    }
});

async function loadDashboard(user) {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) {
        showAlert("User profile missing.", "danger");
        return;
    }

    // যদি অ্যাপ্রুভড না হয়, মডাল বা ওয়ার্নিং দেখাও
    if (!userSnap.data().isApproved) {
        setElementHTML('exam-list', `
            <div class="alert alert-warning text-center mt-5">
                <h4>অ্যাকাউন্ট অনুমোদনের অপেক্ষায়</h4>
                <p>দয়া করে <strong>@Tnayem48</strong> এর সাথে যোগাযোগ করুন।</p>
                <p class="small text-muted">"Great things take time!"</p>
            </div>
        `);
        return;
    }

    await loadQuestionPapersList();
}

async function loadQuestionPapersList() {
    const list = document.getElementById('exam-list');
    if (!list) return;
    setElementHTML('exam-list', '<p class="text-center">Loading exams...</p>');

    try {
        const snap = await getDocs(query(collection(db, "questionPapers")));
        if (snap.empty) {
            setElementHTML('exam-list', '<p class="text-center text-muted">No exams available.</p>');
            return;
        }

        let html = '<div class="row row-cols-1 row-cols-md-3 g-4">';
        snap.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="col">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">${data.subjectName}</h5>
                            <p class="card-text">Questions: ${data.questions.length}</p>
                            <button class="btn btn-primary start-btn" data-id="${doc.id}" data-name="${data.subjectName}">Start Exam</button>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
        setElementHTML('exam-list', html);

        document.querySelectorAll('.start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                localStorage.setItem('currentExamSubjectId', e.target.dataset.id);
                localStorage.setItem('currentExamSubjectName', e.target.dataset.name);
                redirectTo('exam.html');
            });
        });
    } catch (e) {
        setElementHTML('exam-list', '<p class="text-center text-danger">Failed to load exams.</p>');
    }
}

async function loadExamQuestions(user) {
    const id = localStorage.getItem('currentExamSubjectId');
    if (!id) { redirectTo('index.html'); return; }

    currentSubject = localStorage.getItem('currentExamSubjectName');
    setElementHTML('subject-title', currentSubject);

    try {
        const snap = await getDoc(doc(db, "questionPapers", id));
        if (snap.exists()) {
            currentQuestions = snap.data().questions;
            renderQuestions();
        } else {
            setElementHTML('exam-container', '<p class="text-danger text-center">Exam not found.</p>');
        }
    } catch (e) {
        setElementHTML('exam-container', '<p class="text-danger text-center">Error loading questions.</p>');
    }
}

function renderQuestions() {
    const container = document.getElementById('exam-container');
    if (!container) return;
    container.innerHTML = '';

    currentQuestions.forEach((q, idx) => {
        let opts = '';
        q.options.forEach((opt, oIdx) => {
            opts += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="q-${idx}" id="q${idx}-o${oIdx}" value="${oIdx}">
                    <label class="form-check-label" for="q${idx}-o${oIdx}">${opt}</label>
                </div>`;
        });
        container.innerHTML += `
            <div class="card mb-4 shadow-sm">
                <div class="card-body">
                    <h5>Q${idx+1}: ${q.question}</h5>
                    <div class="opts">${opts}</div>
                </div>
            </div>`;
    });

    container.innerHTML += '<div class="text-center mt-4"><button id="sub-btn" class="btn btn-success btn-lg">Submit</button></div>';
    
    container.querySelectorAll('input[type="radio"]').forEach(r => {
        r.addEventListener('change', (e) => {
            const qIdx = parseInt(e.target.name.split('-')[1]);
            userAnswers[qIdx] = parseInt(e.target.value);
        });
    });

    document.getElementById('sub-btn').addEventListener('click', submitExam);
}

function submitExam() {
    showSpinner();
    let score = 0;
    let results = [];
    currentQuestions.forEach((q, idx) => {
        const ans = userAnswers[idx];
        const isCorrect = (ans === q.answer);
        if (isCorrect) score++;
        results.push({
            question: q.question,
            selectedAnswer: q.options[ans] || "Skipped",
            correctAnswer: q.options[q.answer],
            isCorrect: isCorrect,
            explanation: q.explanation
        });
    });
    localStorage.setItem('examResults', JSON.stringify(results));
    localStorage.setItem('examScore', score);
    localStorage.setItem('totalQuestions', currentQuestions.length);
    localStorage.setItem('examSubject', currentSubject);
    
    hideSpinner();
    redirectTo('result.html');
}

async function displayResults(user) {
    const resContainer = document.getElementById('results-container');
    if (!resContainer) return;

    const results = JSON.parse(localStorage.getItem('examResults') || '[]');
    const score = localStorage.getItem('examScore');
    const total = localStorage.getItem('totalQuestions');
    
    setElementHTML('exam-subject-display', localStorage.getItem('examSubject'));
    setElementHTML('score-display', `${score} / ${total}`);

    let html = '';
    results.forEach((res, idx) => {
        const cls = res.isCorrect ? 'border-success' : 'border-danger';
        const badge = res.isCorrect ? 'bg-success' : 'bg-danger';
        html += `
            <div class="card mb-3 ${cls}">
                <div class="card-body">
                    <h5 class="card-title">Q${idx+1} <span class="badge ${badge}">${res.isCorrect?'Correct':'Incorrect'}</span></h5>
                    <p><strong>Question:</strong> ${res.question}</p>
                    <p><strong>Your Answer:</strong> ${res.selectedAnswer}</p>
                    <p><strong>Correct Answer:</strong> ${res.correctAnswer}</p>
                    ${!res.isCorrect && res.explanation ? `<p class="text-muted">Note: ${res.explanation}</p>` : ''}
                </div>
            </div>`;
    });
    setElementHTML('results-container', html || '<p class="text-center">No results.</p>');
}