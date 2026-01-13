// js/exam.js

import { db, auth, getDoc, doc, collection, getDocs, query, where } from './firebase-config.js';
import { showAlert, showSpinner, hideSpinner, setElementHTML } from './ui.js';
import { redirectTo } from './utils.js';
import { logout } from './auth.js'; // logout ফাংশন ইমপোর্ট করা হয়েছে

let currentQuestions = [];
let currentSubject = '';
let userAnswers = {};

// ইউজার অনুমোদিত কিনা তা চেক করে ড্যাশবোর্ড লোড করার ফাংশন
async function loadDashboard() {
  showSpinner();
  try {
    const user = auth.currentUser;
    if (!user) {
      redirectTo('index.html');
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        showAlert("Your user profile could not be found. Please contact support.", "danger");
        await logout(); // ইউজার ডেটা না পেলে লগআউট করে দাও
        return;
    }

    const userData = userDocSnap.data();
    const examListContainer = document.getElementById('exam-list');

    if (!userData.isApproved) {
      if(examListContainer) {
          setElementHTML('exam-list', '<p class="text-center text-warning mt-5">আপনার অ্যাকাউন্টটি এখনো অনুমোদিত হয়নি। এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।</p>');
      }
      return; // অনুমোদিত না হলে, পরীক্ষা লোড করবে না
    }

    // যদি অনুমোদিত হয়, প্রশ্নপত্রের তালিকা লোড করবে
    await loadQuestionPapersList();

  } catch (error) {
    console.error("Error loading dashboard:", error);
    showAlert('Failed to load dashboard: ' + error.message, 'danger');
    await logout(); // ত্রুটি হলে লগআউট করে দাও
  } finally {
    hideSpinner();
  }
}

