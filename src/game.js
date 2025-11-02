import { Whale } from './entities/whale.js';
import { canvas, ctx, seaLevel, resize } from './utils/canvas.js';
import { initInput } from './utils/input.js';

import { spawnKrill, updateKrill, drawKrill } from './entities/krill.js';
import { spawnFish, updateFish, drawFish } from './entities/fish.js';
import { spawnSeagulls, updateSeagulls, drawSeagulls } from './entities/seagulls.js';
// corals are now handled via a foreground image `src/assets/corals.png`; procedural corals removed

import { scenario, titles, setScenario, setScenarioMessaging } from './scenarios/scenarioManager.js';
import { updateHUD } from './ui/hud.js';
import { drawLeftArrow, drawEdgeHint } from './ui/arrows.js';

let whale1, whale2;
let baby = null;
let missionReady = false;
// corals image (front layer for warmer waters)
const coralsImg = new Image();
let coralsImgLoaded = false;
coralsImg.onload = () => { coralsImgLoaded = true; };
coralsImg.onerror = (e) => { coralsImgLoaded = false; console.info('corals.png not found or failed to load; using procedural corals fallback.'); };
coralsImg.src = 'src/assets/corals.png';

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

    // Name the whales
    // whale1 acts as the mother in the spawn logic, so name her Bubbles
    whale1.name = 'Bubbles';
    // whale2 is the companion
    whale2.name = 'Splash';

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
    } else if (s === 1) {
        spawnKrill(0);
        spawnFish(0);
        spawnSeagulls(6);
    } else {
        spawnKrill(0);
        // warmer waters: no fish
        spawnFish(0);
        spawnSeagulls(4);
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
    // draw the sea only (the sky is provided by the image behind the canvas)
    ctx.fillStyle = sea;
    ctx.fillRect(0, seaLevel, w, h - seaLevel);

    // animated waves along the surface (sit visually at the seaLevel)
    ctx.beginPath();
    for (let x = 0; x < w; x += 15) {
        const y = seaLevel + Math.sin((x / 50) + Date.now() / 800) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
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
        // warmer waters: draw a foreground corals image if available, otherwise fall back to procedural corals
        if (coralsImgLoaded && coralsImg.naturalWidth > 0) {
            // draw the sea creatures behind the corals
            updateFish();
            drawFish();
            // draw corals image aligned to bottom with a subtle sway/parallax so it feels alive
            const imgW = coralsImg.naturalWidth || canvas.width;
            const imgH = coralsImg.naturalHeight || Math.floor(canvas.height * 0.18);
            // scale image to canvas width while preserving aspect ratio
            const scale = canvas.width / imgW;
            const drawH = imgH * scale;
            // subtle vertical sway based on time (slow sine) — amplitude is small and scales with canvas height
            const t = Date.now() / 1000; // seconds
            const amp = Math.max(3, Math.min(10, canvas.height * 0.008));
            const sway = Math.sin(t * 0.6) * amp; // slow gentle motion
            const drawY = canvas.height - drawH + sway;
            try { ctx.drawImage(coralsImg, 0, drawY, canvas.width, drawH); } catch (e) { /* ignore draw errors */ }
        } else {
            // fallback: just draw fish (no procedural corals available)
            updateFish();
            drawFish();
        }
    }

    // whales
    whale1.draw();
    whale2.draw();
    if (baby) { ctx.save(); ctx.globalAlpha = Math.min(1, baby.life * 1.3); baby.draw(); ctx.restore(); }

    // draw names beneath each whale (if present)
    (function drawNames() {
        // Slightly smaller, responsive font so labels are unobtrusive on all sizes
        const fontSize = Math.max(10, Math.round(canvas.width * 0.014));
        ctx.save();
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // subtle stroke for readability
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.fillStyle = '#ffffff';

        if (whale1 && whale1.name) {
            const yOff = (whale1.size || 40) * 0.9;
            const x = whale1.x;
            const y = Math.min(canvas.height - 8, whale1.y + yOff);
            ctx.strokeText(whale1.name, x, y);
            ctx.fillText(whale1.name, x, y);
        }

        if (whale2 && whale2.name) {
            const yOff = (whale2.size || 40) * 0.9;
            const x = whale2.x;
            const y = Math.min(canvas.height - 8, whale2.y + yOff);
            ctx.strokeText(whale2.name, x, y);
            ctx.fillText(whale2.name, x, y);
        }

        if (baby && baby.name) {
            const yOff = (baby.size || 30) * 0.9;
            const x = baby.x;
            const y = Math.min(canvas.height - 8, baby.y + yOff);
            ctx.globalAlpha = Math.min(1, baby.life * 1.3);
            ctx.strokeText(baby.name, x, y);
            ctx.fillText(baby.name, x, y);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    })();
}

function spawnBaby(mother) {
    const b = new Whale(mother.x - 40, mother.y + 20, mother.controls, mother.colors);
    b.size = mother.size * 0.55;
    b.mother = mother;
    b.vx = mother.vx; b.vy = mother.vy;
    b.life = 0.01;
    // Name the calf
    b.name = 'Sandy';
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
        // Don't wrap back to the first scenario once we've reached the final level.
        // The final level (index 2) is terminal — advancing from it does nothing.
        if (scenario >= 2) return;
        const nextScenario = scenario + 1;
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
        // If we're in the final (warmer) scenario and a baby exists, do not show
        // arrows or attempt to advance — this level is terminal once the calf is born.
        if (!(scenario === 2 && baby)) {
            drawLeftArrow();
            drawEdgeHint();
            checkScenarioAdvance();
        }
    }

    requestAnimationFrame(loop);
}

// Start the game automatically when module is loaded
initInput();

// Developer hotkeys: allow quick switching between scenarios with keys 1/2/3.
// These keys set the scenario immediately (visuals + entities) but do NOT alter
// mission logic — missions still need to be completed or whales moved to the edge
// to advance naturally.
window.addEventListener('keydown', (e) => {
    // ignore when typing into form elements etc.
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
    if (e.key === '1') {
        // Prevent jumping back to Antarctica if we've already reached the final level.
        if (scenario === 2) return;
        setScenario(0);
        initScenario(0);
    } else if (e.key === '2') {
        if (scenario === 2) return;
        setScenario(1);
        initScenario(1);
    } else if (e.key === '3') {
        setScenario(2);
        initScenario(2);
    }
}, {passive: true});

initGame();
loop();

export { whale1, whale2, baby };