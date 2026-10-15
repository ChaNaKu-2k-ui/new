// 1. NAVIGATION LOGIC (පිටු ඇතුළත සෙක්ෂන් මාරු කිරීම)
function navigateTo(sectionId) {
    // හැම සෙක්ෂන් එකක්ම හංගන්න
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(sec => sec.classList.remove('active-section'));

    // හැම මෙන්නු ලින්ක් එකකම ඇක්ටිව් පාට අයින් කරන්න
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => link.classList.remove('active'));

    // ඉල්ලපු සෙක්ෂන් එක විතරක් පෙන්වන්න
    const targetSection = document.getElementById(`sec-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active-section');
    }

    // අදාළ මෙන්නු බටන් එක ඇක්ටිව් කරන්න (Home, About, Contact නම් විතරක්)
    const activeNav = document.getElementById(`nav-${sectionId}`);
    if (activeNav) {
        activeNav.classList.add('active');
    } else if (sectionId === 'home') {
        document.getElementById('nav-home').classList.add('active');
    }
    
    // පිටුව උඩටම ස්ක්‍රෝල් කරන්න
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. DEFAULT PAGE (පිටුව පූරණය වෙද්දී හෝම් සෙක්ෂන් එක පෙන්වන්න)
window.addEventListener('DOMContentLoaded', () => {
    navigateTo('home');
});

// 3. WORD COUNTER TOOL LOGIC
const textInput = document.getElementById('textInput');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');

if (textInput) {
    textInput.addEventListener('input', () => {
        const text = textInput.value.trim();
        charCount.innerText = text.length;
        wordCount.innerText = text === "" ? 0 : text.split(/\s+/).length;
    });
}

// 4. PASSWORD GENERATOR TOOL LOGIC
const passLength = document.getElementById('passLength');
const lengthVal = document.getElementById('lengthVal');
const generateBtn = document.getElementById('generateBtn');
const passwordResult = document.getElementById('passwordResult');

if (passLength) {
    passLength.addEventListener('input', () => {
        lengthVal.innerText = passLength.value;
    });
}

if (generateBtn) {
    generateBtn.addEventListener('click', () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let password = "";
        for (let i = 0; i < passLength.value; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        passwordResult.value = password;
    });
}
