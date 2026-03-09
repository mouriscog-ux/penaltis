/**
 * BATEDOR DE ELITE - BRASILEIRÃO
 * 
 * MECÂNICAS JOGADOR:
 * - Seta Baixo: Recuo (Potência)
 * - Seta Laterais: Ângulo
 * - Seta Cima: Corrida e Chute
 * 
 * REGRAS:
 * - 10 Chutes
 * - 6 Gols para avançar
 * - Fases: Oitavas -> Final
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
    round: 0, // 0-3
    shotsTaken: 0,
    goalsMade: 0,
    isShooting: false,
    kickPower: 0,
    kickAngle: 0,
    kickerPos: { x: 400, y: 600, scale: 1 },
    ballPos: { x: 400, y: 550 },
    ballTarget: { x: 400, y: 250 },
    gkPos: { x: 400, y: 250, targetX: 400 },
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 700;

const assets = { shields: {} };

function loadAssets() {
    TEAMS.forEach(t => {
        const img = new Image();
        img.src = `${t.id}.png`;
        img.onload = () => assets.shields[t.id] = img;
        img.onerror = () => {
            const fallback = new Image();
            fallback.src = `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}&backgroundColor=${t.color.substring(1)}`;
            assets.shields[t.id] = fallback;
        };
    });
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
        card.innerHTML = `<img class="team-logo-ui" src="https://api.dicebear.com/7.x/initials/svg?seed=${team.name}&backgroundColor=${team.color.substring(1)}"><span class="team-name-ui">${team.name}</span>`;
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
    state.shotsTaken = 0;
    state.goalsMade = 0;
    state.isShooting = false;
    updateHUD();
    
    document.getElementById('team-logo-hud').src = assets.shields[state.playerTeam.id]?.src || "";
    const phases = ["OITAVAS DE FINAL", "QUARTAS DE FINAL", "SEMIFINAL", "GRANDE FINAL"];
    document.getElementById('match-phase').innerText = phases[state.round];

    showScreen('game-screen');
    resetPositions();
    requestAnimationFrame(gameLoop);
}

function updateHUD() {
    document.getElementById('goals-count').innerText = state.goalsMade;
}

function resetPositions() {
    state.kickerPos = { x: 400, y: 600, scale: 1 };
    state.ballPos = { x: 400, y: 560 };
    state.gkPos = { x: 400, y: 250, targetX: 400 };
    state.kickPower = 0;
    state.kickAngle = 0;
    state.isShooting = false;
    document.getElementById('status-msg').innerText = "PREPARE-SE PARA O CHUTE";
}

window.addEventListener('keydown', e => { if (state.keys.hasOwnProperty(e.code)) state.keys[e.code] = true; });
window.addEventListener('keyup', e => { if (state.keys.hasOwnProperty(e.code)) state.keys[e.code] = false; });

function update() {
    if (state.screen !== 'game-screen' || state.isShooting === 'kick_flying' || state.isShooting === 'result_wait') return;

    // PREPARAÇÃO (SETAS)
    if (!state.isShooting) {
        if (state.keys.ArrowDown) {
            state.kickerPos.y += 2;
            state.kickPower += 0.5;
            if (state.kickerPos.y > 680) state.kickerPos.y = 680;
        }

        if (state.keys.ArrowLeft) state.kickAngle -= 1;
        if (state.keys.ArrowRight) state.kickAngle += 1;

        // Limites de Mira
        if (state.kickAngle < -40) state.kickAngle = -40;
        if (state.keysRight && state.kickAngle > 40) state.kickAngle = 40; // fix typo
        if (state.kickAngle > 40) state.kickAngle = 40;

        // CORRIDA (Seta Cima)
        if (state.keys.ArrowUp) {
            state.isShooting = 'running';
        }
    }

    if (state.isShooting === 'running') {
        state.kickerPos.y -= 5;
        // Se estiver correndo e usando as setas laterais, mira no ângulo (sobe a mira)
        let verticalMira = 250;
        if (state.keys.ArrowLeft || state.keys.ArrowRight) {
            verticalMira = 200; // Mira na gaveta
        }

        if (state.kickerPos.y <= state.ballPos.y + 10) {
            // MOMENTO DO IMPACTO
            executeKick(verticalMira);
        }
    }
}

function executeKick(verticalMira) {
    state.isShooting = 'kick_flying';
    state.shotsTaken++;
    
    // Alvo da bola
    state.ballTarget = {
        x: 400 + (state.kickAngle * 6),
        y: verticalMira
    };

    // Inteligência do Goleiro (IA)
    const aiIntelligence = [0.4, 0.6, 0.8, 0.95][state.round];
    if (Math.random() < aiIntelligence) {
        // Goleiro tenta pular pro lado certo
        state.gkPos.targetX = state.ballTarget.x;
    } else {
        // Goleiro pula pro lado errado ou fica no meio
        state.gkPos.targetX = 400 + (Math.random() - 0.5) * 400;
    }

    // Animação de Voo
    animateBall();
}

function animateBall() {
    const duration = 800; // ms
    const startTime = performance.now();
    const startPos = { ...state.ballPos };

    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        state.ballPos.x = startPos.x + (state.ballTarget.x - startPos.x) * t;
        state.ballPos.y = startPos.y + (state.ballTarget.y - startPos.y) * t;

        // Goleiro se move
        state.gkPos.x += (state.gkPos.targetX - state.gkPos.x) * 0.15;

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            checkGoal();
        }
    }
    requestAnimationFrame(step);
}

function checkGoal() {
    state.isShooting = 'result_wait';
    
    // Trave: 200 a 600 largura, 150 a 250 altura
    const isInsideGold = (state.ballPos.x > 220 && state.ballPos.x < 580 && state.ballPos.y > 160 && state.ballPos.y < 260);
    const gkDist = Math.abs(state.ballPos.x - state.gkPos.x);

    if (isInsideGold && gkDist > 60) {
        state.goalsMade++;
        document.getElementById('status-msg').innerText = "GOOOOOL!!!";
    } else if (isInsideGold && gkDist <= 60) {
        document.getElementById('status-msg').innerText = "DEFENDEU O GOLEIRO!";
    } else {
        document.getElementById('status-msg').innerText = "PARA FORA!!!";
    }

    updateHUD();

    setTimeout(() => {
        if (state.shotsTaken >= 10) {
            endMatch();
        } else if (state.shotsTaken - state.goalsMade > 4) {
             // Eliminado se não puder mais atingir 6
            endMatch(true);
        } else {
            resetPositions();
        }
    }, 1500);
}

function endMatch(eliminatedEarly = false) {
    showScreen('result-screen');
    const msg = document.getElementById('result-msg');
    const title = document.getElementById('result-title');
    const btn = document.getElementById('result-btn');

    const qualified = state.goalsMade >= 6;

    if (qualified) {
        title.innerText = "PARABÉNS!";
        msg.innerText = `Você marcou ${state.goalsMade} gols e avançou de fase!`;
        btn.innerText = state.round === 3 ? "ERGUER A TAÇA!" : "Próxima Fase";
        btn.onclick = () => {
            if (state.round === 3) showScreen('main-menu');
            else { state.round++; startMatch(); }
        };
    } else {
        title.innerText = "ELIMINADO!";
        msg.innerText = eliminatedEarly ? "Você perdeu muitas chances. Fim de papo." : `Você marcou apenas ${state.goalsMade} gols. Faltou pontaria!`;
        btn.innerText = "Tentar Novamente";
        btn.onclick = () => showScreen('main-menu');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gramado
    ctx.fillStyle = '#0a1f12';
    ctx.fillRect(0, 500, canvas.width, 200);
    
    // Estádio/Fundo
    ctx.fillStyle = '#050608';
    ctx.fillRect(0,0, canvas.width, 500);

    // O GOL
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.strokeRect(220, 150, 360, 110);
    // Rede
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=220; i<=580; i+=20) { ctx.moveTo(i, 150); ctx.lineTo(i, 260); }
    for(let i=150; i<=260; i+=20) { ctx.moveTo(220, i); ctx.lineTo(580, i); }
    ctx.stroke();

    // ESCUDO NO GRAMADO (Marca do Pênalti)
    if (state.playerTeam && assets.shields[state.playerTeam.id]) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.drawImage(assets.shields[state.playerTeam.id], 375, 545, 50, 50);
        ctx.restore();
    }

    // O GOLEIRO
    ctx.fillStyle = '#222'; // Uniforme Árbitro/Goleiro
    ctx.fillRect(state.gkPos.x - 20, state.gkPos.y - 40, 40, 80);
    ctx.fillStyle = '#ffcc99'; // Cabeça
    ctx.fillRect(state.gkPos.x - 10, state.gkPos.y - 55, 20, 20);

    // A BOLA
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
    ctx.arc(state.ballPos.x, state.ballPos.y, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // O BATEDOR (CHUTEIRA/JOGADOR)
    if (state.isShooting !== 'kick_flying') {
        const kickColor = state.playerTeam ? state.playerTeam.color : "#fff";
        ctx.save();
        ctx.translate(state.kickerPos.x, state.kickerPos.y);
        ctx.rotate(state.kickAngle * Math.PI / 180 * 0.2); // Leve inclinação pra mira
        
        ctx.fillStyle = kickColor;
        ctx.fillRect(-15, -10, 30, 60); // Corpo simples chuteira/leg
        ctx.fillStyle = "#000";
        ctx.fillRect(-18, 40, 36, 12); // Base Chuteira
        
        ctx.restore();
    }
}

function gameLoop() {
    update();
    draw();
    if (state.screen === 'game-screen') requestAnimationFrame(gameLoop);
}

loadAssets();
