import { Whale } from './entities/whale.js';
import { canvas, ctx, seaLevel, resize } from './utils/canvas.js';
import { initInput } from './utils/input.js';

import { spawnKrill, updateKrill, drawKrill } from './entities/krill.js';
import { spawnFish, updateFish, drawFish } from './entities/fish.js';
import { spawnSeagulls, updateSeagulls, drawSeagulls } from './entities/seagulls.js';
import { spawnCorals, drawCorals } from './entities/corals.js';

import { scenario, titles, setScenario, setScenarioMessaging } from './scenarios/scenarioManager.js';
import { updateHUD } from './ui/hud.js';
import { drawLeftArrow, drawEdgeHint } from './ui/arrows.js';

let whale1, whale2;
let baby = null;
let missionReady = false;

function initGame() {
    window.addEventListener("resize", resize, {passive: true});
    resize();

    whale1 = new Whale(canvas.width/2, seaLevel + 200,
        {up:'w', down:'s', left:'a', right:'d', jump:'t'},
        {body1:'#0a4770', body2:'#0c628f', tail:'#093e5f'}
    );
    
    whale2 = new Whale(canvas.width/2 + 180, seaLevel + 260,
        {up:'arrowup', down:'arrowdown', left:'arrowleft', right:'arrowright', jump:'o'},
        {body1:'#0b4c78', body2:'#0e6c9f', tail:'#093e5f'}
    );

    initScenario(0);
}

function initScenario(s) {
    baby = null;

    // reset whale counters/state
    whale1.krillEaten = 0; whale1.jumpsDone = 0; whale1.joined = false;
    whale2.krillEaten = 0; whale2.jumpsDone = 0; whale2.joined = false;

    // spawn entities per scenario
    if (s === 0) {
        spawnKrill(28);
        spawnFish(0);
        spawnSeagulls(0);
        spawnCorals(0);
    } else if (s === 1) {
        spawnKrill(0);
        spawnFish(0);
        spawnSeagulls(6);
        spawnCorals(0);
    } else {
        spawnKrill(0);
        // warmer waters: no fish
        spawnFish(0);
        spawnSeagulls(4);
        spawnCorals(0);
    }

    // position whales
    const centerX = canvas.width / 2;
    const horizSpacing = Math.max(whale1.size, 120);
    whale1.x = centerX - horizSpacing;
    whale2.x = centerX + horizSpacing;
    whale1.y = canvas.height / 2;
    whale2.y = canvas.height / 2 + Math.min(whale2.size * 0.35, 40);
    whale1.vx = whale1.vy = whale2.vx = whale2.vy = 0;

    whale1.target = whale2.target = null;
    whale1.targetActive = whale2.targetActive = false;

    setScenarioMessaging(s);
}

