/* Nokia-style Cricket game for ChaNaKu. All logic here; nothing leaves the browser. */
(function () {
  "use strict";

  var canvas = document.getElementById("ck-board");
  var ctx    = canvas.getContext("2d");

  /* Logical canvas size (scaled by DPR in init) */
  var W = 400, H = 500;

  /* ---- Field geometry (top-down view) ---- */
  var FCX = W / 2, FCY = H / 2 + 10;   /* field centre */
  var FRX = 183, FRY = 170;              /* boundary radii */

  var PITCH_W  = 46;
  var PITCH_CX = FCX;
  var PITCH_TY = FCY - 98;   /* bowler crease y */
  var PITCH_BY = FCY + 98;   /* batsman crease y */

  /* ---- Side-on running view geometry ---- */
  var RUN_PITCH_Y  = 295;    /* pitch strip centre-y in side view */
  var RUN_PITCH_H  = 22;
  var RUN_LEFT_X   = 52;     /* left stumps x */
  var RUN_RIGHT_X  = W - 52; /* right stumps x */

  /* ---- Colours ---- */
  var C = {
    field:    "#2a6030", fieldEdge: "#1f4a25",
    pitch:    "#c09a60", pitchEdge: "#a8835a",
    white:    "#ffffff", cream: "#f0ead8",
    ball:     "#c82020", ballShine: "rgba(255,180,180,0.55)",
    bat:      "#7a4818",
    stumpW:   "#e8e0c0", stumpB: "#ffdd44",
    fielderB: "#0e2e88", fielderH: "#1a44bb",
    batsmanB: "#881a1a", batsmanH: "#aa2828",
    helmet:   "#cc9900",
    pads:     "#e8e8d8",
    boundary: "#ffffff",
    sky:      "#111418",
    scoreG:   "#22ee66",
    amber:    "#ffcc00",
    red:      "#ff3333",
    muted:    "#888888",
    shadow:   "rgba(0,0,0,0.3)",
    /* side-on view */
    runSky:   "#1a2a40",
    runGrass: "#1e5228",
    runCrowd: "#2a3a50",
    runPitch: "#b89050"
  };

  /* ---- Fielder home positions (offsets from FCX/FCY) ---- */
  var FIELDER_SLOTS = [
    { ox:   5, oy:-158, n:"extra-cover"  },
    { ox: -90, oy:-120, n:"cover"        },
    { ox:-158, oy: -28, n:"point"        },
    { ox:-145, oy:  80, n:"sq-leg"       },
    { ox: -70, oy: 158, n:"fine-leg"     },
    { ox:  70, oy: 158, n:"third-man"    },
    { ox: 145, oy:  80, n:"mid-wicket"   },
    { ox: 158, oy: -28, n:"mid-on"       },
    { ox:  90, oy:-120, n:"mid-off"      },
    { ox: -32, oy:-158, n:"slip"         }
  ];

  /* ---- Game states ---- */
  var ST = {
    READY:    0, BOWLING:  1, SWING_ANIM: 2,
    SHOT:     3, RUN_DECIDE: 4, RUNNING:  5,
    BOUNDARY: 6, WICKET:   7, SUMMARY:  8
  };

  /* ---- Persistent state ---- */
  var best = 0;
  try { best = parseInt(localStorage.getItem("cnk-cricket-best")) || 0; } catch(e) {}

  /* ---- Live state ---- */
  var G = {}; /* game counters – reset each game */
  var fielders = [];

  /* Bowling ball */
  var bb = { x:0, y:0, vx:0, vy:0 };

  /* Shot ball */
  var sb = { x:0, y:0, vx:0, vy:0, active:false };

  /* Batsman */
  var bat = { x:0, y:PITCH_BY, vx:0, swinging:false, swingT:0,
              hitDone:false, hitQ:null };

  /* Running state */
  var run = {
    active: false, progress: 0, throwP: 0,
    throwX: 0, throwY: 0,          /* fielder who has ball */
    targetX: RUN_LEFT_X,           /* stumps being targetted */
    safe: false, out: false,
    runsToAdd: 0, decided: false, decideT: 0
  };

  /* HUD flash */
  var fl = { text:"", t:0, col: C.amber };

  /* runs-popup (big number after a hit) */
  var pop = { text:"", t:0 };

  /* keys held */
  var keys = {};

  /* animation time */
  var lastTs = 0;

  /* sounds on? */
  var snd = true;

  /* ---- Helpers ---- */
  function d2(ax,ay,bx,by){ var dx=ax-bx,dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }
  function beep(f,ms,type){ CNKGame.beep(snd,f,ms,type||"square"); }

  /* ---- Init / reset ---- */
  function initFielders(){
    fielders = FIELDER_SLOTS.map(function(s){
      return { x:FCX+s.ox, y:FCY+s.oy,
               bx:FCX+s.ox, by:FCY+s.oy,
               tx:FCX+s.ox, ty:FCY+s.oy,
               hasBall:false, running:false };
    });
  }

  function newGame(){
    G = { state:ST.BOWLING, score:0, wickets:0, balls:0,
          MAX_BALLS:30, MAX_WICKETS:10 };
    initFielders();
    nextBall();
  }

  function nextBall(){
    G.balls++;
    /* random bowl line */
    var swing = (Math.random()-0.5)*28;
    bb.x = PITCH_CX + swing;
    bb.y = PITCH_TY;
    bb.vy = 2.1 + Math.random()*0.35;
    bb.vx = -swing * 0.028;          /* swings back slightly */

    bat.x     = PITCH_CX;
    bat.vx    = 0;
    bat.swinging = false;
    bat.swingT   = 0;
    bat.hitDone  = false;
    bat.hitQ     = null;

    sb.active = false;
    run.active = false;
    run.decided = false;
    run.progress = 0;
    run.throwP   = 0;
    run.out      = false;
    run.safe     = false;

    fielders.forEach(function(f){
      f.x=f.bx; f.y=f.by; f.tx=f.bx; f.ty=f.by; f.hasBall=false; f.running=false;
    });

    G.state = ST.BOWLING;
    CNKGame.unlockAudio();
  }

  /* ---- Swing attempt ---- */
  function trySwing(){
    if(G.state !== ST.BOWLING) return;
    if(bat.hitDone) return;
    bat.hitDone  = true;
    bat.swinging = true;
    bat.swingT   = 0;

    /* timing: how far is ball from bat face? */
    var hitFaceY = bat.y - 12;
    var diff     = Math.abs(bb.y - hitFaceY);
    var xdiff    = bat.x - bb.x;  /* + = bat right of ball */

    var q;
    if(diff < 16)      q = "perfect";
    else if(diff < 34) q = "good";
    else if(diff < 54) q = "edge";
    else               q = "miss";
    bat.hitQ = q;

    G.state = ST.SWING_ANIM;   /* short swing animation before resolving */
  }

  function resolveSwing(){
    var q    = bat.hitQ;
    var xdiff = bat.x - bb.x;

    if(q === "miss"){
      /* bowled if ball over stumps */
      if(Math.abs(bb.x - PITCH_CX) < PITCH_W/2 + 6){
        beep(180,400,"sawtooth");
        dismissal("BOWLED");
      } else {
        /* ball missed everything - wide */
        G.score++;
        fl.text = "WIDE +1";  fl.t = 70; fl.col = C.amber;
        G.balls--;  /* don't count wide as a legal ball */
        setTimeout(nextBall, 800);
      }
      return;
    }

    /* --- compute shot angle --- */
    var angle;
    if(q === "perfect"){
      if(xdiff < -18)      angle = -0.58 * Math.PI; /* off-drive */
      else if(xdiff > 18)  angle = -0.42 * Math.PI; /* on-drive  */
      else                 angle = -0.50 * Math.PI; /* straight  */
      angle += (Math.random()-0.5)*0.25;
    } else if(q === "good"){
      if(xdiff < -12)      angle = -0.58*Math.PI + (Math.random()-0.5)*0.45;
      else if(xdiff > 12)  angle = -0.42*Math.PI + (Math.random()-0.5)*0.45;
      else                 angle = -0.50*Math.PI + (Math.random()-0.5)*0.55;
    } else {   /* edge */
      angle = xdiff < 0
        ? -0.78*Math.PI + (Math.random()-0.5)*0.3   /* slip region */
        : -0.22*Math.PI + (Math.random()-0.5)*0.3;  /* fine-leg   */
      /* 40% catch chance on an edge */
      if(Math.random() < 0.40){
        setTimeout(function(){
          beep(180,400,"sawtooth");
          dismissal("CAUGHT!");
        }, 350);
        return;
      }
    }

    var power = q==="perfect" ? 5.6 : q==="good" ? 4.6 : 3.2;
    sb.x  = bat.x; sb.y = bat.y - 12;
    sb.vx = Math.cos(angle)*power;
    sb.vy = Math.sin(angle)*power;
    sb.active = true;
    beep(660, 80, "square");

    /* direct fielders toward ball path */
    fielders.forEach(function(f){
      var fa = Math.atan2(f.by-FCY, f.bx-FCX);
      var diff2 = Math.abs(fa - angle);
      if(diff2 > Math.PI) diff2 = 2*Math.PI - diff2;
      if(diff2 < 0.55){
        f.tx = FCX + Math.cos(angle)*(FRX*0.82);
        f.ty = FCY + Math.sin(angle)*(FRY*0.82);
        f.running = true;
      }
    });

    G.state = ST.SHOT;
  }

  /* ---- Dismissal ---- */
  function dismissal(reason){
    G.state  = ST.WICKET;
    G.wickets++;
    fl.text  = reason; fl.t = 120; fl.col = C.red;
    if(G.wickets > best){ best = G.wickets; /* best is wickets remaining actually, track score */ }
    setTimeout(function(){
      if(G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS){
        endInnings();
      } else {
        nextBall();
      }
    }, 1800);
  }

  function endInnings(){
    if(G.score > best){ best = G.score; try{ localStorage.setItem("cnk-cricket-best",best); }catch(e){} }
    G.state = ST.SUMMARY;
  }

  /* ---- Update ---- */
  function update(dt){
    if(G.state === ST.BOWLING)     updateBowling(dt);
    if(G.state === ST.SWING_ANIM)  updateSwingAnim(dt);
    if(G.state === ST.SHOT)        updateShot(dt);
    if(G.state === ST.RUN_DECIDE)  updateRunDecide(dt);
    if(G.state === ST.RUNNING)     updateRunning(dt);
    if(fl.t > 0)  fl.t--;
    if(pop.t > 0) pop.t--;
  }

  function updateBowling(dt){
    /* move ball down pitch */
    bb.y += bb.vy;
    bb.x += bb.vx;

    /* move batsman */
    if(keys.left)  bat.vx -= 1.1;
    if(keys.right) bat.vx += 1.1;
    bat.vx  *= 0.80;
    bat.x   += bat.vx;
    bat.x    = clamp(bat.x, PITCH_CX - PITCH_W*2.2, PITCH_CX + PITCH_W*2.2);

    /* ball passed batsman without swing */
    if(!bat.hitDone && bb.y > bat.y + 35){
      bat.hitDone = true;
      if(Math.abs(bb.x - PITCH_CX) < PITCH_W/2 + 6){
        beep(180,400,"sawtooth");
        dismissal("BOWLED");
      } else {
        /* ball went down leg / outside off - dead ball */
        setTimeout(function(){ if(G.state===ST.BOWLING) nextBall(); }, 600);
      }
    }
  }

  function updateSwingAnim(dt){
    bat.swingT += dt;
    if(bat.swingT > 160) resolveSwing();
  }

  function updateShot(dt){
    if(!sb.active) return;
    sb.x += sb.vx; sb.y += sb.vy;

    /* boundary check */
    var dd = d2(sb.x, sb.y, FCX, FCY);
    var rx = FRX, ry = FRY;
    /* rough ellipse: (x/rx)^2 + (y/ry)^2 >= 1 */
    var ex = (sb.x-FCX)/rx, ey = (sb.y-FCY)/ry;
    if(ex*ex + ey*ey >= 0.94){
      sb.active = false;
      G.score += 4;
      beep(880,120,"triangle"); beep(1100,100,"triangle");
      pop.text = "FOUR!"; pop.t = 90; fl.text = "FOUR!"; fl.t = 90; fl.col = C.amber;
      G.state = ST.BOUNDARY;
      setTimeout(function(){
        if(G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
        else nextBall();
      }, 1400);
      return;
    }

    /* fielder interception */
    for(var i=0; i<fielders.length; i++){
      var f = fielders[i];
      if(d2(sb.x,sb.y, f.x,f.y) < 20){
        sb.active = false;
        f.hasBall = true;
        /* runs based on ball distance from batsman crease */
        var shotDist  = d2(sb.x, sb.y, PITCH_CX, PITCH_BY);
        var maxDist   = Math.sqrt(rx*rx + ry*ry);
        var runsRaw   = Math.round( (shotDist/maxDist) * 3 );
        var runs      = clamp(runsRaw, 0, 3);

        /* set up running decision */
        run.runsToAdd  = runs;
        run.throwX     = f.x; run.throwY = f.y;
        run.targetX    = RUN_LEFT_X;   /* fielder throws to batsman's end */
        run.decided    = false;
        run.decideT    = runs > 0 ? 120 : 0;   /* 2s to decide if runs available */
        run.progress   = 0;
        run.throwP     = 0;
        run.out        = false;
        run.safe       = false;

        if(runs === 0){
          /* dot ball */
          beep(330, 60, "square");
          fl.text = "DOT BALL"; fl.t = 65; fl.col = C.muted;
          G.state = ST.RUN_DECIDE;
          run.decideT = 0;
          run.decided = true;
          setTimeout(function(){
            if(G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
            else nextBall();
          }, 900);
        } else {
          G.state = ST.RUN_DECIDE;
          fl.text = "RUN? [HIT]"; fl.t = run.decideT; fl.col = C.scoreG;
        }
        return;
      }
    }

    /* move fielders */
    fielders.forEach(function(f){
      if(!f.running) return;
      var dx=f.tx-f.x, dy=f.ty-f.y, d=Math.sqrt(dx*dx+dy*dy);
      if(d>2){ f.x+=dx/d*3.6; f.y+=dy/d*3.6; }
    });
  }

  function updateRunDecide(dt){
    if(run.decided) return;
    if(run.decideT > 0){ run.decideT--; return; }
    /* time ran out: auto no-run */
    decideRun(false);
  }

  function decideRun(doRun){
    if(run.decided) return;
    run.decided = true;
    fl.t = 0;
    if(!doRun || run.runsToAdd === 0){
      /* no run: just award 0 and move on */
      G.state = ST.RUNNING;
      run.active = false;
      setTimeout(function(){
        if(G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
        else nextBall();
      }, 600);
      return;
    }
    /* attempt run */
    G.state = ST.RUNNING;
    run.active = true;
    beep(550, 60, "square");
  }

  function updateRunning(dt){
    if(!run.active) return;
    run.progress += 0.013;
    run.throwP   += 0.010;
    if(run.progress >= 1) run.progress = 1;
    if(run.throwP  >= 1) run.throwP   = 1;

    if(run.throwP >= 1 && !run.out && !run.safe){
      /* check: does batsman beat the throw? */
      /* run.progress is how far batsmen have run; throw arrives at 1.0 */
      if(run.progress >= 0.95){
        /* SAFE */
        run.safe = true;
        G.score += run.runsToAdd;
        beep(660,80,"square");
        pop.text = "+" + run.runsToAdd; pop.t = 90;
        fl.text = run.runsToAdd + (run.runsToAdd===1?" RUN":" RUNS"); fl.t = 90; fl.col = C.scoreG;
        setTimeout(function(){
          if(G.balls >= G.MAX_BALLS || G.wickets >= G.MAX_WICKETS) endInnings();
          else nextBall();
        }, 1200);
      } else {
        /* RUN OUT */
        run.out = true;
        beep(180,400,"sawtooth");
        dismissal("RUN OUT!");
      }
    }
  }

  /* ---- Draw ---- */
  function draw(ts){
    ctx.clearRect(0, 0, W, H);

    if(G.state === ST.RUNNING && run.active){
      drawSideView();
    } else {
      drawTopView();
    }
  }

  /* ============================================================
     TOP-DOWN VIEW
     ============================================================ */
  function drawTopView(){
    drawField();
    drawPitch();
    drawFielders();

    if(G.state === ST.BOWLING || G.state === ST.SWING_ANIM){
      drawBall(bb.x, bb.y, 6.5);
    }
    if(G.state === ST.SHOT && sb.active){
      drawBall(sb.x, sb.y, 6.5);
    }

    if(G.state !== ST.SUMMARY) drawBatsman();

    drawHUD();
    if(fl.t > 0)  drawFlash();
    if(pop.t > 0) drawPop();

    /* hit-zone glow */
    if(G.state === ST.BOWLING && !bat.hitDone){
      var diff = Math.abs(bb.y - (bat.y-12));
      if(diff < 55){
        var a = (55-diff)/55*0.65;
        ctx.strokeStyle = "rgba(255,255,50,"+a+")";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bat.x, bat.y, 28, 0, Math.PI*2);
        ctx.stroke();
      }
    }

    if(G.state === ST.READY)   drawReadyScreen();
    if(G.state === ST.SUMMARY) drawSummaryScreen();
  }

  function drawField(){
    ctx.fillStyle = C.field;
    ctx.beginPath();
    ctx.ellipse(FCX, FCY, FRX+10, FRY+10, 0, 0, Math.PI*2);
    ctx.fill();

    /* 30-yard circle */
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5,9]);
    ctx.beginPath();
    ctx.ellipse(FCX, FCY, FRX*0.54, FRY*0.50, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* boundary rope */
    ctx.strokeStyle = C.boundary;
    ctx.lineWidth = 2;
    ctx.setLineDash([10,6]);
    ctx.beginPath();
    ctx.ellipse(FCX, FCY, FRX, FRY, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPitch(){
    var PX = PITCH_CX - PITCH_W/2;
    var PH = PITCH_BY - PITCH_TY;
    ctx.fillStyle = C.pitch;
    ctx.beginPath();
    ctx.roundRect(PX, PITCH_TY, PITCH_W, PH, 3);
    ctx.fill();
    ctx.strokeStyle = C.pitchEdge;
    ctx.lineWidth = 1;
    ctx.stroke();

    /* crease lines */
    var CW = PITCH_W + 26;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 2;
    [PITCH_TY, PITCH_BY].forEach(function(y){
      ctx.beginPath();
      ctx.moveTo(PITCH_CX-CW/2, y); ctx.lineTo(PITCH_CX+CW/2, y); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PITCH_CX-PITCH_W/2, y); ctx.lineTo(PITCH_CX-PITCH_W/2, y+(y===PITCH_TY?10:-10));
      ctx.moveTo(PITCH_CX+PITCH_W/2, y); ctx.lineTo(PITCH_CX+PITCH_W/2, y+(y===PITCH_TY?10:-10));
      ctx.stroke();
      ctx.lineWidth = 2;
    });

    drawStumpsTop(PITCH_CX, PITCH_BY,  G.state===ST.WICKET);
    drawStumpsTop(PITCH_CX, PITCH_TY,  false);
  }

  function drawStumpsTop(cx, cy, broken){
    ctx.strokeStyle = broken ? C.stumpB : C.stumpW;
    ctx.lineWidth = 3;
    [-8,0,8].forEach(function(ox){
      var tx = broken ? cx+ox+(Math.random()*8-4) : cx+ox;
      var ty = broken ? cy-16-Math.random()*8 : cy-14;
      ctx.beginPath();
      ctx.moveTo(cx+ox, cy); ctx.lineTo(tx, ty); ctx.stroke();
    });
    ctx.strokeStyle = broken ? C.amber : C.stumpW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx-10, cy-14); ctx.lineTo(cx+10, cy-14); ctx.stroke();
  }

  function drawFielders(){
    fielders.forEach(function(f){
      /* shadow */
      ctx.fillStyle = C.shadow;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y+9, 8, 4, 0, 0, Math.PI*2);
      ctx.fill();
      /* body */
      ctx.fillStyle = f.hasBall ? C.fielderH : C.fielderB;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 9, 0, Math.PI*2);
      ctx.fill();
      /* head */
      ctx.fillStyle = "#ffcc88";
      ctx.beginPath();
      ctx.arc(f.x, f.y-8, 5, 0, Math.PI*2);
      ctx.fill();
      /* helmet */
      ctx.fillStyle = C.helmet;
      ctx.beginPath();
      ctx.arc(f.x, f.y-9, 5, -Math.PI, 0);
      ctx.fill();
    });
  }

  function drawBatsman(){
    var bx = bat.x, by = bat.y;
    /* shadow */
    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(bx, by+10, 13, 5, 0, 0, Math.PI*2);
    ctx.fill();
    /* pads */
    ctx.fillStyle = C.pads;
    ctx.fillRect(bx-9, by-5, 6, 13);
    ctx.fillRect(bx+3, by-5, 6, 13);
    /* body */
    ctx.fillStyle = bat.swinging ? C.batsmanH : C.batsmanB;
    ctx.beginPath();
    ctx.arc(bx, by-4, 11, 0, Math.PI*2);
    ctx.fill();
    /* head */
    ctx.fillStyle = "#ffcc88";
    ctx.beginPath();
    ctx.arc(bx, by-15, 6, 0, Math.PI*2);
    ctx.fill();
    /* helmet */
    ctx.fillStyle = C.helmet;
    ctx.beginPath();
    ctx.arc(bx, by-16, 6, -Math.PI, 0);
    ctx.fill();
    /* grill */
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx-5, by-12); ctx.lineTo(bx+5, by-9); ctx.stroke();

    /* bat */
    ctx.strokeStyle = C.bat; ctx.lineWidth = 5; ctx.lineCap = "round";
    if(bat.swinging){
      var prog = clamp(bat.swingT/130, 0, 1);
      var ang  = lerp(0.22*Math.PI, -0.92*Math.PI, prog);
      ctx.beginPath();
      ctx.moveTo(bx+5, by-4);
      ctx.lineTo(bx+5+Math.cos(ang)*27, by-4+Math.sin(ang)*27);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bx+9, by+5); ctx.lineTo(bx+15, by-22); ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  function drawBall(bx, by, r){
    ctx.fillStyle = C.ball;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI*2);
    ctx.fill();
    /* seam */
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, r*0.65, 0.3*Math.PI, 1.2*Math.PI);
    ctx.stroke();
    /* shine */
    ctx.fillStyle = C.ballShine;
    ctx.beginPath();
    ctx.arc(bx-r*0.3, by-r*0.3, r*0.32, 0, Math.PI*2);
    ctx.fill();
  }

  function drawHUD(){
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, W, 44);
    /* score */
    ctx.font = "bold 22px 'Barlow Condensed','Arial Narrow',sans-serif";
    ctx.fillStyle = C.scoreG; ctx.textAlign = "left";
    ctx.fillText(G.score+"/"+G.wickets, 12, 30);
    /* overs */
    ctx.fillStyle = C.white; ctx.textAlign = "center";
    var ov = Math.floor(G.balls/6), bl = G.balls%6;
    ctx.fillText(ov+"."+bl+" ov", W/2, 30);
    /* balls left */
    ctx.fillStyle = C.muted; ctx.textAlign = "right";
    ctx.fillText((G.MAX_BALLS-G.balls)+" left", W-12, 30);
    /* best */
    ctx.fillStyle = C.amber; ctx.textAlign = "right";
    ctx.font = "13px Barlow,sans-serif";
    ctx.fillText("Best:"+best, W-12, 42);
    /* over dots */
    var oStart = Math.floor(G.balls/6)*6;
    for(var i=0;i<6;i++){
      var bx2 = W/2-37.5+i*15, by2 = 40;
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(bx2,by2,4.5,0,Math.PI*2); ctx.stroke();
      if(oStart+i < G.balls){
        ctx.fillStyle = C.amber;
        ctx.beginPath(); ctx.arc(bx2,by2,3.5,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawFlash(){
    var a = Math.min(1, fl.t/18);
    ctx.fillStyle = "rgba(0,0,0,"+(a*0.5)+")";
    ctx.fillRect(W/2-105, FCY-22, 210, 44);
    ctx.font = "bold 28px 'Barlow Condensed',sans-serif";
    ctx.globalAlpha = a; ctx.fillStyle = fl.col; ctx.textAlign = "center";
    ctx.fillText(fl.text, W/2, FCY+8);
    ctx.globalAlpha = 1;
  }

  function drawPop(){
    var a = Math.min(1, pop.t/14);
    var sz = lerp(48, 36, 1-(pop.t/90));
    ctx.font = "bold "+sz+"px 'Barlow Condensed',sans-serif";
    ctx.globalAlpha = a; ctx.fillStyle = C.amber; ctx.textAlign = "center";
    ctx.fillText(pop.text, W/2, FCY-55);
    ctx.globalAlpha = 1;
  }

  function drawReadyScreen(){
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 56px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.amber; ctx.textAlign = "center";
    ctx.fillText("CRICKET", W/2, H/2-88);
    ctx.font = "19px Barlow,sans-serif";
    ctx.fillStyle = C.white;
    ctx.fillText("Nokia-style cricket game", W/2, H/2-54);
    ctx.font = "15px Barlow,sans-serif";
    ctx.fillStyle = C.muted;
    ctx.fillText("← →  Move bat    Space / HIT to swing", W/2, H/2-18);
    ctx.fillText("Time your shot as ball reaches bat", W/2, H/2+6);
    ctx.fillText("Score runs over 5 overs", W/2, H/2+30);
    ctx.font = "bold 20px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.scoreG;
    ctx.fillText("►  TAP HIT or press SPACE to start", W/2, H/2+75);
    ctx.font = "14px Barlow,sans-serif";
    ctx.fillStyle = C.muted;
    ctx.fillText("Best score: "+best, W/2, H/2+105);
  }

  function drawSummaryScreen(){
    ctx.fillStyle = "rgba(0,0,0,0.84)";
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 30px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.amber; ctx.textAlign = "center";
    ctx.fillText("INNINGS COMPLETE", W/2, H/2-100);
    ctx.font = "bold 68px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.scoreG;
    ctx.fillText(G.score+"/"+G.wickets, W/2, H/2-32);
    ctx.font = "20px Barlow,sans-serif";
    ctx.fillStyle = C.white;
    ctx.fillText("in "+(G.MAX_BALLS/6)+" overs", W/2, H/2+18);
    ctx.font = "16px Barlow,sans-serif";
    ctx.fillStyle = C.muted;
    ctx.fillText("Run rate: "+(G.score/(G.MAX_BALLS/6)).toFixed(2), W/2, H/2+46);
    var rating = G.score>=120?"OUTSTANDING":G.score>=90?"EXCELLENT!":G.score>=65?"WELL PLAYED":G.score>=40?"DECENT":G.score>=20?"NEEDS WORK":"PRACTICE MORE";
    ctx.font = "bold 24px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = G.score>=90?C.amber:C.white;
    ctx.fillText(rating, W/2, H/2+82);
    if(G.score >= best && G.score > 0){
      ctx.font = "bold 18px Barlow,sans-serif";
      ctx.fillStyle = C.amber;
      ctx.fillText("★ NEW BEST! ★", W/2, H/2+112);
    }
    ctx.font = "bold 18px 'Barlow Condensed',sans-serif";
    ctx.fillStyle = C.scoreG;
    ctx.fillText("►  SPACE / HIT to play again", W/2, H/2+148);
  }

  /* ============================================================
     SIDE-ON RUNNING VIEW  (Nokia cricket's iconic perspective)
     ============================================================ */
  function drawSideView(){
    /* sky / crowd */
    ctx.fillStyle = C.runSky;
    ctx.fillRect(0, 0, W, H);
    drawCrowd();

    /* outfield */
    ctx.fillStyle = C.runGrass;
    ctx.fillRect(0, RUN_PITCH_Y - RUN_PITCH_H, W, H - (RUN_PITCH_Y - RUN_PITCH_H));

    /* pitch strip */
    ctx.fillStyle = C.runPitch;
    ctx.fillRect(RUN_LEFT_X, RUN_PITCH_Y - RUN_PITCH_H/2, RUN_RIGHT_X-RUN_LEFT_X, RUN_PITCH_H);

    /* crease lines */
    ctx.strokeStyle = C.white; ctx.lineWidth = 2;
    [[RUN_LEFT_X, RUN_PITCH_Y-14],[RUN_LEFT_X, RUN_PITCH_Y+2],
     [RUN_RIGHT_X,RUN_PITCH_Y-14],[RUN_RIGHT_X,RUN_PITCH_Y+2]].forEach(function(p){
      ctx.beginPath();
      ctx.moveTo(p[0]-14, p[1]); ctx.lineTo(p[0]+14, p[1]); ctx.stroke();
    });

    /* stumps */
    drawSideStumps(RUN_LEFT_X,  RUN_PITCH_Y, run.out && run.targetX === RUN_LEFT_X);
    drawSideStumps(RUN_RIGHT_X, RUN_PITCH_Y, false);

    /* batsmen */
    drawSideBatsman(
      lerp(RUN_LEFT_X+20, RUN_RIGHT_X-20, run.progress),
      RUN_PITCH_Y - 18, true
    );
    drawSideBatsman(
      lerp(RUN_RIGHT_X-20, RUN_LEFT_X+20, run.progress),
      RUN_PITCH_Y - 18, false
    );

    /* ball throw arc */
    if(run.active){
      var tx  = run.targetX;
      var ty2 = RUN_PITCH_Y - 20;
      var tp  = clamp(run.throwP, 0, 1);
      var bx3 = lerp(run.throwX > W/2 ? RUN_RIGHT_X : RUN_LEFT_X+30, tx, tp);
      var arcH = Math.sin(tp * Math.PI) * 50;
      var by3 = lerp(RUN_PITCH_Y - 30, ty2, tp) - arcH;
      drawBall(bx3, by3, 5.5);
    }

    /* overlay text */
    ctx.font = "bold 22px 'Barlow Condensed',sans-serif";
    ctx.textAlign = "center";
    if(!run.safe && !run.out){
      ctx.fillStyle = C.amber;
      ctx.fillText("RUNNING...", W/2, 50);
    } else if(run.safe){
      ctx.fillStyle = C.scoreG;
      ctx.fillText("SAFE! +" + run.runsToAdd, W/2, 50);
    } else if(run.out){
      ctx.fillStyle = C.red;
      ctx.fillText("RUN OUT!", W/2, 50);
    }

    drawHUD();
    if(fl.t > 0) drawFlash();
  }

  function drawCrowd(){
    /* Simple repeating dots as spectators */
    ctx.fillStyle = C.runCrowd;
    ctx.fillRect(0, 0, W, RUN_PITCH_Y - RUN_PITCH_H - 20);
    for(var row=0; row<3; row++){
      for(var col=0; col<28; col++){
        var cx2 = col*15+7+(row%2)*7;
        var cy2 = row*18+40;
        var crowdCol = (col+row*3)%3===0?"#4a5a7a":(col+row*3)%3===1?"#3a4a6a":"#5a6a8a";
        ctx.fillStyle = crowdCol;
        ctx.beginPath(); ctx.arc(cx2, cy2, 5.5, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  function drawSideStumps(cx, cy, broken){
    ctx.strokeStyle = broken ? C.amber : C.stumpW;
    ctx.lineWidth = 3;
    [-7,0,7].forEach(function(ox){
      var topY = broken ? cy-20-Math.random()*10 : cy-22;
      ctx.beginPath();
      ctx.moveTo(cx+ox, cy); ctx.lineTo(cx+ox+(broken?(Math.random()*8-4):0), topY); ctx.stroke();
    });
    ctx.strokeStyle = broken ? C.amber : C.stumpW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx-9, cy-22); ctx.lineTo(cx+9, cy-22); ctx.stroke();
  }

  function drawSideBatsman(bx, by, isBatter){
    /* walking animation based on progress */
    var legAngle = Math.sin(run.progress * Math.PI * 6) * 0.4;
    /* shadow */
    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(bx, by+22, 9, 4, 0, 0, Math.PI*2); ctx.fill();
    /* pads/legs */
    ctx.strokeStyle = C.pads; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx-3, by+6);
    ctx.lineTo(bx-3+Math.sin(legAngle)*8, by+18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx+3, by+6);
    ctx.lineTo(bx+3-Math.sin(legAngle)*8, by+18);
    ctx.stroke();
    ctx.lineCap = "butt";
    /* body */
    ctx.fillStyle = isBatter ? C.batsmanB : "#3366cc";
    ctx.beginPath();
    ctx.arc(bx, by-1, 10, 0, Math.PI*2); ctx.fill();
    /* head */
    ctx.fillStyle = "#ffcc88";
    ctx.beginPath(); ctx.arc(bx, by-12, 6, 0, Math.PI*2); ctx.fill();
    /* helmet */
    ctx.fillStyle = C.helmet;
    ctx.beginPath(); ctx.arc(bx, by-13, 6, -Math.PI, 0); ctx.fill();
  }

  /* ---- Input ---- */
  document.addEventListener("keydown", function(e){
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    keys[e.key] = true;
    if(e.key==="ArrowLeft"  || e.key.toLowerCase()==="a"){ keys.left  = true; e.preventDefault(); }
    if(e.key==="ArrowRight" || e.key.toLowerCase()==="d"){ keys.right = true; e.preventDefault(); }
    if((e.key===" "||e.key==="Enter") && !e.target.closest("button,a,input")){
      e.preventDefault();
      handlePrimary();
    }
  });
  document.addEventListener("keyup", function(e){
    keys[e.key] = false;
    if(e.key==="ArrowLeft"  || e.key.toLowerCase()==="a") keys.left  = false;
    if(e.key==="ArrowRight" || e.key.toLowerCase()==="d") keys.right = false;
  });

  function handlePrimary(){
    if(G.state===ST.READY   || G.state===ST.SUMMARY){ newGame(); }
    else if(G.state===ST.BOWLING)                    { trySwing(); }
    else if(G.state===ST.RUN_DECIDE)                 { decideRun(true); }
  }

  /* Mobile controls */
  function bindMobile(id, down, up, click){
    var el = document.getElementById(id);
    if(!el) return;
    if(down||up){
      el.addEventListener("touchstart", function(e){ e.preventDefault(); if(down) down(); }, {passive:false});
      el.addEventListener("touchend",   function(e){ e.preventDefault(); if(up)   up();   }, {passive:false});
      el.addEventListener("mousedown",  function(){ if(down) down(); });
      el.addEventListener("mouseup",    function(){ if(up)   up();   });
    }
    if(click) el.addEventListener("click", click);
  }

  bindMobile("ck-left",  function(){ keys.left=true;  }, function(){ keys.left=false;  }, null);
  bindMobile("ck-right", function(){ keys.right=true; }, function(){ keys.right=false; }, null);
  bindMobile("ck-hit",   null, null, function(){ handlePrimary(); });
  bindMobile("ck-sound", null, null, function(){
    snd = !snd;
    var el = document.getElementById("ck-sound");
    if(el) el.textContent = snd ? "🔊 Sound" : "🔇 Sound";
  });

  /* Swipe on canvas to swing */
  var swipeFrom = null;
  canvas.addEventListener("touchstart", function(e){
    var t=e.changedTouches[0];
    swipeFrom = {x:t.clientX, y:t.clientY};
  }, {passive:true});
  canvas.addEventListener("touchend", function(e){
    if(!swipeFrom) return;
    var t=e.changedTouches[0];
    var dy=t.clientY-swipeFrom.y;
    swipeFrom = null;
    if(dy < -20){ handlePrimary(); }   /* swipe up = swing */
  }, {passive:true});

  /* ---- Main loop ---- */
  function loop(ts){
    var dt = ts - (lastTs||ts);
    lastTs = ts;
    if(dt > 50) dt = 50;
    update(dt);
    draw(ts);
    requestAnimationFrame(loop);
  }

  /* ---- Boot ---- */
  (function init(){
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width  = W*dpr; canvas.height = H*dpr;
    canvas.style.width  = W+"px"; canvas.style.height = H+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    G = { state:ST.READY, score:0, wickets:0, balls:0, MAX_BALLS:30, MAX_WICKETS:10 };
    initFielders();
    requestAnimationFrame(loop);
  })();
})();
