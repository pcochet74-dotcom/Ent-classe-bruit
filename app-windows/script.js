console.log("script.js chargé");

// Sélecteurs
const profSelect = document.getElementById("prof-select");
const salleSelect = document.getElementById("salle-select");
const classeSelect = document.getElementById("classe-select");

const noiseBox = document.getElementById("noise-box");
const noiseLevel = document.getElementById("noise-level");
const thresholdSlider = document.getElementById("noise-threshold");
const thresholdValue = document.getElementById("threshold-value");
const toggleBtn = document.getElementById("noise-toggle");
const historiqueBtn = document.getElementById("historique-toggle");
const canvas = document.getElementById("noise-history");
const ctx = canvas.getContext("2d");

let threshold = parseInt(localStorage.getItem("noise-threshold") || "80");
let active = false;
let history = Array(60).fill(0);
let lastNotification = 0;

thresholdSlider.value = threshold;
thresholdValue.textContent = threshold;

// --- MICRO + FFT ---
function startMic() {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        function detectNoise() {
            if (!active) return;

            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const volume = sum / dataArray.length;

            history.push(volume);
            history.shift();
            drawHistory();

            noiseLevel.style.width = Math.min(volume, 120) + "%";

            if (volume > threshold) {
                noiseBox.style.background = "red";
                noiseBox.textContent = "Trop de bruit !";
                noiseBox.style.animation = "flash 0.3s";
                setTimeout(() => noiseBox.style.animation = "", 300);
                notify();
            } else {
                noiseBox.style.background = "green";
                noiseBox.textContent = "Calme";
            }

            requestAnimationFrame(detectNoise);
        }

        detectNoise();
    }).catch(err => {
        console.error("❌ Erreur getUserMedia:", err);
        alert("Le micro n'est pas accessible. Vérifiez les permissions.");
    });
}

function drawHistory() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - history[0]);

    for (let i = 1; i < history.length; i++) {
        ctx.lineTo((i / history.length) * canvas.width, canvas.height - history[i]);
    }

    ctx.strokeStyle = "#ff8d2e";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function notify() {
    const now = Date.now();
    if (now - lastNotification < 5000) return;
    lastNotification = now;

    if (Notification.permission === "granted") {
        new Notification("Trop de bruit dans la classe", {
            body: "Le niveau sonore a dépassé le seuil.",
            icon: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Volume_icon.png"
        });
    }
}

thresholdSlider.oninput = () => {
    threshold = parseInt(thresholdSlider.value);
    thresholdValue.textContent = threshold;
    localStorage.setItem("noise-threshold", threshold);
};

toggleBtn.onclick = () => {
    active = !active;
    toggleBtn.textContent = active ? "Désactiver" : "Activer";
    if (active) startMic();
};

function updateHistoriqueButton() {
    const state = localStorage.getItem("historique");
    historiqueBtn.textContent = state === "on" ? "Historique ON" : "Historique OFF";
    historiqueBtn.style.background = state === "on" ? "#0078d4" : "#555";
}

if (!localStorage.getItem("historique")) {
    localStorage.setItem("historique", "off");
}

updateHistoriqueButton();

historiqueBtn.onclick = () => {
    const current = localStorage.getItem("historique");
    const next = current === "on" ? "off" : "on";
    localStorage.setItem("historique", next);
    updateHistoriqueButton();
};

// --- Firestore ---
async function loadProfs() {
    const url = "https://firestore.googleapis.com/v1/projects/ent-classe-bruit/databases/(default)/documents/profs";
    const res = await fetch(url);
    const data = await res.json();

    profSelect.innerHTML = "";

    data.documents.forEach(doc => {
        const name = doc.name.split("/").pop();
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        profSelect.appendChild(option);
    });

    loadSalles();
}

async function loadSalles() {
    const prof = profSelect.value;
    const url = `https://firestore.googleapis.com/v1/projects/ent-classe-bruit/databases/(default)/documents/profs/${prof}/salles`;

    const res = await fetch(url);
    const data = await res.json();

    salleSelect.innerHTML = "";

    data.documents.forEach(doc => {
        const name = doc.name.split("/").pop();
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        salleSelect.appendChild(option);
    });

    loadClasses();
}

async function loadClasses() {
    const prof = profSelect.value;
    const salle = salleSelect.value;

    const url = `https://firestore.googleapis.com/v1/projects/ent-classe-bruit/databases/(default)/documents/profs/${prof}/salles/${salle}`;

    const res = await fetch(url);
    const data = await res.json();

    const arr = data?.fields?.classes?.arrayValue?.values || [];
    const classes = arr.map(v => v.stringValue);

    classeSelect.innerHTML = "";

    classes.forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        classeSelect.appendChild(option);
    });
}

profSelect.onchange = loadSalles;
salleSelect.onchange = loadClasses;

loadProfs();