function drawBackground() {
    const w = canvas.width, h = canvas.height;
    let sky, sea;
    if (scenario === 0) {
        sky = ctx.createLinearGradient(0,0,0,seaLevel); sky.addColorStop(0,"#dff4ff"); sky.addColorStop(1,"#9fdcff");
        sea = ctx.createLinearGradient(0,seaLevel,0,h); sea.addColorStop(0,"#0e4d80"); sea.addColorStop(1,"#012f4a");
    } else if (scenario === 1) {
        sky = ctx.createLinearGradient(0,0,0,seaLevel); sky.addColorStop(0,"#b6e0ff"); sky.addColorStop(1,"#6bb7e0");
        sea = ctx.createLinearGradient(0,seaLevel,0,h); sea.addColorStop(0,"#1d6ea1"); sea.addColorStop(1,"#054064");
    } else {
        sky = ctx.createLinearGradient(0,0,0,seaLevel); sky.addColorStop(0,"#9fdfff"); sky.addColorStop(1,"#6fd0ff");
        sea = ctx.createLinearGradient(0,seaLevel,0,h); sea.addColorStop(0, "#25a8a0"); sea.addColorStop(1, "#0d827b");
    }
    ctx.fillStyle = sky; ctx.fillRect(0,0,w,seaLevel);
    ctx.fillStyle = sea; ctx.fillRect(0,seaLevel,w,h-seaLevel);

    // animated waves
    ctx.beginPath();
    for (let x=0;x<w;x+=15){
        const y = seaLevel + Math.sin((x/50)+Date.now()/800)*2;
        if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2; ctx.stroke();

    // Title
    document.getElementById('title').innerText = titles[scenario];
}

function drawEntities() {
    // scenario-specific underwater entities
    if (scenario === 0) {
        updateKrill();
        drawKrill();
    } else if (scenario === 1) {
        updateFish();
        drawFish();
        updateSeagulls();
        drawSeagulls();
    } else {
        drawCorals();
        updateFish();
        drawFish();
    }

    // whales
    whale1.draw();
    whale2.draw();
    if (baby) { ctx.save(); ctx.globalAlpha = Math.min(1, baby.life * 1.3); baby.draw(); ctx.restore(); }
}

function spawnBaby(mother) {
    const b = new Whale(mother.x - 40, mother.y + 20, mother.controls, mother.colors);
    b.size = mother.size * 0.55;
    b.mother = mother;
    b.vx = mother.vx; b.vy = mother.vy;
    b.life = 0.01;
    baby = b;
}

function updateBaby() {
    if (!baby || !baby.mother) return;
    const m = baby.mother;
    const offsetBehind = -m.vx * 6;
    const side = (m.vx < 0 ? -1 : 1);
    const targetX = m.x + offsetBehind - side * (m.size * 0.4);
    const targetY = Math.max(seaLevel + 26, m.y + m.size * 0.25);

    const toTargetX = targetX - baby.x;
    const toTargetY = targetY - baby.y;

    const maxSpeed = Math.min(1.2, 0.7 + 0.3*Math.hypot(m.vx, m.vy));
    baby.vx += (toTargetX * 0.02);
    baby.vy += (toTargetY * 0.02);

    const sp = Math.hypot(baby.vx, baby.vy);
    if (sp > maxSpeed) { baby.vx = (baby.vx / sp) * maxSpeed; baby.vy = (baby.vy / sp) * maxSpeed; }

    baby.vx *= 0.95; baby.vy *= 0.95;
    baby.x += baby.vx; baby.y += baby.vy;

    if (baby.y < seaLevel + 20) baby.y = seaLevel + 20;
    baby.y = Math.min(canvas.height - baby.size*1.6, baby.y);
    baby.x = Math.max(-baby.size*3, Math.min(canvas.width + baby.size*3, baby.x));

    baby.tail += 0.1; baby.life += 0.02;
}

function isMissionComplete() {
    if (scenario === 0) return (whale1.krillEaten >= 10) && (whale2.krillEaten >= 10);
    if (scenario === 1) return (whale1.jumpsDone >= 5) && (whale2.jumpsDone >= 5);
    if (baby) return true;
    const d = Math.hypot(whale1.x-whale2.x, whale1.y-whale2.y);
    return d < Math.min(whale1.size, whale2.size) * 0.8;
}

function checkScenarioAdvance() {
    const EDGE = 12;
    if ((whale1.x <= EDGE || whale2.x <= EDGE)) {
        const nextScenario = (scenario + 1) % 3;
        setScenario(nextScenario);
        initScenario(nextScenario);
    }
}

function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawBackground();

    missionReady = isMissionComplete();

    // Entities + updates
    if (scenario === 0) {
        // krill handled inside drawEntities
    }

    // Update whales movement
    whale1.update();
    whale2.update();

    if (scenario === 2 && !baby) {
        const d = Math.hypot(whale1.x-whale2.x, whale1.y-whale2.y);
        if (d < Math.min(whale1.size, whale2.size) * 0.8) spawnBaby(whale1);
    }
    if (baby) updateBaby();

    drawEntities();
    updateHUD(whale1, whale2);

    if (missionReady) {
        drawLeftArrow();
        drawEdgeHint();
        checkScenarioAdvance();
    }

    requestAnimationFrame(loop);
}

// Start the game automatically when module is loaded
initInput();
initGame();
loop();

export { whale1, whale2, baby };