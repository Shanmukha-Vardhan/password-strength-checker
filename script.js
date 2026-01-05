// Grabbing all the DOM elements I need for the password checker
const pwdInput = document.getElementById('password'); // Main input field
const strengthMsg = document.getElementById('strength-text');
const strengthBarThing = document.getElementById('strength-bar');
  const criteriaBox = document.getElementById('criteria-feedback');
const suggestionArea = document.getElementById('suggestions-panel'); // Where I show tips
const crackTimeDisplay = document.getElementById('crack-time');
const breachStatus = document.getElementById('breach-feedback');
const toggleEyeBtn = document.getElementById('toggle-password');
const projInfoToggle = document.getElementById('project-details-toggle');
  const projInfoPanel = document.getElementById('project-details');
const closeButton = document.querySelector('.close-btn');
const footerSection = document.getElementById('footer');

// TODO: Maybe add a custom footer with my GitHub link later
// Loading footer from external file
fetch('footer.html')
.then(resp => resp.text())
.then(data => {
    footerSection.innerHTML = data;
    console.log("Footer loaded, looks good!"); // Debug to confirm it worked
})
.catch(err => {
    console.error('Footer load failed, ugh:', err);
});

// Wiring up the page stuff
if (pwdInput && toggleEyeBtn) {
  pwdInput.addEventListener('input', checkMyPassword); // Run analysis on input
    toggleEyeBtn.addEventListener('click', flipPasswordView);
}

if(projInfoToggle && projInfoPanel){
    projInfoToggle.addEventListener('click', showHideProjectInfo);
    projInfoPanel.classList.add('hidden'); // Hide it by default
}

  if (closeButton) {
 closeButton.addEventListener('click', showHideProjectInfo);
}

