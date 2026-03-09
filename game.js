/**
 * BRASILEIRÃO PENALTY & GLORY - MASTER CORE
 * 
 * PROTOCOLOS ZERO-ERROR:
 * - Windowed Center 1280x720
 * - Hybrid Input Tracking
 * - Alternate Shootout Logic
 * - Dynamic Weather & Pro-Logic AI
 */

const TEAMS = [
    { id: 'palmeiras', name: 'Palmeiras', color: '#006437' },
    { id: 'flamengo', name: 'Flamengo', color: '#c20000' },
    { id: 'gremio', name: 'Grêmio', color: '#00adef' },
    { id: 'atletico-mg', name: 'Atlético-MG', color: '#000000' },
    { id: 'botafogo', name: 'Botafogo', color: '#000000' },
    { id: 'bragantino', name: 'Bragantino', color: '#ffffff' },
    { id: 'fluminense', name: 'Fluminense', color: '#8b0000' },
    { id: 'athletico-pr', name: 'Athletico-PR', color: '#ff0000' },
    { id: 'internacional', name: 'Internacional', color: '#ff0000' },
    { id: 'fortaleza', name: 'Fortaleza', color: '#1a3c8a' },
    { id: 'sao-paulo', name: 'São Paulo', color: '#ff0000' },
    { id: 'cuiaba', name: 'Cuiabá', color: '#006400' },
    { id: 'corinthians', name: 'Corinthians', color: '#000000' },
    { id: 'cruzeiro', name: 'Cruzeiro', color: '#0000ff' },
    { id: 'vasco', name: 'Vasco', color: '#000000' },
    { id: 'bahia', name: 'Bahia', color: '#0000ff' },
    { id: 'vitoria', name: 'Vitória', color: '#ff0000' },
    { id: 'juventude', name: 'Juventude', color: '#ffffff' },
    { id: 'atletico-go', name: 'Atlético-GO', color: '#ff0000' },
    { id: 'criciuma', name: 'Criciúma', color: '#ffff00' }
];

const state = {
    screen: 'main-menu',
    playerTeam: null,
    aiTeam: null,
    round: 0, // 0-3
    score: { player: 0, ai: 0 },
    currentTurn: 'player_kick', // player_kick, ai_kick, player_gk, ai_gk
    shotsInTurn: 0, // max 5 per side
    isSuddenDeath: false,
    confidence: 0,
    gameState: 'idle', // idle, preparing, running, flying, result
    weather: 'clear', // clear, rain, fog
    
    // Positions
    shotPower: 0,
    shotAngle: 0,
    kickerPos: { x: 400, y: 600 },
    ballPos: { x: 400, y: 550 },
    ballVel: { x: 0, y: 0 },
    gkPos: { x: 400, y: 250, targetX: 400, state: 'idle' },
    
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, ShiftLeft: false }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 700;

const assets = { shields: {}, audio: null };

