/* Nokia-style Cricket – perspective view matching the original Nokia Cricket Cup.
   Ball bowled from far end (top), grows as it approaches batsman (bottom).
   Side-on running view after each shot. */
(function () {
  "use strict";

  var canvas = document.getElementById("ck-board");
  var ctx    = canvas.getContext("2d");
  var W = 400, H = 500, CX = W / 2;

  /* ── Perspective field geometry ──────────────────────────────────────────── */
  var HORZ_Y   = 165;   // horizon / bowler-crease screen-y
  var GRND_Y   = 455;   // batsman-crease screen-y
  var PITCH_TW = 26;    // pitch width at top (bowler end)
  var PITCH_BW = 72;    // pitch width at bottom (batsman end)
  var FIELD_HW = 188;   // field half-width at batsman level

  /* 3-D → screen helpers.
     wz : depth  0 = batsman (near)  1 = bowler (far)
     wx : lateral world units (= screen px at near level)           */
  function fz2y(wz) { return GRND_Y - (GRND_Y - HORZ_Y) * wz; }
  function fw2x(wx, wz) { return CX + wx * (1 - wz * 0.83); }
  function fscale(wz)  { return 1 - wz * 0.80; }

  /* ── Colours ─────────────────────────────────────────────────────────────── */
  var C = {
    sky:"#0c180c", fieldD:"#1c5420", fieldL:"#1f5e23",
    crowd:"#1e2e18", crowdA:"#3a4a2a", crowdB:"#2a3a1a", crowdC:"#4a5a3a",
    pitch:"#c8a060", pitchE:"#b08448",
    white:"#ffffff", cream:"#f0ead8",
    ball:"#cc1c1c", ballS:"rgba(255,180,180,0.55)",
    bat:"#7a4818", stump:"#ece8d0", stumpB:"#ffdd44",
    fielder:"#0e2e88", fielderH:"#1a44bb",
    batter:"#881a1a", batterH:"#aa2828",
    helmet:"#cc9900", pad:"#e8e8d8", skin:"#d4a070",
    shadow:"rgba(0,0,0,0.35)",
    hud:"#080f08", green:"#22ee66", amber:"#ffcc00",
    red:"#ff3333", muted:"#666",
    /* running view */
    rSky:"#0e1a28", rGrass:"#1e5228", rPitch:"#b89050", rCrowd:"#1e2c18"
  };

  /* ── Game states ─────────────────────────────────────────────────────────── */
  var ST = { READY:0, BOWLING:1, SWING_ANIM:2, SHOT:3,
             RUN_DECIDE:4, RUNNING:5, BOUNDARY:6, WICKET:7, SUMMARY:8 };

  /* ── Fielder layout ──────────────────────────────────────────────────────── */
  /* wx = lateral world px (+ = right), wz = depth (0=near 1=far)            */
  var SLOTS = [
    { wx:  -70, wz:0.78, n:"mid-off"      },
    { wx:   70, wz:0.78, n:"mid-on"       },
    { wx: -140, wz:0.64, n:"extra-cover"  },
    { wx:  140, wz:0.64, n:"mid-wicket"   },
    { wx: -168, wz:0.44, n:"cover"        },
    { wx:  168, wz:0.44, n:"point"        },
    { wx: -158, wz:0.22, n:"sq-leg"       },
    { wx:  158, wz:0.22, n:"third-man"    },
    { wx:  -32, wz:0.06, n:"slip"         },
    { wx:   32, wz:0.06, n:"fine-leg"     }
  ];

  /* ── Persistent ──────────────────────────────────────────────────────────── */
  var best = 0;
  try { best = parseInt(localStorage.getItem("cnk-cricket-best")) || 0; } catch(e) {}

  /* ── Live state ─────────────────────────────────────────────────────────── */
  var G = {};
  var fielders = [];

  /* Bowling ball: starts at wz=1 (far), decreases toward 0 (batsman)        */
  var bb = { wx:0, wz:1.0, vz:0 };
  /* Shot ball: world coords after hit                                        */
  var sb = { wx:0, wz:0, vx:0, vz:0, active:false, t:0 };
  /* Bat                                                                      */
  var bat = { wx:0, vx:0, swinging:false, swingT:0,
              hitDone:false, hitQ:null, hitWz:0 };
  /* Running                                                                  */
  var run = { active:false, progress:0, throwP:0,
              throwRight:false, safe:false, out:false,
              runsToAdd:0, decided:false, decideT:0 };
  /* HUD flash + popup                                                        */
  var fl  = { text:"", t:0, col:C.amber };
  var pop = { text:"", t:0 };
  /* Bowler walk cycle                                                        */
  var bowlerT = 0;
  /* Keys + misc                                                              */
  var keys = {}, lastTs = 0, snd = true, _ac = null;

  /* ── Audio ───────────────────────────────────────────────────────────────── */
  function getAC() {
    if (_ac) return _ac;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _ac = new AC();
    } catch(e) {}
    return _ac;
  }
  function beep(f, ms, type) {
    if (!snd) return;
    var ac = getAC(); if (!ac) return;
    try {
      if (ac.state === "suspended") ac.resume();
      var t = ac.currentTime, osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type || "square"; osc.frequency.value = f;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms/1000);
      osc.connect(g); g.connect(ac.destination);
      osc.start(t); osc.stop(t + ms/1000);
    } catch(e) {}
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function lerp(a,b,t){ return a+(b-a)*t; }
  function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }
  function sdist(ax,ay,bx,by){ var dx=ax-bx,dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  function initFielders() {
    fielders = SLOTS.map(function(s) {
      return { wx:s.wx, wz:s.wz, bwx:s.wx, bwz:s.wz,
               twx:s.wx, twz:s.wz, hasBall:false, running:false };
    });
  }

  function newGame() {
    G = { state:ST.BOWLING, score:0, wickets:0, balls:0,
          MAX_BALLS:30, MAX_WICKETS:10 };
    initFielders();
    nextBall();
  }

  function nextBall() {
    G.balls++;
    var swing = (Math.random()-0.5) * 34;
    bb.wx = swing;
    bb.wz = 1.0;
    bb.vz = -(0.019 + Math.random()*0.004);  /* decreases from 1→0 */

    bat.wx = 0; bat.vx = 0;
    bat.swinging = false; bat.swingT = 0;
    bat.hitDone = false; bat.hitQ = null; bat.hitWz = 0;

    sb.active = false;
    run.active = false; run.decided = false;
    run.progress = 0; run.throwP = 0;
    run.out = false; run.safe = false;
    bowlerT = 0;

    fielders.forEach(function(f){
      f.wx=f.bwx; f.wz=f.bwz; f.twx=f.bwx; f.twz=f.bwz;
      f.hasBall=false; f.running=false;
    });
    G.state = ST.BOWLING;
  }

  /* ── Swing ───────────────────────────────────────────────────────────────── */
  function trySwing() {
    if (G.state !== ST.BOWLING) return;
    if (bat.hitDone) return;
    bat.hitDone = true;
    bat.swinging = true;
    bat.swingT = 0;
    bat.hitWz = bb.wz;   /* capture current wz for timing                   */

    /* timing: ball close to batsman (low wz) = easier to connect            */
    var q;
    if      (bb.wz < 0.12) q = "perfect";
    else if (bb.wz < 0.26) q = "good";
    else if (bb.wz < 0.40) q = "edge";
    else                   q = "miss";
    bat.hitQ = q;
    G.state = ST.SWING_ANIM;
  }

  function resolveSwing() {
    var q = bat.hitQ;
    var xdiff = bat.wx - bb.wx;  /* + = bat right of ball                   */

    if (q === "miss") {
      if (Math.abs(bb.wx) < 18) {
        beep(180,400,"sawtooth");
        dismissal("BOWLED");
      } else {
        G.score++; G.balls--;   /* wide                                     */
        fl.text = "WIDE +1"; fl.t = 70; fl.col = C.amber;
        setTimeout(nextBall, 800);
      }
      return;
    }

    /* shot angle: 0 = straight (up screen), negative = off-side, + = on    */
    var angDeg, spread;
    if (q === "edge") {
      /* edge to slip / fine-leg                                             */
      angDeg = xdiff < 0 ? -135 : 135;
      spread = 18;
      if (Math.random() < 0.40) {
        setTimeout(function(){
          beep(180,400,"sawtooth"); dismissal("CAUGHT!");
        }, 350);
        return;
      }
    } else {
      spread = q === "perfect" ? 14 : 26;
      if      (xdiff < -22) angDeg = -44;   /* off-drive                   */
      else if (xdiff >  22) angDeg = 44;    /* on-drive                    */
      else                  angDeg = 0;     /* straight                    */
    }
    angDeg += (Math.random()-0.5) * spread;

    var power = q==="perfect" ? 1.0 : q==="good" ? 0.76 : 0.52;
    var rad   = angDeg * Math.PI / 180;
    sb.wx = bat.wx;
    sb.wz = 0.0;
    sb.vz = Math.cos(rad) * power * 0.024;   /* forward speed              */
    sb.vx = Math.sin(rad) * power * 1.6;     /* lateral speed (wx/frame)   */
    /* behind-bat shots have negative vz – clamp slightly forward           */
    if (sb.vz < 0.006) sb.vz = 0.006;
    sb.active = true; sb.t = 0;

    /* send nearest fielder toward the shot direction                       */
    fielders.forEach(function(f) {
      var fa = Math.atan2(f.bwx, f.bwz) * 180/Math.PI;
      if (Math.abs(fa - angDeg) < 38) {
        f.running = true;
        f.twz = clamp(f.bwz + 0.12, 0.04, 0.96);
        f.twx = f.bwx;
      }
    });

    beep(660,80,"square");
    G.state = ST.SHOT;
  }

  /* ── Dismissal / end ─────────────────────────────────────────────────────── */
  function dismissal(reason) {
    G.state = ST.WICKET;
    G.wickets++;
    fl.text = reason; fl.t = 120; fl.col = C.red;
    setTimeout(function(){
      if (G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
      else nextBall();
    }, 1800);
  }

  function endInnings() {
    if (G.score > best) {
      best = G.score;
      try { localStorage.setItem("cnk-cricket-best", best); } catch(e) {}
    }
    G.state = ST.SUMMARY;
  }

  /* ── Update ──────────────────────────────────────────────────────────────── */
  function update(dt) {
    if (G.state === ST.BOWLING)    updateBowling(dt);
    if (G.state === ST.SWING_ANIM) updateSwingAnim(dt);
    if (G.state === ST.SHOT)       updateShot(dt);
    if (G.state === ST.RUN_DECIDE) updateRunDecide(dt);
    if (G.state === ST.RUNNING)    updateRunning(dt);
    if (fl.t  > 0) fl.t--;
    if (pop.t > 0) pop.t--;
  }

  function updateBowling(dt) {
    /* ball approaches                                                        */
    bb.wz += bb.vz;   /* vz is negative – bb.wz decreases 1→0               */
    /* gentle drift back to off-stump                                        */
    bb.wx *= 0.997;

    /* bat movement                                                          */
    if (keys.left)  bat.vx -= 1.1;
    if (keys.right) bat.vx += 1.1;
    bat.vx *= 0.80;
    bat.wx += bat.vx * 0.5;
    bat.wx = clamp(bat.wx, -88, 88);

    bowlerT += dt;

    /* ball past batsman                                                     */
    if (!bat.hitDone && bb.wz <= 0) {
      bat.hitDone = true;
      if (Math.abs(bb.wx) < 18) {
        beep(180,400,"sawtooth"); dismissal("BOWLED");
      } else {
        setTimeout(function(){ if (G.state===ST.BOWLING) nextBall(); }, 500);
      }
    }
  }

  function updateSwingAnim(dt) {
    bat.swingT += dt;
    if (bat.swingT > 160) resolveSwing();
  }

  function updateShot(dt) {
    if (!sb.active) return;
    sb.t++;
    sb.wz += sb.vz;
    sb.wx += sb.vx;

    /* boundary: ball reaches far end or wide sides                          */
    if (sb.wz > 0.93 || Math.abs(sb.wx) > 186) {
      sb.active = false;
      G.score += 4;
      beep(880,120,"triangle"); beep(1100,100,"triangle");
      pop.text = "FOUR!"; pop.t = 90;
      fl.text = "FOUR!"; fl.t = 90; fl.col = C.amber;
      G.state = ST.BOUNDARY;
      setTimeout(afterBoundary, 1400);
      return;
    }

    /* check fielder interception using screen distance                      */
    var sbSX = fw2x(sb.wx, sb.wz);
    var sbSY = fz2y(sb.wz);
    for (var i = 0; i < fielders.length; i++) {
      var f = fielders[i];
      var fSX = fw2x(f.wx, f.wz);
      var fSY = fz2y(f.wz);
      if (sdist(sbSX, sbSY, fSX, fSY) < 22 && sb.wz > 0.04) {
        sb.active = false;
        f.hasBall = true;
        /* runs based on how far the ball traveled                           */
        var runs = sb.t > 55 ? 2 : sb.t > 32 ? 1 : 0;
        runs = clamp(runs, 0, 2);
        run.runsToAdd = runs;
        run.throwRight = f.wx > 0;
        run.decided = false;
        run.decideT = runs > 0 ? 115 : 0;
        run.progress = 0; run.throwP = 0;
        run.out = false; run.safe = false;

        if (runs === 0) {
          beep(330,60,"square");
          fl.text = "DOT BALL"; fl.t = 65; fl.col = C.muted;
          run.decided = true;
          G.state = ST.RUN_DECIDE;
          setTimeout(afterDot, 900);
        } else {
          G.state = ST.RUN_DECIDE;
          fl.text = "RUN? [HIT]"; fl.t = run.decideT; fl.col = C.green;
        }
        return;
      }
    }

    /* move running fielders                                                 */
    fielders.forEach(function(f) {
      if (!f.running) return;
      var dwx = f.twx - f.wx, dwz = f.twz - f.wz;
      var d = Math.sqrt(dwx*dwx + dwz*dwz);
      if (d > 0.01) { f.wx += dwx/d*0.024; f.wz += dwz/d*0.024; }
    });
  }

  function afterBoundary() {
    if (G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
    else nextBall();
  }
  function afterDot() {
    if (G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
    else nextBall();
  }

  function updateRunDecide(dt) {
    if (run.decided) return;
    if (run.decideT > 0) { run.decideT--; return; }
    decideRun(false);
  }

  function decideRun(doRun) {
    if (run.decided) return;
    run.decided = true;
    fl.t = 0;
    G.state = ST.RUNNING;
    if (!doRun || run.runsToAdd === 0) {
      run.active = false;
      setTimeout(function(){
        if (G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
        else nextBall();
      }, 600);
    } else {
      run.active = true;
      beep(550,60,"square");
    }
  }

  function updateRunning(dt) {
    if (!run.active) return;
    run.progress += 0.013;
    run.throwP   += 0.010;
    if (run.progress > 1) run.progress = 1;
    if (run.throwP  > 1) run.throwP   = 1;

    if (run.throwP >= 1 && !run.out && !run.safe) {
      if (run.progress >= 0.95) {
        run.safe = true;
        G.score += run.runsToAdd;
        beep(660,80,"square");
        pop.text = "+" + run.runsToAdd; pop.t = 90;
        fl.text = run.runsToAdd + (run.runsToAdd===1?" RUN":" RUNS");
        fl.t = 90; fl.col = C.green;
        setTimeout(function(){
          if (G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
          else nextBall();
        }, 1200);
      } else {
        run.out = true;
        beep(180,400,"sawtooth");
        dismissal("RUN OUT!");
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PERSPECTIVE FIELD VIEW  (main game)
     ══════════════════════════════════════════════════════════════════════════ */
  function drawPerspView() {
    /* background */
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, W, H);

    drawPerspCrowd();
    drawPerspField();
    drawPerspPitch();
    drawPerspFielders();

    if (G.state === ST.BOWLING || G.state === ST.SWING_ANIM) {
      drawBowler();
      drawPerspBall(bb.wx, bb.wz);
    }
    if (G.state === ST.SHOT && sb.active) {
      drawPerspBall(sb.wx, sb.wz);
    }

    if (G.state !== ST.SUMMARY) drawPerspBatsman();

    /* hit-zone glow */
    if (G.state === ST.BOWLING && !bat.hitDone && bb.wz < 0.40) {
      var ga = (0.40 - bb.wz) / 0.40 * 0.75;
      ctx.strokeStyle = "rgba(255,255,50," + ga + ")";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(fw2x(bat.wx,0.02), fz2y(0.02), 32, 0, Math.PI*2);
      ctx.stroke();
    }

    drawHUD();
    if (fl.t  > 0) drawFlash();
    if (pop.t > 0) drawPop();

    if (G.state === ST.READY)   drawReadyScreen();
    if (G.state === ST.SUMMARY) drawSummaryScreen();
  }

  /* ── Crowd ───────────────────────────────────────────────────────────────── */
  function drawPerspCrowd() {
    ctx.fillStyle = C.crowd;
    ctx.fillRect(0, 48, W, HORZ_Y - 44);
    var rows = [
      { y:56, n:30, r:4.5 },
      { y:74, n:26, r:5 },
      { y:95, n:22, r:5.5 },
      { y:118,n:18, r:6 },
      { y:142,n:15, r:7 }
    ];
    var cols = [C.crowdA, C.crowdB, C.crowdC, "#334428", "#2e3e1e"];
    rows.forEach(function(row, ri) {
      var step = W / row.n;
      for (var i = 0; i < row.n; i++) {
        var cx2 = i*step + step*0.5 + (ri%2)*step*0.4;
        ctx.fillStyle = cols[(i + ri*3) % cols.length];
        ctx.beginPath();
        ctx.arc(cx2, row.y, row.r, 0, Math.PI*2);
        ctx.fill();
      }
    });
  }

  /* ── Field surface ───────────────────────────────────────────────────────── */
  function drawPerspField() {
    /* mown stripes (alternating slightly different greens)                  */
    var stripes = 10;
    for (var i = 0; i < stripes; i++) {
      var y0 = HORZ_Y + i*(H - HORZ_Y)/stripes;
      var y1 = HORZ_Y + (i+1)*(H - HORZ_Y)/stripes;
      ctx.fillStyle = i%2===0 ? C.fieldD : C.fieldL;
      ctx.fillRect(0, y0, W, y1 - y0);
    }

    /* side boundary lines (perspective)                                     */
    var bx1 = CX - FIELD_HW * (1 - 0.83);   /* at horizon */
    var bx2 = CX + FIELD_HW * (1 - 0.83);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6,5]);
    /* left */
    ctx.beginPath();
    ctx.moveTo(bx1, HORZ_Y); ctx.lineTo(8, H); ctx.stroke();
    /* right */
    ctx.beginPath();
    ctx.moveTo(bx2, HORZ_Y); ctx.lineTo(W-8, H); ctx.stroke();
    /* far boundary arc */
    ctx.beginPath();
    ctx.ellipse(CX, HORZ_Y + 6, W*0.46, 13, 0, 0, Math.PI, true);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 30-yard ring (inner) */
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4,7]);
    ctx.beginPath();
    ctx.ellipse(CX, HORZ_Y + 6, W*0.26, 7, 0, 0, Math.PI, true);
    ctx.stroke();
    ctx.beginPath();
    var ix1 = CX - W*0.26, ix2 = CX + W*0.26;
    ctx.moveTo(ix1, HORZ_Y + 6); ctx.lineTo(CX - 58, H - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ix2, HORZ_Y + 6); ctx.lineTo(CX + 58, H - 30);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* ── Pitch ───────────────────────────────────────────────────────────────── */
  function drawPerspPitch() {
    var tx = CX, ty = HORZ_Y + 4;
    var bx = CX, by = GRND_Y;

    ctx.beginPath();
    ctx.moveTo(tx - PITCH_TW/2, ty); ctx.lineTo(tx + PITCH_TW/2, ty);
    ctx.lineTo(bx + PITCH_BW/2, by); ctx.lineTo(bx - PITCH_BW/2, by);
    ctx.closePath();
    ctx.fillStyle = C.pitch;  ctx.fill();
    ctx.strokeStyle = C.pitchE; ctx.lineWidth = 1; ctx.stroke();

    /* crease lines */
    ctx.strokeStyle = C.white; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - PITCH_TW/2 - 7, ty + 2);
    ctx.lineTo(tx + PITCH_TW/2 + 7, ty + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - PITCH_BW/2 - 18, by - 1);
    ctx.lineTo(bx + PITCH_BW/2 + 18, by - 1);
    ctx.stroke();

    /* stumps at both ends */
    drawPerspStumps(CX, ty, 5.5, false);
    drawPerspStumps(CX, by, 15,  G.state === ST.WICKET);
  }

  function drawPerspStumps(cx, cy, h, broken) {
    ctx.strokeStyle = broken ? C.stumpB : C.stump;
    ctx.lineWidth = Math.max(1.2, h/5.5);
    ctx.lineCap = "round";
    [-h*0.42, 0, h*0.42].forEach(function(ox) {
      var tx2 = broken ? cx+ox+(Math.random()-0.5)*5 : cx+ox;
      var ty2 = broken ? cy - h - Math.random()*4 : cy - h;
      ctx.beginPath();
      ctx.moveTo(cx+ox, cy); ctx.lineTo(tx2, ty2); ctx.stroke();
    });
    ctx.lineWidth = Math.max(1, h/7);
    ctx.beginPath();
    ctx.moveTo(cx - h*0.42, cy - h);
    ctx.lineTo(cx + h*0.42, cy - h);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  /* ── Fielders ────────────────────────────────────────────────────────────── */
  function drawPerspFielders() {
    /* painter's algorithm: far first                                        */
    var sorted = fielders.slice().sort(function(a,b){ return b.wz - a.wz; });
    sorted.forEach(function(f) {
      var sx = fw2x(f.wx, f.wz);
      var sy = fz2y(f.wz);
      var sc = fscale(f.wz);
      drawFig(sx, sy, sc, f.hasBall ? C.fielderH : C.fielder, false, f.hasBall);
    });
  }

  /* Generic figure: sx,sy = base, sc = perspective scale                   */
  function drawFig(sx, sy, sc, bodyCol, swinging, hasBall) {
    var r = 7.5 * sc;
    /* shadow */
    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(sx, sy + r*1.3, r*1.1, r*0.38, 0, 0, Math.PI*2); ctx.fill();
    /* body */
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
    /* head */
    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(sx, sy - r*0.95, r*0.68, 0, Math.PI*2); ctx.fill();
    /* helmet */
    ctx.fillStyle = C.helmet;
    ctx.beginPath(); ctx.arc(sx, sy - r*1.05, r*0.68, -Math.PI, 0); ctx.fill();
    /* ball in hand */
    if (hasBall) {
      ctx.fillStyle = C.ball;
      ctx.beginPath(); ctx.arc(sx + r*1.05, sy - r*0.5, r*0.48, 0, Math.PI*2); ctx.fill();
    }
  }

  /* ── Bowler (far end) ────────────────────────────────────────────────────── */
  function drawBowler() {
    var sx = fw2x(0, 0.94);
    var sy = fz2y(0.94);
    var sc = fscale(0.94);
    var r = 7.5 * sc;
    /* running animation */
    var legSwing = Math.sin(bowlerT * 0.012) * 0.35;

    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(sx, sy + r*1.3, r*1.1, r*0.38, 0, 0, Math.PI*2); ctx.fill();

    /* legs */
    ctx.strokeStyle = "#555"; ctx.lineWidth = 2.5 * sc; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx - r*0.3, sy + r*0.2);
    ctx.lineTo(sx - r*0.3 + Math.sin(legSwing)*r*0.8, sy + r*1.1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + r*0.3, sy + r*0.2);
    ctx.lineTo(sx + r*0.3 - Math.sin(legSwing)*r*0.8, sy + r*1.1); ctx.stroke();
    ctx.lineCap = "butt";

    ctx.fillStyle = "#0e2e88";
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(sx, sy - r*0.95, r*0.68, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#cc6600";
    ctx.beginPath(); ctx.arc(sx, sy - r*1.05, r*0.68, -Math.PI, 0); ctx.fill();

    /* arm going over to bowl */
    var armAng = -Math.PI*0.7 + Math.sin(bowlerT*0.012)*0.8;
    ctx.strokeStyle = "#0e2e88"; ctx.lineWidth = 3*sc; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx + r*0.6, sy - r*0.3);
    ctx.lineTo(sx + r*0.6 + Math.cos(armAng)*r*1.5, sy - r*0.3 + Math.sin(armAng)*r*1.5);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  /* ── Ball in perspective ─────────────────────────────────────────────────── */
  function drawPerspBall(wx, wz) {
    var sx = fw2x(wx, wz);
    var sy = fz2y(wz);
    var r  = lerp(2.2, 8.5, 1 - wz);

    ctx.fillStyle = C.ball;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(sx, sy, r*0.6, 0.3*Math.PI, 1.2*Math.PI); ctx.stroke();

    ctx.fillStyle = C.ballS;
    ctx.beginPath();
    ctx.arc(sx - r*0.3, sy - r*0.3, r*0.3, 0, Math.PI*2); ctx.fill();

    /* ground shadow */
    if (wz > 0.15) {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(sx, fz2y(wz) + r*2, r*0.9, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  /* ── Batsman ─────────────────────────────────────────────────────────────── */
  function drawPerspBatsman() {
    var bx = fw2x(bat.wx, 0.02);
    var by = fz2y(0.02);

    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(bx, by + 13, 14, 5, 0, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = C.pad;
    ctx.fillRect(bx - 11, by - 8, 6, 16);
    ctx.fillRect(bx + 5,  by - 8, 6, 16);

    ctx.fillStyle = bat.swinging ? C.batterH : C.batter;
    ctx.beginPath(); ctx.arc(bx, by - 4, 12, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(bx, by - 19, 7, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = C.helmet;
    ctx.beginPath(); ctx.arc(bx, by - 20, 7, -Math.PI, 0); ctx.fill();

    ctx.strokeStyle = "#333"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - 14); ctx.lineTo(bx + 6, by - 11); ctx.stroke();

    /* bat */
    ctx.strokeStyle = C.bat; ctx.lineWidth = 5; ctx.lineCap = "round";
    if (bat.swinging) {
      var prog = clamp(bat.swingT / 130, 0, 1);
      var ang  = lerp(0.22*Math.PI, -0.82*Math.PI, prog);
      ctx.beginPath();
      ctx.moveTo(bx + 6, by - 4);
      ctx.lineTo(bx + 6 + Math.cos(ang)*29, by - 4 + Math.sin(ang)*29);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bx + 10, by + 6); ctx.lineTo(bx + 16, by - 25); ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SIDE-ON RUNNING VIEW
     ══════════════════════════════════════════════════════════════════════════ */
  var RP_Y  = 295;   /* running pitch centre y   */
  var RP_H  = 22;    /* pitch strip height       */
  var RL_X  = 52;    /* left stumps x            */
  var RR_X  = W-52;  /* right stumps x           */

  function drawSideView() {
    ctx.fillStyle = C.rSky; ctx.fillRect(0, 0, W, H);

    /* crowd */
    ctx.fillStyle = C.rCrowd; ctx.fillRect(0, 0, W, RP_Y - RP_H - 18);
    for (var ri=0; ri<3; ri++) {
      for (var ci=0; ci<28; ci++) {
        var cx3 = ci*15+7+(ri%2)*7, cy3 = ri*18+44;
        ctx.fillStyle = [C.crowdA,C.crowdB,C.crowdC][(ci+ri*3)%3];
        ctx.beginPath(); ctx.arc(cx3, cy3, 5, 0, Math.PI*2); ctx.fill();
      }
    }

    /* outfield */
    ctx.fillStyle = C.rGrass;
    ctx.fillRect(0, RP_Y-RP_H, W, H-(RP_Y-RP_H));

    /* pitch strip */
    ctx.fillStyle = C.rPitch;
    ctx.fillRect(RL_X, RP_Y-RP_H/2, RR_X-RL_X, RP_H);

    /* crease lines */
    ctx.strokeStyle = C.white; ctx.lineWidth = 2;
    [RL_X, RR_X].forEach(function(cx4) {
      ctx.beginPath(); ctx.moveTo(cx4-14,RP_Y-14); ctx.lineTo(cx4+14,RP_Y-14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx4-14,RP_Y+2);  ctx.lineTo(cx4+14,RP_Y+2);  ctx.stroke();
    });

    /* stumps */
    drawSideStumps(RL_X, RP_Y, run.out && !run.throwRight);
    drawSideStumps(RR_X, RP_Y, run.out &&  run.throwRight);

    /* batsmen running */
    var b1x = lerp(RL_X+22, RR_X-22, run.progress);
    var b2x = lerp(RR_X-22, RL_X+22, run.progress);
    drawRunBatsman(b1x, RP_Y-20, true);
    drawRunBatsman(b2x, RP_Y-20, false);

    /* throw arc */
    if (run.active) {
      var fx5 = run.throwRight ? RR_X-10 : RL_X+10;
      var tx5 = run.throwRight ? RL_X    : RR_X;
      var tp5 = clamp(run.throwP, 0, 1);
      var bx5 = lerp(fx5, tx5, tp5);
      var ah  = Math.sin(tp5*Math.PI)*52;
      ctx.fillStyle = C.ball;
      ctx.beginPath(); ctx.arc(bx5, RP_Y-20-ah, 5.5, 0, Math.PI*2); ctx.fill();
    }

    /* status */
    ctx.font = "bold 22px 'Barlow Condensed','Arial Narrow',sans-serif";
    ctx.textAlign = "center";
    if (!run.safe && !run.out) {
      ctx.fillStyle = C.amber; ctx.fillText("RUNNING...", W/2, 52);
    } else if (run.safe) {
      ctx.fillStyle = C.green; ctx.fillText("SAFE! +"+run.runsToAdd, W/2, 52);
    } else {
      ctx.fillStyle = C.red;   ctx.fillText("RUN OUT!", W/2, 52);
    }

    drawHUD();
    if (fl.t > 0) drawFlash();
  }

  function drawSideStumps(cx, cy, broken) {
    ctx.strokeStyle = broken ? C.stumpB : C.stump;
    ctx.lineWidth = 3; ctx.lineCap = "round";
    [-7,0,7].forEach(function(ox) {
      var ty3 = broken ? cy-22-Math.random()*8 : cy-22;
      var tx3 = broken ? cx+ox+(Math.random()-0.5)*6 : cx+ox;
      ctx.beginPath(); ctx.moveTo(cx+ox,cy); ctx.lineTo(tx3,ty3); ctx.stroke();
    });
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx-9,cy-22); ctx.lineTo(cx+9,cy-22); ctx.stroke();
    ctx.lineCap = "butt";
  }

  function drawRunBatsman(bx, by, isBatter) {
    var leg = Math.sin(run.progress*Math.PI*6)*0.4;
    ctx.fillStyle = C.shadow;
    ctx.beginPath(); ctx.ellipse(bx, by+22, 9, 4, 0, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = C.pad; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx-3,by+6); ctx.lineTo(bx-3+Math.sin(leg)*8,by+18); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx+3,by+6); ctx.lineTo(bx+3-Math.sin(leg)*8,by+18); ctx.stroke();
    ctx.lineCap = "butt";

    ctx.fillStyle = isBatter ? C.batter : "#3366cc";
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(bx, by-12, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C.helmet;
    ctx.beginPath(); ctx.arc(bx, by-13, 6, -Math.PI, 0); ctx.fill();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     HUD + OVERLAYS
     ══════════════════════════════════════════════════════════════════════════ */
  function drawHUD() {
    ctx.fillStyle = C.hud; ctx.fillRect(0, 0, W, 44);

    ctx.font = "bold 22px 'Barlow Condensed','Arial Narrow',sans-serif";
    ctx.fillStyle = C.green; ctx.textAlign = "left";
    ctx.fillText(G.score+"/"+G.wickets, 12, 30);

    var ov = Math.floor(G.balls/6), bl = G.balls%6;
    ctx.fillStyle = C.white; ctx.textAlign = "center";
    ctx.fillText(ov+"."+bl+" ov", W/2, 30);

    ctx.fillStyle = C.muted; ctx.textAlign = "right";
    ctx.fillText((G.MAX_BALLS-G.balls)+" left", W-12, 30);
    ctx.fillStyle = C.amber;
    ctx.font = "13px Barlow,sans-serif";
    ctx.fillText("Best:"+best, W-12, 42);

    /* over balls */
    var oBase = Math.floor(G.balls/6)*6;
    for (var i=0; i<6; i++) {
      var bx6 = W/2-37.5+i*15, by6=40;
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(bx6,by6,4.5,0,Math.PI*2); ctx.stroke();
      if (oBase+i < G.balls) {
        ctx.fillStyle = C.amber;
        ctx.beginPath(); ctx.arc(bx6,by6,3.5,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawFlash() {
    var mid = (G.state===ST.RUNNING && run.active) ? 280 : (HORZ_Y+H)/2;
    var a = Math.min(1, fl.t/18);
    ctx.fillStyle = "rgba(0,0,0,"+(a*0.52)+")";
    ctx.fillRect(W/2-112, mid-24, 224, 48);
    ctx.font = "bold 28px 'Barlow Condensed',sans-serif";
    ctx.globalAlpha = a; ctx.fillStyle = fl.col; ctx.textAlign = "center";
    ctx.fillText(fl.text, W/2, mid+8);
    ctx.globalAlpha = 1;
  }

  function drawPop() {
    var a   = Math.min(1, pop.t/14);
    var sz  = lerp(50, 36, 1-(pop.t/90));
    ctx.font = "bold "+sz+"px 'Barlow Condensed',sans-serif";
    ctx.globalAlpha = a; ctx.fillStyle = C.amber; ctx.textAlign = "center";
    ctx.fillText(pop.text, W/2, HORZ_Y+70);
    ctx.globalAlpha = 1;
  }

  function drawReadyScreen() {
    ctx.fillStyle = "rgba(0,0,0,0.82)"; ctx.fillRect(0,0,W,H);
    ctx.font = "bold 58px 'Barlow Condensed','Arial Narrow',sans-serif";
    ctx.fillStyle = C.amber; ctx.textAlign = "center";
    ctx.fillText("CRICKET", W/2, H/2-90);
    ctx.font = "18px Barlow,sans-serif"; ctx.fillStyle = C.white;
    ctx.fillText("Nokia-style cricket game", W/2, H/2-56);
    ctx.font = "15px Barlow,sans-serif"; ctx.fillStyle = C.muted;
    ctx.fillText("← →  Move bat      Space / HIT to swing", W/2, H/2-18);
    ctx.fillText("Time your shot as the ball reaches you", W/2, H/2+6);
    ctx.fillText("Score runs in 5 overs  •  10 wickets", W/2, H/2+30);
    ctx.font = "bold 20px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.green;
    ctx.fillText("► TAP HIT or press SPACE to start", W/2, H/2+75);
    ctx.font = "14px Barlow,sans-serif"; ctx.fillStyle = C.muted;
    ctx.fillText("Best score: "+best, W/2, H/2+108);
  }

  function drawSummaryScreen() {
    ctx.fillStyle = "rgba(0,0,0,0.86)"; ctx.fillRect(0,0,W,H);
    ctx.font = "bold 30px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.amber; ctx.textAlign = "center";
    ctx.fillText("INNINGS COMPLETE", W/2, H/2-100);
    ctx.font = "bold 70px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.green;
    ctx.fillText(G.score+"/"+G.wickets, W/2, H/2-28);
    ctx.font = "20px Barlow,sans-serif"; ctx.fillStyle = C.white;
    ctx.fillText("in "+(G.MAX_BALLS/6)+" overs", W/2, H/2+20);
    ctx.font = "16px Barlow,sans-serif"; ctx.fillStyle = C.muted;
    ctx.fillText("Run rate: "+(G.score/(G.MAX_BALLS/6)).toFixed(2), W/2, H/2+48);
    var rt = G.score>=120?"OUTSTANDING":G.score>=90?"EXCELLENT!":G.score>=65?"WELL PLAYED":G.score>=40?"DECENT":G.score>=20?"NEEDS WORK":"PRACTICE MORE";
    ctx.font = "bold 24px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = G.score>=90 ? C.amber : C.white;
    ctx.fillText(rt, W/2, H/2+84);
    if (G.score >= best && G.score > 0) {
      ctx.font = "bold 18px Barlow,sans-serif"; ctx.fillStyle = C.amber;
      ctx.fillText("★ NEW BEST! ★", W/2, H/2+114);
    }
    ctx.font = "bold 18px 'Barlow Condensed',sans-serif"; ctx.fillStyle = C.green;
    ctx.fillText("► SPACE / HIT to play again", W/2, H/2+150);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MAIN DRAW DISPATCH
     ══════════════════════════════════════════════════════════════════════════ */
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    if (G.state === ST.RUNNING && run.active) drawSideView();
    else                                      drawPerspView();
  }

  /* ── Input ───────────────────────────────────────────────────────────────── */
  document.addEventListener("keydown", function(e) {
    if (e.ctrlKey||e.metaKey||e.altKey) return;
    if (e.key==="ArrowLeft"  || e.key.toLowerCase()==="a"){ keys.left=true;  e.preventDefault(); }
    if (e.key==="ArrowRight" || e.key.toLowerCase()==="d"){ keys.right=true; e.preventDefault(); }
    if ((e.key===" "||e.key==="Enter") && !e.target.closest("button,a,input")){
      e.preventDefault(); handlePrimary();
    }
  });
  document.addEventListener("keyup", function(e) {
    if (e.key==="ArrowLeft"  || e.key.toLowerCase()==="a") keys.left=false;
    if (e.key==="ArrowRight" || e.key.toLowerCase()==="d") keys.right=false;
  });

  function handlePrimary() {
    if (G.state===ST.READY   || G.state===ST.SUMMARY) newGame();
    else if (G.state===ST.BOWLING)                     trySwing();
    else if (G.state===ST.RUN_DECIDE)                  decideRun(true);
  }

  function bindMobile(id, down, up, click) {
    var el = document.getElementById(id); if (!el) return;
    if (down||up) {
      el.addEventListener("touchstart",function(e){e.preventDefault();if(down)down();},{passive:false});
      el.addEventListener("touchend",  function(e){e.preventDefault();if(up)up();  },{passive:false});
      el.addEventListener("mousedown", function(){if(down)down();});
      el.addEventListener("mouseup",   function(){if(up)up();  });
    }
    if (click) el.addEventListener("click", click);
  }

  bindMobile("ck-left",  function(){keys.left=true; }, function(){keys.left=false; }, null);
  bindMobile("ck-right", function(){keys.right=true;}, function(){keys.right=false;}, null);
  bindMobile("ck-hit",   null, null, function(){ handlePrimary(); });
  bindMobile("ck-sound", null, null, function(){
    snd = !snd;
    var el=document.getElementById("ck-sound");
    if(el) el.textContent = snd ? "🔊 Sound" : "🔇 Sound";
  });

  var swipeFrom = null;
  canvas.addEventListener("touchstart",function(e){
    swipeFrom={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};
  },{passive:true});
  canvas.addEventListener("touchend",function(e){
    if(!swipeFrom) return;
    var dy=e.changedTouches[0].clientY-swipeFrom.y; swipeFrom=null;
    if(dy<-20) handlePrimary();
  },{passive:true});

  /* ── Main loop ───────────────────────────────────────────────────────────── */
  function loop(ts) {
    var dt = ts-(lastTs||ts); lastTs=ts;
    if(dt>50) dt=50;
    update(dt); draw(ts);
    requestAnimationFrame(loop);
  }

  /* ── Boot ────────────────────────────────────────────────────────────────── */
  (function init() {
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width  = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    G = { state:ST.READY, score:0, wickets:0, balls:0, MAX_BALLS:30, MAX_WICKETS:10 };
    initFielders();
    requestAnimationFrame(loop);
  })();
})();
