window.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const strengthText = document.getElementById('strength-text');
    const strengthBar = document.getElementById('strength-bar');
    const criteriaFeedback = document.getElementById('criteria-feedback');
    const suggestions = document.getElementById('suggestions');
    const crackTime = document.getElementById('crack-time');

    passwordInput.addEventListener('input', analyzePassword);

    function analyzePassword() {
        const password = passwordInput.value;
        let strengthScore = 0;
        const suggestionsList = [];

        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;

        if (password.length > 0) strengthScore += 10;
        if (hasLower) strengthScore += 20;
        if (hasUpper) strengthScore += 20;
        if (hasDigit) strengthScore += 20;
        if (hasSpecial) strengthScore += 20;
        if (isLongEnough) strengthScore += 10;

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

        criteriaFeedback.innerHTML = `
            ${isLongEnough ? '✓' : '✗'} At least 8 characters<br>
            ${hasLower ? '✓' : '✗'} Lowercase letter<br>
            ${hasUpper ? '✓' : '✗'} Uppercase letter<br>
            ${hasDigit ? '✓' : '✗'} Digit<br>
            ${hasSpecial ? '✓' : '✗'} Special character
        `;

        if (strengthScore < 80 && password.length > 0) {
            if (!isLongEnough) suggestionsList.push('Make the password at least 8 characters long');
            if (!hasLower) suggestionsList.push('Add a lowercase letter');
            if (!hasUpper) suggestionsList.push('Add an uppercase letter');
            if (!hasDigit) suggestionsList.push('Add a number');
            if (!hasSpecial) suggestionsList.push('Add a special character');
        }
        suggestions.innerHTML = suggestionsList.length
            ? `<strong>Suggestions:</strong><br>${suggestionsList.join('<br>')}`
            : '';

        let crackTimeText = 'Instantly';
        if (password.length > 0) {
            let charSetSize = 0;
            if (hasLower) charSetSize += 26;
            if (hasUpper) charSetSize += 26;
            if (hasDigit) charSetSize += 10;
            if (hasSpecial) charSetSize += 32;

            if (charSetSize === 0) {
                crackTime.textContent = 'Time to crack: N/A';
                return;
            }

            const entropy = password.length * Math.log2(charSetSize);
            const attemptsPerSecond = 1e11; // 100 billion
            const secondsToCrack = Math.pow(2, entropy) / attemptsPerSecond;

            crackTimeText = formatCrackTime(secondsToCrack);
        }
        crackTime.textContent = `Time to crack: ${crackTimeText}`;
    }

    function formatCrackTime(seconds) {
        if (seconds < 1) return 'Instantly';
        if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
        const minutes = seconds / 60;
        if (minutes < 60) return `${Math.ceil(minutes)} minutes`;
        const hours = minutes / 60;
        if (hours < 24) return `${Math.ceil(hours)} hours`;
        const days = hours / 24;
        if (days < 365) return `${Math.ceil(days)} days`;
        const years = days / 365;
        return `${Math.ceil(years)} years`;
    }
});
