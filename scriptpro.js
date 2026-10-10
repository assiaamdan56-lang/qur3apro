/* =====================================================
   Qur3a Pro - Functional Script (Firebase + 2 Inputs Room System)
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCPFWFfOu52lXsn4zw9g_MpolXliKSAz0",
    authDomain: "qur3a-acad5.firebaseapp.com",
    databaseURL: "https://qur3a-acad5-default-rtdb.firebaseio.com",
    projectId: "qur3a-acad5",
    storageBucket: "qur3a-acad5.firebasestorage.app",
    messagingSenderId: "43636337221",
    appId: "1:43636337221:web:201025dca4d26e9713512c"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let currentRoomCode = "";
let currentUser = "";
let isHost = false;
let roomRef = null;
let timerInterval = null;
let timeLeft = 60;

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });
    document.getElementById(pageId).classList.add("active");
    updateNavigation(pageId);
}

document.addEventListener("DOMContentLoaded", () => {
    showPage("homePage");
});

function updateNavigation(pageId) {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (pageId === "gamePage") document.querySelectorAll(".nav-item")[0].classList.add("active");
    if (pageId === "chatPage") document.querySelectorAll(".nav-item")[1].classList.add("active");
    if (pageId === "profilePage") document.querySelectorAll(".nav-item")[2].classList.add("active");

    const nav = document.getElementById("bottomNav");
    if (pageId === "homePage" || pageId === "adminPage") {
        nav.style.display = "none";
    } else {
        nav.style.display = "flex";
    }
}

/* ================= ROOM MODALS (2 INPUTS) ================= */

function openCreateRoomModal() {
    document.getElementById("createRoomModal").classList.remove("hidden");
}

function closeCreateModal() {
    document.getElementById("createRoomModal").classList.add("hidden");
}

function confirmCreateRoom() {
    const hostName = document.getElementById("createHostName").value.trim();
    const pin = document.getElementById("createPinInput").value.trim();

    if (!hostName || !pin) {
        alert("⚠️ A3fak 3amer ga3 l'khanat (Smiya w Code)!");
        return;
    }

    currentUser = hostName;
    isHost = true;
    currentRoomCode = pin;

    closeCreateModal();
    initRoom(true);
}

function openJoinRoomModal() {
    document.getElementById("joinRoomModal").classList.remove("hidden");
}

function closeJoinModal() {
    document.getElementById("joinRoomModal").classList.add("hidden");
}

function confirmJoinRoom() {
    const code = document.getElementById("joinRoomCodeInput").value.trim();
    const name = document.getElementById("joinPlayerName").value.trim();

    if (!code || !name) {
        alert("⚠️ A3fak 3amer code w smiytek!");
        return;
    }

    currentRoomCode = code;
    currentUser = name;
    isHost = false;

    db.ref(`rooms/${currentRoomCode}`).once('value', snapshot => {
        if (snapshot.exists()) {
            closeJoinModal();
            initRoom(false);
        } else {
            alert("⚠️ Had room ma kaynach! Jreb code khor.");
        }
    });
}

function initRoom(creator) {
    roomRef = db.ref(`rooms/${currentRoomCode}`);
    
    document.getElementById("profileDisplayName").textContent = currentUser;
    document.getElementById("profileUsername").textContent = `@${currentUser.toLowerCase().replace(/ /g, "_")}`;
    document.getElementById("profileAvatarLetter").firstChild.textContent = currentUser[0].toUpperCase();

    if (creator) {
        roomRef.set({ host: currentUser, state: "lobby" });
        document.getElementById("profileBadgeRole").textContent = "👑 Admin";
        document.getElementById("adminPanelBtn").classList.remove("hidden");
    } else {
        document.getElementById("profileBadgeRole").textContent = "👤 Joueur";
        document.getElementById("adminPanelBtn").classList.add("hidden");
    }

    roomRef.child(`players/${currentUser}`).set({ name: currentUser, isHost: creator });
    
    document.getElementById("roomNumber").textContent = `Room #${currentRoomCode}`;
    document.getElementById("badgeRoomCode").textContent = `Room #${currentRoomCode}`;
    document.getElementById("chatHeaderCode").textContent = `Room #${currentRoomCode}`;

    setupFirebaseListeners();
    showPage("gamePage");
}

function leaveRoom() {
    if (roomRef && currentUser) {
        roomRef.child(`players/${currentUser}`).remove();
    }
    window.location.reload();
}

/* ================= FIREBASE LISTENERS & GAME LOGIC ================= */

