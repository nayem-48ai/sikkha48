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
            redirectTo('login.html');
            return;
        }

        try {
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

    // অ্যাকাউন্ট অ্যাপ্রুভড না হলে পেমেন্ট গেটওয়ে দেখাবে
    if (!userSnap.data().isApproved) {
        setElementHTML('exam-list', `
            <div id="approval-notice-container" style="max-width: 500px; margin: 40px auto; padding: 0 15px;">
                <div id="fade-alert" class="alert alert-warning text-center shadow-sm" 
                     style="transition: all 0.8s ease; opacity: 1; border-radius: 15px; margin-bottom: 20px; overflow: hidden;">
                    <h4 class="font-weight-bold">অ্যাকাউন্ট (approval) অনুমোদনের অপেক্ষায়</h4>
                    <p class="mb-1">অ্যাক্টিভেশন ফি প্রদান করে নিচের ফরমটি পূরণ করুন।</p>
                    <p class="small text-muted">"Great things take time!"</p>
                </div>

                <div id="payment-wrapper" style="transition: all 0.8s ease; margin-top: 0;">
                    <iframe 
                        src="payment.html" 
                        style="width: 100%; height: 675px; border: none; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);" 
                        scrolling="no">
                    </iframe>
                </div>

                <div class="text-center mt-3">
                    <p class="text-muted small">সাহায্য/সহযোগিতার জন্য: <strong>@Tnayem48</strong></p>
                </div>
            </div>
        `);

        // ৫ সেকেন্ড পর অ্যালার্টটি সরিয়ে দেওয়ার ফাংশন
        setTimeout(() => {
            const alertBox = document.getElementById('fade-alert');
            const wrapper = document.getElementById('payment-wrapper');
            if (alertBox) {
                alertBox.style.opacity = '0';
                alertBox.style.maxHeight = '0';
                alertBox.style.margin = '0';
                alertBox.style.padding = '0';
                alertBox.style.border = 'none';
                
                // পেমেন্ট বক্সটি যেন স্মুথলি ওপরে উঠে আসে
                if(wrapper) {
                    wrapper.style.marginTop = "10px";
                }
            }
        }, 5000); // ৫০০০ মিলিসেকেন্ড = ৫ সেকেন্ড

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
                    <div class="card h-100 shadow-sm border-0" style="border-radius: 15px;">
                        <div class="card-body">
                            <h5 class="card-title font-weight-bold">${data.subjectName}</h5>
                            <p class="card-text text-muted">Questions: ${data.questions.length}</p>
                            <button class="btn btn-primary start-btn w-100 shadow-sm" 
                                    style="border-radius: 10px;"
                                    data-id="${doc.id}" data-name="${data.subjectName}">Start Exam</button>
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
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="q-${idx}" id="q${idx}-o${oIdx}" value="${oIdx}">
                    <label class="form-check-label" for="q${idx}-o${oIdx}">${opt}</label>
                </div>`;
        });
        container.innerHTML += `
            <div class="card mb-4 shadow-sm border-0" style="border-radius: 15px;">
                <div class="card-body">
                    <h5 class="font-weight-bold">Q${idx+1}: ${q.question}</h5>
                    <div class="opts mt-3">${opts}</div>
                </div>
            </div>`;
    });

    container.innerHTML += '<div class="text-center mt-4 mb-5"><button id="sub-btn" class="btn btn-success btn-lg px-5 shadow" style="border-radius: 12px;">Submit Exam</button></div>';
    
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
            <div class="card mb-3 ${cls} border-2" style="border-radius: 15px;">
                <div class="card-body">
                    <h5 class="card-title">Q${idx+1} <span class="badge ${badge}">${res.isCorrect?'Correct':'Incorrect'}</span></h5>
                    <p class="mb-1"><strong>Question:</strong> ${res.question}</p>
                    <p class="mb-1"><strong>Your Answer:</strong> ${res.selectedAnswer}</p>
                    <p class="mb-1"><strong>Correct Answer:</strong> <span class="text-success font-weight-bold">${res.correctAnswer}</span></p>
                    ${!res.isCorrect && res.explanation ? `<div class="mt-2 p-2 bg-light rounded small text-muted"><strong>Explanation:</strong> ${res.explanation}</div>` : ''}
                </div>
            </div>`;
    });
    setElementHTML('results-container', html || '<p class="text-center">No results.</p>');
}
