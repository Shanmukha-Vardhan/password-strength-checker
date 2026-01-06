// DOM Elements
const pwdInput = document.getElementById('password');
const strengthText = document.getElementById('strength-text');
const strengthBar = document.getElementById('strength-bar');
const criteriaBox = document.getElementById('criteria-feedback');
const suggestionArea = document.getElementById('suggestions-panel');
const breachStatus = document.getElementById('breach-feedback');
const patternFeedback = document.getElementById('pattern-feedback');
const toggleEyeBtn = document.getElementById('toggle-password');
const themeSelector = document.getElementById('theme-selector');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const downloadBtn = document.getElementById('download-report');
const entropyContainer = document.getElementById('entropy-container');
const entropyBar = document.getElementById('entropy-bar');
const entropyBits = document.getElementById('entropy-bits');

// Generator Elements
const genOutput = document.getElementById('generated-password');
const genLength = document.getElementById('gen-length');
const genLengthVal = document.getElementById('gen-length-val');
const genChecks = {
    upper: document.getElementById('gen-uppercase'),
    lower: document.getElementById('gen-lowercase'),
    num: document.getElementById('gen-numbers'),
    sym: document.getElementById('gen-symbols'),
    mem: document.getElementById('gen-memorable')
};
const btnCopy = document.getElementById('copy-btn');
const btnRefresh = document.getElementById('refresh-gen-btn');

// Age Input
const ageInput = document.getElementById('creation-date');
const rotationMsg = document.getElementById('rotation-msg');

// History & Badges
const badgeGrid = document.getElementById('badges-grid');
const historyList = document.getElementById('history-items');
const btnClearHistory = document.getElementById('clear-history');

// State
let currentEntropy = 0;
let userBadges = JSON.parse(localStorage.getItem('pwd_badges')) || [];
let historyLog = JSON.parse(localStorage.getItem('pwd_history')) || [];

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadFooter();
    initTabs();
    initTheme();
    initGenerator();
    renderBadges();
    renderHistory();

    // Check local storage for theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    themeSelector.value = savedTheme;
});

// --- CORE: Analysis & Strength ---

