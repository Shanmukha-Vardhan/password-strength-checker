const passwordInput = document.getElementById('password');
const strengthText = document.getElementById('strength-text');
const strengthBar = document.getElementById('strength-bar');
const criteriaFeedback = document.getElementById('criteria-feedback');
const suggestionsPanel = document.getElementById('suggestions-panel');
const crackTime = document.getElementById('crack-time');
const breachFeedback = document.getElementById('breach-feedback');
const togglePassword = document.getElementById('toggle-password');

passwordInput.addEventListener('input', analyzePassword);
togglePassword.addEventListener('click', togglePasswordVisibility);

async function analyzePassword() {
    const password = passwordInput.value;
    let strengthScore = 0;
    const suggestionsList = [];

    // Criteria checks
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    // Strength calculation
    if (password.length > 0) strengthScore += 10;
    if (hasLower) strengthScore += 20;
    if (hasUpper) strengthScore += 20;
    if (hasDigit) strengthScore += 20;
    if (hasSpecial) strengthScore += 20;
    if (isLongEnough) strengthScore += 10;
    if (hasLower && hasUpper && hasDigit && hasSpecial && isLongEnough) {
        strengthScore += 10;
    }

    // Update strength meter
    let strengthLabel = 'None';
    let barClass = '';
    if (strengthScore >= 80) {
        strengthLabel = 'Strong';
        barClass = 'strong';
    } else if (strengthScore >= 50) {
        strengthLabel = 'Medium';
        barClass = 'medium';
    } else if (strengthScore > 0) {
        strengthLabel = 'Weak';
        barClass = 'weak';
    }

    strengthText.textContent = `Strength: ${strengthLabel}`;
    strengthBar.className = barClass;

    // Criteria feedback
    criteriaFeedback.innerHTML = `
        ${isLongEnough ? '✓' : '✗'} At least 8 characters<br>
        ${hasLower ? '✓' : '✗'} Lowercase letter<br>
        ${hasUpper ? '✓' : '✗'} Uppercase letter<br>
        ${hasDigit ? '✓' : '✗'} Digit<br>
        ${hasSpecial ? '✓' : '✗'} Special character
    `;

    // Suggestions for weak or medium passwords
    if (strengthScore < 80 && password.length > 0) {
        if (!isLongEnough) suggestionsList.push('At least 8 characters');
        if (!hasLower) suggestionsList.push('Lowercase letter');
        if (!hasUpper) suggestionsList.push('Uppercase letter');
        if (!hasDigit) suggestionsList.push('Digit');
        if (!hasSpecial) suggestionsList.push('Special character');
    }
    suggestionsPanel.innerHTML = suggestionsList.length
        ? `<strong>Suggestions to improve your password:</strong><ul>${suggestionsList.map(s => `<li>${s}</li>`).join('')}</ul>`
        : 'Your password is strong! No suggestions needed.';

    // Time to crack estimator
    let crackTimeText = 'Instantly';
    if (password.length > 0) {
        let charSetSize = 0;
        if (hasLower) charSetSize += 26;
        if (hasUpper) charSetSize += 26;
        if (hasDigit) charSetSize += 10;
        if (hasSpecial) charSetSize += 32;

        const charTypes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
        const scalingFactor = charTypes <= 2 ? 3.5 : 1.5;

        const entropy = (password.length * Math.log2(charSetSize || 1)) / scalingFactor;
        const attemptsPerSecond = 100_000_000;
        const secondsToCrack = Math.pow(2, entropy) / attemptsPerSecond;

        crackTimeText = formatCrackTime(secondsToCrack);
    }
    crackTime.textContent = `Time to crack: ${crackTimeText}`;

    // HaveIBeenPwned check
    let breachText = 'Checking for breaches...';
    let breachClass = 'error';
    if (password.length > 0) {
        try {
            const breachCount = await checkHIBP(password);
            if (breachCount > 0) {
                breachText = `Warning: This password has been seen in ${breachCount} breach${breachCount === 1 ? '' : 'es'}`;
                breachClass = 'compromised';
            } else {
                breachText = 'Good news: No breaches found for this password';
                breachClass = 'safe';
            }
        } catch (error) {
            breachText = 'Unable to check breaches at this time';
            breachClass = 'error';
        }
    }
    breachFeedback.textContent = breachText;
    breachFeedback.className = breachClass;
}

function togglePasswordVisibility() {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    const icon = togglePassword.querySelector('i');
    icon.classList.toggle('fa-eye', isPassword);
    icon.classList.toggle('fa-eye-slash', !isPassword);
    console.log('Toggled to:', passwordInput.type, icon.className); // Debug
}

async function checkHIBP(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' }
    });

    if (!response.ok) throw new Error('API request failed');

    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
            return parseInt(count, 10);
        }
    }
    return 0;
}

function formatCrackTime(seconds) {
    if (seconds < 1) return 'Instantly';
    if (seconds < 60) return `${Math.ceil(seconds)} second${seconds >= 2 ? 's' : ''}`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.ceil(minutes)} minute${minutes >= 2 ? 's' : ''}`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.ceil(hours)} hour${hours >= 2 ? 's' : ''}`;
    const days = hours / 24;
    if (days < 365) return `${Math.ceil(days)} day${days >= 2 ? 's' : ''}`;
    const years = days / 365;
    return `${Math.ceil(years)} year${years >= 2 ? 's' : ''}`;
}