// প্রশ্নপত্রের তালিকা লোড করার ফাংশন (ড্যাশবোর্ডের জন্য)
async function loadQuestionPapersList() {
  showSpinner();
  const examListContainer = document.getElementById('exam-list');
  if (!examListContainer) {
    hideSpinner();
    return;
  }

  setElementHTML('exam-list', '<p class="text-center">Loading available exams...</p>');

  try {
    const q = query(collection(db, "questionPapers"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setElementHTML('exam-list', '<p class="text-center text-muted">No exam papers available yet.</p>');
      return;
    }

    let html = '<div class="row row-cols-1 row-cols-md-3 g-4">';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const subjectId = doc.id; 
      html += `
        <div class="col">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">${data.subjectName}</h5>
              <p class="card-text">Total Questions: ${data.questions.length}</p>
              <button class="btn btn-primary start-exam-btn" data-subject-id="${subjectId}" data-subject-name="${data.subjectName}">Start Exam</button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    setElementHTML('exam-list', html);

    document.querySelectorAll('.start-exam-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const subjectId = e.target.dataset.subjectId;
        const subjectName = e.target.dataset.subjectName;
        localStorage.setItem('currentExamSubjectId', subjectId);
        localStorage.setItem('currentExamSubjectName', subjectName);
        redirectTo('exam.html'); 
      });
    });

  } catch (error) {
    console.error("Error loading question papers: ", error);
    showAlert('Failed to load exam papers: ' + error.message, 'danger');
    setElementHTML('exam-list', '<p class="text-center text-danger">Failed to load exam papers. Please try again later.</p>');
  } finally {
    hideSpinner();
  }
}

// পরীক্ষা শুরু করার জন্য প্রশ্ন লোড করা (exam.html এর জন্য)
async function loadExamQuestions() {
  showSpinner();
  const subjectId = localStorage.getItem('currentExamSubjectId');
  currentSubject = localStorage.getItem('currentExamSubjectName');

  if (!subjectId) {
    showAlert("No exam selected. Redirecting to dashboard.", "warning");
    redirectTo('dashboard.html');
    return;
  }

  const examContainer = document.getElementById('exam-container');
  if (!examContainer) {
    hideSpinner();
    return;
  }

  setElementHTML('exam-container', '<p class="text-center">Loading questions...</p>');
  setElementHTML('subject-title', currentSubject);

  try {
    const docRef = doc(db, "questionPapers", subjectId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      currentQuestions = data.questions;
      renderQuestions();
    } else {
      setElementHTML('exam-container', '<p class="text-center text-danger">Exam paper not found!</p>');
    }
  } catch (error) {
    console.error("Error loading exam questions: ", error);
    showAlert('Failed to load questions: ' + error.message, 'danger');
    setElementHTML('exam-container', '<p class="text-center text-danger">Failed to load questions. Please try again later.</p>');
  } finally {
    hideSpinner();
  }
}

// প্রশ্নগুলো UI তে রেন্ডার করা
function renderQuestions() {
  const examContainer = document.getElementById('exam-container');
  if (!examContainer) return;
  examContainer.innerHTML = ''; 

  currentQuestions.forEach((q, index) => {
    let optionsHtml = '';
    q.options.forEach((option, optIndex) => {
      optionsHtml += `
        <div class="form-check">
          <input class="form-check-input" type="radio" name="question-${index}" id="q${index}-opt${optIndex}" value="${optIndex}" ${userAnswers[index] == optIndex ? 'checked' : ''}>
          <label class="form-check-label" for="q${index}-opt${optIndex}">
            ${option}
          </label>
        </div>
      `;
    });

    examContainer.innerHTML += `
      <div class="card mb-4 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Q${index + 1}: ${q.question}</h5>
          <div class="options-container">
            ${optionsHtml}
          </div>
        </div>
      </div>
    `;
  });

  examContainer.innerHTML += `
    <div class="text-center mt-4">
      <button id="submit-exam-btn" class="btn btn-success btn-lg">Submit Exam</button>
    </div>
  `;

  examContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const questionIndex = parseInt(e.target.name.split('-')[1]);
      userAnswers[questionIndex] = parseInt(e.target.value);
    });
  });

  document.getElementById('submit-exam-btn').addEventListener('click', submitExam);
}

// পরীক্ষা সাবমিট করা এবং ফলাফল গণনা করা
function submitExam() {
  showSpinner();
  let score = 0;
  let results = [];

  currentQuestions.forEach((q, index) => {
    const userAnswer = userAnswers[index];
    const isCorrect = (userAnswer === q.answer); 

    if (isCorrect) {
      score++;
    }

    results.push({
      question: q.question,
      selectedAnswer: q.options[userAnswer] || "No answer",
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

// ফলাফল পেজে ফলাফল প্রদর্শন করা (result.html এর জন্য)
function displayResults() {
  showSpinner();
  const resultsContainer = document.getElementById('results-container');
  const scoreDisplay = document.getElementById('score-display');
  const examSubjectDisplay = document.getElementById('exam-subject-display');

  if (!resultsContainer || !scoreDisplay || !examSubjectDisplay) {
    hideSpinner();
    return;
  }

  const results = JSON.parse(localStorage.getItem('examResults') || '[]');
  const score = localStorage.getItem('examScore') || 0;
  const totalQuestions = localStorage.getItem('totalQuestions') || 0;
  const examSubject = localStorage.getItem('examSubject') || 'N/A';

  setElementHTML('exam-subject-display', examSubject);
  setElementHTML('score-display', `${score} / ${totalQuestions}`);

  if (results.length === 0) {
    setElementHTML('results-container', '<p class="text-center text-muted">No results to display.</p>');
    hideSpinner();
    return;
  }

  let html = '';
  results.forEach((res, index) => {
    const cardClass = res.isCorrect ? 'border-success' : 'border-danger';
    const answerBadge = res.isCorrect ? 'bg-success' : 'bg-danger';

    html += `
      <div class="card mb-3 ${cardClass}">
        <div class="card-body">
          <h5 class="card-title">Q${index + 1}: ${res.question} <span class="badge ${answerBadge}">${res.isCorrect ? 'Correct' : 'Incorrect'}</span></h5>
          <p class="card-text"><strong>Your Answer:</strong> ${res.selectedAnswer}</p>
          <p class="card-text"><strong>Correct Answer:</strong> ${res.correctAnswer}</p>
          ${!res.isCorrect && res.explanation ? `<p class="card-text"><strong>Explanation:</strong> ${res.explanation}</p>` : ''}
        </div>
      </div>
    `;
  });
  setElementHTML('results-container', html);

  // Clear local storage after displaying results to avoid stale data
  localStorage.removeItem('examResults');
  localStorage.removeItem('examScore');
  localStorage.removeItem('totalQuestions');
  localStorage.removeItem('examSubject');
  localStorage.removeItem('currentExamSubjectId');
  localStorage.removeItem('currentExamSubjectName');
  
  hideSpinner();
}


// DOMContentLoaded ইভেন্টের উপর ভিত্তি করে ফাংশন কল করা
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  if (currentPath.includes('dashboard.html')) {
    loadDashboard();
  } else if (currentPath.includes('exam.html')) {
    loadExamQuestions();
  } else if (currentPath.includes('result.html')) {
    displayResults();
  }

  // Logout button on exam and result pages
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
      logoutButton.addEventListener('click', logout); // auth.js থেকে logout ফাংশন ব্যবহার
  }
});