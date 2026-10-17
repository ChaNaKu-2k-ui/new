// AI Video Generator — Wan 2.1 via raw Gradio 4 REST API (no npm package)
const BASE = "https://wan-ai-wan2-1.hf.space/gradio_api/call";

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

// Read one SSE event stream until we get the final "complete" or "error" event
async function readSSE(url) {
  const resp = await fetch(url, { headers: { Accept: "text/event-stream" } });
  if (!resp.ok) throw new Error("SSE fetch failed: " + resp.status);
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastEvent = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop(); // keep incomplete last line
    let curEvent = null;
    for (const line of lines) {
      if (line.startsWith("event: ")) curEvent = line.slice(7).trim();
      if (line.startsWith("data: ") && curEvent) {
        try { lastEvent = { event: curEvent, data: JSON.parse(line.slice(6)) }; } catch (_) {}
        if (curEvent === "complete" || curEvent === "error") {
          reader.cancel();
          return lastEvent;
        }
        curEvent = null;
      }
    }
  }
  return lastEvent;
}

btn.onclick = async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) { promptEl.focus(); return; }

  errorEl.classList.remove("active");
  resultEl.classList.remove("active");
  btn.disabled = true;
  btn.innerHTML = PLAY_ICON + " Generating…";
  setStatus("Connecting to Wan 2.1…", 5);

  try {
    // Step 1: kick off generation
    const kickResp = await fetch(`${BASE}/t2v_generation_async`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [prompt, sizeEl.value, false, parseInt(seedEl.value)] }),
    });
    if (!kickResp.ok) throw new Error("Start failed: " + kickResp.status);
    const { event_id } = await kickResp.json();
    if (!event_id) throw new Error("No event_id returned");

    setStatus("In queue — waiting for a GPU…", 15);

    // Step 2: read the SSE stream for t2v_generation_async (returns wait estimate)
    const kickResult = await readSSE(`${BASE}/t2v_generation_async/${event_id}`);
    const estWait = kickResult?.data?.[1] ?? 60;
    setStatus(`Generating… (~${Math.round(estWait)}s estimated)`, 30);

    // Step 3: poll status_refresh until video is ready
    let found = false;
    for (let i = 0; i < 180 && !found; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollResp = await fetch(`${BASE}/status_refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [] }),
      });
      if (!pollResp.ok) continue;
      const { event_id: pollId } = await pollResp.json();

      const pollResult = await readSSE(`${BASE}/status_refresh/${pollId}`);
      if (!pollResult || pollResult.event !== "complete") continue;

      const [videoData, , estLeft, progress] = pollResult.data ?? [];
      const pct = Math.min(90, 30 + ((progress ?? 0) * 0.6));
      const leftTxt = estLeft > 0 ? ` (~${Math.round(estLeft)}s left)` : "";
      setStatus(`Generating${leftTxt}…`, pct);

      if (videoData && (videoData.url || videoData.path)) {
        const src = videoData.url || videoData.path;
        setStatus("Almost done…", 98);
        videoEl.src = src;
        dlEl.href = src;
        await new Promise(r => { videoEl.onloadeddata = r; videoEl.onerror = r; setTimeout(r, 5000); });
        statusEl.classList.remove("active");
        resultEl.classList.add("active");
        btn.disabled = false;
        btn.innerHTML = PLAY_ICON + " Generate video";
        found = true;
      }
    }
    if (!found) showError("Timed out — the model is very busy right now. Try again in a few minutes.");

  } catch (err) {
    console.error("[video-gen]", err);
    showError("Connection failed: " + (err.message || "unknown error") + ". Try again shortly.");
  }
};
