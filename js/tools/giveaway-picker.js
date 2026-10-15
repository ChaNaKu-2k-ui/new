/* Giveaway picker. Names are separated by commas or line breaks. Each winner is chosen with the
   browser's secure random generator before the wheel moves, so the wheel always lands on that name. */
(function () {
  var $ = CNK.$;
  var canvas = $("wheel"), ctx = canvas.getContext("2d");
  var st = $("status"), list = $("winners"), banner = $("winner");
  var spinBtn = $("spin"), drawBtn = $("draw");
  var S = 600, C = S / 2, R = C - 12, TAU = Math.PI * 2;
  var COLORS = ["#e3a72f", "#58aef0", "#f0806a", "#35c4b3", "#a898f5", "#f27bb5", "#7dbdf2", "#6fd4a3"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rot = 0, busy = false;

  /* Split on commas and line breaks, trim, drop blanks and (optionally) repeats, ignoring case. */
  function entries() {
    var names = $("names").value.split(/[,\n\r]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if ($("dedupe").checked) {
      var seen = new Set();
      names = names.filter(function (s) {
        var k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    return names;
  }

  function fit(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var px = Math.round((canvas.clientWidth || 360) * dpr);
    canvas.width = px;
    canvas.height = px;
  }

  function draw(pool) {
    var n = pool.length;
    ctx.setTransform(canvas.width / S, 0, 0, canvas.width / S, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.translate(C, C);
    ctx.rotate(rot);
    if (n === 0) {
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = "#363c42"; ctx.fill();
    } else {
      var slice = TAU / n;
      var fs = n <= 10 ? 30 : n <= 25 ? 20 : n <= 50 ? 14 : 0;   /* no names when slices are too thin */
      for (var i = 0; i < n; i++) {
        var a0 = -Math.PI / 2 + i * slice;                         /* 12 o'clock is the start */
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + slice); ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = "#23272b"; ctx.stroke();
      }
      if (fs) {
        ctx.font = "700 " + fs + "px 'Barlow Condensed', 'Arial Narrow', sans-serif";
        ctx.fillStyle = "#1c1c1c";
        ctx.textBaseline = "middle";
        for (var j = 0; j < n; j++) {
          var mid = -Math.PI / 2 + (j + 0.5) * slice;
          ctx.save();
          if (Math.cos(mid) >= 0) {                                /* right half: read outwards */
            ctx.rotate(mid); ctx.textAlign = "right";
            ctx.fillText(fit(pool[j], R - 70), R - 22, 0);
          } else {                                                 /* left half: flip so it reads upright */
            ctx.rotate(mid + Math.PI); ctx.textAlign = "left";
            ctx.fillText(fit(pool[j], R - 70), -(R - 22), 0);
          }
          ctx.restore();
        }
      }
    }
    ctx.restore();
    /* hub and pointer stay still */
    ctx.beginPath(); ctx.arc(C, C, 46, 0, TAU); ctx.fillStyle = "#23272b"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(C - 24, 4); ctx.lineTo(C + 24, 4); ctx.lineTo(C, 58); ctx.closePath();
    ctx.fillStyle = "#f2efe8"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#23272b"; ctx.stroke();
  }

  /* Turn the wheel so slice idx ends under the pointer, then call done. */
  function spin(pool, idx, duration, done) {
    var slice = TAU / pool.length;
    var jitter = (CNK.randInt(1000) / 1000 - 0.5) * slice * 0.8;  /* stay away from the slice edges */
    var target = -((idx + 0.5) * slice + jitter);                 /* rotation that puts the slice at the top */
    var from = rot;
    var delta = ((target - from) % TAU + TAU) % TAU;
    var to = from + 5 * TAU + delta;                              /* five full turns, then land */
    var dur = reduceMotion ? Math.min(duration, 600) : duration;
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      rot = from + (to - from) * (1 - Math.pow(1 - p, 4));       /* ease-out */
      draw(pool);
      if (p < 1) { requestAnimationFrame(frame); }
      else { rot = to % TAU; draw(pool); done(); }
    }
    requestAnimationFrame(frame);
  }

  function setBusy(on) {
    busy = on;
    spinBtn.disabled = on;
    drawBtn.disabled = on;
  }

  /* useWheel: true spins the wheel for each winner, false draws instantly. */
  function run(useWheel) {
    if (busy) return;
    var pool = entries();
    var want = Math.max(1, Math.min(100, parseInt($("n").value, 10) || 1));
    list.innerHTML = "";
    banner.textContent = "";
    if (!pool.length) { CNK.status(st, "Add at least one entry first.", "err"); draw(pool); return; }
    if (want > pool.length) { want = pool.length; $("n").value = want; }
    var left = pool.slice(), found = 0;
    setBusy(true);
    CNK.status(st, "", "");
    (function next() {
      var idx = CNK.randInt(left.length), name = left[idx];
      var settle = function () {
        found++;
        var li = document.createElement("li");
        li.textContent = found + ". " + name;
        list.appendChild(li);
        banner.textContent = name;
        if (found === want) {
          setBusy(false);
          CNK.status(st, want + (want === 1 ? " winner" : " winners") + " picked from " + pool.length + " entries.", "ok");
          return;
        }
        left.splice(idx, 1);                                      /* a name that has won cannot win again in this draw */
        draw(left);
        setTimeout(next, useWheel ? 700 : 0);
      };
      if (useWheel) spin(left, idx, found === 0 ? 4500 : 2800, settle);
      else settle();
    })();
  }

  function refresh() {
    var pool = entries();
    $("entries").textContent = pool.length;
    if (!busy) draw(pool);
  }

  $("names").addEventListener("input", refresh);
  $("dedupe").addEventListener("change", refresh);
  spinBtn.addEventListener("click", function () { run(true); });
  drawBtn.addEventListener("click", function () { run(false); });
  window.addEventListener("resize", function () {
    sizeCanvas();
    if (!busy) draw(entries());
  });

  sizeCanvas();
  refresh();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (!busy) draw(entries()); });
  }
})();