if (pwdInput) {
    pwdInput.addEventListener('input', () => {
        analyzePassword(pwdInput.value);
        updateEntropy(pwdInput.value);
    });
}
if (toggleEyeBtn) {
    toggleEyeBtn.addEventListener('click', () => {
        const type = pwdInput.type === 'password' ? 'text' : 'password';
        pwdInput.type = type;
        toggleEyeBtn.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
}

// Main Analysis Function
async function analyzePassword(pwd) {
    if (!pwd) {
        resetUI();
        return;
    }

    let score = 0;
    const checks = {
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        lower: /[a-z]/.test(pwd),
        num: /\d/.test(pwd),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };

    // Base Calculation
    if (checks.length) score += 10;
    if (checks.upper) score += 20;
    if (checks.lower) score += 20;
    if (checks.num) score += 20;
    if (checks.special) score += 20;
    if (pwd.length > 12) score += 10;

    // Pattern Detection Penalty
    const patterns = checkPatterns(pwd);
    if (patterns.length > 0) {
        score -= (patterns.length * 10);
        patternFeedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> Pattern Detected: ${patterns.join(', ')}`;
        patternFeedback.classList.remove('hidden');
    } else {
        patternFeedback.classList.add('hidden');
    }

    score = Math.max(0, Math.min(100, score));

    // Update UI
    updateMeter(score);
    updateCriteria(checks);
    updateSuggestions(checks, patterns);
    updateCrackTime(pwd);

    // Check Badges & Gamification
    checkBadges(score, pwd, checks);

    // Save to History (Debounced or on blur? Let's do on significant change or manual? 
    // Logic: distinct entries. We'll just log high scores or manual saves if we had a button.
    // For now, let's just log the 'latest' attempt if it's strong enough to avoid spam.
    if (score > 60) addToHistory(score);

    // Show PDF button if respectable score
    if (score > 40) downloadBtn.classList.remove('hidden');
    else downloadBtn.classList.add('hidden');

    // Breach Check (Debounced ideally, but here direct)
    checkBreach(pwd);
}

function checkPatterns(pwd) {
    const findings = [];
    const lower = pwd.toLowerCase();

    // Common sequences
    if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/.test(lower)) findings.push("Scale Sequence");
    if (/(123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321|210)/.test(pwd)) findings.push("Number Sequence");
    if (/(qwerty|asdf|zxcv|poiuy|lkjh)/.test(lower)) findings.push("Keyboard Pattern");
    if (/(.)\1\1/.test(pwd)) findings.push("Repeated Characters");

    // Common words (very basic dictionary)
    const common = ['password', 'admin', 'welcome', 'love', '123456', 'google'];
    if (common.some(w => lower.includes(w))) findings.push("Common Dictionary Word");

    return findings;
}

function updateMeter(score) {
    let label = 'Weak';
    let cls = 'weak';

    if (score >= 80) { label = 'Fortress'; cls = 'strong'; }
    else if (score >= 50) { label = 'Moderate'; cls = 'medium'; }

    strengthText.textContent = `${label} (${score}%)`;
    strengthBar.className = cls;
    strengthBar.style.width = `${score}%`;

    if (score === 100) confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
}

function updateCriteria(c) {
    criteriaBox.innerHTML = `
        <div class="criteria-item ${c.length ? 'valid' : ''}"><i class="fas ${c.length ? 'fa-check' : 'fa-circle'}"></i> 8+ Chars</div>
        <div class="criteria-item ${c.lower ? 'valid' : ''}"><i class="fas ${c.lower ? 'fa-check' : 'fa-circle'}"></i> Lowercase</div>
        <div class="criteria-item ${c.upper ? 'valid' : ''}"><i class="fas ${c.upper ? 'fa-check' : 'fa-circle'}"></i> Uppercase</div>
        <div class="criteria-item ${c.num ? 'valid' : ''}"><i class="fas ${c.num ? 'fa-check' : 'fa-circle'}"></i> Number</div>
        <div class="criteria-item ${c.special ? 'valid' : ''}"><i class="fas ${c.special ? 'fa-check' : 'fa-circle'}"></i> Symbol</div>
    `;
}

function updateSuggestions(c, patterns) {
    const tips = [];
    if (!c.length) tips.push("Make it longer (8+ characters).");
    if (!c.special) tips.push("Add a special character (!@#$).");
    if (patterns.length) tips.push(`Fix patterns: ${patterns.join(', ')}`);

    suggestionArea.innerHTML = tips.length ? `<ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>` : '';
}

function updateEntropy(pwd) {
    if (!pwd) {
        entropyContainer.classList.add('entropy-hidden');
        return;
    }
    entropyContainer.classList.remove('entropy-hidden');

    const pool = (/[a-z]/.test(pwd) ? 26 : 0) + (/[A-Z]/.test(pwd) ? 26 : 0) + (/\d/.test(pwd) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(pwd) ? 32 : 0);
    const entropy = Math.floor(pwd.length * Math.log2(pool || 1));
    currentEntropy = entropy;

    entropyBits.textContent = entropy;
    entropyBar.style.width = `${Math.min(entropy, 128) / 1.28}%`; // Max visual ~128 bits

    const msg = document.getElementById('entropy-msg');
    if (entropy < 40) msg.textContent = "Very predictable.";
    else if (entropy < 80) msg.textContent = "Reasonably secure.";
    else msg.textContent = "Mathematically improbable to guess.";
}

function updateCrackTime(pwd) {
    // Simple estimation logic
    const pool = (/[a-z]/.test(pwd) ? 26 : 0) + (/[A-Z]/.test(pwd) ? 26 : 0) + (/\d/.test(pwd) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(pwd) ? 32 : 0);
    const combos = Math.pow(pool, pwd.length);

    // PC: 1 billion guesses/sec
    // Super: 1 trillion guesses/sec
    const secPC = combos / 1e9;
    const secSuper = combos / 1e12;

    document.getElementById('time-pc').textContent = formatTime(secPC);
    document.getElementById('time-super').textContent = formatTime(secSuper);
}

function formatTime(seconds) {
    if (seconds < 1) return "Instant";
    const units = [
        { u: 'year', s: 31536000 },
        { u: 'day', s: 86400 },
        { u: 'hour', s: 3600 },
        { u: 'min', s: 60 }
    ];
    for (const unit of units) {
        if (seconds >= unit.s) return `${Math.floor(seconds / unit.s)} ${unit.u}s`;
    }
    return `${Math.floor(seconds)} secs`;
}

// --- Generator Logic ---
function initGenerator() {
    genLength.addEventListener('input', () => {
        genLengthVal.textContent = genLength.value;
        generateNewPassword();
    });
    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(genOutput.value);
        btnCopy.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => btnCopy.innerHTML = '<i class="fas fa-copy"></i>', 1500);
    });
    btnRefresh.addEventListener('click', generateNewPassword);

    Object.values(genChecks).forEach(cb => cb.addEventListener('change', generateNewPassword));
    generateNewPassword();
}

function generateNewPassword() {
    const len = parseInt(genLength.value);
    const useMem = genChecks.mem.checked;

    if (useMem) {
        // Memorable logic: Word-Word-Num
        const words = ['Sky', 'Blue', 'Falcon', 'Galaxy', 'Pixel', 'Sonic', 'Crypto', 'Hawk', 'River', 'Stone', 'Leaf', 'Fire', 'Neon'];
        const separators = ['-', '!', '#', '@'];
        let result = [];
        while (result.join('').length < len) {
            result.push(words[Math.floor(Math.random() * words.length)]);
            if (result.join('').length < len) result.push(separators[Math.floor(Math.random() * separators.length)]);
        }
        genOutput.value = result.join('').slice(0, len); // Truncate to fit exactly? Or just relax length.
        // Actually, for memorable, let's just do 3-4 words + num
        const w1 = words[Math.floor(Math.random() * words.length)];
        const w2 = words[Math.floor(Math.random() * words.length)];
        const w3 = words[Math.floor(Math.random() * words.length)];
        const num = Math.floor(Math.random() * 9999);
        genOutput.value = `${w1}-${w2}-${w3}${num}`;
    } else {
        // Standard Chaos
        const chars = {
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lower: 'abcdefghijklmnopqrstuvwxyz',
            num: '0123456789',
            sym: '!@#$%^&*()_+'
        };
        let pool = '';
        if (genChecks.upper.checked) pool += chars.upper;
        if (genChecks.lower.checked) pool += chars.lower;
        if (genChecks.num.checked) pool += chars.num;
        if (genChecks.sym.checked) pool += chars.sym;

        if (!pool) pool = chars.lower;

        let res = '';
        const arr = new Uint32Array(len);
        crypto.getRandomValues(arr);
        for (let i = 0; i < len; i++) {
            res += pool[arr[i] % pool.length];
        }
        genOutput.value = res;
    }
}

// --- Gamification ---
const BADGES = [
    { id: 'first_try', name: 'Rookie', icon: '🐣', check: (s, p) => true },
    { id: 'fortress', name: 'Fortress', icon: '🏰', check: (s, p) => s >= 80 },
    { id: 'century', name: 'Entropy King', icon: '🧠', check: (s, p) => currentEntropy > 100 },
    { id: 'long_haul', name: 'Novel Writer', icon: '📜', check: (s, p) => p.length > 20 }
];

function checkBadges(score, pwd) {
    let newUnlock = false;
    BADGES.forEach(b => {
        if (!userBadges.includes(b.id) && b.check(score, pwd)) {
            userBadges.push(b.id);
            newUnlock = true;
            // Notify user?
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    });
    if (newUnlock) {
        localStorage.setItem('pwd_badges', JSON.stringify(userBadges));
        renderBadges();
    }
}

function renderBadges() {
    badgeGrid.innerHTML = BADGES.map(b => {
        const unlocked = userBadges.includes(b.id);
        return `
            <div class="badge ${unlocked ? 'unlocked' : ''}">
                <span class="badge-icon">${b.icon}</span>
                <span class="badge-name">${b.name}</span>
            </div>
        `;
    }).join('');
}

// --- History ---
function addToHistory(score) {
    // Keep last 5
    const entry = { score, date: new Date().toLocaleTimeString() };
    if (historyLog.length > 0 && historyLog[0].score === score) return; // Prevent dupe spam
    historyLog.unshift(entry);
    if (historyLog.length > 5) historyLog.pop();
    localStorage.setItem('pwd_history', JSON.stringify(historyLog));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = historyLog.map(h => `
        <li class="history-item">
            <span>Scan at ${h.date}</span>
            <strong>${h.score}%</strong>
        </li>
    `).join('');
}

if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
        historyLog = [];
        localStorage.removeItem('pwd_history');
        renderHistory();
    });
}

// --- Utils: HIBP, Themes, PDF, Tabs ---

async function checkBreach(pwd) {
    // (Reuse existing logic or simplified version)
    // For brevity, basic fetch placeholder logic:
    const hash = await sha1(pwd);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5).toUpperCase();
    try {
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        const text = await res.text();
        const match = text.split('\n').find(line => line.startsWith(suffix));
        if (match) {
            const count = match.split(':')[1];
            breachStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Pwned ${parseInt(count).toLocaleString()} times!`;
            breachStatus.className = 'info-card compromised';
        } else {
            breachStatus.innerHTML = `<i class="fas fa-check-circle"></i> No breach found.`;
            breachStatus.className = 'info-card safe';
        }
    } catch (e) { console.log(e); }
}

async function sha1(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-1', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function initTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });
}

function initTheme() {
    themeSelector.addEventListener('change', (e) => {
        document.body.setAttribute('data-theme', e.target.value);
        localStorage.setItem('theme', e.target.value);
    });
}

function loadFooter() {
    fetch('footer.html').then(r => r.text()).then(h => document.getElementById('footer').innerHTML = h);
}

// PDF Export (Basic)
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Security Analysis Report", 20, 20);
        doc.setFontSize(12);
        doc.text(`Password Strength: ${strengthText.textContent}`, 20, 40);
        doc.text(`Entropy: ${currentEntropy} bits`, 20, 50);
        doc.text(`Breach Status: ${breachStatus.textContent}`, 20, 60);
        doc.save("security-report.pdf");
    });
}

