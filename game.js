/**
 * BRASILEIRÃO PENALTY CHALLENGE - PRECISION EDITION
 * - Retículo Dinâmico (Precision Aim)
 * - Barra de Força (80% Optimal)
 * - Alternância de Turnos
 * - Dica do Goleiro (Friv Dot)
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
    screen: 'menu',
    team: null, rival: null,
    score: { p: 0, ai: 0 },
    turn: 'player', // player, ai
    round: 1, stage: 0, // 0-3 (Oitavas-Final)
    
    gameState: 'idle', // idle, osc, charging, flying, result
    
    // Physics / Aim
    aimX: 500, aimY: 300,
    aimSpd: 0.04, aimTime: 0,
    power: 0, powerDir: 1,
    
    ball: { x: 500, y: 530, tx: 500, ty: 300 },
    gk: { x: 500, y: 220, tx: 500, anim: 'idle' },
    
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1000;
canvas.height = 600;

const reticle = document.getElementById('aim-reticle');
const hint = document.getElementById('ai-hint');

// Preload Icons
const assets = { shields: {} };
function preload() {
    TEAMS.forEach(t => {
        const i = new Image();
        i.src = `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}&backgroundColor=${t.color.substring(1)}`;
        assets.shields[t.id] = i;
    });
}

function nav(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-screen').classList.add('active');
    state.screen = id;
    if (id === 'selection') renderSelection();
}

function renderSelection() {
    const g = document.getElementById('teams-grid');
    g.innerHTML = '';
    TEAMS.forEach(t => {
        const c = document.createElement('div');
        c.className = 'team-card';
        c.innerHTML = `<img src="${assets.shields[t.id].src}" style="width:40px"><span style="font-size:0.7rem">${t.name}</span>`;
        c.onclick = () => {
            document.querySelectorAll('.team-card').forEach(x => x.classList.remove('selected'));
            c.classList.add('selected');
            state.team = t;
            document.getElementById('start-btn').disabled = false;
        };
        g.appendChild(c);
    });
}

function initGame() {
    state.stage = 0;
    state.score = { p: 0, ai: 0 };
    nextMatch();
    nav('game');
    requestAnimationFrame(gameLoop);
}

function nextMatch() {
    const pool = TEAMS.filter(t => t.id !== state.team.id);
    state.rival = pool[Math.floor(Math.random() * pool.length)];
    state.round = 1;
    state.turn = 'player';
    
    document.getElementById('p-logo').src = assets.shields[state.team.id].src;
    document.getElementById('ai-logo').src = assets.shields[state.rival.id].src;
    document.getElementById('stage-label').innerText = ["OITAVAS", "QUARTAS", "SEMIFINAL", "GRANDE FINAL"][state.stage];
    
    resetTurn();
}

function resetTurn() {
    state.gameState = 'idle';
    state.power = 0;
    state.aimTime = 0;
    state.ball = { x: 500, y: 530 };
    state.gk = { x: 500, y: 220, tx: 500 };
    
    reticle.style.display = (state.turn === 'player') ? 'block' : 'none';
    hint.style.display = 'none';
    document.getElementById('game-msg').innerText = (state.turn === 'player') ? "SUA VEZ DE BATER" : "IA VAI BATER - FIQUE ATENTO";
    updateHUD();
}

function updateHUD() {
    document.getElementById('p-goals').innerText = state.score.p;
    document.getElementById('ai-goals').innerText = state.score.ai;
    document.getElementById('power-bar-fill').style.width = state.power + "%";
}

window.addEventListener('keydown', e => { if (state.keys.hasOwnProperty(e.code)) state.keys[e.code] = true; });
window.addEventListener('keyup', e => { if (state.keys.hasOwnProperty(e.code)) state.keys[e.code] = false; });

function update() {
    if (state.screen !== 'game' || state.gameState === 'flying' || state.gameState === 'result') return;

    if (state.turn === 'player') {
        // MIRA OSCILANTE (PRECISION TARGET)
        state.aimTime += 0.04 + (state.stage * 0.01);
        let base_x = 500 + Math.sin(state.aimTime) * 250;
        let base_y = 220 + Math.cos(state.aimTime * 1.5) * 80;

        // Controle Manual das Setas
        if (state.keys.ArrowLeft) state.aimX -= 5;
        if (state.keys.ArrowRight) state.aimX += 5;
        if (state.keys.ArrowUp) state.aimY -= 5;
        if (state.keys.ArrowDown) state.aimY += 5;

        // Se não tiver setas pressionadas, segue o padrão
        if (!state.keys.ArrowLeft && !state.keys.ArrowRight && !state.keys.ArrowUp && !state.keys.ArrowDown) {
            state.aimX = base_x; state.aimY = base_y;
        }

        // Clamp da mira
        state.aimX = Math.max(250, Math.min(750, state.aimX));
        state.aimY = Math.max(160, Math.min(320, state.aimY));

        reticle.style.left = (state.aimX - 20) + "px";
        reticle.style.top = (state.aimY - 20) + "px";

        // Charging Power
        if (state.keys.Space || state.keys.ArrowUp) {
            state.gameState = 'charging';
            state.power += 1.5;
            if (state.power > 100) state.power = 100;
            updateHUD();
        } else if (state.gameState === 'charging') {
            kick();
        }
    } else {
        // IA BATE - JOGADOR NO GOL
        if (state.gameState === 'idle') {
            state.gameState = 'osc';
            setTimeout(() => {
                // Dica do Friv (Hint Dot)
                const tx = 300 + Math.random() * 400;
                const ty = 180 + Math.random() * 120;
                hint.style.left = (tx - 4) + "px";
                hint.style.top = (ty - 4) + "px";
                hint.style.display = 'block';
                
                setTimeout(() => { kick(tx, ty); }, 600);
            }, 1200);
        }

        // Movimentação do Goleiro
        const gkSpd = 8;
        if (state.keys.ArrowLeft) state.gk.x -= gkSpd;
        if (state.keys.ArrowRight) state.gk.x += gkSpd;
        state.gk.x = Math.max(300, Math.min(700, state.gk.x));
    }
}

function kick(targetX, targetY) {
    state.gameState = 'flying';
    reticle.style.display = 'none';
    hint.style.display = 'none';

    let tx = targetX || state.aimX;
    let ty = targetY || state.aimY;

    // Power Penalties (If too high, ball goes up)
    if (state.turn === 'player' && state.power > 90) ty -= 80;

    // Wind Effect (Final Only)
    if (state.stage === 3) tx += 40; 

    // IA GK Reaction
    if (state.turn === 'player') {
        const diff = [0.4, 0.6, 0.8, 0.95][state.stage];
        state.gk.tx = (Math.random() < diff) ? tx : (Math.random() > 0.5 ? 200 : 800);
    }

    const duration = 600;
    const startX = state.ball.x;
    const startY = state.ball.y;
    const startTime = performance.now();

    function animate(now) {
        const t = Math.min((now - startTime) / duration, 1);
        state.ball.x = startX + (tx - startX) * t;
        state.ball.y = startY + (ty - startY) * t;
        
        // GK Move
        if (state.turn === 'player') state.gk.x += (state.gk.tx - state.gk.x) * 0.1;

        if (t < 1) requestAnimationFrame(animate);
        else resolveOutcome(tx, ty);
    }
    requestAnimationFrame(animate);
}

function resolveOutcome(tx, ty) {
    state.gameState = 'result';
    const inGoal = (tx > 300 && tx < 700 && ty > 150 && ty < 280);
    const saved = Math.abs(tx - state.gk.x) < 60 && Math.abs(ty - state.gk.y) < 60;

    let res = "ERROU";
    if (saved) res = "DEFENDEU!";
    else if (inGoal) {
        res = "GOL!";
        if (state.turn === 'player') state.score.p++;
        else state.score.ai++;
    } else res = "FORA!";

    document.getElementById('game-msg').innerText = res;
    updateHUD();

    setTimeout(() => {
        if (state.turn === 'player') state.turn = 'ai';
        else { state.turn = 'player'; state.round++; }

        if (state.round > 5) {
            if (state.score.p !== state.score.ai) applyWinner();
            // Else Sudden Death continues implicitly
        }
        resetTurn();
    }, 1500);
}

function applyWinner() {
    if (state.score.p > state.score.ai) {
        state.stage++;
        if (state.stage > 3) {
            nav('final');
            document.getElementById('winner-img').src = assets.shields[state.team.id].src;
        } else {
            alert("VOCÊ AVANÇOU!");
            nextMatch();
        }
    } else {
        alert("DERROTA! Fim de campeonato.");
        location.reload();
    }
}

function draw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);

    // GRAMADO
    ctx.fillStyle = '#081a0e';
    ctx.fillRect(0, 480, 1000, 120);
    ctx.fillStyle = '#030406';
    ctx.fillRect(0, 0, 1000, 480);

    // GOL
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.strokeRect(300, 150, 400, 130);
    // Rede Estilo Friv
    ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
    for(let i=300; i<=700; i+=20) { ctx.beginPath(); ctx.moveTo(i, 150); ctx.lineTo(i, 280); ctx.stroke(); }
    for(let i=150; i<=280; i+=20) { ctx.beginPath(); ctx.moveTo(300, i); ctx.lineTo(700, i); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // ESCUDO NO CHÃO
    if (state.team && assets.shields[state.team.id]) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.drawImage(assets.shields[state.team.id], 475, 500, 50, 50);
        ctx.restore();
    }

    // GOLEIRO
    ctx.fillStyle = '#222';
    ctx.fillRect(state.gk.x - 25, state.gk.y - 35, 50, 70);

    // BOLA
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
    ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function gameLoop() {
    update();
    draw();
    if (state.screen === 'game') requestAnimationFrame(gameLoop);
}

preload();
