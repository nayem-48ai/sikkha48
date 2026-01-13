// js/ui.js

/**
 * UI তে একটি অ্যালার্ট মেসেজ দেখায়।
 * @param {string} message - প্রদর্শনের জন্য মেসেজ।
 * @param {'success'|'danger'|'warning'|'info'} type - অ্যালার্টের ধরন।
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container'); // আপনার HTML এ এই আইডি সহ একটি কন্টেইনার থাকতে হবে
    if (alertContainer) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alertDiv);

        // নির্দিষ্ট সময় পর অ্যালার্ট স্বয়ংক্রিয়ভাবে সরিয়ে ফেলা
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    } else {
        alert(message); // যদি কন্টেইনার না থাকে, ব্রাউজারের ডিফল্ট অ্যালার্ট ব্যবহার করুন
    }
}

/**
 * লোডিং স্পিনার দেখায়।
 */
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.add('active'); // active ক্লাস যোগ করা
    }
}

/**
 * লোডিং স্পিনার লুকায়।
 */
function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.remove('active'); // active ক্লাস সরিয়ে ফেলা
    }
}

/**
 * একটি নির্দিষ্ট HTML এলিমেন্টের Inner HTML সেট করে।
 * @param {string} elementId - HTML এলিমেন্টের ID।
 * @param {string} htmlContent - সেট করার জন্য HTML কন্টেন্ট।
 */
function setElementHTML(elementId, htmlContent) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = htmlContent;
    } else {
        console.warn(`Element with ID '${elementId}' not found.`);
    }
}

/**
 * একটি ফর্ম রিসেট করে।
 * @param {string} formId - ফর্মের ID।
 */
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

// অন্যান্য UI সংক্রান্ত ফাংশন এখানে যোগ করা যেতে পারে

export {
    showAlert,
    showSpinner,
    hideSpinner,
    setElementHTML,
    resetForm
};