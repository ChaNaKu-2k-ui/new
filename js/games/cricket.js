/* Cricket Legends — merged from audio.js + sprites.js + game.js + main.js
   Integrated into chanaku.pages.dev shell. Canvas id: ck-board.          */
(function () {
  "use strict";

  /* ══════════════════════════════════════════════════════════════════════
     AUDIO
     ══════════════════════════════════════════════════════════════════════ */
  var Audio = (function () {
    var ctx = null;
    var muted = false;
    try { muted = localStorage.getItem('cnk-cricket-muted') === '1'; } catch(e) {}
    function init() {
      if (ctx) return;
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    function beep(freq, dur, type, vol) {
      if (!ctx || muted) return;
      type = type || 'square'; vol = vol || 0.08;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + dur);
      } catch (e) {}
    }
    function toggleMute() {
      muted = !muted;
      try { localStorage.setItem('cnk-cricket-muted', muted ? '1' : '0'); } catch(e) {}
      return muted;
    }
    return {
      init: init,
      toggleMute: toggleMute,
      isMuted: function(){ return muted; },
      move:   function(){ beep(660, 0.04, 'square',   0.04); },
      select: function(){ beep(880, 0.08, 'square',   0.06); },
      back:   function(){ beep(440, 0.06, 'square',   0.05); },
      swing:  function(){ beep(300, 0.05, 'sawtooth', 0.05); },
      six:    function(){ beep(880, 0.12, 'square', 0.10); setTimeout(function(){ beep(1320, 0.20, 'square', 0.09); }, 80); },
      four:   function(){ beep(660, 0.10, 'square', 0.08); setTimeout(function(){ beep( 990, 0.12, 'square', 0.07); }, 70); },
      one:    function(){ beep(520, 0.06, 'square',   0.05); },
      dot:    function(){ beep(330, 0.05, 'square',   0.04); },
      out:    function(){ beep(220, 0.20, 'sawtooth', 0.10); setTimeout(function(){ beep(140, 0.25, 'sawtooth', 0.08); }, 100); },
      bowl:   function(){ beep(400, 0.08, 'triangle', 0.06); },
      toss:   function(){ beep(550, 0.08, 'square', 0.06); setTimeout(function(){ beep(770, 0.12, 'square', 0.07); }, 100); },
    };
  })();

  /* ══════════════════════════════════════════════════════════════════════
     SPRITES — pixel-art style, flat colours, no gradients
     ══════════════════════════════════════════════════════════════════════ */
  var Sprites = (function () {
    var COL = {
      sky: '#1a2e1a', fieldFar: '#1e4a1e', fieldNear: '#2d6a2d',
      pitchFar: '#a8854a', pitchNear: '#c4a060',
      stump: '#e8d8b0', ball: '#c1121f', ballLight: '#ff4d4d',
      batsmanKit: '#e8e8e0', batsmanHelmet: '#2a4a8a',
      bowlerKit: '#8a2a2a', fielder: '#2a4a8a', white: '#ffffff',
      shadow: 'rgba(0,0,0,0.35)',
    };

    function pitchGeom(W, H) {
      return { topY: H*0.20, botY: H*0.92, topW: W*0.10, botW: W*0.30 };
    }

    function drawField(ctx, W, H) {
      var skyH = H * 0.16;
      ctx.fillStyle = COL.sky;
      ctx.fillRect(0, 0, W, skyH);

      ctx.fillStyle = 'rgba(200,200,180,0.12)';
      for (var r = 0; r < 3; r++) {
        for (var x = 4; x < W; x += 9) {
          ctx.fillRect(x + (r%2)*4, skyH*0.35 + r*8, 3, 3);
        }
      }

      var fg = ctx.createLinearGradient(0, skyH, 0, H);
      fg.addColorStop(0, COL.fieldFar); fg.addColorStop(1, COL.fieldNear);
      ctx.fillStyle = fg; ctx.fillRect(0, skyH, W, H - skyH);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W/2, H*1.05, W*0.55, Math.PI*1.15, Math.PI*1.85); ctx.stroke();

      var p = pitchGeom(W, H);
      ctx.beginPath();
      ctx.moveTo(W/2 - p.topW/2, p.topY); ctx.lineTo(W/2 + p.topW/2, p.topY);
      ctx.lineTo(W/2 + p.botW/2, p.botY); ctx.lineTo(W/2 - p.botW/2, p.botY);
      ctx.closePath();
      var pg = ctx.createLinearGradient(0, p.topY, 0, p.botY);
      pg.addColorStop(0, COL.pitchFar); pg.addColorStop(1, COL.pitchNear);
      ctx.fillStyle = pg; ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W/2 - p.topW/2, p.topY + (p.botY-p.topY)*0.12);
      ctx.lineTo(W/2 + p.topW/2, p.topY + (p.botY-p.topY)*0.12); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W/2 - p.botW/2, p.botY - (p.botY-p.topY)*0.08);
      ctx.lineTo(W/2 + p.botW/2, p.botY - (p.botY-p.topY)*0.08); ctx.stroke();
      return p;
    }

    function drawStumps(ctx, x, y, scale) {
      var h = 26*scale, gap = 3.5*scale, w = Math.max(1.5, 2.5*scale);
      ctx.fillStyle = COL.stump;
      for (var i = -1; i <= 1; i++) ctx.fillRect(x + i*gap - w/2, y - h, w, h);
      ctx.fillRect(x - gap - w/2, y - h - 2*scale, gap*2 + w, 1.8*scale);
    }

    function drawBatsmanBehind(ctx, x, y, scale, swingPhase) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath(); ctx.ellipse(0, 2, 22, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = COL.batsmanKit;
      ctx.fillRect(-13,-42,10,42); ctx.fillRect(3,-42,10,42);
      ctx.fillStyle = '#c8c8c0';
      ctx.fillRect(-13,-36,10,2); ctx.fillRect(-13,-24,10,2);
      ctx.fillRect(3,-36,10,2);  ctx.fillRect(3,-24,10,2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-14,-3,12,4); ctx.fillRect(2,-3,12,4);
      ctx.fillStyle = COL.batsmanKit;
      ctx.fillRect(-16,-78,32,38);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(-6,-70,12,16);
      ctx.fillStyle = COL.batsmanKit;
      var armSwing = swingPhase || 0;
      ctx.fillRect(-22,-74+armSwing*8,7,22);
      ctx.fillRect(15,-74-armSwing*10,7,22);
      ctx.fillStyle = COL.batsmanHelmet;
      ctx.beginPath(); ctx.arc(0,-86,12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-12,-88,24,3);
      ctx.save(); ctx.translate(20,-66);
      ctx.rotate(-0.35 + (swingPhase||0)*1.6);
      ctx.fillStyle = '#c9954a'; ctx.fillRect(-3.5,0,7,48);
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-2.5,40,5,6);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-2.5,-14,5,16);
      ctx.restore(); ctx.restore();
    }

    function drawBatsmanFront(ctx, x, y, scale) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath(); ctx.ellipse(0,1,10,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = COL.batsmanKit;
      ctx.fillRect(-6,-20,5,20); ctx.fillRect(1,-20,5,20);
      ctx.fillRect(-8,-38,16,20);
      ctx.fillStyle = COL.batsmanHelmet;
      ctx.beginPath(); ctx.arc(0,-44,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-7,-46,14,3);
      ctx.fillStyle = '#c9954a';
      ctx.save(); ctx.translate(8,-28); ctx.rotate(0.3);
      ctx.fillRect(-2,0,4,26); ctx.restore(); ctx.restore();
    }

    function drawBowlerBack(ctx, x, y, scale, runPhase) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath(); ctx.ellipse(0,1,8,3,0,0,Math.PI*2); ctx.fill();
      var lp = runPhase || 0;
      ctx.fillStyle = '#e8e8e0';
      ctx.fillRect(-5+lp*3,-16,4,16); ctx.fillRect(1-lp*3,-16,4,16);
      ctx.fillStyle = COL.bowlerKit; ctx.fillRect(-7,-34,14,19);
      ctx.fillStyle = '#c8a080';
      ctx.beginPath(); ctx.arc(0,-39,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#c8a080'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(6,-30); ctx.lineTo(12,-40+(runPhase||0)*-6); ctx.stroke();
      ctx.restore();
    }

    function drawBowlerFront(ctx, x, y, scale) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath(); ctx.ellipse(0,2,16,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e8e8e0';
      ctx.fillRect(-9,-34,7,34); ctx.fillRect(2,-34,7,34);
      ctx.fillStyle = COL.bowlerKit; ctx.fillRect(-12,-62,24,30);
      ctx.fillStyle = '#c8a080';
      ctx.beginPath(); ctx.arc(0,-70,9,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#c8a080'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(10,-56); ctx.lineTo(18,-74); ctx.stroke();
      ctx.restore();
    }

    function drawBall(ctx, x, y, scale, alpha) {
      var r = 7 * scale;
      ctx.save();
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.fillStyle = COL.shadow;
      ctx.beginPath(); ctx.ellipse(x+r*0.4, y+r*0.6, r*0.9, r*0.4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = COL.ball;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = COL.ballLight;
      ctx.beginPath(); ctx.arc(x-r*0.3, y-r*0.3, r*0.35, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = Math.max(1, 1.5*scale);
      ctx.beginPath(); ctx.arc(x, y, r*0.7, -0.6, 0.6); ctx.stroke();
      ctx.restore();
    }

    function drawFielder(ctx, x, y, scale) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath(); ctx.ellipse(0,1,6,2,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = COL.fielder; ctx.fillRect(-4,-16,8,16);
      ctx.fillStyle = '#c8a080';
      ctx.beginPath(); ctx.arc(0,-19,4,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function drawTargetCursor(ctx, x, y, pulse) {
      var s = 1 + (pulse||0)*0.15;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = '#7ec850'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-20,0); ctx.lineTo(-8,0);
      ctx.moveTo(8,0);   ctx.lineTo(20,0);
      ctx.moveTo(0,-20); ctx.lineTo(0,-8);
      ctx.moveTo(0,8);   ctx.lineTo(0,20);
      ctx.stroke();
      ctx.fillStyle = '#7ec850';
      ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    return { COL: COL, pitchGeom: pitchGeom, drawField: drawField,
             drawStumps: drawStumps, drawBatsmanBehind: drawBatsmanBehind,
             drawBatsmanFront: drawBatsmanFront, drawBowlerBack: drawBowlerBack,
             drawBowlerFront: drawBowlerFront, drawBall: drawBall,
             drawFielder: drawFielder, drawTargetCursor: drawTargetCursor };
  })();

  /* ══════════════════════════════════════════════════════════════════════
     GAME LOGIC
     ══════════════════════════════════════════════════════════════════════ */
  var Game = (function () {

    var TEAMS = [
      { id:'ind', name:'INDIA',       flag:'🇮🇳' },
      { id:'aus', name:'AUSTRALIA',   flag:'🇦🇺' },
      { id:'eng', name:'ENGLAND',     flag:'🏴' },
      { id:'pak', name:'PAKISTAN',    flag:'🇵🇰' },
      { id:'sl',  name:'SRI LANKA',   flag:'🇱🇰' },
      { id:'nz',  name:'NEW ZEALAND', flag:'🇳🇿' },
      { id:'sa',  name:'S. AFRICA',   flag:'🇿🇦' },
      { id:'wi',  name:'W. INDIES',   flag:'🏝️' },
      { id:'ban', name:'BANGLADESH',  flag:'🇧🇩' },
      { id:'afg', name:'AFGHANISTAN', flag:'🇦🇫' },
      { id:'zim', name:'ZIMBABWE',    flag:'🇿🇼' },
      { id:'ire', name:'IRELAND',     flag:'🇮🇪' },
    ];

    var OVERS = 5, WICKETS = 5;

    var S = {
      screen:'menu', menuIndex:0, mode:null,
      playerTeam:null, oppTeam:null, selStage:'player', teamIndex:0,
      tossIndex:0, tossWinner:null, tossChoice:null, tossReady:false,
      battingFirst:null, batting:null, innings:1, target:null,
      score:{ player:{r:0,w:0,b:0}, opp:{r:0,w:0,b:0} },
      tournament:null, lastWinner:null,
    };

    var B = {
      phase:'idle', t:0, duration:0, line:0, swing:0,
      timingPhase:0, timingDir:1, direction:0, directionY:0,
      lockedDirection:0, lockedDirectionY:0, shotResult:null,
      fieldBall:null, cursor:{x:0.5,y:0.5}, runPhase:0,
      resultTimer:0, swingKey:false, autoSwing:false, autoSwingAt:0.5,
    };

    var canvas, ctx, W, H;

    function teamById(id) { return TEAMS.find(function(t){ return t.id===id; }); }
    function $(id) { return document.getElementById(id); }
    function show(id){ var el=$(id); if(el) el.classList.remove('hidden'); }
    function hide(id){ var el=$(id); if(el) el.classList.add('hidden'); }
    function hideScreens() {
      document.querySelectorAll('.cg-lscreen').forEach(function(s){ s.classList.add('hidden'); });
    }
    function setScreen(name) {
      hideScreens();
      S.screen = name;
      if (name !== 'match') { hide('hud-top'); hide('timing-wrap'); hide('controls'); }
      if      (name==='menu')    show('screen-menu');
      else if (name==='help')    show('screen-help');
      else if (name==='teams')   show('screen-teams');
      else if (name==='toss')    show('screen-toss');
      else if (name==='break')   show('screen-break');
      else if (name==='result')  show('screen-result');
      else if (name==='bracket') show('screen-bracket');
    }

    function setHUD() {
      var meBatting = S.batting === 'player';
      var sc  = meBatting ? S.score.player : S.score.opp;
      var team = teamById(meBatting ? S.playerTeam : S.oppTeam);
      if (!team) return;
      var ht = $('hud-team'); if(ht) ht.textContent = team.name;
      var hs = $('hud-score'); if(hs) hs.textContent = sc.r+'/'+sc.w;
      var ho = $('hud-overs'); if(ho) ho.textContent = Math.floor(sc.b/6)+'.'+sc.b%6+' ov';
      var tgt = $('hud-target');
      if (tgt) {
        if (S.innings===2 && S.target!==null && meBatting) {
          var need = Math.max(0, S.target - sc.r);
          var left = OVERS*6 - sc.b;
          tgt.textContent = need>0 ? 'NEED '+need+' FROM '+left : 'TARGET REACHED';
        } else { tgt.textContent = ''; }
      }
      /* sync external stat display */
      var sd = document.getElementById('ck-score-disp');
      if (sd) sd.textContent = S.score.player.r+'/'+S.score.player.w;
    }

    function commentary(text){ var el=$('hud-comm'); if(el) el.textContent=text; }

    function toast(text, color) {
      var el = $('toast'); if (!el) return;
      el.textContent = text;
      el.style.color = color || '#fff';
      el.classList.add('on');
      clearTimeout(el._t);
      el._t = setTimeout(function(){ el.classList.remove('on'); }, 900);
    }

    /* --- Menu --- */
    function menuItems() { return Array.from(document.querySelectorAll('#menu-list .menu-item')); }
    function refreshMenu() {
      menuItems().forEach(function(el,i){ el.classList.toggle('selected', i===S.menuIndex); });
    }
    function menuActivate() {
      var action = menuItems()[S.menuIndex].dataset.action;
      Audio.select();
      if      (action==='quick')      { S.mode='quick'; startTeamSelect(); }
      else if (action==='tournament') { S.mode='tournament'; startTeamSelect(); }
      else if (action==='help')       { setScreen('help'); }
    }

    /* --- Team select --- */
    function startTeamSelect() {
      S.selStage='player'; S.playerTeam=null; S.oppTeam=null; S.teamIndex=0;
      var tt=$('teams-title'); if(tt) tt.textContent='CHOOSE YOUR TEAM';
      renderTeams(); setScreen('teams');
    }
    function renderTeams() {
      var grid = $('team-grid'); if (!grid) return;
      grid.innerHTML = '';
      TEAMS.forEach(function(t, i) {
        var cell = document.createElement('div');
        cell.className = 'team-cell';
        if (i===S.teamIndex) cell.classList.add('selected');
        if (S.selStage==='opp' && t.id===S.playerTeam) cell.classList.add('disabled');
        cell.innerHTML = '<div class="team-flag">'+t.flag+'</div><div class="team-name">'+t.name+'</div>';
        grid.appendChild(cell);
      });
    }
    function teamMove(dx, dy) {
      var cols=3, i=S.teamIndex, r=Math.floor(i/cols), c=i%cols;
      c+=dx; r+=dy;
      if(c<0) c=cols-1; if(c>=cols) c=0;
      if(r<0) r=Math.ceil(TEAMS.length/cols)-1;
      if(r>=Math.ceil(TEAMS.length/cols)) r=0;
      i=r*cols+c; if(i>=TEAMS.length) i=TEAMS.length-1;
      if(S.selStage==='opp'&&TEAMS[i].id===S.playerTeam){
        i=(i+1)%TEAMS.length;
        if(TEAMS[i].id===S.playerTeam) i=(i+1)%TEAMS.length;
      }
      S.teamIndex=i; Audio.move(); renderTeams();
    }
    function teamConfirm() {
      var t=TEAMS[S.teamIndex];
      if(S.selStage==='opp'&&t.id===S.playerTeam) return;
      Audio.select();
      if(S.selStage==='player'){
        S.playerTeam=t.id;
        if(S.mode==='tournament'){ startTournament(); return; }
        S.selStage='opp'; S.teamIndex=0;
        while(TEAMS[S.teamIndex].id===S.playerTeam) S.teamIndex++;
        var tt=$('teams-title'); if(tt) tt.textContent='CHOOSE OPPONENT';
        renderTeams();
      } else {
        S.oppTeam=t.id; startToss();
      }
    }

    /* --- Toss --- */
    function startToss() {
      S.tossWinner=null; S.tossChoice=null; S.tossIndex=0; S.tossReady=false;
      var tr=$('toss-result'); if(tr) tr.textContent='TOSSING…';
      hide('toss-choices');
      var tf=$('toss-foot'); if(tf) tf.textContent='…';
      setScreen('toss'); Audio.toss();
      setTimeout(function(){
        var playerWins = Math.random()<0.5;
        S.tossWinner = playerWins?'player':'opp';
        var team = teamById(playerWins?S.playerTeam:S.oppTeam);
        if(tr) tr.textContent = team.name+' WIN THE TOSS';
        if(playerWins){
          show('toss-choices'); refreshTossChoices();
          if(tf) tf.textContent='↑↓ choose · ENTER confirm';
        } else {
          setTimeout(function(){
            var ch = Math.random()<0.65?'bat':'bowl';
            S.tossChoice=ch;
            if(tr) tr.textContent=team.name+' WIN THE TOSS AND CHOOSE TO '+ch.toUpperCase();
            S.battingFirst = ch==='bat'?'opp':'player';
            if(tf) tf.textContent='SPACE / ENTER start match';
            S.tossReady=true;
          },900);
        }
      },800);
    }
    function refreshTossChoices() {
      document.querySelectorAll('#toss-choices .menu-item').forEach(function(el,i){
        el.classList.toggle('selected', i===S.tossIndex);
      });
    }
    function tossConfirm() {
      if(S.tossReady){ startMatch(); return; }
      if(S.tossWinner!=='player') return;
      Audio.select();
      var choice = S.tossIndex===0?'bat':'bowl';
      S.tossChoice=choice; S.battingFirst=choice==='bat'?'player':'opp'; S.tossReady=true;
      var tr=$('toss-result'); if(tr) tr.textContent='YOU CHOOSE TO '+choice.toUpperCase();
      var tf=$('toss-foot'); if(tf) tf.textContent='SPACE / ENTER start match';
    }

    /* --- Match --- */
    function startMatch() {
      S.innings=1; S.target=null;
      S.score.player={r:0,w:0,b:0}; S.score.opp={r:0,w:0,b:0};
      S.batting=S.battingFirst; B.phase='idle'; B.t=0; B.shotResult=null;
      hideScreens(); show('hud-top'); show('controls');
      setScreen('match'); setHUD();
      commentary(teamById(S.batting==='player'?S.playerTeam:S.oppTeam).name+' BATTING');
      startBall();
    }
    function startBall() {
      if(checkInningsEnd()){ endInnings(); return; }
      B.phase='runup'; B.t=0; B.duration=0.9;
      B.line=(Math.random()*2-1)*0.7; B.swing=0;
      B.timingPhase=0; B.timingDir=1; B.direction=0; B.directionY=0;
      B.lockedDirection=0; B.lockedDirectionY=0; B.shotResult=null;
      B.fieldBall=null; B.swingKey=false; B.autoSwing=false;
      B.autoSwingAt=0.5+(Math.random()*0.3-0.15);
      if(S.batting==='opp'){ B.autoSwing=true; hide('timing-wrap'); }
      else { show('timing-wrap'); var tm=$('tm'); if(tm) tm.style.left='0%'; }
    }
    function playerSwing() {
      if(B.phase!=='travel'||B.swingKey) return;
      B.swingKey=true; B.swing=0.001; Audio.swing();
      var err=Math.abs(B.timingPhase-0.5), timing;
      if(err<0.03) timing='perfect';
      else if(err<0.09) timing='good';
      else if(err<0.16) timing='ok';
      else timing='poor';
      var dir=B.direction, dirY=B.directionY, result;
      if(timing==='perfect'){
        if(dirY>0) result='six';
        else if(dir!==0) result=Math.random()<0.6?'four':'six';
        else result='four';
      } else if(timing==='good'){
        if(dirY>0) result=Math.random()<0.5?'six':'four';
        else if(dir!==0) result='four';
        else result=Math.random()<0.5?'four':'two';
      } else if(timing==='ok'){
        if(dirY>0) result=Math.random()<0.3?'four':'one';
        else if(dir!==0) result='two';
        else result='one';
      } else {
        result=Math.random()<0.35?'out':'dot';
      }
      B.shotResult=result; B.lockedDirection=dir; B.lockedDirectionY=dirY;
      resolveShot(result,dir,dirY);
    }
    function autoSwing() {
      var acc=Math.random(), result;
      if(acc<0.04) result='out'; else if(acc<0.14) result='six';
      else if(acc<0.30) result='four'; else if(acc<0.55) result='two';
      else if(acc<0.80) result='one'; else result='dot';
      B.shotResult=result;
      B.lockedDirection=(Math.random()*2-1);
      B.lockedDirectionY=Math.random()<0.4?1:0;
      resolveShot(result,B.lockedDirection,B.lockedDirectionY);
    }
    function resolveShot(result, dir, dirY) {
      B.phase='shot'; B.t=0; B.duration=0.35;
      if(result==='six'){ Audio.six(); toast('SIX!','#e8c840'); commentary('SIX! Into the crowd!'); }
      else if(result==='four'){ Audio.four(); toast('FOUR!','#7ec850'); commentary('FOUR! Cracking shot.'); }
      else if(result==='two'){ Audio.one(); toast('2','#c8e6c0'); commentary('Two runs.'); }
      else if(result==='one'){ Audio.one(); toast('1','#c8e6c0'); commentary('Single taken.'); }
      else if(result==='dot'){ Audio.dot(); toast('•','#8aa888'); commentary('Dot ball.'); }
      else if(result==='out'){ Audio.out(); toast('OUT!','#e05050'); commentary('OUT! Wicket falls.'); }
      var key=S.batting==='player'?'player':'opp', sc=S.score[key];
      sc.b++;
      if(result==='out') sc.w++;
      else if(result==='six') sc.r+=6;
      else if(result==='four') sc.r+=4;
      else if(result==='two') sc.r+=2;
      else if(result==='one') sc.r+=1;
      setHUD();
      B.fieldBall={
        x:W/2, y:H*0.88,
        vx:dir*(result==='six'?260:result==='four'?220:120),
        vy:-(result==='six'?320:result==='four'?260:dirY>0?180:140),
        scale:1, active:true, life:0,
      };
    }
    function checkInningsEnd() {
      var key=S.batting==='player'?'player':'opp', sc=S.score[key];
      if(sc.w>=WICKETS) return true;
      if(sc.b>=OVERS*6) return true;
      if(S.innings===2&&S.target!==null&&sc.r>=S.target) return true;
      return false;
    }
    function endInnings() {
      hide('timing-wrap'); B.phase='idle';
      var key=S.batting==='player'?'player':'opp', sc=S.score[key];
      var team=teamById(S.batting==='player'?S.playerTeam:S.oppTeam);
      if(S.innings===1){
        S.target=sc.r+1; S.innings=2;
        S.batting=S.batting==='player'?'opp':'player';
        var chase=teamById(S.batting==='player'?S.playerTeam:S.oppTeam);
        var bs=$('break-score'); if(bs) bs.textContent=sc.r+'/'+sc.w;
        var bd=$('break-detail'); if(bd) bd.textContent=team.name+' — '+Math.floor(sc.b/6)+'.'+sc.b%6+' OVERS';
        var bt=$('break-target'); if(bt) bt.textContent=chase.name+' NEED '+S.target+' TO WIN';
        setScreen('break');
      } else { endMatch(); }
    }
    function endMatch() {
      var p=S.score.player, o=S.score.opp, winner, title;
      if(p.r>o.r){ winner='player'; title=teamById(S.playerTeam).name+' WIN!'; }
      else if(o.r>p.r){ winner='opp'; title=teamById(S.oppTeam).name+' WIN!'; }
      else { winner='tie'; title='MATCH TIED'; }
      S.lastWinner=winner;
      var rt=$('result-title'); if(rt) rt.textContent=title;
      var rs=$('result-score'); if(rs) rs.textContent=p.r+'/'+p.w+'  vs  '+o.r+'/'+o.w;
      var rd=$('result-detail'); if(rd) rd.textContent=teamById(S.playerTeam).name+' '+p.r+'/'+p.w+' · '+teamById(S.oppTeam).name+' '+o.r+'/'+o.w;
      var rf=$('result-foot'); if(rf) rf.textContent=S.mode==='tournament'?'SPACE / ENTER continue tournament':'SPACE / ENTER main menu';
      setScreen('result');
    }
    function continueFromBreak() {
      Audio.select(); hideScreens(); show('hud-top'); show('controls');
      setScreen('match'); setHUD();
      commentary(teamById(S.batting==='player'?S.playerTeam:S.oppTeam).name+' CHASING '+S.target);
      startBall();
    }
    function continueFromResult() {
      Audio.select();
      if(S.mode==='tournament') advanceTournament(); else toMenu();
    }
    function toMenu() {
      S.mode=null; S.tournament=null; S.menuIndex=0; refreshMenu(); setScreen('menu');
    }

    /* --- Tournament --- */
    function startTournament() {
      var others=TEAMS.filter(function(t){ return t.id!==S.playerTeam; });
      for(var i=others.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=others[i]; others[i]=others[j]; others[j]=tmp; }
      var ids=[S.playerTeam].concat(others.slice(0,7).map(function(t){ return t.id; }));
      for(var k=ids.length-1;k>0;k--){ var m=Math.floor(Math.random()*(k+1)); var tmpi=ids[k]; ids[k]=ids[m]; ids[m]=tmpi; }
      var qf=[];
      for(var q=0;q<8;q+=2) qf.push({a:ids[q],b:ids[q+1],winner:null});
      S.tournament={
        playerTeam:S.playerTeam, currentRound:0,
        rounds:[qf,
          [{a:null,b:null,winner:null},{a:null,b:null,winner:null}],
          [{a:null,b:null,winner:null}]],
      };
      showBracket();
    }
    function showBracket(){ renderBracket(); setScreen('bracket'); }
    function renderBracket() {
      var t=S.tournament; if(!t) return;
      var el=$('bracket'); if(!el) return;
      el.innerHTML='';
      var names=['QUARTER-FINALS','SEMI-FINALS','FINAL'];
      t.rounds.forEach(function(round,ri){
        var col=document.createElement('div'); col.className='round-col';
        var lbl=document.createElement('div'); lbl.className='round-label'; lbl.textContent=names[ri];
        col.appendChild(lbl);
        round.forEach(function(match){
          var box=document.createElement('div'); box.className='match-box';
          if(match.a===t.playerTeam||match.b===t.playerTeam) box.classList.add('mine');
          if(match.a&&match.b){
            var ta=teamById(match.a),tb=teamById(match.b);
            var aw=match.winner===match.a?'win':match.winner?'lose':'';
            var bw=match.winner===match.b?'win':match.winner?'lose':'';
            box.innerHTML='<div class="match-line '+aw+'"><span>'+ta.flag+' '+ta.name+'</span></div><div class="match-line '+bw+'"><span>'+tb.flag+' '+tb.name+'</span></div>';
          } else {
            box.innerHTML='<div class="match-line">TBD</div><div class="match-line">TBD</div>';
          }
          col.appendChild(box);
        });
        el.appendChild(col);
      });
      var final=t.rounds[2][0];
      var foot=$('bracket-foot');
      if(foot) foot.textContent=final.winner?(teamById(final.winner).name+' CHAMPIONS · SPACE / ENTER menu'):'SPACE / ENTER play next match';
    }
    function playTournamentMatch() {
      var t=S.tournament; if(!t){ toMenu(); return; }
      var final=t.rounds[2][0]; if(final.winner){ toMenu(); return; }
      var round=t.rounds[t.currentRound];
      var idx=round.findIndex(function(m){ return (m.a===t.playerTeam||m.b===t.playerTeam)&&!m.winner; });
      if(idx<0){ advanceTournament(); return; }
      var match=round[idx];
      S.playerTeam=t.playerTeam; S.oppTeam=match.a===t.playerTeam?match.b:match.a;
      S.tossWinner=null; S.tossChoice=null; S.tossReady=false;
      S.battingFirst=null; S.target=null; S.lastWinner=null;
      Audio.select(); startToss();
    }
    function simInnings() {
      var r=0,w=0,b=0;
      while(w<WICKETS&&b<OVERS*6){
        b++; var x=Math.random();
        if(x<0.06) w++; else if(x<0.16) r+=6; else if(x<0.32) r+=4;
        else if(x<0.52) r+=2; else if(x<0.78) r+=1;
      }
      return {r:r,w:w,b:b};
    }
    function simMatch(teamA,teamB){ var a=simInnings(),b=simInnings(); return a.r>b.r?teamA:b.r>a.r?teamB:Math.random()<0.5?teamA:teamB; }
    function advanceTournament() {
      var t=S.tournament; if(!t){ toMenu(); return; }
      var round=t.rounds[t.currentRound];
      var idx=round.findIndex(function(m){ return m.a===t.playerTeam||m.b===t.playerTeam; });
      if(idx>=0&&!round[idx].winner){
        var match=round[idx];
        var playerWon=S.lastWinner==='player'||S.lastWinner==='tie';
        match.winner=playerWon?t.playerTeam:(match.a===t.playerTeam?match.b:match.a);
      }
      round.forEach(function(m){ if(!m.winner) m.winner=simMatch(m.a,m.b); });
      if(t.currentRound<2){
        var thisR=t.rounds[t.currentRound], nextR=t.rounds[t.currentRound+1];
        for(var i=0;i<nextR.length;i++){
          nextR[i].a=thisR[i*2].winner; nextR[i].b=thisR[i*2+1].winner;
        }
        t.currentRound++;
      }
      showBracket();
    }

    /* --- Update --- */
    function update(dt) {
      if(S.screen!=='match') return;
      if(B.phase==='runup'){
        B.t+=dt; B.runPhase=B.t/B.duration;
        if(B.t>=B.duration){ B.phase='travel'; B.t=0; B.duration=0.95; var tm=$('tm'); if(tm) tm.style.left='0%'; }
      } else if(B.phase==='travel'){
        B.t+=dt;
        B.timingPhase+=B.timingDir*dt*2.2;
        if(B.timingPhase>=1){ B.timingPhase=1; B.timingDir=-1; }
        if(B.timingPhase<=0){ B.timingPhase=0; B.timingDir=1; }
        if(S.batting==='player'){ var tm2=$('tm'); if(tm2) tm2.style.left=(B.timingPhase*100)+'%'; }
        if(B.autoSwing&&B.t/B.duration>=B.autoSwingAt&&!B.swingKey){ B.swingKey=true; autoSwing(); }
        if(B.t>=B.duration&&!B.swingKey){ B.swingKey=true; if(S.batting==='player') resolveShot(Math.random()<0.15?'out':'dot',0,0); }
        if(B.swing>0){ B.swing+=dt*4; if(B.swing>1) B.swing=0; }
      } else if(B.phase==='shot'){
        B.t+=dt;
        if(B.fieldBall&&B.fieldBall.active){
          var fb=B.fieldBall; fb.life+=dt;
          fb.x+=fb.vx*dt; fb.y+=fb.vy*dt; fb.vy+=220*dt;
          fb.scale=Math.max(0.15,1-fb.life*0.8);
          if(fb.x<-30||fb.x>W+30||fb.y<-30||fb.y>H+30||fb.life>1.6) fb.active=false;
        }
        if(B.t>=B.duration+0.9){
          B.phase='idle';
          setTimeout(function(){
            if(S.screen!=='match') return;
            if(checkInningsEnd()) endInnings(); else startBall();
          },300);
        }
      }
      setHUD();
    }

    /* --- Render --- */
    function render() {
      ctx.clearRect(0,0,W,H);
      if(S.screen!=='match'){ ctx.fillStyle='#0a140a'; ctx.fillRect(0,0,W,H); return; }
      var p=Sprites.drawField(ctx,W,H);
      var playerBatting=S.batting==='player';
      if(playerBatting){
        var bowlerY=p.topY+(p.botY-p.topY)*0.06;
        Sprites.drawBowlerBack(ctx,W/2,bowlerY,1.1,B.runPhase||0);
        Sprites.drawStumps(ctx,W/2,bowlerY+6,0.8);
        var fielders=[[W*0.18,p.topY+40],[W*0.82,p.topY+40],[W*0.10,H*0.55],[W*0.90,H*0.55],[W*0.30,p.topY+70],[W*0.70,p.topY+70]];
        fielders.forEach(function(f){ Sprites.drawFielder(ctx,f[0],f[1],0.7); });
        if(B.phase==='travel'){
          var prog=B.t/B.duration;
          var bx=W/2+B.line*(W*0.06)*prog, by=bowlerY+10+(H*0.88-bowlerY-10)*prog;
          var sc=0.4+prog*1.4;
          Sprites.drawBall(ctx,bx,by,sc);
        }
        if(B.fieldBall&&B.fieldBall.active) Sprites.drawBall(ctx,B.fieldBall.x,B.fieldBall.y,B.fieldBall.scale*1.5);
        Sprites.drawStumps(ctx,W/2,H*0.89,1.4);
        var swingPhase=B.swing>0&&B.swing<1?Math.sin(B.swing*Math.PI):0;
        Sprites.drawBatsmanBehind(ctx,W/2,H*0.94,1.5,swingPhase);
        if(B.phase==='travel'&&S.batting==='player'){
          var cx=W/2,cy=H*0.78;
          ctx.save(); ctx.globalAlpha=0.5+Math.sin(Date.now()*0.01)*0.2;
          ctx.strokeStyle='#7ec850'; ctx.lineWidth=2;
          var off=34;
          ctx.beginPath();
          ctx.moveTo(cx,cy-off);ctx.lineTo(cx-6,cy-off+8);ctx.moveTo(cx,cy-off);ctx.lineTo(cx+6,cy-off+8);
          ctx.moveTo(cx,cy+off);ctx.lineTo(cx-6,cy+off-8);ctx.moveTo(cx,cy+off);ctx.lineTo(cx+6,cy+off-8);
          ctx.moveTo(cx-off,cy);ctx.lineTo(cx-off+8,cy-6);ctx.moveTo(cx-off,cy);ctx.lineTo(cx-off+8,cy+6);
          ctx.moveTo(cx+off,cy);ctx.lineTo(cx+off-8,cy-6);ctx.moveTo(cx+off,cy);ctx.lineTo(cx+off-8,cy+6);
          ctx.stroke(); ctx.restore();
        }
      } else {
        var batsY=p.topY+(p.botY-p.topY)*0.10;
        Sprites.drawBatsmanFront(ctx,W/2,batsY,1.2);
        Sprites.drawStumps(ctx,W/2,batsY+4,0.7);
        var cxr=W/2-p.topW/2+B.cursor.x*p.topW, cyr=p.topY+B.cursor.y*(p.botY-p.topY);
        if(B.phase==='runup'||B.phase==='idle') Sprites.drawTargetCursor(ctx,cxr,cyr,Math.sin(Date.now()*0.006)*0.5+0.5);
        if(B.phase==='travel'){
          var prog2=B.t/B.duration;
          var bx2=W/2+B.line*(W*0.05)*prog2, by2=H*0.88-(H*0.88-batsY)*prog2;
          var sc2=1.4-prog2*1.0;
          Sprites.drawBall(ctx,bx2,by2,sc2);
        }
        Sprites.drawStumps(ctx,W/2,H*0.89,1.4);
        Sprites.drawBowlerFront(ctx,W/2,H*0.94,1.4);
      }
      if(B.phase==='shot'&&B.shotResult){
        var col=B.shotResult==='six'?'rgba(232,200,64,0.15)':B.shotResult==='four'?'rgba(126,200,80,0.12)':B.shotResult==='out'?'rgba(224,80,80,0.15)':null;
        if(col){ ctx.fillStyle=col; ctx.fillRect(0,0,W,H); }
      }
    }

    /* --- Input --- */
    function onKey(e, down) {
      var k = e.code;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(k)) e.preventDefault();
      if(!down) return;
      Audio.init();
      if(k==='KeyM'){ var m=Audio.toggleMute(); updateSoundBtn(m); return; }
      if(k==='Escape'){ if(S.screen==='help'||S.screen==='teams'){ Audio.back(); toMenu(); } return; }
      if(S.screen==='menu'){
        if(k==='ArrowUp'){ S.menuIndex=(S.menuIndex-1+menuItems().length)%menuItems().length; Audio.move(); refreshMenu(); }
        else if(k==='ArrowDown'){ S.menuIndex=(S.menuIndex+1)%menuItems().length; Audio.move(); refreshMenu(); }
        else if(k==='Enter'||k==='Space') menuActivate();
        return;
      }
      if(S.screen==='help'){ if(k==='Enter'||k==='Space'){ Audio.back(); toMenu(); } return; }
      if(S.screen==='teams'){
        if(k==='ArrowUp') teamMove(0,-1); else if(k==='ArrowDown') teamMove(0,1);
        else if(k==='ArrowLeft') teamMove(-1,0); else if(k==='ArrowRight') teamMove(1,0);
        else if(k==='Enter'||k==='Space') teamConfirm();
        return;
      }
      if(S.screen==='toss'){
        if(S.tossWinner==='player'&&!S.tossReady){
          if(k==='ArrowUp'||k==='ArrowDown'){ S.tossIndex=S.tossIndex===0?1:0; Audio.move(); refreshTossChoices(); }
        }
        if(k==='Enter'||k==='Space') tossConfirm();
        return;
      }
      if(S.screen==='break'){ if(k==='Enter'||k==='Space') continueFromBreak(); return; }
      if(S.screen==='result'){ if(k==='Enter'||k==='Space') continueFromResult(); return; }
      if(S.screen==='bracket'){ if(k==='Enter'||k==='Space') playTournamentMatch(); return; }
      if(S.screen==='match'){
        if(S.batting==='player'){
          if(k==='ArrowLeft') B.direction=-1;
          else if(k==='ArrowRight') B.direction=1;
          else if(k==='ArrowUp') B.directionY=1;
          else if(k==='ArrowDown') B.directionY=-1;
          else if(k==='Space'||k==='Enter') playerSwing();
        } else {
          if(k==='ArrowLeft') B.cursor.x=Math.max(0.1,B.cursor.x-0.08);
          else if(k==='ArrowRight') B.cursor.x=Math.min(0.9,B.cursor.x+0.08);
          else if(k==='ArrowUp') B.cursor.y=Math.max(0.1,B.cursor.y-0.08);
          else if(k==='ArrowDown') B.cursor.y=Math.min(0.9,B.cursor.y+0.08);
          else if(k==='Space'||k==='Enter'){
            if(B.phase==='runup'||B.phase==='idle'){ B.phase='travel'; B.t=0; B.duration=0.95; B.line=(B.cursor.x-0.5)*1.4; Audio.bowl(); }
          }
        }
        return;
      }
    }
    function onKeyUp(e) {
      var k=e.code;
      if(S.screen==='match'&&S.batting==='player'){
        if(k==='ArrowLeft'&&B.direction===-1) B.direction=0;
        if(k==='ArrowRight'&&B.direction===1) B.direction=0;
        if(k==='ArrowUp'&&B.directionY===1) B.directionY=0;
        if(k==='ArrowDown'&&B.directionY===-1) B.directionY=0;
      }
    }

    function resize() {
      if(!canvas) return;
      var rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
      W=rect.width; H=rect.height;
      canvas.width=W*dpr; canvas.height=H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.imageSmoothingEnabled=false;
    }

    function init(canvasEl) {
      canvas=canvasEl; ctx=canvas.getContext('2d');
      resize(); window.addEventListener('resize',resize);
      refreshMenu(); setScreen('menu');
      window.addEventListener('keydown',function(e){ onKey(e,true); });
      window.addEventListener('keyup',onKeyUp);
      canvas.addEventListener('pointerdown',function(){
        Audio.init();
        if(S.screen==='match'&&S.batting==='player') playerSwing();
        else if(S.screen==='match'&&S.batting==='opp'){
          if(B.phase==='runup'||B.phase==='idle'){ B.phase='travel'; B.t=0; B.duration=0.95; B.line=(B.cursor.x-0.5)*1.4; Audio.bowl(); }
        }
      });
    }

    function loop(now) {
      var dt=Math.min(0.05,(now-(loop._last||now))/1000);
      loop._last=now;
      update(dt); render();
      requestAnimationFrame(loop);
    }

    /* expose mobile helpers */
    function mobileAction() {
      Audio.init();
      if(S.screen==='menu'){ menuActivate(); return; }
      if(S.screen==='help'){ Audio.back(); toMenu(); return; }
      if(S.screen==='teams'){ teamConfirm(); return; }
      if(S.screen==='toss'){ tossConfirm(); return; }
      if(S.screen==='break'){ continueFromBreak(); return; }
      if(S.screen==='result'){ continueFromResult(); return; }
      if(S.screen==='bracket'){ playTournamentMatch(); return; }
      if(S.screen==='match'&&S.batting==='player') playerSwing();
      else if(S.screen==='match'&&S.batting==='opp'){
        if(B.phase==='runup'||B.phase==='idle'){ B.phase='travel'; B.t=0; B.duration=0.95; B.line=(B.cursor.x-0.5)*1.4; Audio.bowl(); }
      }
    }
    function mobileLeft(down) {
      if(S.screen==='teams'){ if(down) teamMove(-1,0); return; }
      if(S.screen!=='match') return;
      if(S.batting==='player') B.direction=down?-1:0;
      else if(down) B.cursor.x=Math.max(0.1,B.cursor.x-0.08);
    }
    function mobileRight(down) {
      if(S.screen==='teams'){ if(down) teamMove(1,0); return; }
      if(S.screen!=='match') return;
      if(S.batting==='player') B.direction=down?1:0;
      else if(down) B.cursor.x=Math.min(0.9,B.cursor.x+0.08);
    }
    function mobileUp(down) {
      if(S.screen==='menu'){ if(down){ S.menuIndex=(S.menuIndex-1+menuItems().length)%menuItems().length; Audio.move(); refreshMenu(); } return; }
      if(S.screen==='toss'){ if(down){ S.tossIndex=S.tossIndex===0?1:0; Audio.move(); refreshTossChoices(); } return; }
      if(S.screen==='teams'){ if(down) teamMove(0,-1); return; }
      if(S.screen!=='match') return;
      if(S.batting==='player') B.directionY=down?1:0;
      else if(down) B.cursor.y=Math.max(0.1,B.cursor.y-0.08);
    }
    function mobileDown(down) {
      if(S.screen==='menu'){ if(down){ S.menuIndex=(S.menuIndex+1)%menuItems().length; Audio.move(); refreshMenu(); } return; }
      if(S.screen==='toss'){ if(down){ S.tossIndex=S.tossIndex===0?1:0; Audio.move(); refreshTossChoices(); } return; }
      if(S.screen==='teams'){ if(down) teamMove(0,1); return; }
      if(S.screen!=='match') return;
      if(S.batting==='player') B.directionY=down?-1:0;
      else if(down) B.cursor.y=Math.min(0.9,B.cursor.y+0.08);
    }

    return { init:init, loop:loop, resize:resize, mobileAction:mobileAction, mobileLeft:mobileLeft, mobileRight:mobileRight, mobileUp:mobileUp, mobileDown:mobileDown, toggleMute:function(){ return Audio.toggleMute(); }, isMuted:function(){ return Audio.isMuted(); }, _S:S, _B:B };
  })();

  /* ══════════════════════════════════════════════════════════════════════
     BOOTSTRAP + MOBILE WIRING
     ══════════════════════════════════════════════════════════════════════ */
  function bindBtn(id, down, up, click) {
    var el = document.getElementById(id); if (!el) return;
    if (down || up) {
      el.addEventListener('touchstart', function(e){ e.preventDefault(); if(down) down(); },{passive:false});
      el.addEventListener('touchend',   function(e){ e.preventDefault(); if(up)   up();   },{passive:false});
      el.addEventListener('mousedown',  function(){ if(down) down(); });
      el.addEventListener('mouseup',    function(){ if(up)   up();   });
    }
    if (click) el.addEventListener('click', click);
  }

  function boot() {
    var canvasEl = document.getElementById('ck-board');
    if (!canvasEl) return;

    Game.init(canvasEl);
    requestAnimationFrame(Game.loop);

    /* mobile pad */
    bindBtn('ck-left',  function(){ Game.mobileLeft(true);  }, function(){ Game.mobileLeft(false);  }, null);
    bindBtn('ck-right', function(){ Game.mobileRight(true); }, function(){ Game.mobileRight(false); }, null);
    bindBtn('ck-up',    function(){ Game.mobileUp(true);    }, function(){ Game.mobileUp(false);    }, null);
    bindBtn('ck-down',  function(){ Game.mobileDown(true);  }, function(){ Game.mobileDown(false);  }, null);
    bindBtn('ck-hit',   null, null, function(){ Game.mobileAction(); });

    /* sound toggle */
    var sndBtn = document.getElementById('ck-sound');
    if (sndBtn) {
      updateSoundBtn(Audio.isMuted());
      sndBtn.addEventListener('click', function(){
        Audio.init();
        var m = Game.toggleMute();
        updateSoundBtn(m);
      });
    }
  }

  function updateSoundBtn(muted) {
    var btn = document.getElementById('ck-sound');
    if (!btn) return;
    btn.textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
    btn.title = muted ? 'Unmute (M)' : 'Mute (M)';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
