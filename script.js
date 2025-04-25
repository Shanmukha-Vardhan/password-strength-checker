const passwordInput = document.getElementById('password');
const strengthText = document.getElementById('strength-text');
const strengthBar = document.getElementById('strength-bar');
const criteriaFeedback = document.getElementById('criteria-feedback');
const suggestionsPanel = document.getElementById('suggestions-panel');
const crackTime = document.getElementById('crack-time');

passwordInput.addEventListener('input', analyzePassword);

function analyzePassword() {
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
        // Prioritize length first
        if (!isLongEnough) {
            suggestionsList.push(`Add ${8 - password.length} more character${8 - password.length === 1 ? '' : 's'} (currently ${password.length})`);
        }
        // Then character variety
        if (!hasLower) suggestionsList.push('Include at least one lowercase letter (e.g., a-z)');
        if (!hasUpper) suggestionsList.push('Include at least one uppercase letter (e.g., A-Z)');
        if (!hasDigit) suggestionsList.push('Include at least one number (e.g., 0-9)');
        if (!hasSpecial) suggestionsList.push('Include at least one special character (e.g., !@#$%)');
        // Additional tip for very weak passwords
        if (password.length < 4) {
            suggestionsList.push('Consider a longer password for better security');
        }
    }
    suggestionsPanel.innerHTML = suggestionsList.length
        ? `<strong>Suggestions to improve your password:</strong><ul>${suggestionsList.map(s => `<li>${s}</li>`).join('')}</ul>`
        : 'Your password is strong! No suggestions needed.';

    // Time to crack estimator
    let crackTimeText = 'Instantly';
    if (password.length > 0) {
        // Calculate character set size
        let charSetSize = 0;
        if (hasLower) charSetSize += 26;
        if (hasUpper) charSetSize += 26;
        if (hasDigit) charSetSize += 10;
        if (hasSpecial) charSetSize += 32;

        // Dynamic scaling based on character types
        const charTypes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
        const scalingFactor = charTypes <= 2 ? 3.5 : 1.5;

        // Entropy: Length * log2(Character Set Size) / scalingFactor
        const entropy = (password.length * Math.log2(charSetSize || 1)) / scalingFactor;
        
        // Assume 100 million attempts per second
        const attemptsPerSecond = 100_000_000;
        const secondsToCrack = Math.pow(2, entropy) / attemptsPerSecond;

        // Format time
        crackTimeText = formatCrackTime(secondsToCrack);
    }
    crackTime.textContent = `Time to crack: ${crackTimeText}`;
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