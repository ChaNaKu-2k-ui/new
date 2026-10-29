/* ============================================================================
   CRICKET LEGENDS — ENGINE v5.3 (Menu Restored + 3D Camera Fixed)
   ========================================================================== */
(function () {
    "use strict";

    const canvas = document.getElementById('ck-board') || document.querySelector('.ck-screen canvas') || document.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const hitBtn = document.getElementById('ck-hit');
    const btnUp = document.getElementById('ck-up');
    const btnDown = document.getElementById('ck-down');
    const btnLeft = document.getElementById('ck-left');
    const btnRight = document.getElementById('ck-right');
    const scoreDisp = document.getElementById('ck-score-disp');
    const bestDisp = document.getElementById('ck-best-disp');

    // Set actual canvas resolution (16:9 ratio)
    canvas.width = 900;
    canvas.height = 600;

    // Show mobile D-pad
    const gameContainer = document.getElementById('game');
    if (gameContainer && (("ontouchstart" in window) || navigator.maxTouchPoints > 0)) {
        gameContainer.setAttribute('data-pad', 'on');
    }

    // --- 3D Math ---
    class Vec3 {
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
        sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
        mul(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
        dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
        cross(v) { return new Vec3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); }
        len() { return Math.sqrt(this.dot(this)); }
        norm() { const l = this.len(); return l > 0 ? this.mul(1 / l) : new Vec3(0, 0, 0); }
        lerp(v, t) { return this.add(v.sub(this).mul(t)); }
        dist(v) { return this.sub(v).len(); }
    }

    function project(pos, camPos, camTarget, fov, width, height) {
        const forward = camTarget.sub(camPos).norm();
        let right, up;
        if (Math.abs(forward.y) > 0.99) {
            right = new Vec3(1, 0, 0);
            up = new Vec3(0, 0, -1).mul(forward.y > 0 ? 1 : -1);
        } else {
            right = new Vec3(0, 1, 0).cross(forward).norm();
            up = forward.cross(right).norm();
        }
        const d = pos.sub(camPos);
        const cx = d.dot(right), cy = d.dot(up), cz = d.dot(forward);
        if (cz <= 0.1) return null;
        const scale = (height / 2) / Math.tan((fov * Math.PI / 180) / 2);
        // Adjust scale factor to fit the field nicely
        return { x: (width / 2) + (cx / cz) * scale, y: (height / 2) - (cy / cz) * scale, depth: cz, scale: (scale / cz) * 0.6 };
    }

    // --- Physics & Entities ---
    class Ball {
        constructor() {
            this.pos = new Vec3(0, 0, -10);
            this.vel = new Vec3(0, 0, 0);
            this.radius = 0.04;
            this.active = false;
            this.state = 'idle';
            this.gravity = -9.81;
            this.restitution = 0.55;
        }
        reset() {
            this.pos = new Vec3(0, 0, -10); this.vel = new Vec3(0, 0, 0);
            this.active = false; this.state = 'idle';
        }
        bowl(line, length) {
            this.pos = new Vec3(line, 2.0, -10);
            // Length: 0 (full) to 2 (short)
            const targetZ = -10 + length * 8 + 2; 
            const dz = targetZ - this.pos.z;
            const speedMs = 130 / 3.6;
            const timeToPitch = Math.abs(dz) / speedMs;
            
            this.vel.z = dz / timeToPitch;
            this.vel.y = (0.5 * 9.81 * timeToPitch * timeToPitch - 2.0) / timeToPitch;
            
            this.active = true; 
            this.state = 'bowled';
        }
        update(dt) {
            if (!this.active) return;
            this.vel.y += this.gravity * dt;
            this.pos = this.pos.add(this.vel.mul(dt));
            
            if (this.pos.y <= 0 && this.vel.y < 0 && this.pos.z >= -10 && this.pos.z <= 10) {
                this.pos.y = 0; 
                this.vel.y = -this.vel.y * this.restitution;
                this.vel.x *= 0.75; 
                this.vel.z *= 0.95;
                if (this.state === 'bowled') this.state = 'bounced';
            }
        }
        hitBat() {
            this.state = 'hit';
            this.vel = new Vec3((Math.random() - 0.5) * 30, 15 + Math.random() * 15, 20 + Math.random() * 20);
        }
    }

    class Camera {
        constructor() {
            this.pos = new Vec3(0, 12, -25); 
            this.target = new Vec3(0, 0, 0);
            this.desPos = new Vec3(0, 12, -25); 
            this.desTarget = new Vec3(0, 0, 0);
            this.presets = {
                BOWLER: { pos: new Vec3(0, 8, -20), target: new Vec3(0, 1, 10) },
                BATSMAN: { pos: new Vec3(0, 8, 20), target: new Vec3(0, 1, -10) },
                BROADCAST: { pos: new Vec3(35, 25, 0), target: new Vec3(0, 0, 0) },
                SPIDER: { pos: new Vec3(0, 40, -0.1), target: new Vec3(0, 0, 0) }
            };
        }
        setMode(mode, targetPos = null) {
            if (mode === 'BALL' && targetPos) this.desTarget = targetPos;
            else if (this.presets[mode]) { this.desPos = this.presets[mode].pos; this.desTarget = this.presets[mode].target; }
        }
        update(dt) {
            this.pos = this.pos.lerp(this.desPos, dt * 3.5);
            this.target = this.target.lerp(this.desTarget, dt * 3.5);
        }
    }

    // --- Renderer ---
    const renderer = {
        clear() {
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#4facfe'); grad.addColorStop(1, '#00f2fe');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        },
        drawField(camPos, camTarget) {
            const center = project(new Vec3(0, 0, 0), camPos, camTarget, 60, canvas.width, canvas.height);
            const edge = project(new Vec3(60, 0, 0), camPos, camTarget, 60, canvas.width, canvas.height);
            if (center && edge) {
                const radius = Math.abs(edge.x - center.x);
                ctx.fillStyle = '#2c5e1a';
                ctx.beginPath(); ctx.ellipse(center.x, center.y, radius, radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            }
            
            // Pitch
            const p1 = project(new Vec3(-1.5, 0, -10), camPos, camTarget, 60, canvas.width, canvas.height);
            const p2 = project(new Vec3(1.5, 0, -10), camPos, camTarget, 60, canvas.width, canvas.height);
            const p3 = project(new Vec3(1.5, 0, 10), camPos, camTarget, 60, canvas.width, canvas.height);
            const p4 = project(new Vec3(-1.5, 0, 10), camPos, camTarget, 60, canvas.width, canvas.height);
            if (p1 && p2 && p3 && p4) {
                ctx.fillStyle = '#d4b872';
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            }
        },
        drawPlayer(pos, color) {
            const bot = project(pos, camera.pos, camera.target, 60, canvas.width, canvas.height);
            const top = project(pos.add(new Vec3(0, 1.8, 0)), camera.pos, camera.target, 60, canvas.width, canvas.height);
            if (bot && top) {
                const s = bot.scale;
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.ellipse(bot.x, bot.y, 15 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.moveTo(bot.x - 10 * s, bot.y); ctx.lineTo(bot.x + 10 * s, bot.y);
                ctx.lineTo(top.x + 8 * s, top.y); ctx.lineTo(top.x - 8 * s, top.y); ctx.fill();
                ctx.beginPath(); ctx.arc(top.x, top.y - 5 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
            }
        },
        drawBall(ball) {
            const sp = project(ball.pos, camera.pos, camera.target, 60, canvas.width, canvas.height);
            if (sp) {
                const r = Math.max(2, ball.radius * sp.scale * 2);
                const sh = project(new Vec3(ball.pos.x, 0, ball.pos.z), camera.pos, camera.target, 60, canvas.width, canvas.height);
                if (sh) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 2, r, 0, 0, Math.PI * 2); ctx.fill(); }
                ctx.fillStyle = '#b00000';
                ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.fill();
            }
        }
    };

    // --- Game State ---
    const camera = new Camera();
    const ball = new Ball();
    
    let gameState = 'MENU'; // MENU, TOSS, PLAY
    let currentTeam = 1;
    let score = { team1: { runs: 0, wkts: 0, balls: 0 }, team2: { runs: 0, wkts: 0, balls: 0 } };
    let aimX = 0;
    let aimY = 0;
    let bowlingPhase = 'aim';
    let accPos = 0;
    let accDir = 1;

    const fielders = [
        { pos: new Vec3(25, 0, -25) }, { pos: new Vec3(-25, 0, 25) },
        { pos: new Vec3(35, 0, 15) }, { pos: new Vec3(-10, 0, -35) }, { pos: new Vec3(15, 0, 35) }
    ];

    // Menu Hitboxes
    const hitboxes = [];
    
    function drawMenu() {
        renderer.clear();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#d4ff00';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CRICKET LEGENDS', canvas.width / 2, 150);
        
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.fillText('Click to Start Match', canvas.width / 2, 300);
        
        hitboxes.length = 0;
        hitboxes.push({ x: 300, y: 250, w: 300, h: 60, action: 'start' });
        
        ctx.strokeStyle = '#d4ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(300, 250, 300, 60);
    }

    function drawToss() {
        renderer.clear();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WON THE TOSS', canvas.width / 2, 200);
        
        ctx.font = '24px sans-serif';
        ctx.fillText('Choose to:', canvas.width / 2, 260);
        
        hitboxes.length = 0;
        hitboxes.push({ x: 250, y: 300, w: 150, h: 60, action: 'bat' });
        hitboxes.push({ x: 500, y: 300, w: 150, h: 60, action: 'bowl' });
        
        ctx.strokeStyle = '#d4ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(250, 300, 150, 60);
        ctx.strokeRect(500, 300, 150, 60);
        
        ctx.fillStyle = '#d4ff00';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('BAT', 325, 335);
        ctx.fillText('BOWL', 575, 335);
    }

    function startMatch(batFirst) {
        gameState = 'PLAY';
        currentTeam = batFirst ? 1 : 2;
        score = { team1: { runs: 0, wkts: 0, balls: 0 }, team2: { runs: 0, wkts: 0, balls: 0 } };
        updateUI();
        nextDelivery();
    }

    function updateUI() {
        if (scoreDisp) scoreDisp.innerText = `${score[`team${currentTeam}`].runs}/${score[`team${currentTeam}`].wkts}`;
        if (bestDisp) {
            const b = score[`team${currentTeam}`].balls;
            bestDisp.innerText = `${Math.floor(b / 6)}.${b % 6}`;
        }
    }

    function nextDelivery() {
        ball.reset();
        camera.setMode(currentTeam === 1 ? 'BOWLER' : 'BATSMAN');
        bowlingPhase = 'aim';
        aimX = 0; aimY = 0;
        
        setTimeout(() => {
            if (gameState !== 'PLAY') return;
            if (currentTeam === 1) {
                ball.bowl((Math.random() - 0.5) * 1.5, Math.random() * 2 + 1);
                bowlingPhase = 'flight';
            }
        }, 1500);
    }

    function startBowl() {
        if (bowlingPhase === 'aim') {
            bowlingPhase = 'release';
            accPos = 0; accDir = 1;
        } else if (bowlingPhase === 'release') {
            bowlingPhase = 'flight';
            ball.bowl((Math.random() - 0.5) * 1.5, Math.random() * 2 + 1);
            
            // AI Batsman
            setTimeout(() => {
                if (ball.state === 'bowled' || ball.state === 'bounced') {
                    ball.hitBat();
                    camera.setMode('BALL', ball.pos);
                }
            }, 500);
        }
    }

    function swingBat() {
        if (bowlingPhase !== 'flight' || !ball.active || (ball.state !== 'bowled' && ball.state !== 'bounced')) return;
        ball.hitBat();
        camera.setMode('BALL', ball.pos);
    }

    function handleWicket(type) {
        if (!ball.active) return;
        ball.active = false;
        score[`team${currentTeam}`].wkts++;
        score[`team${currentTeam}`].balls++;
        updateUI();
        camera.setMode('BROADCAST');
        
        setTimeout(() => {
            if (score[`team${currentTeam}`].wkts >= 10 || score[`team${currentTeam}`].balls >= 120) {
                if (currentTeam === 1) { currentTeam = 2; nextDelivery(); } else { gameState = 'MENU'; }
            } else {
                nextDelivery();
            }
        }, 2500);
    }

    function handleRuns(runs, type) {
        if (!ball.active) return;
        ball.active = false;
        score[`team${currentTeam}`].runs += runs;
        score[`team${currentTeam}`].balls++;
        updateUI();
        
        if (type === '6') camera.setMode('SPIDER');
        else if (type === '4') camera.setMode('BROADCAST');
        
        setTimeout(() => {
            if (score[`team${currentTeam}`].balls >= 120) {
                if (currentTeam === 1) { currentTeam = 2; nextDelivery(); } else { gameState = 'MENU'; }
            } else {
                nextDelivery();
            }
        }, 2500);
    }

    // --- Input Handlers ---
    if (btnUp) btnUp.addEventListener('pointerdown', () => aimY = 1);
    if (btnDown) btnDown.addEventListener('pointerdown', () => aimY = -1);
    if (btnLeft) btnLeft.addEventListener('pointerdown', () => aimX = -1);
    if (btnRight) btnRight.addEventListener('pointerdown', () => aimX = 1);

    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        for (let b of hitboxes) {
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                if (b.action === 'start') { gameState = 'TOSS'; }
                else if (b.action === 'bat') { startMatch(true); }
                else if (b.action === 'bowl') { startMatch(false); }
                return;
            }
        }

        if (gameState === 'PLAY') {
            if (currentTeam === 1 && bowlingPhase === 'flight') swingBat();
            else if (currentTeam === 2) startBowl();
        }
    });

    if (hitBtn) {
        hitBtn.addEventListener('pointerdown', () => {
            if (gameState === 'PLAY') {
                if (currentTeam === 1 && bowlingPhase === 'flight') swingBat();
                else if (currentTeam === 2) startBowl();
            }
        });
    }

    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && gameState === 'PLAY') {
            if (currentTeam === 1 && bowlingPhase === 'flight') swingBat();
            else if (currentTeam === 2) startBowl();
        }
    });

    // --- Engine Loop ---
    let lastTime = performance.now();
    function gameLoop(time) {
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        if (gameState === 'MENU') {
            drawMenu();
        } else if (gameState === 'TOSS') {
            drawToss();
        } else if (gameState === 'PLAY') {
            ball.update(dt);
            
            if (bowlingPhase === 'release') {
                accPos += accDir * dt * 1.5;
                if (accPos >= 1) { accPos = 1; accDir = -1; }
                if (accPos <= 0) { accPos = 0; accDir = 1; }
            }

            if (ball.active && (ball.state === 'bowled' || ball.state === 'bounced') && ball.pos.z > 10 && ball.pos.y < 1.5 && Math.abs(ball.pos.x) < 1.5) {
                handleWicket('bowled');
            }
            
            if (ball.active && ball.state === 'hit') {
                for (let f of fielders) {
                    if (ball.pos.dist(f.pos) < 3.0 && ball.pos.y < 2 && ball.vel.y < 0) {
                        handleWicket('caught');
                        break;
                    }
                }
            }
            
            if (ball.active && ball.state === 'hit') {
                const dist = Math.sqrt(ball.pos.x ** 2 + ball.pos.z ** 2);
                if (dist > 60) handleRuns(ball.pos.y > 2 ? 6 : 4, ball.pos.y > 2 ? '6' : '4');
                else if (ball.pos.y < 0.5 && ball.vel.len() < 2) handleRuns(1, '1');
            }
            
            // Handle bowling progression if user is bowling
            if (currentTeam === 2 && bowlingPhase === 'aim' && !ball.active) {
                 // waiting for player to press HIT to start release
            }

            camera.update(dt);
            renderer.clear();
            renderer.drawField(camera.pos, camera.target);
            
            fielders.forEach(f => renderer.drawPlayer(f.pos, '#1a4fa0'));
            renderer.drawPlayer(new Vec3(0, 0, -10), '#1a4fa0');
            renderer.drawPlayer(new Vec3(0, 0, 10), '#0039a6');
            
            if (ball.active) renderer.drawBall(ball);

            if (bowlingPhase === 'release') {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(300, 500, 300, 30);
                ctx.fillStyle = '#d4ff00';
                ctx.fillRect(300, 500, 300 * accPos, 30);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(300, 500, 300, 30);
            }
        }

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
})();