function setupFirebaseListeners() {
    roomRef.child('players').on('value', snapshot => {
        const players = Object.values(snapshot.val() || {});
        document.getElementById("playerCount").textContent = players.length;
        document.getElementById("chatPlayersCount").textContent = `${players.length} حاضرین f l'room`;
        
        const container = document.getElementById("playersListContainer");
        container.innerHTML = "";
        players.forEach(p => {
            container.innerHTML += `
                <div class="player">
                    <div class="avatar purple">${p.name[0].toUpperCase()}</div>
                    <span>${escapeHTML(p.name)}</span>
                    ${p.isHost ? '<small>👑</small>' : ''}
                </div>
            `;
        });
    });

    roomRef.child('state').on('value', snapshot => {
        const state = snapshot.val();
        document.getElementById("lobby").classList.add("hidden");
        document.getElementById("questionStage").classList.add("hidden");
        document.getElementById("judgeStage").classList.add("hidden");
        clearInterval(timerInterval);

        if (state === "question") {
            document.getElementById("questionStage").classList.remove("hidden");
            startTimer();
        } else if (state === "judge") {
            document.getElementById("judgeStage").classList.remove("hidden");
        } else {
            document.getElementById("lobby").classList.remove("hidden");
        }
    });

    roomRef.child('chat').on('value', snapshot => {
        const chatData = snapshot.val() || {};
        const messages = document.getElementById("messages");
        messages.innerHTML = "";
        
        Object.values(chatData).forEach(msg => {
            const isMe = msg.sender === currentUser;
            const div = document.createElement("div");
            div.className = `message ${isMe ? 'sent' : 'received'}`;
            div.innerHTML = `
                ${!isMe ? `<div class="avatar small blue">${msg.sender[0].toUpperCase()}</div>` : ''}
                <div>
                    ${!isMe ? `<strong>${escapeHTML(msg.sender)}</strong>` : ''}
                    <p>${escapeHTML(msg.text)}</p>
                    <small>Maintenant</small>
                </div>
            `;
            messages.appendChild(div);
        });
        messages.scrollTop = messages.scrollHeight;
    });
}

function startDraw() {
    if (!isHost) {
        alert("⚠️ Ghir l'admin li 3ndo l'7a9 ydour l'qor3a!");
        return;
    }
    
    const dice = document.getElementById("dice");
    const message = document.getElementById("diceMessage");
    dice.classList.add("rolling");
    message.textContent = "L'qor3a katdour... 🎲";

    setTimeout(() => {
        dice.classList.remove("rolling");
        message.textContent = "Sara - jat fik l'qor3a! 🎉";
        setTimeout(() => {
            roomRef.update({ state: "question" });
        }, 800);
    }, 1800);
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    updateTimerUI();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (isHost) roomRef.update({ state: "judge" });
        }
    }, 1000);
}

function updateTimerUI() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("timer").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function answered() {
    alert("Sara jawabt! 💎");
    if (isHost) roomRef.update({ state: "lobby" });
}

function cantAnswer() {
    clearInterval(timerInterval);
    if (isHost) roomRef.update({ state: "judge" });
}

function addJudgement() {
    const input = document.getElementById("judgementInput");
    const val = input.value.trim();
    if (!val) return;
    
    document.getElementById("customJudgements").innerHTML += `
        <button class="vote-option" onclick="vote(this)">
            <span>⚖️ ${escapeHTML(val)}</span>
            <b>0%</b>
        </button>
    `;
    input.value = "";
}

function vote(button) {
    document.querySelectorAll(".vote-option").forEach(o => o.style.borderColor = "var(--border)");
    button.style.borderColor = "var(--purple)";
    setTimeout(() => { alert("Le vote est enregistré ✓"); }, 200);
}

function handleMessage(event) {
    if (event.key === "Enter") sendMessage();
}

function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text || !roomRef) return;

    roomRef.child('chat').push({ sender: currentUser, text: text, time: Date.now() });
    input.value = "";
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showAllPlayers() {
    if (roomRef) {
        roomRef.child('players').once('value', s => {
            const players = Object.values(s.val() || {});
            let msg = "Tous les joueurs:\n\n";
            players.forEach(p => msg += `${p.isHost ? '👑 ' : ''}${p.name}\n`);
            alert(msg);
        });
    }
}

function addQuestion() {
    const q = prompt("Écris ta question :");
    if (!q) return;
    document.querySelector(".profile-section").innerHTML += `
        <div class="my-question">
            <span>${escapeHTML(q)}</span>
            <b>›</b>
        </div>
    `;
}

function openAdmin() { showPage("adminPage"); }

function showAdminTab(tab) {
    const questions = document.getElementById("adminQuestions");
    const players = document.getElementById("adminPlayers");
    const questionsTab = document.getElementById("questionsTab");
    const playersTab = document.getElementById("playersTab");

    if (tab === "questions") {
        questions.classList.remove("hidden");
        players.classList.add("hidden");
        questionsTab.classList.add("active");
        playersTab.classList.remove("active");
    } else {
        questions.classList.add("hidden");
        players.classList.remove("hidden");
        questionsTab.classList.remove("active");
        playersTab.classList.add("active");
    }
}