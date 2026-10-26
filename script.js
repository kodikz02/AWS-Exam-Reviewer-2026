let questionBank = [];
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = {};
let isSubmitted = false;
let timerInterval = null;
let totalTimeSeconds = 0;
let remainingSeconds = 0;

// Load questions directly via Python local server
document.addEventListener("DOMContentLoaded", async function() {
    try {
        const response = await fetch('questions.json');
        questionBank = await response.json();
        console.log(`Successfully loaded ${questionBank.length} questions.`);
    } catch (e) {
        alert("Error loading questions.json! Make sure your python server is running on localhost:8000.");
    }

    document.getElementById("start-btn").addEventListener("click", startQuiz);
    document.getElementById("submit-btn").addEventListener("click", submitAnswer);
    document.getElementById("next-btn").addEventListener("click", nextQuestion);
    document.getElementById("restart-btn").addEventListener("click", resetQuiz);
});

function startQuiz() {
    if (questionBank.length === 0) {
        alert("No questions loaded in questionBank.");
        return;
    }

    const domain = document.getElementById("domain-select").value;
    const countInput = document.getElementById("question-count");
    const timeSelect = document.getElementById("time-limit");

    const requestedCount = parseInt(countInput.value) || 65;
    const timeLimitMinutes = parseInt(timeSelect.value) || 0;

    if (domain === "ALL") {
        currentQuestions = [...questionBank];
    } else {
        currentQuestions = questionBank.filter(q => q.domain === domain);
    }

    currentQuestions = currentQuestions.sort(() => 0.5 - Math.random()).slice(0, Math.min(requestedCount, currentQuestions.length));

    if (currentQuestions.length === 0) {
        alert("No questions found for the selected category.");
        return;
    }

    currentIndex = 0;
    userAnswers = {};

    if (timeLimitMinutes > 0) {
        totalTimeSeconds = timeLimitMinutes * 60;
        remainingSeconds = totalTimeSeconds;
        document.getElementById("timer-display").classList.remove("hidden");
        updateTimerDisplay();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(tickTimer, 1000);
    } else {
        document.getElementById("timer-display").classList.add("hidden");
    }

    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");
    
    loadQuestion();
}

function tickTimer() {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        alert("⏱️ Time limit reached! Submitting exam.");
        showResults();
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    document.getElementById("timer-display").innerText = `⏳ ${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function loadQuestion() {
    isSubmitted = false;
    const q = currentQuestions[currentIndex];

    document.getElementById("domain-badge").innerText = q.domain;
    document.getElementById("progress-text").innerText = `Question ${currentIndex + 1} / ${currentQuestions.length}`;
    document.getElementById("question-text").innerText = q.question;

    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    const inputType = q.type === "multiple-response" ? "checkbox" : "radio";

    q.options.forEach((opt, idx) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "option-item";
        optionDiv.onclick = () => toggleOption(idx, q.type);

        const input = document.createElement("input");
        input.type = inputType;
        input.name = "option";
        input.value = idx;
        input.id = `opt-${idx}`;
        
        if (userAnswers[currentIndex] && userAnswers[currentIndex].includes(idx)) {
            input.checked = true;
            optionDiv.classList.add("selected");
        }

        const label = document.createElement("label");
        label.htmlFor = `opt-${idx}`;
        label.innerText = opt;
        label.style.marginBottom = "0";
        label.style.cursor = "pointer";

        optionDiv.appendChild(input);
        optionDiv.appendChild(label);
        optionsContainer.appendChild(optionDiv);
    });

    document.getElementById("explanation-box").classList.remove("visible");
    document.getElementById("submit-btn").classList.remove("hidden");
    document.getElementById("next-btn").classList.add("hidden");
}

function toggleOption(index, type) {
    if (isSubmitted) return;

    if (!userAnswers[currentIndex]) {
        userAnswers[currentIndex] = [];
    }

    if (type === "multiple-response") {
        const pos = userAnswers[currentIndex].indexOf(index);
        if (pos > -1) {
            userAnswers[currentIndex].splice(pos, 1);
        } else {
            userAnswers[currentIndex].push(index);
        }
    } else {
        userAnswers[currentIndex] = [index];
    }

    const items = document.querySelectorAll(".option-item");
    items.forEach((item, idx) => {
        const input = item.querySelector("input");
        if (userAnswers[currentIndex].includes(idx)) {
            item.classList.add("selected");
            input.checked = true;
        } else {
            item.classList.remove("selected");
            input.checked = false;
        }
    });
}

function submitAnswer() {
    if (!userAnswers[currentIndex] || userAnswers[currentIndex].length === 0) {
        alert("Please select an answer before submitting.");
        return;
    }

    isSubmitted = true;
    const q = currentQuestions[currentIndex];
    
    document.getElementById("explanation-text").innerText = q.explanation;
    document.getElementById("explanation-box").classList.add("visible");

    document.getElementById("submit-btn").classList.add("hidden");
    document.getElementById("next-btn").classList.remove("hidden");
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
        loadQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");

    let score = 0;
    const reviewContainer = document.getElementById("review-container");
    reviewContainer.innerHTML = "";

    currentQuestions.forEach((q, idx) => {
        const uAns = (userAnswers[idx] || []).sort();
        const cAns = [...q.answer].sort();
        const isCorrect = JSON.stringify(uAns) === JSON.stringify(cAns);

        if (isCorrect) score++;

        const reviewDiv = document.createElement("div");
        reviewDiv.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;

        const userText = uAns.map(i => q.options[i]).join(", ") || "No Answer";
        const correctText = cAns.map(i => q.options[i]).join(", ");

        reviewDiv.innerHTML = `
            <strong>${idx + 1}. ${q.question}</strong><br>
            <small style="color: var(--text-muted);">Domain: ${q.domain}</small><br>
            <p style="margin-top: 8px;"><strong>Your Answer:</strong> <span style="color: ${isCorrect ? 'var(--correct-green)' : 'var(--wrong-red)'};">${userText}</span></p>
            ${!isCorrect ? `<p><strong>Correct Answer:</strong> <span style="color: var(--correct-green);">${correctText}</span></p>` : ''}
            <p style="margin-top: 5px; font-size: 0.9rem; color: var(--text-muted);"><em>${q.explanation}</em></p>
        `;

        reviewContainer.appendChild(reviewDiv);
    });

    document.getElementById("score-number").innerText = `${score} / ${currentQuestions.length}`;
    const pct = Math.round((score / currentQuestions.length) * 100);
    document.getElementById("percentage-text").innerText = `Score: ${pct}% ${pct >= 70 ? '🎉 PASSED!' : '❌ NEEDS REVISION'}`;

    if (totalTimeSeconds > 0) {
        const usedSecs = totalTimeSeconds - remainingSeconds;
        const uMins = Math.floor(usedSecs / 60);
        const uSecs = usedSecs % 60;
        document.getElementById("time-used-text").innerText = `Time Elapsed: ${uMins}m ${uSecs}s`;
    } else {
        document.getElementById("time-used-text").innerText = "";
    }
}

function resetQuiz() {
    document.getElementById("result-screen").classList.add("hidden");
    document.getElementById("setup-screen").classList.remove("hidden");
}