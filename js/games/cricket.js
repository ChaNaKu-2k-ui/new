(function () {
    "use strict";

    // --- DOM Elements ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const ui = {
        menu: document.getElementById('menu-screen'),
        toss: document.getElementById('toss-screen'),
        result: document.getElementById('result-screen'),
        scoreboard: document.getElementById('scoreboard'),
        stats: document.getElementById('player-stats'),
        actionBar: document.getElementById('action-bar'),
        timingCursor: document.getElementById('timing-cursor'),
        controlText: document.getElementById('control-text')
    };

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
        const right = new Vec3(0, 1, 0).cross(forward).norm();
        const up = forward.cross(right).norm();
        const d = pos.sub(camPos);
        const cx = d.dot(right), cy = d.dot(up), cz = d.dot(forward);
        if (cz <= 0.1) return null;
        const scale = (height / 2) / Math.tan((fov * Math.PI / 180) / 2);
        return { x: (width / 2) + (cx / cz) * scale, y: (height / 2) - (cy / cz) * scale, depth: cz, scale: scale / cz };
    }

    // --- Physics & Entities ---
    class Ball {
        constructor() {
            this.pos = new Vec3(0, 0, -10);
            this.vel = new Vec3(0, 0, 0);
            this.spin = new Vec3(0, 0, 0);
            this.radius = 0.04;
            this.active = false;
            this.state = 'idle';
            this.gravity = -9.81;
            this.dragCoeff = 0.0015;
            this.magnusCoeff = 0.0008;
            this.restitution = 0.55;
        }
        reset() {
            this.pos = new Vec3(0, 0, -10); this.vel = new Vec3(0, 0, 0); this.spin = new Vec3(0, 0, 0);
            this.active = false; this.state = 'idle';
        }
        bowl(speedKmh, line, length, spinType) {
            this.pos = new Vec3(line, 2.0, -10);

            const targetZ = -10 + length * 6 + 2;
            const dz = targetZ - this.pos.z;

            const speedMs = speedKmh / 3.6;
            const timeToPitch = Math.abs(dz) / speedMs;

            this.vel.z = dz / timeToPitch;

            const g = 9.81;
            this.vel.y = (0.5 * g * timeToPitch * timeToPitch - 2.0) / timeToPitch;

            if (spinType === 'swing') this.vel.x = line * 0.5;
            this.active = true;
            this.state = 'bowled';
        }
        update(dt) {
            if (!this.active) return;
            this.vel.y += this.gravity * dt;
            if (this.spin.len() > 0) {
                const magnus = this.spin.cross(this.vel).mul(this.magnusCoeff);
                this.vel = this.vel.add(magnus.mul(dt));
            }
            const speed = this.vel.len();
            if (speed > 0) {
                const drag = this.vel.norm().mul(-this.dragCoeff * speed * speed);
                this.vel = this.vel.add(drag.mul(dt));
            }
            this.pos = this.pos.add(this.vel.mul(dt));

            if (this.pos.y <= 0 && this.vel.y < 0 && this.pos.z >= -10 && this.pos.z <= 10) {
                this.pos.y = 0;
                this.vel.y = -this.vel.y * this.restitution;
                this.vel.x *= 0.75;
                this.vel.z *= 0.95;
                if (this.state === 'bowled') this.state = 'bounced';
            }
        }
        hitBat(aimVector, power) {
            this.state = 'hit';
            this.vel = aimVector.norm().mul(power);
            this.vel.y = power * 0.4 + Math.random() * 2;
            this.spin = new Vec3(0, 0, 0);
        }
    }

    class Camera {
        constructor() {
            this.pos = new Vec3(0, 5, -12);
            this.target = new Vec3(0, 0, 0);
            this.desPos = new Vec3(0, 5, -12);
            this.desTarget = new Vec3(0, 0, 0);
            this.presets = {
                BOWLER: { pos: new Vec3(0, 3, -12), target: new Vec3(0, 1, 10) },
                BATSMAN: { pos: new Vec3(0, 3, 12), target: new Vec3(0, 1, -10) },
                BROADCAST: { pos: new Vec3(30, 20, 0), target: new Vec3(0, 0, 0) },
                SPIDER: { pos: new Vec3(0, 35, 0), target: new Vec3(0, 0, 0) },
                CATCH: { pos: new Vec3(0, 5, -20), target: new Vec3(0, 0, 0) }
            };
        }
        setMode(mode, targetPos) {
            if (mode === 'BALL' && targetPos) {
                this.desTarget = targetPos;
            } else if (this.presets[mode]) {
                this.desPos = this.presets[mode].pos;
                this.desTarget = this.presets[mode].target;
            }
        }
        update(dt) {
            this.pos = this.pos.lerp(this.desPos, dt * 3.5);
            this.target = this.target.lerp(this.desTarget, dt * 3.5);
        }
    }

    class Renderer {
        constructor() {
            this.colors = {
                DAY: { sky1: '#4facfe', sky2: '#00f2fe', grass: '#2c5e1a', pitch: '#d4b872' },
                DUSK: { sky1: '#ff7e5f', sky2: '#feb47b', grass: '#1e3a10', pitch: '#b09050' },
                NIGHT: { sky1: '#0f2027', sky2: '#203a43', grass: '#112a0a', pitch: '#806a3a' }
            };
        }
        resize() {
            canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
        }
        clear(weather) {
            const c = this.colors[weather] || this.colors.DAY;
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, c.sky1); grad.addColorStop(1, c.sky2);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        drawField(camPos, camTarget, weather) {
            const c = this.colors[weather] || this.colors.DAY;
            const center = project(new Vec3(0, 0, 0), camPos, camTarget, 60, canvas.width, canvas.height);
            const edge = project(new Vec3(70, 0, 0), camPos, camTarget, 60, canvas.width, canvas.height);

            if (center && edge) {
                const radius = Math.abs(edge.x - center.x);
                ctx.fillStyle = c.grass;
                ctx.beginPath(); ctx.ellipse(center.x, center.y, radius, radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            }

            const p1 = project(new Vec3(-1.5, 0, -10), camPos, camTarget, 60, canvas.width, canvas.height);
            const p2 = project(new Vec3(1.5, 0, -10), camPos, camTarget, 60, canvas.width, canvas.height);
            const p3 = project(new Vec3(1.5, 0, 10), camPos, camTarget, 60, canvas.width, canvas.height);
            const p4 = project(new Vec3(-1.5, 0, 10), camPos, camTarget, 60, canvas.width, canvas.height);

            if (p1 && p2 && p3 && p4) {
                ctx.fillStyle = c.pitch;
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            }
        }
        drawPlayer(pos, color, isKeeper) {
            const bot = project(pos, camera.pos, camera.target, 60, canvas.width, canvas.height);
            const top = project(pos.add(new Vec3(0, 1.8, 0)), camera.pos, camera.target, 60, canvas.width, canvas.height);
            if (bot && top) {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.ellipse(bot.x, bot.y, 15 * bot.scale, 5 * bot.scale, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.moveTo(bot.x - 10 * bot.scale, bot.y); ctx.lineTo(bot.x + 10 * bot.scale, bot.y);
                ctx.lineTo(top.x + 8 * top.scale, top.y); ctx.lineTo(top.x - 8 * top.scale, top.y); ctx.fill();
                ctx.beginPath(); ctx.arc(top.x, top.y - 5 * top.scale, 6 * top.scale, 0, Math.PI * 2); ctx.fill();
                if (isKeeper) {
                    ctx.fillStyle = '#aaa';
                    ctx.beginPath(); ctx.arc(top.x, top.y - 5 * top.scale, 7 * top.scale, 0, Math.PI * 2); ctx.stroke();
                }
            }
        }
        drawBall(ball) {
            const sp = project(ball.pos, camera.pos, camera.target, 60, canvas.width, canvas.height);
            if (sp) {
                const r = Math.max(2, ball.radius * sp.scale);
                const sh = project(new Vec3(ball.pos.x, 0, ball.pos.z), camera.pos, camera.target, 60, canvas.width, canvas.height);
                if (sh) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 2, r, 0, 0, Math.PI * 2); ctx.fill(); }
                const grad = ctx.createRadialGradient(sp.x - r/3, sp.y - r/3, r/4, sp.x, sp.y, r);
                grad.addColorStop(0, '#ff6b6b'); grad.addColorStop(1, '#b00000');
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    // --- Main Game State ---
    const renderer = new Renderer();
    const camera = new Camera();
    const ball = new Ball();

    let weather = 'DAY';
    let gameState = 'MENU';
    let matchMode = 'T20';
    let currentInning = 1;
    let score = { team1: { runs: 0, wkts: 0, balls: 0 }, team2: { runs: 0, wkts: 0, balls: 0 } };
    let currentTeam = 1;
    let target = 0;
    let aiHasSwung = false;

    const fielders = [
        { pos: new Vec3(20, 0, -30), team: 2 },
        { pos: new Vec3(-30, 0, 20), team: 2 },
        { pos: new Vec3(40, 0, 10), team: 2 },
        { pos: new Vec3(-15, 0, -40), team: 2 },
        { pos: new Vec3(10, 0, 45), team: 2 }
    ];

    const TEAMS = [
        { id: 'SL', name: 'Sri Lanka', flag: '&#x1F1F1;&#x1F1F0;', color: '#0039a6' },
        { id: 'IN', name: 'India', flag: '&#x1F1EE;&#x1F1F3;', color: '#1a4fa0' },
        { id: 'AUS', name: 'Australia', flag: '&#x1F1E6;&#x1F1FA;', color: '#0a6b3a' },
        { id: 'ENG', name: 'England', flag: '&#x1F1EC;&#x1F1E7;', color: '#002f6c' }
    ];

    // --- Setup UI ---
    const team1Sel = document.getElementById('team1-select');
    const team2Sel = document.getElementById('team2-select');
    TEAMS.forEach(function(t, i) {
        team1Sel.innerHTML += '<option value="' + i + '">' + t.flag + ' ' + t.name + '</option>';
        team2Sel.innerHTML += '<option value="' + i + '">' + t.flag + ' ' + t.name + '</option>';
    });
    team2Sel.selectedIndex = 1;

    document.querySelectorAll('#mode-select .btn').forEach(function(b) {
        b.onclick = function() { document.querySelectorAll('#mode-select .btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); matchMode = b.dataset.mode; };
    });
    document.querySelectorAll('#weather-select .btn').forEach(function(b) {
        b.onclick = function() { document.querySelectorAll('#weather-select .btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); weather = b.dataset.weather; };
    });

    document.getElementById('start-btn').onclick = function() {
        ui.menu.classList.add('hidden');
        ui.toss.classList.remove('hidden');
        gameState = 'TOSS';
        document.getElementById('team1-flag').innerHTML = TEAMS[team1Sel.value].flag;
        document.getElementById('team1-name').innerText = TEAMS[team1Sel.value].id;
        document.getElementById('team2-flag').innerHTML = TEAMS[team2Sel.value].flag;
        document.getElementById('team2-name').innerText = TEAMS[team2Sel.value].id;

        setTimeout(function() {
            document.getElementById('toss-result').innerText = 'You won the toss!';
            document.getElementById('toss-choices').classList.remove('hidden');
        }, 2000);
    };

    document.getElementById('bat-btn').onclick = function() { startMatch(true); };
    document.getElementById('bowl-btn').onclick = function() { startMatch(false); };

    function startMatch(batFirst) {
        ui.toss.classList.add('hidden');
        ui.scoreboard.classList.remove('hidden');
        ui.stats.classList.remove('hidden');
        ui.actionBar.classList.remove('hidden');
        gameState = 'PLAY';
        currentInning = 1;
        currentTeam = batFirst ? 1 : 2;
        score = { team1: { runs: 0, wkts: 0, balls: 0 }, team2: { runs: 0, wkts: 0, balls: 0 } };
        updateUI();
        nextDelivery();
    }

    function updateUI() {
        document.getElementById('team1-score').innerText = score.team1.runs + '/' + score.team1.wkts;
        document.getElementById('team2-score').innerText = currentInning === 2 ? (score.team2.runs + '/' + score.team2.wkts) : '-';
        var balls = score['team' + currentTeam].balls;
        document.getElementById('match-overs').innerText = Math.floor(balls / 6) + '.' + (balls % 6) + ' / ' + (matchMode === 'T20' ? 20 : 50);
        document.getElementById('batsman-runs').innerText = score['team' + currentTeam].runs + ' (' + balls + ')';
    }

    // --- Core Game Loop Logic ---
    var timingActive = false, timingValue = 0, timingDir = 1;

    function nextDelivery() {
        ball.reset();
        aiHasSwung = false;
        camera.setMode(currentTeam === 1 ? 'BOWLER' : 'BATSMAN');

        setTimeout(function() {
            if (gameState !== 'PLAY') return;
            ball.bowl(120 + Math.random() * 25, (Math.random() - 0.5) * 2, Math.random() * 2 + 1, 'none');

            if (currentTeam === 1) {
                timingActive = true; timingValue = 0; timingDir = 1;
                ui.controlText.innerText = 'Press SPACE to swing';
            } else {
                ui.controlText.innerText = 'You are bowling...';
            }
        }, 1500);
    }

    function swingBat() {
        if (!timingActive) return;
        timingActive = false;

        if (timingValue >= 40 && timingValue <= 60) {
            var aim = new Vec3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
            ball.hitBat(aim, 35);
            camera.setMode('BALL', ball.pos);
            ui.controlText.innerText = 'GREAT SHOT!';
        } else if (timingValue >= 30 && timingValue <= 70) {
            var aim2 = new Vec3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30);
            ball.hitBat(aim2, 20);
            camera.setMode('BALL', ball.pos);
            ui.controlText.innerText = 'Good connection';
        } else {
            ui.controlText.innerText = 'MISSED!';
        }
    }

    function handleWicket(type) {
        if (!ball.active) return;
        ball.active = false;
        timingActive = false;
        score['team' + currentTeam].wkts++;
        score['team' + currentTeam].balls++;
        updateUI();
        ui.controlText.innerText = 'OUT! ' + type.toUpperCase();
        camera.setMode('BROADCAST');

        setTimeout(function() {
            if (gameState !== 'PLAY') return;
            if (score['team' + currentTeam].wkts >= 10 || score['team' + currentTeam].balls >= (matchMode === 'T20' ? 120 : 300)) endInnings();
            else nextDelivery();
        }, 3000);
    }

    function handleRuns(runs, type) {
        if (!ball.active) return;
        ball.active = false;
        timingActive = false;
        score['team' + currentTeam].runs += runs;
        score['team' + currentTeam].balls++;
        updateUI();

        if (type === '6') camera.setMode('SPIDER');
        else if (type === '4') camera.setMode('BROADCAST');

        ui.controlText.innerText = type === '6' ? 'SIX!' : (type === '4' ? 'FOUR!' : runs + ' Runs');

        setTimeout(function() {
            if (gameState !== 'PLAY') return;
            if (score['team' + currentTeam].balls >= (matchMode === 'T20' ? 120 : 300)) endInnings();
            else nextDelivery();
        }, 3000);
    }

    function handleDotBall() {
        if (!ball.active) return;
        ball.active = false;
        timingActive = false;
        score['team' + currentTeam].balls++;
        updateUI();
        ui.controlText.innerText = 'Dot Ball';

        setTimeout(function() {
            if (gameState !== 'PLAY') return;
            if (score['team' + currentTeam].balls >= (matchMode === 'T20' ? 120 : 300)) endInnings();
            else nextDelivery();
        }, 1500);
    }

    function endInnings() {
        if (currentInning === 1) {
            currentInning = 2;
            target = score.team1.runs + 1;
            currentTeam = 2;
            updateUI();
            nextDelivery();
        } else {
            gameState = 'RESULT';
            ui.actionBar.classList.add('hidden');
            document.getElementById('result-screen').classList.remove('hidden');
            var s1 = score.team1.runs, s2 = score.team2.runs;
            var text = s2 >= target ? (TEAMS[team2Sel.value].name + ' won by wickets!') : (s1 > s2 ? (TEAMS[team1Sel.value].name + ' won by runs!') : 'Match Tied!');
            document.getElementById('result-text').innerText = text;
        }
    }

    document.getElementById('replay-btn').onclick = function() {
        ui.result.classList.add('hidden');
        ui.scoreboard.classList.add('hidden');
        ui.stats.classList.add('hidden');
        ui.menu.classList.remove('hidden');
        gameState = 'MENU';
    };

    // --- Input Handlers ---
    window.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && gameState === 'PLAY' && ball.active && (ball.state === 'bowled' || ball.state === 'bounced')) swingBat();
    });
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameState === 'PLAY' && ball.active && (ball.state === 'bowled' || ball.state === 'bounced')) swingBat();
    });

    // --- Engine Loop ---
    var lastTime = performance.now();
    function gameLoop(time) {
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        if (gameState === 'PLAY') {
            ball.update(dt);

            if (timingActive) {
                timingValue += timingDir * 150 * dt;
                if (timingValue >= 100) { timingValue = 100; timingDir = -1; }
                if (timingValue <= 0) { timingValue = 0; timingDir = 1; }
                ui.timingCursor.style.left = timingValue + '%';
            }

            // AI Batsman Logic
            if (currentTeam === 2 && ball.active && ball.state === 'bowled' && ball.pos.z > 5 && !aiHasSwung) {
                aiHasSwung = true;
                if (Math.random() > 0.15) {
                    var aim = new Vec3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30);
                    ball.hitBat(aim, 25);
                    camera.setMode('BALL', ball.pos);
                }
            }

            // Check for bowled
            if (ball.active && (ball.state === 'bowled' || ball.state === 'bounced') && ball.pos.z > 10 && ball.pos.y < 1.5 && Math.abs(ball.pos.x) < 1.5) {
                handleWicket('bowled');
            }

            // Check for catch
            if (ball.active && ball.state === 'hit') {
                for (var i = 0; i < fielders.length; i++) {
                    var f = fielders[i];
                    if (ball.pos.dist(f.pos) < 3.0 && ball.pos.y < 2 && ball.vel.y < 0) {
                        handleWicket('caught');
                        break;
                    }
                }
            }

            // Check for boundary / runs
            if (ball.active && ball.state === 'hit') {
                var dist = Math.sqrt(ball.pos.x * ball.pos.x + ball.pos.z * ball.pos.z);
                if (dist > 60) {
                    handleRuns(ball.pos.y > 2 ? 6 : 4, ball.pos.y > 2 ? '6' : '4');
                } else if (ball.pos.y < 0.5 && ball.vel.len() < 2) {
                    handleRuns(1, '1');
                }
            }

            // Check for dot ball (missed and passed keeper)
            if (ball.active && ball.state === 'bowled' && ball.pos.z > 12) {
                handleDotBall();
            }
        }

        camera.update(dt);
        renderer.clear(weather);
        renderer.drawField(camera.pos, camera.target, weather);

        fielders.forEach(function(f) { renderer.drawPlayer(f.pos, TEAMS[team2Sel.value].color); });
        renderer.drawPlayer(new Vec3(0, 0, -10), TEAMS[team2Sel.value].color);
        renderer.drawPlayer(new Vec3(0, 0, 10), TEAMS[team1Sel.value].color, true);

        if (ball.active) renderer.drawBall(ball);

        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('resize', function() { renderer.resize(); });
    renderer.resize();
    requestAnimationFrame(gameLoop);
})();
