/* Nokia-style Cricket — chanaku.pages.dev
   Renders to 128×128 offscreen canvas, scaled to main canvas (pixelated).
   Two views: perspective batting/bowling + top-down field.
   ─────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════════════════ */
  var VW = 128, VH = 128;
  var MAX_OVERS   = 5;
  var MAX_WICKETS = 10;
  var BALLS_PER_OVER = 6;

  /* ══════════════════════════════════════════════════════════
     PALETTE
  ══════════════════════════════════════════════════════════ */
  var C = {
    fieldA:'#4AB83A', fieldB:'#3EA832',
    pitch:'#C8C0A0', pitchAlt:'#D8CEB0',
    boundary:'#EEEEDD',
    hudBg:'#000000', white:'#F0F0E0',
    yellow:'#FFEE00', orange:'#FF8800', red:'#FF3333',
    menuBg:'#001800', menuSel:'#007700',
    menuTxt:'#88CC88', menuSelTxt:'#EEFFEE',
    notifBg:'#07091C', notifBorder:'#5468A8',
    ball:'#CC1111', ballHi:'#FF4444',
    // batsman sprites
    bHelmet:'#1A2040', bBody:'#CC2020', bLegs:'#2030AA', bSkin:'#C09070', bat:'#C8A040',
    // bowler
    wBody:'#6633AA', wLegs:'#2233AA', wSkin:'#C09070', wCap:'#5522AA',
    // stumps
    stump:'#D0C090', bail:'#F0E0A0',
    fielderCol:'#EEEEDD',
    panel:'#DDDDC8', panelBorder:'#9999AA',
    panelTxt:'#223322',
    // timing bar zones
    tzMiss:'#882222', tzOk:'#887700', tzGood:'#226622', tzPerf:'#44CC44',
  };

  /* ══════════════════════════════════════════════════════════
     AUDIO
  ══════════════════════════════════════════════════════════ */
  var SFX = (function () {
    var ctx = null, muted = false;
    try { muted = localStorage.getItem('cnk-nokia-muted') === '1'; } catch (e) {}
    function init() {
      if (ctx) return;
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    function beep(freq, dur, type, vol, delay) {
      if (!ctx || muted) return;
      delay = delay || 0; vol = vol || 0.06; type = type || 'square';
      try {
        if (ctx.state === 'suspended') ctx.resume();
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + dur);
      } catch (e) {}
    }
    return {
      init: init,
      toggleMute: function () {
        muted = !muted;
        try { localStorage.setItem('cnk-nokia-muted', muted ? '1' : '0'); } catch (e) {}
        return muted;
      },
      isMuted: function () { return muted; },
      menu:   function () { beep(660, 0.04); },
      select: function () { beep(880, 0.08); beep(1100, 0.06, 'square', 0.05, 0.07); },
      bowl:   function () { beep(350, 0.06, 'triangle'); },
      bat:    function () { beep(320, 0.04, 'sawtooth', 0.1); },
      miss:   function () { beep(180, 0.12, 'square', 0.05); },
      four:   function () { beep(880, 0.1); beep(1320, 0.14, 'square', 0.06, 0.09); },
      six:    function () { beep(1100, 0.12); beep(1650, 0.18, 'square', 0.07, 0.11); },
      out:    function () { beep(200, 0.2, 'sawtooth', 0.1); beep(140, 0.26, 'sawtooth', 0.07, 0.16); },
      bounce: function () { beep(200, 0.03, 'triangle', 0.04); },
      win:    function () { [880,1100,1320,1760].forEach(function(f,i){ beep(f,0.15,'square',0.08,i*0.12); }); },
      lose:   function () { [440,330,220].forEach(function(f,i){ beep(f,0.18,'sawtooth',0.08,i*0.15); }); },
      tick:   function () { beep(500, 0.02, 'square', 0.03); },
      coin:   function () { beep(880, 0.04); beep(660, 0.04, 'square', 0.04, 0.05); },
    };
  })();

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */
  function rnd(v) { return Math.round(v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ri(n) { return Math.floor(Math.random() * n); } // random 0..n-1
  function rf(lo, hi) { return lo + Math.random() * (hi - lo); }
  function dst(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ══════════════════════════════════════════════════════════
     OFFSCREEN CANVAS + DRAW HELPERS
  ══════════════════════════════════════════════════════════ */
  var oc, octx;

  function fr(x, y, w, h, col) {
    octx.fillStyle = col;
    octx.fillRect(rnd(x), rnd(y), rnd(w) || 1, rnd(h) || 1);
  }
  function tx(str, x, y, col, sz, align) {
    sz = sz || 5;
    octx.fillStyle = col || C.white;
    octx.font = sz + 'px monospace';
    octx.textAlign  = align || 'left';
    octx.textBaseline = 'top';
    octx.fillText('' + str, rnd(x), rnd(y));
  }
  function dot(x, y, r, col) {
    octx.fillStyle = col;
    octx.beginPath();
    octx.arc(rnd(x), rnd(y), r, 0, Math.PI * 2);
    octx.fill();
  }

  /* ══════════════════════════════════════════════════════════
     PITCH GEOMETRY  (batting view, looking down pitch)
  ══════════════════════════════════════════════════════════ */
  //   Far end (bowler): narrower, higher up
  //   Near end (batsman): wider, lower
  var PT = {
    farL: 44, farR: 84,  farY: 22,
    nearL: 6, nearR: 122, nearY: 116,
  };
  function pitchLerpX(norm, py) {
    var t = clamp((py - PT.farY) / (PT.nearY - PT.farY), 0, 1);
    var l = lerp(PT.farL, PT.nearL, t);
    var r2 = lerp(PT.farR, PT.nearR, t);
    return lerp(l, r2, norm);
  }

  /* ══════════════════════════════════════════════════════════
     SPRITES
  ══════════════════════════════════════════════════════════ */

  /* Batsman — near end, facing camera */
  function spriteBatsman(cx, cy) {
    var x = rnd(cx), y = rnd(cy); // cy = bottom of sprite
    fr(x - 4, y - 1, 9, 2, 'rgba(0,0,0,0.25)');  // shadow
    fr(x - 3, y - 7, 3, 7, C.bLegs);              // left leg
    fr(x,     y - 7, 3, 7, C.bLegs);              // right leg
    fr(x - 3, y - 12, 7, 6, C.bBody);             // torso
    fr(x + 3, y - 11, 2, 5, C.bSkin);             // arm
    fr(x - 2, y - 16, 6, 5, C.bHelmet);           // helmet
    fr(x - 2, y - 18, 6, 3, C.bHelmet);           // helmet top
    fr(x + 4, y - 11, 2, 13, C.bat);              // bat handle+blade
    fr(x + 5, y - 2, 3, 2, C.bat);                // bat toe
  }

  /* Batsman swing animation — bat raised */
  function spriteBatsmanSwing(cx, cy, t) {
    var x = rnd(cx), y = rnd(cy);
    var rise = rnd(t * 10);
    fr(x - 4, y - 1, 9, 2, 'rgba(0,0,0,0.25)');
    fr(x - 3, y - 7, 3, 7, C.bLegs);
    fr(x,     y - 7, 3, 7, C.bLegs);
    fr(x - 3, y - 12, 7, 6, C.bBody);
    fr(x + 3, y - 12 - rise, 2, 5, C.bSkin);
    fr(x - 2, y - 16, 6, 5, C.bHelmet);
    fr(x - 2, y - 18, 6, 3, C.bHelmet);
    // bat sweeping: diagonal
    var bx = rnd(x + 4 - t * 8);
    var by = rnd(y - 10 - rise);
    fr(bx,     by,    2, 2, C.bat);
    fr(bx - 2, by - 2, 2, 2, C.bat);
    fr(bx - 4, by - 4, 2, 2, C.bat);
    fr(bx - 5, by - 7, 2, 2, C.bat);
    fr(bx - 4, by - 10, 2, 2, C.bat);
  }

  /* Bowler — far end, smaller scale */
  function spriteBowler(cx, cy, phase) {
    var x = rnd(cx), y = rnd(cy);
    var legWobble = (phase > 0 && phase < 0.8) ? rnd(Math.sin(phase * 18) * 1.2) : 0;
    fr(x - 1, y - 1, 4, 1, 'rgba(0,0,0,0.2)');
    fr(x - 1, y - 5, 2, 5, C.wLegs);
    fr(x + 1, y - 5 - legWobble, 2, 5, C.wLegs);
    fr(x - 1, y - 9, 4, 4, C.wBody);
    fr(x + 2, y - 8, 2, phase > 0.85 ? 10 : 3, C.wBody); // arm up at release
    fr(x - 1, y - 12, 3, 3, C.wSkin);
    fr(x - 1, y - 13, 3, 2, C.wCap);
  }

  /* Stumps at (cx, cy=top of bails) — w = total width */
  function spriteStumps(cx, cy, w, h) {
    var s1 = rnd(cx - w / 2);
    var s2 = rnd(cx);
    var s3 = rnd(cx + w / 2);
    fr(s1, cy, 1, h, C.stump);
    fr(s2, cy, 1, h, C.stump);
    fr(s3, cy, 1, h, C.stump);
    fr(s1, cy, w, 1, C.bail);
  }

  /* ══════════════════════════════════════════════════════════
     FIELDER POSITIONS  (top-down view, 0-100 x, 0-VH y)
  ══════════════════════════════════════════════════════════ */
  var FD_W = 100;  // field area width (right of it = panel)
  var FD_CX = 50, FD_CY = 64; // field center
  var FIELDERS = [
    [50, 14], [50,114],              // long-on, long-off
    [20, 38], [80, 38],              // cover, mid-wicket
    [12, 64], [88, 64],              // square leg, point
    [28, 18], [72, 18],              // third man, fine leg area
    [28,108], [72,108],              // mid-on variations
  ];

  /* ══════════════════════════════════════════════════════════
     GAME STATE
  ══════════════════════════════════════════════════════════ */
  var S = {
    screen: 'menu',   // menu|help|toss|batting|fielding|break|result
    menuSel: 0,

    // toss
    tossTimer: 0, tossPhase: 'flip', // flip|choice
    tossWinner: null,                // 'player'|'opp'
    tossSel: 0,
    tossOppChoice: null,             // 'bat'|'bowl'

    // match
    innings: 1,
    batting: 'player',   // who is currently batting
    firstScore: 0,
    oppScore: 0,
    target: 0,

    // current innings
    runs: 0, wkts: 0, overs: 0, balls: 0,
    comm: '',            // commentary text

    // delivery
    phase: 'idle',       // idle|runup|flight|done
    phaseTimer: 0,
    delivLine: 0.5,      // delivery line 0-1
    delivSpeed: 1,       // speed multiplier

    // timing bar
    timPos: 0.5, timDir: 1, timSpeed: 0.022,
    shotFired: false,
    inputDir: 0,         // -1|0|1
    inputUp: false,

    // batting view ball
    ballX: 64, ballY: PT.farY + 8,
    ballT: 0,
    ballBounced: false,
    ballActive: false,
    ballStartX: 64, ballStartY: PT.farY + 8,
    ballEndX: 64,   ballEndY: PT.nearY - 8,

    // bowler anim
    bowlerPhase: 0,

    // batsman anim
    swingT: 0,

    // delivery result
    delResult: null,     // {runs, wicket, how}
    doneTimer: 0,

    // fielding view
    fdBX: 50, fdBY: 64,
    fdVX: 0, fdVY: 0,
    fdActive: false,
    fdTimer: 0,
    fdBoundary: false,
    fdRuns: 0,

    // notification
    notifTxt: null, notifTimer: 0,

    // result
    matchResult: null,   // 'win'|'lose'|'tie'
  };

  /* ══════════════════════════════════════════════════════════
     DRAW — BATTING VIEW
  ══════════════════════════════════════════════════════════ */
  function drawBatView() {
    // field bg
    fr(0, 0, VW, VH, C.fieldA);

    // draw pitch as horizontal strips (trapezoid)
    for (var py = PT.farY; py < PT.nearY; py++) {
      var l  = rnd(pitchLerpX(0, py));
      var rr = rnd(pitchLerpX(1, py));
      var alt = (py % 4 < 2);
      fr(l, py, rr - l, 1, alt ? C.pitch : C.pitchAlt);
    }

    // far stumps (bowler's end)
    spriteStumps(64, PT.farY + 1, 7, 5);

    // near stumps (batsman's end)
    spriteStumps(64, PT.nearY - 5, 12, 5);

    // bowler
    spriteBowler(64, PT.farY + 13, S.bowlerPhase);

    // ball
    if (S.ballActive) {
      fr(rnd(S.ballX) - 1, rnd(S.ballY) - 1, 3, 3, C.ball);
      fr(rnd(S.ballX),     rnd(S.ballY) - 1, 1, 1, C.white);
    }

    // batsman
    var bcy = PT.nearY - 6;
    if (S.shotFired) {
      spriteBatsmanSwing(54, bcy, S.swingT);
    } else {
      spriteBatsman(54, bcy);
    }

    // HUD strip
    drawBatHUD();

    // timing bar while ball in flight
    if (S.phase === 'flight' && !S.shotFired) {
      drawTimingBar();
    }

    // commentary
    if (S.comm && S.phase === 'done') {
      var commW = Math.min(S.comm.length * 5 + 8, VW - 10);
      fr(VW / 2 - commW / 2, VH - 14, commW, 10, 'rgba(0,0,0,0.8)');
      tx(S.comm, VW / 2, VH - 13, C.yellow, 5, 'center');
    }

    // notification overlay
    if (S.notifTxt) drawNotif(S.notifTxt);
  }

  function drawBatHUD() {
    fr(0, 0, VW, 20, C.hudBg);
    // team blobs
    fr(2, 3, 8, 8, '#CC2222');
    fr(11, 3, 8, 8, '#2244AA');
    // score
    var sc = S.runs + '/' + S.wkts;
    tx(sc, 22, 2, C.white, 6);
    // overs
    tx(S.overs + ':' + S.balls, 22, 12, C.yellow, 4);
    // right: overs remaining / need
    var need = '';
    if (S.innings === 2 && S.target > 0) {
      var n = S.target - S.runs;
      need = n > 0 ? 'Need ' + n : 'Won!';
      tx(need, VW - 2, 3, C.orange, 4, 'right');
    }
    var remOv = MAX_OVERS - S.overs;
    tx(remOv + ' ov', VW - 2, 12, C.white, 4, 'right');
  }

  function drawTimingBar() {
    var bx = 14, by = VH - 17, bw = 100, bh = 8;
    fr(bx - 1, by - 1, bw + 2, bh + 2, '#000');
    fr(bx,            by, bw,                 bh, C.tzMiss);
    fr(bx + rnd(bw * 0.13), by, rnd(bw * 0.74), bh, C.tzOk);
    fr(bx + rnd(bw * 0.28), by, rnd(bw * 0.44), bh, C.tzGood);
    fr(bx + rnd(bw * 0.38), by, rnd(bw * 0.24), bh, C.tzPerf);
    // marker
    var mx = bx + rnd(S.timPos * bw);
    fr(mx - 1, by - 2, 3, bh + 4, '#FFFFFF');
    tx('TIMING', VW / 2, by - 9, '#88CC88', 4, 'center');
    // direction hint
    var dh = S.inputUp ? '^LOFT' : (S.inputDir < 0 ? '<OFF' : (S.inputDir > 0 ? '>ON' : '|STR'));
    tx(dh, VW / 2, by + bh + 2, C.yellow, 4, 'center');
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — TOP-DOWN FIELD VIEW
  ══════════════════════════════════════════════════════════ */
  function drawFieldView() {
    // striped green field
    for (var row = 0; row < VH; row++) {
      fr(0, row, FD_W, 1, row % 8 < 4 ? C.fieldA : C.fieldB);
    }

    // oval boundary
    drawOval(FD_CX, FD_CY, 43, 52, C.boundary, 1);

    // pitch strip in center
    fr(FD_CX - 3, FD_CY - 16, 6, 32, C.pitch);

    // stumps each end
    fr(FD_CX - 3, FD_CY - 16, 7, 1, C.stump);
    fr(FD_CX - 3, FD_CY + 15, 7, 1, C.stump);

    // crease lines
    fr(FD_CX - 5, FD_CY - 12, 10, 1, C.white);
    fr(FD_CX - 5, FD_CY + 11, 10, 1, C.white);

    // fielder dots
    for (var fi = 0; fi < FIELDERS.length; fi++) {
      dot(FIELDERS[fi][0], FIELDERS[fi][1], 2, C.fielderCol);
    }

    // ball
    if (S.fdActive) {
      fr(rnd(S.fdBX) - 1, rnd(S.fdBY) - 1, 3, 3, C.ball);
    }

    // right panel
    fr(FD_W, 0, VW - FD_W, VH, C.panel);
    fr(FD_W, 0, 1, VH, C.panelBorder);
    drawPanel();

    if (S.notifTxt) drawNotif(S.notifTxt);
  }

  function drawOval(cx, cy, rx, ry, col, lw) {
    octx.strokeStyle = col;
    octx.lineWidth = lw || 1;
    octx.beginPath();
    if (octx.ellipse) {
      octx.ellipse(rnd(cx), rnd(cy), rx, ry, 0, 0, Math.PI * 2);
    } else {
      // fallback: manual
      var prev = [cx + rx, cy];
      for (var i = 1; i <= 36; i++) {
        var a = (i / 36) * Math.PI * 2;
        var nx = cx + Math.cos(a) * rx, ny = cy + Math.sin(a) * ry;
        octx.moveTo(rnd(prev[0]), rnd(prev[1]));
        octx.lineTo(rnd(nx), rnd(ny));
        prev = [nx, ny];
      }
    }
    octx.stroke();
  }

  function drawPanel() {
    var px = FD_W + 2;
    // mini team squares
    fr(px, 4, 8, 8, '#CC2222');
    fr(px + 10, 4, 8, 8, '#2244AA');
    // score
    tx(S.runs, px, 16, C.panelTxt, 6);
    tx('/' + S.wkts, px, 24, C.panelTxt, 5);
    // overs
    tx(S.overs + '.' + S.balls, px, 34, '#334488', 4);
    // separator
    fr(px, 44, 22, 1, '#AAAAAA');
    // innings
    tx('INN', px, 47, C.panelTxt, 4);
    tx(S.innings, px, 54, C.panelTxt, 5);
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — MENU
  ══════════════════════════════════════════════════════════ */
  function drawMenu() {
    fr(0, 0, VW, VH, C.menuBg);

    // title
    tx('CRICKET', VW / 2, 16, '#00FF44', 11, 'center');
    tx('LEGENDS', VW / 2, 29, '#00CC33', 9, 'center');

    // decorative stumps row
    [46, 51, 56, 70, 75, 80].forEach(function (sx) {
      fr(sx, 44, 1, 10, C.stump);
    });
    fr(46, 44, 11, 1, C.bail);
    fr(70, 44, 11, 1, C.bail);

    // menu items
    var items = ['QUICK MATCH', 'HOW TO PLAY'];
    items.forEach(function (label, i) {
      var iy = 68 + i * 20;
      var sel = S.menuSel === i;
      if (sel) {
        fr(8, iy - 2, VW - 16, 14, C.menuSel);
        tx('▶ ' + label, VW / 2, iy + 1, C.menuSelTxt, 5, 'center');
      } else {
        tx(label, VW / 2, iy + 1, C.menuTxt, 5, 'center');
      }
    });

    tx('UP/DN: move   HIT: select', VW / 2, VH - 8, '#335533', 4, 'center');
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — HOW TO PLAY
  ══════════════════════════════════════════════════════════ */
  function drawHelp() {
    fr(0, 0, VW, VH, C.menuBg);
    tx('HOW TO PLAY', VW / 2, 4, '#00FF44', 6, 'center');
    var lines = [
      'BATTING:',
      'Timing bar moves L↔R.',
      'Press HIT in green',
      'zone to hit the ball.',
      '',
      'UP=loft  L/R=direction',
      '',
      'Miss the green zone =',
      'risk being bowled out!',
      '',
      'Score more than the',
      'opponent to win.',
    ];
    lines.forEach(function (l, i) {
      tx(l, 4, 18 + i * 8, C.white, 4);
    });
    tx('HIT to go back', VW / 2, VH - 7, '#335533', 4, 'center');
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — TOSS
  ══════════════════════════════════════════════════════════ */
  function drawToss() {
    fr(0, 0, VW, VH, C.menuBg);
    tx('TOSS', VW / 2, 6, '#00FF44', 7, 'center');

    if (S.tossPhase === 'flip') {
      // spinning coin
      var spin = S.tossTimer % 10;
      var cw = spin < 5 ? 22 - spin * 4 : (spin - 5) * 4 + 2;
      cw = Math.max(2, cw);
      fr(VW / 2 - cw / 2, 38, cw, 20, '#FFCC00');
      fr(VW / 2 - cw / 2 + 2, 40, Math.max(0, cw - 4), 16, '#FFAA00');
      tx('Flipping...', VW / 2, 68, C.yellow, 5, 'center');
    } else {
      var winTxt = S.tossWinner === 'player' ? 'YOU WIN TOSS!' : 'OPP WINS TOSS!';
      tx(winTxt, VW / 2, 36, C.yellow, 5, 'center');

      if (S.tossWinner === 'player') {
        tx('Choose:', VW / 2, 52, C.white, 5, 'center');
        ['BAT FIRST', 'BOWL FIRST'].forEach(function (label, i) {
          var iy = 64 + i * 17;
          var sel = S.tossSel === i;
          if (sel) {
            fr(18, iy - 2, VW - 36, 13, C.menuSel);
            tx('▶ ' + label, VW / 2, iy, C.menuSelTxt, 5, 'center');
          } else {
            tx(label, VW / 2, iy, C.menuTxt, 5, 'center');
          }
        });
        tx('HIT to confirm', VW / 2, VH - 7, '#335533', 4, 'center');
      } else {
        var oppTxt = S.tossOppChoice === 'bat' ? 'Opp chose to BAT' : 'Opp chose to BOWL';
        tx(oppTxt, VW / 2, 56, C.white, 5, 'center');
        tx('Press HIT to start', VW / 2, 76, C.yellow, 5, 'center');
      }
    }
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — INNINGS BREAK
  ══════════════════════════════════════════════════════════ */
  function drawBreak() {
    fr(0, 0, VW, VH, C.menuBg);
    tx('INNINGS BREAK', VW / 2, 8, '#00FF44', 5, 'center');

    if (S.innings === 2) {
      if (S.batting === 'player') {
        // player bats second — show opp score as target
        tx('Opp scored:', VW / 2, 34, C.white, 5, 'center');
        tx(S.oppScore + ' runs', VW / 2, 46, C.yellow, 9, 'center');
        tx('Target: ' + S.target, VW / 2, 64, C.orange, 6, 'center');
        tx('YOU are chasing!', VW / 2, 78, C.white, 5, 'center');
      } else {
        tx('You scored:', VW / 2, 34, C.white, 5, 'center');
        tx(S.firstScore + ' runs', VW / 2, 46, C.yellow, 9, 'center');
        tx('Opp needs ' + S.target, VW / 2, 64, C.orange, 5, 'center');
        tx('Computing result...', VW / 2, 78, C.white, 4, 'center');
      }
    }

    tx('HIT to continue', VW / 2, VH - 7, '#335533', 4, 'center');
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — RESULT
  ══════════════════════════════════════════════════════════ */
  function drawResult() {
    fr(0, 0, VW, VH, C.menuBg);

    var isWin = S.matchResult === 'win';
    var isTie = S.matchResult === 'tie';
    var col = isWin ? '#00FF44' : (isTie ? C.yellow : C.red);
    var lbl = isWin ? 'YOU WIN!' : (isTie ? 'TIED!' : 'YOU LOSE');
    tx(lbl, VW / 2, 22, col, 11, 'center');

    if (S.batting === 'player') {
      // player batted second
      tx('You scored: ' + S.runs, VW / 2, 52, C.white, 5, 'center');
      tx('Target was: ' + S.target, VW / 2, 62, C.white, 5, 'center');
      if (isWin) {
        tx('Won by ' + (MAX_WICKETS - S.wkts) + ' wkts!', VW / 2, 76, C.yellow, 5, 'center');
      } else if (!isTie) {
        tx('Lost by ' + (S.target - S.runs) + ' runs', VW / 2, 76, C.orange, 5, 'center');
      }
    } else {
      // player batted first
      tx('You scored: ' + S.firstScore, VW / 2, 52, C.white, 5, 'center');
      tx('Opp scored: ' + S.oppScore, VW / 2, 62, C.white, 5, 'center');
      if (isWin) {
        tx('Opp fell short!', VW / 2, 76, C.yellow, 5, 'center');
      } else {
        tx('Opp chased down!', VW / 2, 76, C.orange, 5, 'center');
      }
    }

    tx('HIT to play again', VW / 2, VH - 7, '#335533', 4, 'center');
  }

  /* ══════════════════════════════════════════════════════════
     DRAW — NOTIFICATION POPUP ("Out!" etc.)
  ══════════════════════════════════════════════════════════ */
  function drawNotif(txt) {
    var cw = txt.length * 5 + 16;
    var ch = 16;
    var nx = rnd((VW - cw) / 2);
    var ny = rnd(VH / 2 - 22);
    fr(nx - 2, ny - 2, cw + 4, ch + 4, C.notifBorder);
    fr(nx, ny, cw, ch, C.notifBg);
    tx(txt, VW / 2, ny + 5, C.white, 6, 'center');
  }

  /* ══════════════════════════════════════════════════════════
     MAIN DRAW DISPATCH
  ══════════════════════════════════════════════════════════ */
  function draw() {
    octx.clearRect(0, 0, VW, VH);
    switch (S.screen) {
      case 'menu':    drawMenu();      break;
      case 'help':    drawHelp();      break;
      case 'toss':    drawToss();      break;
      case 'batting': drawBatView();   break;
      case 'fielding':drawFieldView(); break;
      case 'break':   drawBreak();     break;
      case 'result':  drawResult();    break;
    }

    // Blit to main canvas (scaled, pixelated)
    var cv = document.getElementById('ck-board');
    if (!cv) return;
    var c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(oc, 0, 0, cv.width, cv.height);
  }

  /* ══════════════════════════════════════════════════════════
     MATCH LOGIC
  ══════════════════════════════════════════════════════════ */
  function startMatch(playerBatsFirst) {
    S.innings    = 1;
    S.batting    = playerBatsFirst ? 'player' : 'opp';
    S.runs       = 0; S.wkts = 0; S.overs = 0; S.balls = 0;
    S.firstScore = 0; S.oppScore = 0; S.target = 0;
    S.comm       = '';
    S.phase      = 'idle'; S.phaseTimer = 0;
    S.shotFired  = false;
    S.ballActive = false;
    S.notifTxt   = null;

    if (playerBatsFirst) {
      S.screen = 'batting';
      SFX.select();
    } else {
      // Opp bats first — simulate immediately
      simulateOppInnings(function (score) {
        S.oppScore   = score;
        S.firstScore = score;
        S.target     = score + 1;
        S.innings    = 2;
        S.batting    = 'player';
        S.runs       = 0; S.wkts = 0; S.overs = 0; S.balls = 0;
        S.screen     = 'break';
      });
    }
  }

  function simulateOppInnings(cb) {
    // Quick simulation: random score 30-95 across MAX_OVERS overs
    var score = rnd(rf(28, 96));
    var wkts  = rnd(rf(2, MAX_WICKETS));
    S.oppScore = score;
    cb(score);
  }

  function beginBatting() {
    S.screen     = 'batting';
    S.phase      = 'idle';
    S.phaseTimer = 0;
    S.shotFired  = false;
    S.ballActive = false;
    S.comm       = '';
    S.notifTxt   = null;
  }

  function nextBall() {
    // Check end of innings
    var oversUp   = (S.overs >= MAX_OVERS);
    var allOut    = (S.wkts  >= MAX_WICKETS);
    var targetMet = (S.innings === 2 && S.target > 0 && S.runs >= S.target);

    if (oversUp || allOut || targetMet) {
      endInnings();
      return;
    }

    S.phase      = 'runup';
    S.phaseTimer = 0;
    S.bowlerPhase = 0;
    S.shotFired  = false;
    S.ballActive = false;
    S.swingT     = 0;
    S.comm       = '';
    S.notifTxt   = null;

    // Randomise delivery line
    S.delivLine  = clamp(0.5 + rf(-0.18, 0.18), 0.15, 0.85);
    S.delivSpeed = rf(0.9, 1.15);

    // Timing bar speed varies per delivery
    S.timSpeed   = rf(0.018, 0.030);
  }

  function releaseBall() {
    S.phase       = 'flight';
    S.ballT       = 0;
    S.ballBounced = false;
    S.ballActive  = true;

    S.ballStartX  = 64;
    S.ballStartY  = PT.farY + 10;
    S.ballEndX    = pitchLerpX(S.delivLine, PT.nearY - 10);
    S.ballEndY    = PT.nearY - 10;
    S.phaseTimer  = 0;
    SFX.bowl();
  }

  function timingZone(pos) {
    var p = Math.abs(pos - 0.5) * 2; // 0=center, 1=edge
    if (p < 0.24) return 'perfect';
    if (p < 0.44) return 'good';
    if (p < 0.74) return 'ok';
    return 'miss';
  }

  function calcRuns(zone, dir, loft) {
    // Returns {runs, wicket}
    if (zone === 'perfect') {
      if (loft) {
        return { runs: ri(2) === 0 ? 6 : 4, wicket: false };
      }
      var r = dir !== 0 ? [4, 4, 3, 2][ri(4)] : [4, 3, 2, 2][ri(4)];
      return { runs: r, wicket: false };
    }
    if (zone === 'good') {
      if (loft) return { runs: ri(2) === 0 ? 4 : 2, wicket: false };
      return { runs: [3, 2, 2, 1, 1][ri(5)], wicket: false };
    }
    if (zone === 'ok') {
      return { runs: [1, 1, 0, 0][ri(4)], wicket: false };
    }
    // miss / edge — risk wicket
    return ri(3) === 0
      ? { runs: 0, wicket: true,  how: 'Caught!' }
      : { runs: ri(2) === 0 ? 1 : 0, wicket: false };
  }

  function resolveDelivery(hit) {
    if (S.shotFired) return;
    S.shotFired = true;
    S.phase     = 'done';

    var runs = 0, wicket = false, how = '';

    if (!hit) {
      // Ball reached batsman without swing — bowled?
      var onTarget = Math.abs(S.delivLine - 0.5) < 0.18;
      if (onTarget) {
        wicket = true; how = 'Bowled!';
        SFX.out();
      } else {
        how = 'Dot ball.'; SFX.miss();
      }
    } else {
      SFX.bat();
      var zone = timingZone(S.timPos);
      var res  = calcRuns(zone, S.inputDir, S.inputUp);
      runs     = res.runs;
      wicket   = !!res.wicket;
      how      = res.how || '';
      if (!wicket) {
        if (runs === 6) { how = 'SIX!';  SFX.six(); }
        else if (runs === 4) { how = 'FOUR!'; SFX.four(); }
        else if (runs === 0) { how = 'Dot ball.'; }
        else how = runs + ' run' + (runs !== 1 ? 's' : '');
      } else {
        SFX.out();
      }
    }

    S.comm      = how;
    S.delResult = { runs: runs, wicket: wicket, how: how };

    if (wicket) {
      S.wkts++;
      S.balls++;
      if (S.balls >= BALLS_PER_OVER) { S.overs++; S.balls = 0; }
      S.notifTxt   = 'Out!';
      S.notifTimer = 120;
      S.doneTimer  = 130;
    } else {
      S.runs  += runs;
      S.balls++;
      if (S.balls >= BALLS_PER_OVER) { S.overs++; S.balls = 0; }

      if (runs >= 1) {
        // Switch to fielding view
        startFieldingView(runs);
        return;
      } else {
        S.doneTimer = 70; // dot ball brief pause
      }
    }
  }

  function startFieldingView(runs) {
    S.screen     = 'fielding';
    S.fdBX       = FD_CX;
    S.fdBY       = FD_CY + 14; // near batsman's end
    S.fdActive   = true;
    S.fdBoundary = false;
    S.fdTimer    = 0;
    S.fdRuns     = runs;

    var ang = S.inputDir < 0
      ? rf(-1.8, -0.4)
      : (S.inputDir > 0 ? rf(0.4, 1.8) : rf(-0.5, 0.5));
    ang += Math.PI; // toward far end of field (away from batsman)

    // Speed calibrated so 4s/6s reach the boundary, singles/twos get fielded
    var spd;
    if (runs === 6)     spd = rf(4.5, 5.5);  // clears boundary
    else if (runs === 4) spd = rf(2.8, 3.6);  // reaches boundary rope
    else if (runs >= 2)  spd = rf(1.2, 1.8);  // fielder runs to stop it
    else                 spd = rf(0.6, 1.1);  // trickles, fielder pounces

    S.fdVX = Math.sin(ang) * spd;
    S.fdVY = Math.cos(ang) * -spd;

    if (runs >= 4) {
      S.notifTxt   = runs === 6 ? 'SIX!' : 'FOUR!';
      S.notifTimer = 90;
    }
  }

  function endFieldingView() {
    S.screen   = 'batting';
    S.fdActive = false;
    S.notifTxt = null;
    nextBall();
  }

  function endInnings() {
    if (S.innings === 1) {
      S.firstScore = S.runs;
      S.innings    = 2;

      if (S.batting === 'player') {
        // Player batted first — simulate opp chase immediately
        S.target   = S.firstScore + 1;
        S.oppScore = simulateChase(S.target);
        S.batting  = 'opp'; // mark that opp "batted" (already simulated)
        S.screen   = 'break';
      } else {
        // Opp batted first (already simulated in startMatch) — player chases
        S.batting = 'player';
        S.runs    = 0; S.wkts = 0; S.overs = 0; S.balls = 0;
        S.screen  = 'break';
      }
    } else {
      // Both innings done
      computeResult();
    }
  }

  function simulateChase(target) {
    // Simulate if opp can chase target
    // Random outcome weighted around target ± 20
    var score = rnd(rf(target - 25, target + 15));
    return Math.max(0, score);
  }

  function computeResult() {
    if (S.batting === 'player') {
      // Player batted second — compare player's runs vs target
      if (S.runs >= S.target) {
        S.matchResult = 'win'; SFX.win();
      } else if (S.runs === S.target - 1) {
        S.matchResult = 'tie';
      } else {
        S.matchResult = 'lose'; SFX.lose();
      }
    } else {
      // Player batted first (S.batting === 'opp' = already simulated)
      if (S.oppScore < S.firstScore) {
        S.matchResult = 'win'; SFX.win();   // opp fell short
      } else if (S.oppScore === S.firstScore) {
        S.matchResult = 'tie';
      } else {
        S.matchResult = 'lose'; SFX.lose(); // opp surpassed
      }
    }
    S.screen = 'result';
  }

  function continueFromBreak() {
    if (S.innings === 2 && S.batting === 'player') {
      // Player chases second
      beginBatting();
      nextBall();
    } else {
      // Player batted first; opp already simulated → show result
      computeResult();
    }
  }

  /* ══════════════════════════════════════════════════════════
     UPDATE
  ══════════════════════════════════════════════════════════ */
  function update() {
    if (S.screen === 'toss')    { updateToss(); return; }
    if (S.screen === 'batting') { updateBatting(); return; }
    if (S.screen === 'fielding'){ updateFielding(); return; }
  }

  function updateToss() {
    if (S.tossPhase !== 'flip') return;
    S.tossTimer++;
    if (S.tossTimer % 5 === 0) SFX.coin();
    if (S.tossTimer > 80) {
      S.tossPhase  = 'choice';
      S.tossWinner = Math.random() < 0.5 ? 'player' : 'opp';
      if (S.tossWinner === 'opp') {
        S.tossOppChoice = Math.random() < 0.5 ? 'bat' : 'bowl';
      }
      SFX.select();
    }
  }

  function updateBatting() {
    switch (S.phase) {
      case 'idle':
        S.phaseTimer++;
        if (S.phaseTimer > 28) nextBall();
        break;

      case 'runup':
        S.phaseTimer++;
        S.bowlerPhase = Math.min(1, S.phaseTimer / 45);
        if (S.phaseTimer > 45) releaseBall();
        break;

      case 'flight':
        S.phaseTimer++;
        var dur = rnd(38 / S.delivSpeed);
        S.ballT = Math.min(1, S.phaseTimer / dur);

        // Parabolic ball path
        S.ballX = lerp(S.ballStartX, S.ballEndX, S.ballT);
        var arc  = Math.sin(S.ballT * Math.PI) * 10;
        S.ballY  = lerp(S.ballStartY, S.ballEndY, S.ballT) - arc;

        // bounce sound mid-way
        if (!S.ballBounced && S.ballT > 0.52) {
          S.ballBounced = true;
          SFX.bounce();
        }

        // oscillate timing bar
        S.timPos += S.timDir * S.timSpeed;
        if (S.timPos >= 1) { S.timPos = 1; S.timDir = -1; }
        if (S.timPos <= 0) { S.timPos = 0; S.timDir =  1; }

        // ball reached batsman
        if (S.ballT >= 1 && !S.shotFired) {
          resolveDelivery(false);
        }
        break;

      case 'done':
        // swing animation
        if (S.shotFired && S.swingT < 1) {
          S.swingT = Math.min(1, S.swingT + 0.07);
        }

        // notification timeout
        if (S.notifTimer > 0) {
          S.notifTimer--;
          if (S.notifTimer <= 0) S.notifTxt = null;
        }

        // countdown to next ball
        if (S.doneTimer > 0) {
          S.doneTimer--;
          if (S.doneTimer <= 0 && S.screen === 'batting') {
            S.phase      = 'idle';
            S.phaseTimer = 0;
            nextBall();
          }
        }
        break;
    }
  }

  function updateFielding() {
    if (!S.fdActive) return;
    S.fdTimer++;

    S.fdBX += S.fdVX;
    S.fdBY += S.fdVY;
    S.fdVX *= 0.97;
    S.fdVY *= 0.97;

    // Check boundary (oval)
    var dx = (S.fdBX - FD_CX) / 43;
    var dy = (S.fdBY - FD_CY) / 52;
    if (dx * dx + dy * dy >= 1.0) {
      S.fdActive   = false;
      S.fdBoundary = true;
      S.notifTxt   = S.fdRuns === 6 ? 'SIX!' : 'FOUR!';
      S.notifTimer = 90;
      setTimeout(endFieldingView, 1300);
      return;
    }

    // Fielder stops ball (only for non-boundary hits)
    if (S.fdRuns < 4) {
      for (var fi = 0; fi < FIELDERS.length; fi++) {
        if (dst(S.fdBX, S.fdBY, FIELDERS[fi][0], FIELDERS[fi][1]) < 6) {
          S.fdActive = false;
          setTimeout(endFieldingView, 700);
          return;
        }
      }
    }

    // Ball nearly stopped
    var spd2 = S.fdVX * S.fdVX + S.fdVY * S.fdVY;
    if (spd2 < 0.01 && S.fdTimer > 20) {
      S.fdActive = false;
      setTimeout(endFieldingView, 500);
      return;
    }

    // Safety
    if (S.fdTimer > 220) endFieldingView();

    // Notification fade
    if (S.notifTimer > 0) {
      S.notifTimer--;
      if (S.notifTimer <= 0) S.notifTxt = null;
    }
  }

  /* ══════════════════════════════════════════════════════════
     PLAYER SWING
  ══════════════════════════════════════════════════════════ */
  function playerSwing() {
    if (S.phase !== 'flight') return;
    if (S.shotFired) return;
    SFX.init();
    resolveDelivery(true);
  }

  /* ══════════════════════════════════════════════════════════
     INPUT — KEYBOARD
  ══════════════════════════════════════════════════════════ */
  function onKey(e, down) {
    var k = e.code;

    if (down && k === 'KeyM') {
      SFX.init();
      updateSoundBtn(SFX.toggleMute());
      return;
    }

    if (S.screen === 'menu') {
      if (!down) return;
      if (k === 'ArrowUp')                { S.menuSel = (S.menuSel + 1) % 2; SFX.menu(); }
      if (k === 'ArrowDown')              { S.menuSel = (S.menuSel + 1) % 2; SFX.menu(); }
      if (k === 'Space' || k === 'Enter') { SFX.init(); menuSelect(); }
      return;
    }
    if (S.screen === 'help') {
      if (!down) return;
      if (k === 'Space' || k === 'Enter' || k === 'Escape') { S.screen = 'menu'; SFX.select(); }
      return;
    }
    if (S.screen === 'toss') {
      if (!down) return;
      if (S.tossPhase === 'choice' && S.tossWinner === 'player') {
        if (k === 'ArrowUp' || k === 'ArrowDown') { S.tossSel ^= 1; SFX.menu(); }
      }
      if (k === 'Space' || k === 'Enter') { SFX.init(); tossConfirm(); }
      return;
    }
    if (S.screen === 'batting') {
      if (k === 'ArrowLeft')   { down ? (S.inputDir = -1) : (S.inputDir === -1 && (S.inputDir = 0)); }
      if (k === 'ArrowRight')  { down ? (S.inputDir =  1) : (S.inputDir ===  1 && (S.inputDir = 0)); }
      if (k === 'ArrowUp')     { S.inputUp = down; }
      if (k === 'ArrowDown')   { if (down) S.inputUp = false; }
      if (down && (k === 'Space' || k === 'Enter')) { SFX.init(); playerSwing(); }
      return;
    }
    if (S.screen === 'break') {
      if (!down) return;
      if (k === 'Space' || k === 'Enter') { SFX.init(); continueFromBreak(); }
      return;
    }
    if (S.screen === 'result') {
      if (!down) return;
      if (k === 'Space' || k === 'Enter') { S.screen = 'menu'; S.menuSel = 0; }
      return;
    }
  }

  /* ══════════════════════════════════════════════════════════
     MENU / TOSS ACTIONS
  ══════════════════════════════════════════════════════════ */
  function menuSelect() {
    if (S.menuSel === 0) {
      // Quick match → toss
      S.screen     = 'toss';
      S.tossPhase  = 'flip';
      S.tossTimer  = 0;
      S.tossWinner = null;
      S.tossSel    = 0;
      SFX.select();
    } else {
      S.screen = 'help';
      SFX.select();
    }
  }

  function tossConfirm() {
    if (S.tossPhase !== 'choice') return;
    if (S.tossWinner === 'player') {
      startMatch(S.tossSel === 0); // 0=bat first
    } else {
      startMatch(S.tossOppChoice === 'bowl'); // opp chose bat → player bats second
    }
  }

  /* ══════════════════════════════════════════════════════════
     MOBILE BUTTONS
  ══════════════════════════════════════════════════════════ */
  function mobileAction() {
    SFX.init();
    switch (S.screen) {
      case 'menu':    menuSelect(); break;
      case 'help':    S.screen = 'menu'; SFX.select(); break;
      case 'toss':    tossConfirm(); break;
      case 'batting': playerSwing(); break;
      case 'break':   continueFromBreak(); break;
      case 'result':  S.screen = 'menu'; S.menuSel = 0; break;
    }
  }
  function mobileUp(down) {
    switch (S.screen) {
      case 'menu':    if (down) { S.menuSel = (S.menuSel + 1) % 2; SFX.menu(); } break;
      case 'toss':    if (down && S.tossPhase === 'choice') { S.tossSel = 0; SFX.menu(); } break;
      case 'batting': S.inputUp = down; break;
    }
  }
  function mobileDown(down) {
    switch (S.screen) {
      case 'menu':    if (down) { S.menuSel = (S.menuSel + 1) % 2; SFX.menu(); } break;
      case 'toss':    if (down && S.tossPhase === 'choice') { S.tossSel = 1; SFX.menu(); } break;
      case 'batting': if (down) S.inputUp = false; break;
    }
  }
  function mobileLeft(down) {
    if (S.screen === 'batting') {
      if (down) S.inputDir = -1;
      else if (S.inputDir === -1) S.inputDir = 0;
    }
  }
  function mobileRight(down) {
    if (S.screen === 'batting') {
      if (down) S.inputDir = 1;
      else if (S.inputDir === 1) S.inputDir = 0;
    }
  }

  /* ══════════════════════════════════════════════════════════
     SOUND BUTTON
  ══════════════════════════════════════════════════════════ */
  function updateSoundBtn(isMuted) {
    var b = document.getElementById('ck-sound');
    if (b) b.textContent = isMuted ? '🔇 Sound off' : '🔊 Sound on';
  }

  /* ══════════════════════════════════════════════════════════
     GAME LOOP
  ══════════════════════════════════════════════════════════ */
  var lastT = 0;
  function loop(t) {
    // Run update at ~60 fps ticks
    if (t - lastT >= 14) {  // ~70fps max, smooth on 60Hz
      update();
      draw();
      lastT = t;
    }
    requestAnimationFrame(loop);
  }

  /* ══════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════ */
  function bindBtn(id, onDown, onUp, onClick) {
    var el = document.getElementById(id);
    if (!el) return;
    if (onDown) {
      el.addEventListener('mousedown',  function(e){ e.preventDefault(); onDown(); });
      el.addEventListener('touchstart', function(e){ e.preventDefault(); onDown(); }, {passive:false});
    }
    if (onUp) {
      el.addEventListener('mouseup',    function(e){ e.preventDefault(); onUp(); });
      el.addEventListener('touchend',   function(e){ e.preventDefault(); onUp(); }, {passive:false});
    }
    if (onClick) {
      el.addEventListener('click',      function(e){ e.preventDefault(); onClick(); });
    }
  }

  function boot() {
    // Offscreen canvas
    oc  = document.createElement('canvas');
    oc.width = VW; oc.height = VH;
    octx = oc.getContext('2d');

    // Show mobile pad
    var game = document.getElementById('game');
    if (game) game.dataset.pad = 'on';

    // Keyboard
    document.addEventListener('keydown', function(e){ onKey(e, true);  });
    document.addEventListener('keyup',   function(e){ onKey(e, false); });

    // Mobile buttons
    bindBtn('ck-up',    function(){ mobileUp(true);    }, function(){ mobileUp(false);    }, null);
    bindBtn('ck-down',  function(){ mobileDown(true);  }, function(){ mobileDown(false);  }, null);
    bindBtn('ck-left',  function(){ mobileLeft(true);  }, function(){ mobileLeft(false);  }, null);
    bindBtn('ck-right', function(){ mobileRight(true); }, function(){ mobileRight(false); }, null);
    bindBtn('ck-hit',   null, null, function(){ SFX.init(); mobileAction(); });

    bindBtn('ck-sound', null, null, function(){
      SFX.init();
      updateSoundBtn(SFX.toggleMute());
    });

    updateSoundBtn(SFX.isMuted());

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Expose for cricket-init.js compatibility */
  window.__CricketGame = {
    toggleMute: function(){ return SFX.toggleMute(); },
    isMuted:    function(){ return SFX.isMuted(); },
  };

})();