// Age Check Logic
if (ageInput) {
    ageInput.addEventListener('change', () => {
        const date = new Date(ageInput.value);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 90) {
            rotationMsg.innerHTML = `<span style="color:var(--danger)">High Risk: ${diffDays} days old. Rotate immediately.</span>`;
        } else {
            rotationMsg.innerHTML = `<span style="color:var(--success)">Good: ${diffDays} days old.</span>`;
        }
        rotationMsg.classList.remove('hidden');
    });
}

// Export CSV
const btnExportHistory = document.getElementById('export-history-btn');
if (btnExportHistory) {
    btnExportHistory.addEventListener('click', () => {
        if (!historyLog.length) return alert('No history to export!');
        let csv = 'Date,Score\n';
        historyLog.forEach(row => {
            csv += `${row.date},${row.score}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'password_history.csv';
        a.click();
    });
}

// --- Memorization Dojo ---
const btnTrain = document.getElementById('train-btn');
const modalDojo = document.getElementById('dojo-modal');
const closeModal = document.querySelector('.close-modal');
const stepView = document.getElementById('dojo-step-view');
const stepInput = document.getElementById('dojo-step-input');
const dojoTarget = document.getElementById('dojo-target-display');
const dojoInput = document.getElementById('dojo-input');
const dojoTimerBar = document.getElementById('dojo-timer-bar');
const dots = document.querySelectorAll('.dot');
let trainingPwd = '';
let trainingRound = 0;
const ROUNDS = 3;

if (btnTrain) {
    btnTrain.addEventListener('click', () => {
        const pwd = genOutput.value;
        if (!pwd) return alert("Generate a password first!");
        startDojo(pwd);
    });
}
if (closeModal) {
    closeModal.addEventListener('click', () => {
        modalDojo.classList.add('hidden');
    });
}

function startDojo(pwd) {
    trainingPwd = pwd;
    trainingRound = 0;
    modalDojo.classList.remove('hidden');
    nextRound();
}

function nextRound() {
    if (trainingRound >= ROUNDS) {
        // Win!
        confetti({ particleCount: 150, spread: 80 });
        dojoTarget.textContent = "MASTERED!";
        stepView.classList.remove('hidden');
        stepInput.classList.add('hidden');
        setTimeout(() => modalDojo.classList.add('hidden'), 3000);
        return;
    }

    // Reset UI
    stepView.classList.remove('hidden');
    stepInput.classList.add('hidden');
    dojoInput.value = '';
    dojoInput.className = '';
    dojoTarget.textContent = trainingPwd;
    updateDots();

    // Timer
    dojoTimerBar.style.transition = 'none';
    dojoTimerBar.style.width = '100%';
    setTimeout(() => {
        dojoTimerBar.style.transition = 'width 5s linear';
        dojoTimerBar.style.width = '0%';
    }, 50);

    setTimeout(() => {
        showInputPhase();
    }, 5000); // 5 seconds to memorize
}

function showInputPhase() {
    stepView.classList.add('hidden');
    stepInput.classList.remove('hidden');
    dojoInput.focus();
}

if (dojoInput) {
    dojoInput.addEventListener('input', () => {
        if (dojoInput.value === trainingPwd) {
            dojoInput.className = 'correct';
            trainingRound++;
            setTimeout(nextRound, 1000); // Wait a sec then next
        } else if (dojoInput.value.length >= trainingPwd.length) {
            dojoInput.className = 'wrong';
        }
    });
}

function updateDots() {
    dots.forEach((d, i) => {
        d.className = 'dot';
        if (i < trainingRound) d.classList.add('success');
        else if (i === trainingRound) d.classList.add('active');
    });
}

function resetUI() {
    strengthText.textContent = 'Empty';
    strengthBar.style.width = '0';
    if (patternFeedback) patternFeedback.classList.add('hidden');
    breachStatus.textContent = '';
    entropyContainer.classList.add('entropy-hidden');
}

// --- QR Code Logic ---
const btnQr = document.getElementById('qr-btn');
const modalQr = document.getElementById('qr-modal');
const closeQr = document.querySelector('.close-modal-qr');
const qrContainer = document.getElementById('qrcode');

if (btnQr) {
    btnQr.addEventListener('click', () => {
        const password = genOutput.value;
        if (!password) {
            alert('Generate a password first!');
            return;
        }

        modalQr.classList.remove('hidden');
        qrContainer.innerHTML = ''; // Clear previous

        // Generate new QR
        new QRCode(qrContainer, {
            text: password,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    });
}

if (closeQr) {
    closeQr.addEventListener('click', () => {
        modalQr.classList.add('hidden');
    });
}