// Swing Coach AI — frontend logic.
// Flow: enable camera -> record a burst of frames over the swing ->
// POST them to /analyze -> render scores + coaching feedback.

const video = document.getElementById("video");
const startCamBtn = document.getElementById("startCam");
const recordBtn = document.getElementById("record");
const statusEl = document.getElementById("status");
const countdownEl = document.getElementById("countdown");
const thumbsEl = document.getElementById("thumbs");
const resultsEl = document.getElementById("results");

const FRAME_COUNT = 10; // frames grabbed per swing
const SWING_MS = 2000; // capture window length

let stream = null;

startCamBtn.addEventListener("click", enableCamera);
recordBtn.addEventListener("click", recordSwing);

async function enableCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false,
    });
    video.srcObject = stream;
    recordBtn.disabled = false;
    startCamBtn.disabled = true;
    statusEl.textContent =
      "Camera on. Get in frame from the side, then hit “Record swing.”";
  } catch (err) {
    statusEl.textContent = "Couldn't access camera: " + err.message;
  }
}

async function recordSwing() {
  recordBtn.disabled = true;
  thumbsEl.innerHTML = "";
  resultsEl.classList.add("hidden");

  // Short countdown so the hitter can get set.
  for (const n of ["3", "2", "1", "GO!"]) {
    countdownEl.textContent = n;
    countdownEl.classList.remove("hidden");
    await sleep(600);
  }
  countdownEl.classList.add("hidden");

  // Grab FRAME_COUNT frames evenly across the swing window.
  const frames = [];
  const interval = SWING_MS / FRAME_COUNT;
  statusEl.textContent = "Recording…";
  for (let i = 0; i < FRAME_COUNT; i++) {
    frames.push(grabFrame());
    addThumb(frames[frames.length - 1]);
    await sleep(interval);
  }

  statusEl.textContent = "Analyzing your swing with GPT-4o…";
  await analyze(frames);
  recordBtn.disabled = false;
}

// Capture the current video frame as a JPEG data URL.
function grabFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function addThumb(dataUrl) {
  const img = document.createElement("img");
  img.src = dataUrl;
  thumbsEl.appendChild(img);
}

async function analyze(frames) {
  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames }),
    });
    const data = await res.json();
    if (data.error) {
      statusEl.textContent = "⚠️ " + data.error;
      return;
    }
    renderResults(data);
    statusEl.textContent = "Done! Record another swing anytime.";
  } catch (err) {
    statusEl.textContent = "Request failed: " + err.message;
  }
}

function renderResults(data) {
  resultsEl.classList.remove("hidden");

  document.getElementById("overallScore").textContent = data.overall ?? "–";

  const labels = {
    stance: "Stance",
    load: "Load",
    swing: "Swing",
    follow_through: "Follow-through",
  };
  const bars = document.getElementById("scoreBars");
  bars.innerHTML = "";
  const scores = data.scores || {};
  for (const key of Object.keys(labels)) {
    const val = scores[key] ?? 0;
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-label">${labels[key]}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${val}%"></span></span>
      <span class="bar-val">${val}</span>`;
    bars.appendChild(row);
  }

  document.getElementById("summary").textContent = data.summary || "";
  fillList("strengths", data.strengths);
  fillList("fixes", data.fixes);
  fillList("drills", data.drills);
}

function fillList(id, items) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  (items || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
