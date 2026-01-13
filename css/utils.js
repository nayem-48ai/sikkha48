// js/utils.js

/**
 * ইমেল অ্যাড্রেস ভ্যালিডেট করে।
 * @param {string} email - ভ্যালিডেট করার জন্য ইমেল।
 * @returns {boolean} - ইমেল বৈধ হলে true, অন্যথায় false।
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * পাসওয়ার্ড ভ্যালিডেট করে।
 * @param {string} password - ভ্যালিডেট করার জন্য পাসওয়ার্ড।
 * @returns {boolean} - পাসওয়ার্ড বৈধ হলে true, অন্যথায় false।
 */
function isValidPassword(password) {
    // কমপক্ষে 6টি অক্ষর
    return password.length >= 6;
}

/**
 * একটি JSON স্ট্রিং বৈধ কিনা তা পরীক্ষা করে।
 * @param {string} jsonString - পরীক্ষা করার জন্য JSON স্ট্রিং।
 * @returns {boolean} - JSON স্ট্রিং বৈধ হলে true, অন্যথায় false।
 */
function isValidJson(jsonString) {
    try {
        JSON.parse(jsonString);
    } catch (e) {
        return false;
    }
    return true;
}

/**
 * ইউজারকে নির্দিষ্ট URL এ রিডাইরেক্ট করে।
 * @param {string} url - রিডাইরেক্ট করার জন্য URL।
 */
function redirectTo(url) {
    window.location.href = url;
}

/**
 * সাধারণ লোডিং স্পিনার দেখায়/লুকায়।
 * @param {boolean} show - স্পিনার দেখাতে হলে true, লুকাতে হলে false।
 */
function toggleLoading(show) {
    const loadingElement = document.getElementById('loading-spinner'); // আপনার HTML এ এই আইডি সহ একটি স্পিনার থাকতে হবে
    if (loadingElement) {
        if (show) {
            loadingElement.style.display = 'flex'; // বা 'block'
        } else {
            loadingElement.style.display = 'none';
        }
    }
}

// অন্যান্য সাধারণ ইউটিলিটি ফাংশন এখানে যোগ করা যেতে পারে

export {
    isValidEmail,
    isValidPassword,
    isValidJson,
    redirectTo,
    toggleLoading
};