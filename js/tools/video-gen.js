import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client@1.4.0/dist/index.min.js";

const SPACE = "Wan-AI/Wan2.1";

const promptEl = document.getElementById("vg-prompt");
const sizeEl   = document.getElementById("vg-size");
const seedEl   = document.getElementById("vg-seed");
const btn      = document.getElementById("vg-btn");
const statusEl = document.getElementById("vg-status");
const fillEl   = document.getElementById("vg-fill");
const msgEl    = document.getElementById("vg-msg");
const errorEl  = document.getElementById("vg-error");
const resultEl = document.getElementById("vg-result");
const videoEl  = document.getElementById("vg-video");
const dlEl     = document.getElementById("vg-download");
const againBtn = document.getElementById("vg-again");

// prompt chips
const CHIPS = [
  "A cinematic drone shot over a neon city at night, rain reflections on streets",
  "Slow motion waves crashing on a tropical beach, golden hour",
  "A cat sitting on a windowsill watching snowfall outside",
  "Timelapse of clouds rolling over mountains at sunrise",
  "Close-up of a campfire crackling, sparks floating upward",
  "A sports car drifting on a wet road, cinematic slow motion",
];
const chipsEl = document.getElementById("chips");
if (chipsEl) {
  CHIPS.forEach(c => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = c.length > 52 ? c.slice(0, 50) + "…" : c;
    chip.title = c;
    chip.onclick = () => { promptEl.value = c; promptEl.focus(); };
    chipsEl.appendChild(chip);
  });
}

const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

function setStatus(msg, pct) {
  statusEl.classList.add("active");
  msgEl.textContent = msg;
  fillEl.style.width = pct + "%";
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add("active");
  statusEl.classList.remove("active");
  btn.disabled = false;
  btn.innerHTML = PLAY_ICON + " Try again";
}

function reset() {
  statusEl.classList.remove("active");
  resultEl.classList.remove("active");
  errorEl.classList.remove("active");
  fillEl.style.width = "0%";
  btn.disabled = false;
  btn.innerHTML = PLAY_ICON + " Generate video";
}

againBtn.onclick = reset;

btn.onclick = async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) { promptEl.focus(); return; }

  errorEl.classList.remove("active");
  resultEl.classList.remove("active");
  btn.disabled = true;
  btn.innerHTML = PLAY_ICON + " Generating…";

  setStatus("Connecting to Wan 2.1…", 5);

  try {
    const client = await Client.connect(SPACE);
    setStatus("In queue — waiting for a GPU slot…", 15);

    // kick off generation — returns estimated wait, not the video
    const kickoff = await client.predict("/t2v_generation_async", [
      prompt,
      sizeEl.value,
      false,                      // watermark off
      parseInt(seedEl.value),
    ]);

    const estWait = kickoff.data ? (kickoff.data[1] ?? 60) : 60;
    setStatus(`Generating… estimated wait ~${Math.round(estWait)}s`, 30);

    // poll status_refresh until video arrives
    const MAX = 180;
    for (let i = 0; i < MAX; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const poll = await client.predict("/status_refresh", []);
      const [videoData, costTime, estLeft, progress] = poll.data ?? [];

      const pct = Math.min(90, 30 + ((progress ?? 0) * 0.6));
      const leftTxt = estLeft > 0 ? ` (~${Math.round(estLeft)}s left)` : "";
      setStatus(`Generating${leftTxt}…`, pct);

      if (videoData && (videoData.url || videoData.path)) {
        const src = videoData.url || videoData.path;
        setStatus("Finishing up…", 98);
        videoEl.src = src;
        dlEl.href = src;
        await new Promise(r => { videoEl.onloadeddata = r; videoEl.onerror = r; });
        statusEl.classList.remove("active");
        resultEl.classList.add("active");
        btn.disabled = false;
        btn.innerHTML = PLAY_ICON + " Generate video";
        return;
      }
    }
    showError("Timed out — the model is very busy. Try again in a few minutes.");
  } catch (err) {
    console.error(err);
    showError("Could not connect to the AI model. Server may be busy — please try again shortly.");
  }
};