// Main function to analyze the password
async function checkMyPassword() {
    const userPassword = pwdInput.value; // Grab what they typed
    let pwdScore = 0; // Track how good the password is
    const tipsForBetterPwd = [];

    // Checking password criteria
    const gotLowercase = /[a-z]/.test(userPassword);
      const gotUppercase = /[A-Z]/.test(userPassword);
    const gotNumber = /\d/.test(userPassword);
    const gotSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(userPassword);
    const longEnough = userPassword.length >= 8;

    // Scoring logic (kinda arbitrary but works)
    if (userPassword.length > 0) pwdScore += 10; // At least they typed something
    if (gotLowercase) pwdScore += 20;
    if (gotUppercase) pwdScore += 20;
      if (gotNumber) pwdScore += 20;
    if (gotSpecialChar) pwdScore += 20;
    if (longEnough) pwdScore += 10;
    if (gotLowercase && gotUppercase && gotNumber && gotSpecialChar && longEnough) {
        pwdScore += 10; // Bonus for hitting all criteria
    }

    console.log(`Password score: ${pwdScore}`); // Debug to see the score

    // Update the strength meter UI

    // Update the strength meter UI
    let strengthLevel = 'None';
    let barClass = '';
    
    if (pwdScore >= 80) {
        strengthLevel = 'Fortress Level';
        barClass = 'strong';
    } else if (pwdScore >= 50) {
        strengthLevel = 'Moderate';
        barClass = 'medium';
    } else if (pwdScore > 0) {
        strengthLevel = 'Weak';
        barClass = 'weak';
    }

    strengthMsg.textContent = strengthLevel;
    // reset classes first
    strengthBarThing.className = '';
    if (barClass) strengthBarThing.classList.add(barClass);
    strengthBarThing.style.width = userPassword.length > 0 ? `${Math.min(pwdScore, 100)}%` : '0%';

    // Rich Criteria Feedback
    const criteriaList = [
        { label: '8+ Characters', met: longEnough },
        { label: 'Lowercase Letter', met: gotLowercase },
        { label: 'Uppercase Letter', met: gotUppercase },
        { label: 'Number', met: gotNumber },
        { label: 'Special Character', met: gotSpecialChar }
    ];

    criteriaBox.innerHTML = criteriaList.map(c => `
        <div class="criteria-item ${c.met ? 'valid' : ''}">
            <i class="fas ${c.met ? 'fa-check' : 'fa-circle'}"></i>
            <span>${c.label}</span>
        </div>
    `).join('');

    // Give tips if password isn't great
    if (pwdScore < 80 && userPassword.length > 0) {
      if (!longEnough) tipsForBetterPwd.push('Increase length to at least 8 characters');
      if (!gotLowercase) tipsForBetterPwd.push('Add a lowercase letter');
        if (!gotUppercase) tipsForBetterPwd.push('Include an uppercase letter');
      if (!gotNumber) tipsForBetterPwd.push('Incorporate a number');
      if (!gotSpecialChar) tipsForBetterPwd.push('Add a special symbol (!@#$)');
    }
    suggestionArea.innerHTML = tipsForBetterPwd.length
        ? `<b>Optimization Tips:</b><ul>${tipsForBetterPwd.map(tip => `<li>${tip}</li>`).join('')}</ul>`
        : '';

    // Estimate how long it'd take to crack
    let crackTimeTxt = 'Pending...';
    if (userPassword.length > 0) {
        let charPool = 0;
        if (gotLowercase) charPool += 26;
          if (gotUppercase) charPool += 26;
        if (gotNumber) charPool += 10;
        if (gotSpecialChar) charPool += 32;

        const charVariety = [gotLowercase, gotUppercase, gotNumber, gotSpecialChar].filter(Boolean).length;
        const tweakFactor = charVariety <= 2 ? 3.5 : 1.5;

        const entropyVal = (userPassword.length * Math.log2(charPool || 1)) / tweakFactor;
        const guessesPerSec = 100_000_000;
        const secsToCrack = Math.pow(2, entropyVal) / guessesPerSec;

        crackTimeTxt = makeCrackTimePretty(secsToCrack);
    }
    crackTimeDisplay.innerHTML = userPassword.length > 0 
        ? `<i class="fas fa-stopwatch"></i> Crack Time: <strong>${crackTimeTxt}</strong>`
        : '';

    // Check if password's been pwned
    // Using SHA-1 to check password safety via HIBP API
    if (userPassword.length > 0) {
        breachStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking breach database...';
        breachStatus.className = 'info-card'; // reset
        
        try {
            const breachHits = await raviVarmaHIBPCheck(userPassword);
            if (breachHits > 0) {
                breachStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Exposed in <strong>${breachHits.toLocaleString()}</strong> data breaches`;
                breachStatus.className = 'info-card compromised';
            } else {
                breachStatus.innerHTML = '<i class="fas fa-shield-alt"></i> No breaches found in public database';
                  breachStatus.className = 'info-card safe';
            }
        } catch (oops) {
            breachStatus.textContent = 'Breach check service unavailable';
            breachStatus.className = 'info-card error';
            console.error('HIBP check failed:', oops);
        }
    } else {
        breachStatus.textContent = '';
        breachStatus.className = 'info-card';
    }
}

// Toggle password visibility
function flipPasswordView() {
    const isHidden = pwdInput.type === 'password';
    pwdInput.type = isHidden ? 'text' : 'password';
    const eyeIcon = toggleEyeBtn.querySelector('i');
    eyeIcon.classList.toggle('fa-eye', isHidden);
      eyeIcon.classList.toggle('fa-eye-slash', !isHidden);
    console.log('Toggled to:', pwdInput.type, eyeIcon.className); // Keeping your debug
}

// Show/hide project details panel
function showHideProjectInfo() {
    projInfoPanel.style.display = projInfoPanel.style.display === 'none' ? 'block' : 'none';
    console.log('Project info toggled:', projInfoPanel.style.display); // Debug
}

// Check HaveIBeenPwned for breaches
async function raviVarmaHIBPCheck(pwd) {
    // Using SHA-1 to hash the password for HIBP
    const textEncoder = new TextEncoder();
    const pwdData = textEncoder.encode(pwd);
      const hashBuf = await crypto.subtle.digest('SHA-1', pwdData);
    const hashBytes = Array.from(new Uint8Array(hashBuf));
    const fullHash = hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

    const hashPrefix = fullHash.slice(0, 5);
    const hashTail = fullHash.slice(5);
    try {
        const resp = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
            headers: { 'Add-Padding': 'true' }
        });

        if (!resp.ok) throw new Error('HIBP API call failed');

        const apiText = await resp.text();
        const lines = apiText.split('\n');
        for (const line of lines) {
            const [suffix, count] = line.split(':');
            if (suffix === hashTail) {
                console.log(`Found breach, count: ${count}`); // Debug
                return parseInt(count, 10);
            }
        }
        return 0;
    } catch (err) {
        console.error('Error in HIBP check:', err); // Error tracing
        throw err;
    }
}

// Format crack time to look nice
function makeCrackTimePretty(secs) {
    if (secs < 1) return 'Instant';
    if (secs < 60) return `${Math.ceil(secs)} sec${secs >= 2 ? 's' : ''}`;
      const mins = secs / 60;
    if (mins < 60) return `${Math.ceil(mins)} min${mins >= 2 ? 's' : ''}`;
    const hrs = mins / 60;
    if (hrs < 24) return `${Math.ceil(hrs)} hr${hrs >= 2 ? 's' : ''}`;
    const days = hrs / 24;
    if (days < 365) return `${Math.ceil(days)} day${days >= 2 ? 's' : ''}`;
    const yrs = days / 365;
    return `${Math.ceil(yrs)} yr${yrs >= 2 ? 's' : ''}`;
}

// Personal note: This took way longer than expected, but it’s solid for my portfolio!
// TODO: Add dark mode toggle and password creator module before July 1st deadline