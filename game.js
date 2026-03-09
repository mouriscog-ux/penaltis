/**
 * PENALTY GLORY - KILLER EDITION (RESGATE)
 * 
 * ESPECIFICAÇÕES:
 * - Mira Oscilante (Dynamic Aim)
 * - Alternância Automática (Eu -> IA -> Eu)
 * - Visão Frontal p/ Goleiro
 * - Morte Súbita
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
    score: { player: 0, ai: 0 },
    turn: 'player', // player, ai
    round: 1, // max 5
    isSuddenDeath: false,
    gameState: 'idle', // idle, osc, kick, result
    
    // Physics / Aim
    aimX: 400,
    aimY: 250,
    aimOsc: 0, 
    gkX: 400,
    gkTargetX: 400,
    gkAnim: 'idle',
    ballPos: { x: 400, y: 440 },
    ballTarget: { x: 400, y: 250 },
    
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 500;

const assets = { shields: {} };

// Carregamento Imediato Dicebear (Seguro)
function loadDirectAssets() {
    TEAMS.forEach(t => {
        const img = new Image();
        img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}&backgroundColor=${t.color.substring(1)}`;
        assets.shields[t.id] = img;
    });
}

function changeScreen(id) {
    document.querySelectorAll('.active-screen, .hidden-screen').forEach(s => {
        s.className = 'hidden-screen';
    });
    document.getElementById(id).className = 'active-screen';
    state.screen = id;
    if (id === 'team-selection') renderTeams();
}

function renderTeams() {
    const grid = document.getElementById('teams-grid');
    grid.innerHTML = '';
    TEAMS.forEach(t => {
        const c = document.createElement('div');
        c.className = 'team-card';
        c.innerHTML = `<img src="${assets.shields[t.id].src}" class="team-icon"> <span class="team-name">${t.name}</span>`;
        c.onclick = () => {
            document.querySelectorAll('.team-card').forEach(x => x.classList.remove('selected'));
            c.classList.add('selected');
            state.playerTeam = t;
            document.getElementById('start-btn').disabled = false;
        };
        grid.appendChild(c);
    });
}

function startGame() {
    const others = TEAMS.filter(x => x.id !== state.playerTeam.id);
    state.aiTeam = others[Math.floor(Math.random() * others.length)];
    state.score = { player: 0, ai: 0 };
    state.round = 1;
    state.turn = 'player';
    state.isSuddenDeath = false;
    
    changeScreen('game-screen');
    startTurn();
    requestAnimationFrame(gameLoop);
}

function startTurn() {
    state.gameState = 'idle';
    state.aimOsc = 0;
    state.ballPos = { x: 400, y: 440 };
    state.gkX = 400;
    state.gkAnim = 'idle';
    
    document.getElementById('turn-indicator').innerText = (state.turn === 'player') ? "VOCÊ BATE" : "IA BATE - PULE!";
    document.getElementById('action-msg').innerText = "PREPARE-SE";
    document.getElementById('shots-left').innerText = `ROUND: ${state.round}/5 ${state.isSuddenDeath ? '(MORTE SÚBITA)' : ''}`;
    updateScoreUI();
}

function updateScoreUI() {
    document.getElementById('p-score').innerText = state.score.player;
    document.getElementById('ai-score').innerText = state.score.ai;
}

window.addEventListener('keydown', e => { 
    const k = e.code.replace('Key', '');
    if (state.keys.hasOwnProperty(k)) state.keys[k] = true;
});
window.addEventListener('keyup', e => { 
    const k = e.code.replace('Key', '');
    if (state.keys.hasOwnProperty(k)) state.keys[k] = false;
});

function update() {
    if (state.screen !== 'game-screen' || state.gameState === 'result' || state.gameState === 'kick') return;

    if (state.turn === 'player') {
        // MIRA OSCILANTE
        state.aimOsc += 0.05;
        state.aimX = 400 + Math.sin(state.aimOsc) * 200;
        state.aimY = 200 + Math.cos(state.aimOsc * 1.5) * 60;

        // Influência Jogador (Segurar setas para travar a mira)
        if (state.keys.ArrowLeft) state.aimX -= 5;
        if (state.keys.ArrowRight) state.aimX += 5;
        if (state.keys.ArrowUp) state.aimY -= 5;
        if (state.keys.ArrowDown) state.aimY += 5;

        document.getElementById('action-msg').innerText = "MIRA ESTÁ OSCILANDO!";

        if (state.keys.Space || state.keys.ArrowUp) {
            executeKick(state.aimX, state.aimY);
        }
    } else {
        // IA BATE: EU NO GOL
        if (state.gameState === 'idle') {
            document.getElementById('action-msg').innerText = "IA PREPARANDO...";
            state.gameState = 'osc';
            setTimeout(() => {
                const targetX = 300 + Math.random() * 200;
                const targetY = 180 + Math.random() * 100;
                executeKick(targetX, targetY);
            }, 1500);
        }

        // Movimento do Goleiro (EU)
        if (state.keys.ArrowLeft) state.gkTargetX = 300;
        else if (state.keys.ArrowRight) state.gkTargetX = 500;
        else state.gkTargetX = 400;

        if (state.keys.ArrowUp) state.gkAnim = 'high';
        else if (state.keys.ArrowDown) state.gkAnim = 'low';
        else state.gkAnim = 'side';

        state.gkX += (state.gkTargetX - state.gkX) * 0.1;
    }
}

function executeKick(tx, ty) {
    state.gameState = 'kick';
    state.ballTarget = { x: tx, y: ty };
    
    // IA GK REACTION
    if (state.turn === 'player') {
        state.gkTargetX = (Math.random() > 0.4) ? tx : 400; // 60% chance de pular certo
        state.gkAnim = (ty < 220) ? 'high' : 'low';
    }

    // ANIMAÇÃO BOLA
    const duration = 600;
    const startX = state.ballPos.x;
    const startY = state.ballPos.y;
    const startTime = performance.now();

    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        state.ballPos.x = startX + (tx - startX) * t;
        state.ballPos.y = startY + (ty - startY) * t;
        
        // Movimento do GK IA
        if (state.turn === 'player') {
            state.gkX += (state.gkTargetX - state.gkX) * 0.1;
        }

        if (t < 1) requestAnimationFrame(step);
        else resolveTurn(tx, ty);
    }
    requestAnimationFrame(step);
}

function resolveTurn(tx, ty) {
    state.gameState = 'result';
    const isGoal = (tx > 250 && tx < 550 && ty > 150 && ty < 280);
    const gkDist = Math.abs(tx - state.gkX);
    
    let result = "ERROU";
    if (isGoal) {
        if (gkDist > 60) {
            result = "GOL!";
            if (state.turn === 'player') state.score.player++;
            else state.score.ai++;
        } else {
            result = "DEFENDEU!";
        }
    } else {
        result = "FORA!";
    }

    document.getElementById('action-msg').innerText = result;
    updateScoreUI();

    setTimeout(() => {
        if (state.turn === 'player') {
            state.turn = 'ai';
        } else {
            state.turn = 'player';
            state.round++;
        }

        // FIM DE JOGO?
        if (state.round > 5 || state.isSuddenDeath) {
            if (state.score.player !== state.score.ai) {
                finishGame();
                return;
            } else {
                state.isSuddenDeath = true;
            }
        }
        startTurn();
    }, 1500);
}

function finishGame() {
    if (state.score.player > state.score.ai) {
        changeScreen('victory-screen');
        document.getElementById('winner-shield').src = assets.shields[state.playerTeam.id].src;
    } else {
        alert("PERDEU! TENTE NOVAMENTE.");
        location.reload();
    }
}

function draw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    // FUNDO / GOL
    ctx.fillStyle = '#003300';
    ctx.fillRect(0, 400, 800, 100);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.strokeRect(250, 150, 300, 130);
    
    // ESCUDO NO CHÃO (SOB A BOLA)
    if (state.playerTeam && assets.shields[state.playerTeam.id]) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.drawImage(assets.shields[state.playerTeam.id], 370, 410, 60, 60);
        ctx.restore();
    }

    // GOLEIRO
    ctx.fillStyle = (state.gkAnim === 'high') ? '#0ff' : '#222';
    ctx.fillRect(state.gkX - 25, 230 - (state.gkAnim === 'high' ? 30 : 0), 50, 50);

    // MIRA (Só se for minha vez de bater)
    if (state.turn === 'player' && state.gameState !== 'kick') {
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.aimX, state.aimY, 15, 0, Math.PI*2);
        ctx.stroke();
    }

    // BOLA
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
    ctx.arc(state.ballPos.x, state.ballPos.y, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (state.screen === 'game-screen') {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

loadDirectAssets();