function initZeroError() {
    window.focus();
    // Preload shields
    TEAMS.forEach(t => {
        const img = new Image();
        img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}&backgroundColor=${t.color.substring(1)}`;
        img.onload = () => assets.shields[t.id] = img;
    });
    document.getElementById('init-check').innerText = "Protocolos Master Ativos: 100%";
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
    state.screen = id;
    if (id === 'team-selection') renderTeams();
}

function renderTeams() {
    const grid = document.getElementById('teams-grid');
    grid.innerHTML = '';
    TEAMS.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `<img src="https://api.dicebear.com/7.x/initials/svg?seed=${team.name}&backgroundColor=${team.color.substring(1)}" style="width:60px"><span>${team.name}</span>`;
        card.onclick = () => {
            document.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.playerTeam = team;
            document.getElementById('start-btn').disabled = false;
        };
        grid.appendChild(card);
    });
}

document.getElementById('start-btn').onclick = () => {
    state.round = 0;
    startMatch();
};

function startMatch() {
    const others = TEAMS.filter(t => t.id !== state.playerTeam.id);
    state.aiTeam = others[Math.floor(Math.random() * others.length)];
    state.score = { player: 0, ai: 0 };
    state.shotsInTurn = 0;
    state.currentTurn = 'player_kick';
    state.confidence = 0;
    state.isSuddenDeath = false;
    
    // Weather logic
    state.weather = state.round >= 2 ? (Math.random() > 0.5 ? 'rain' : 'fog') : 'clear';
    updateWeatherUI();
    
    document.getElementById('team-logo-hud').src = assets.shields[state.playerTeam.id]?.src || "";
    const phases = ["OITAVAS", "QUARTAS", "SEMIFINAL", "GRANDE FINAL"];
    document.getElementById('match-phase').innerText = phases[state.round];
    
    updateHUD();
    showScreen('game-screen');
    resetArena();
    requestAnimationFrame(gameLoop);
}

function updateWeatherUI() {
    const w = document.getElementById('weather-effect');
    w.className = state.weather === 'rain' ? 'rain' : (state.weather === 'fog' ? 'fog' : '');
}

function updateHUD() {
    document.getElementById('player-score').innerText = state.score.player;
    document.getElementById('ai-score').innerText = state.score.ai;
    document.getElementById('confidence-bar').style.width = state.confidence + "%";
    document.getElementById('mode-hint').innerText = state.currentTurn.includes('kick') ? "VOCÊ É O BATEDOR" : "VOCÊ É O GOLEIRO";
}

function resetArena() {
    state.gameState = 'idle';
    state.shotPower = 0;
    state.shotAngle = 0;
    state.kickerPos = { x: 400, y: 600 };
    state.ballPos = { x: 400, y: 550 };
    state.gkPos = { x: 400, y: 250, targetX: 400, state: 'idle', power: 0 };
    document.getElementById('status-display').innerText = "PREPARE-SE";
}

window.addEventListener('keydown', e => { if (state.keys.hasOwnProperty(e.code)) state.keys[e.code] = true; });
window.addEventListener('keyup', e => { if (state.keys.hasOwnProperty(e.code)) state.keys[e.code] = false; });

function update() {
    if (state.screen !== 'game-screen' || state.gameState === 'result') return;

    if (state.currentTurn === 'player_kick') {
        playerKickingLogic();
    } else if (state.currentTurn === 'ai_kick') {
        aiKickingLogic();
    } else if (state.currentTurn === 'player_gk') {
        playerGKLogic();
    }
}

function playerKickingLogic() {
    if (state.gameState === 'idle') {
        if (state.keys.ArrowDown) {
            state.kickerPos.y += 2;
            state.shotPower += 0.5;
            if (state.kickerPos.y > 680) state.kickerPos.y = 680;
        }
        if (state.keys.ArrowLeft) state.shotAngle -= 1;
        if (state.keys.ArrowRight) state.shotAngle += 1;
        
        if (state.keys.ArrowUp) {
            state.gameState = 'running';
        }
    }

    if (state.gameState === 'running') {
        state.kickerPos.y -= 6;
        if (state.kickerPos.y <= state.ballPos.y + 10) {
            executeKick('player');
        }
    }
}

function playerGKLogic() {
    const gk = state.gkPos;
    if (state.keys.ArrowLeft) gk.x -= 5;
    if (state.keys.ArrowRight) gk.x += 5;
    
    if (state.keys.ArrowUp) gk.state = 'high';
    else if (state.keys.ArrowDown) gk.state = 'low';
    else gk.state = 'idle';

    if (gk.x < 240) gk.x = 240;
    if (gk.x > 560) gk.x = 560;
}

function aiKickingLogic() {
    if (state.gameState === 'idle') {
        state.gameState = 'preparing';
        setTimeout(() => {
            state.gameState = 'running';
            // AI Direction based on difficulty
            state.shotAngle = (Math.random() - 0.5) * 60;
            state.shotPower = 40 + (Math.random() * 20);
        }, 1000);
    }
    
    if (state.gameState === 'running') {
        state.kickerPos.y -= 6;
        if (state.kickerPos.y <= state.ballPos.y + 10) {
            executeKick('ai');
        }
    }
}

function executeKick(attacker) {
    state.gameState = 'flying';
    
    let targetX = 400 + (state.shotAngle * 5);
    let targetY = 220; // Default height
    
    // Advanced Commands: Trivela & Cavadinha
    if (attacker === 'player') {
        if (state.keys.ShiftLeft) { // Trivela
            targetX += 100;
        }
        if (state.shotPower < 5) { // Cavadinha
            targetY = 180;
            targetX = 400;
        }
    }

    // AI GK Reaction (Pro-Logic)
    if (attacker === 'player') {
        const aiIQ = [0.4, 0.6, 0.8, 0.95][state.round];
        if (Math.random() < aiIQ) state.gkPos.targetX = targetX;
        else state.gkPos.targetX = 400 + (Math.random() - 0.5) * 300;
    }

    // Animation
    const duration = 800;
    const startPos = { ...state.ballPos };
    const startTime = performance.now();

    function ballAnimate(now) {
        const t = Math.min((now - startTime) / duration, 1);
        state.ballPos.x = startPos.x + (targetX - startPos.x) * t;
        state.ballPos.y = startPos.y + (targetX - startPos.y) * 0; // Curve logic if needed
        state.ballPos.y = startPos.y + (targetY - startPos.y) * t;
        
        // GK Move
        if (attacker === 'player') {
            state.gkPos.x += (state.gkPos.targetX - state.gkPos.x) * 0.1;
        }

        if (t < 1) requestAnimationFrame(ballAnimate);
        else resolveOutcome(targetX, targetY, attacker);
    }
    requestAnimationFrame(ballAnimate);
}

function resolveOutcome(tx, ty, attacker) {
    state.gameState = 'result';
    
    const isGoalArea = (tx > 220 && tx < 580 && ty > 150 && ty < 260);
    const dist = Math.abs(tx - state.gkPos.x);
    
    // Hitbox for GK
    let gkRange = 50;
    if (state.confidence >= 100) gkRange = 100; // Gloved up
    
    let outcome = "MISS";
    if (isGoalArea) {
        if (dist > gkRange) {
            outcome = "GOAL";
            if (attacker === 'player') {
                state.score.player++;
                state.confidence += 25;
            } else {
                state.score.ai++;
            }
        } else {
            outcome = "SAVE";
            if (attacker === 'ai') {
                state.confidence += 40; // Save boost
            }
        }
    }
    
    document.getElementById('status-display').innerText = outcome;
    updateHUD();
    
    setTimeout(() => {
        nextTurn();
    }, 1500);
}

function nextTurn() {
    state.shotsInTurn++;
    if (state.currentTurn === 'player_kick') state.currentTurn = 'player_gk';
    else state.currentTurn = 'player_kick';
    
    // Check match end (5 rounds or sudden death)
    if (state.shotsInTurn >= 10 || state.isSuddenDeath) {
        if (state.score.player !== state.score.ai) {
            endMatch();
            return;
        } else {
            state.isSuddenDeath = true;
        }
    }
    
    resetArena();
    updateHUD();
}

function endMatch() {
    if (state.score.player > state.score.ai) {
        state.round++;
        if (state.round > 3) {
            showScreen('victory-screen');
            document.getElementById('champion-shield').src = assets.shields[state.playerTeam.id].src;
        } else {
            alert("VOCÊ AVANÇOU!");
            startMatch();
        }
    } else {
        alert("DERROTA! Fim de linha.");
        showScreen('main-menu');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Stadium & Goal
    ctx.fillStyle = '#0a1a0f';
    ctx.fillRect(0, 500, 800, 200);
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, 800, 500);
    
    // The Net
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.strokeRect(220, 150, 360, 110);
    
    // Shield on Spot
    if (state.playerTeam && assets.shields[state.playerTeam.id]) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(assets.shields[state.playerTeam.id], 375, 545, 50, 50);
        ctx.restore();
    }
    
    // Goleiro
    const gkColor = state.confidence >= 100 && state.currentTurn === 'player_gk' ? '#00e5ff' : '#222';
    ctx.fillStyle = gkColor;
    ctx.fillRect(state.gkPos.x - 20, state.gkPos.y - 40, 40, 80);
    
    // Ball
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
    ctx.arc(state.ballPos.x, state.ballPos.y, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Kicker (Boot)
    if (state.gameState !== 'flying') {
        ctx.save();
        ctx.translate(state.kickerPos.x, state.kickerPos.y);
        ctx.fillStyle = state.playerTeam?.color || '#fff';
        ctx.fillRect(-15, -10, 30, 60);
        ctx.restore();
    }
}

function gameLoop() {
    update();
    draw();
    if (state.screen === 'game-screen') requestAnimationFrame(gameLoop);
}

initZeroError();
