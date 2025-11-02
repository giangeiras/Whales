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
// Speech bubble state for Splash (whale2)
let splashBubble = {
    // use an explicit newline so we display two lines as requested
    text: 'Fill up on krill, Bubbles!\nBig trip ahead!',
    scheduledAt: 0,
    startTime: 0,
    duration: 4000,
    shown: false,
    active: false
    };

// Kiki (Bubbles) speech bubble state — shown when either whale reaches 3 krill eaten
let kikiBubble = {
    text: 'Krill move in swarms. Try following the sparkly cloud!',
    shown: false,
    active: false,
    startTime: 0,
    duration: 5000,
    triggeredByWhale1: false,
    triggeredByWhale2: false
};

let scenarioStartTime = Date.now();
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
    whale1.name = 'Bubbles';
    whale2.name = 'Splash';

    initScenario(0);
}

function initScenario(s) {
    baby = null;
    // reset speech bubble scheduling for the new scenario
    scenarioStartTime = Date.now();
    splashBubble.shown = false;
    splashBubble.active = false;
    splashBubble.startTime = 0;
    if (s === 0) {
        // schedule Splash's line 3 seconds after entering Antarctica
        splashBubble.scheduledAt = scenarioStartTime + 3000;
    } else {
        splashBubble.scheduledAt = 0;
    }

    // reset Kiki bubble triggers when a scenario starts
    kikiBubble.shown = false;
    kikiBubble.active = false;
    kikiBubble.startTime = 0;
    kikiBubble.triggeredByWhale1 = false;
    kikiBubble.triggeredByWhale2 = false;

    // reset whale counters/state
    whale1.krillEaten = 0; whale1.jumpsDone = 0; whale1.joined = false;
    whale2.krillEaten = 0; whale2.jumpsDone = 0; whale2.joined = false;

    // spawn entities per scenario
    if (s === 0) {
        // spawn more groups of krill for better availability (9 swarms x 8 particles)
        spawnKrill(9, 8);
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

    // (Kiki bubble drawing moved to top-level drawKikiBubble so it can be called from loop)

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

    // draw floating speech bubbles (canvas-based)
    function drawSpeechBubbles() {
        if (scenario !== 0) return; // only for Antarctica for now
        const now = Date.now();
        // activate scheduled bubble
        if (!splashBubble.shown && splashBubble.scheduledAt && now >= splashBubble.scheduledAt) {
            splashBubble.shown = true;
            splashBubble.active = true;
            splashBubble.startTime = now;
        }

        if (splashBubble.active) {
            const elapsed = now - splashBubble.startTime;
            if (elapsed > splashBubble.duration) {
                splashBubble.active = false;
                return;
            }

            // fade in/out alpha
            const fadeIn = 300;
            const fadeOut = 500;
            let alpha = 1;
            if (elapsed < fadeIn) alpha = elapsed / fadeIn;
            else if (elapsed > splashBubble.duration - fadeOut) alpha = Math.max(0, (splashBubble.duration - elapsed) / fadeOut);

        // where to place the bubble: above and slightly right of whale2
        const x = whale2.x + Math.min(whale2.size * 0.8, 48);
        // make the bubble noticeably narrower on most screens
        const maxW = Math.min(180, canvas.width * 0.28);
            ctx.save();
            ctx.globalAlpha = alpha;

            // prepare text wrap and respect explicit newlines
            ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
            const paragraphs = splashBubble.text.split('\n');
            const lines = [];
            for (const p of paragraphs) {
                const words = p.split(' ');
                let cur = '';
                for (const w of words) {
                    const test = cur ? cur + ' ' + w : w;
                    if (ctx.measureText(test).width > maxW && cur) {
                        lines.push(cur); cur = w;
                    } else cur = test;
                }
                if (cur) lines.push(cur);
                // do not insert extra blank lines between paragraphs to keep spacing tight
            }

            // tighter line spacing and smaller padding to compact the bubble
            const lineHeight = Math.ceil(parseInt(ctx.font, 10) * 1.05);
            const padding = 6;
            // compute max measured line width so the bubble fits the text closely
            const maxLineW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
            const bW = Math.min(maxW, Math.max(80, Math.round(maxLineW))) + padding * 2;
            const bH = lines.length * lineHeight + padding * 2;
            let bX = x;
            // avoid overflowing right edge
            if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
            let bY = Math.max(8, whale2.y - whale2.size - bH - 8);

            // rounded rect with tail pointing to whale
            const radius = 8;
            ctx.fillStyle = 'rgba(255,255,255,0.96)';
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 1.5;
            // drop shadow
            ctx.shadowColor = 'rgba(0,0,0,0.25)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(bX + radius, bY);
            ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
            ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
            ctx.arcTo(bX, bY + bH, bX, bY, radius);
            ctx.arcTo(bX, bY, bX + bW, bY, radius);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // draw small tail (triangle) pointing to whale
            ctx.beginPath();
            const tailX = Math.min(whale2.x + 8, bX + bW - 12);
            ctx.moveTo(tailX, bY + bH);
            ctx.lineTo(tailX + 8, bY + bH + 14);
            ctx.lineTo(tailX + 18, bY + bH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // draw text
            ctx.fillStyle = '#000';
            ctx.textBaseline = 'top';
            let ty = bY + padding;
            for (const line of lines) {
                ctx.fillText(line, bX + padding, ty);
                ty += lineHeight;
            }

            ctx.restore();
        }
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

// draw Kiki (Bubbles) speech bubble anchored to whale1 (top-level so loop can call it)
function drawKikiBubble() {
    if (!kikiBubble.active) return;
    const now = Date.now();
    const elapsed = now - kikiBubble.startTime;
    if (elapsed > kikiBubble.duration) { kikiBubble.active = false; return; }

    // fade in/out
    const fadeIn = 300, fadeOut = 400;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > kikiBubble.duration - fadeOut) alpha = Math.max(0, (kikiBubble.duration - elapsed) / fadeOut);

    // anchor above whale1
    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const paragraphs = kikiBubble.text.split('\n');
    const lines = [];
    for (const p of paragraphs) {
        const words = p.split(' ');
        let cur = '';
        for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
        }
        if (cur) lines.push(cur);
    }
    const lineHeight = Math.ceil(parseInt(ctx.font, 10) * 1.05);
    const padding = 6;
    const maxLineW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    const bW = Math.min(maxW, Math.max(80, Math.round(maxLineW))) + padding * 2;
    const bH = lines.length * lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale1.y - whale1.size - bH - 8);

    // draw rounded rect
    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // tail triangle
    ctx.beginPath();
    const tailX = Math.min(whale1.x + 8, bX + bW - 12);
    ctx.moveTo(tailX, bY + bH);
    ctx.lineTo(tailX + 8, bY + bH + 12);
    ctx.lineTo(tailX + 18, bY + bH);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // text
    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    let ty = bY + padding;
    for (const line of lines) { ctx.fillText(line, bX + padding, ty); ty += lineHeight; }

    ctx.restore();
}

// compatibility wrapper: previously the bubble drawer was renamed to dialogue2
// Some call sites may still expect `dialogue2` — forward to the real function.
function dialogue2() {
    try { return drawKikiBubble(); } catch (e) { /* if drawKikiBubble is missing, fail silently */ }
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

    // Kiki bubble triggers: when either whale first reaches 3 krill eaten,
    // show the bubble anchored to Bubbles (whale1) for 5s.
    const now = Date.now();
    if (!kikiBubble.triggeredByWhale1 && whale1.krillEaten >= 3) {
        kikiBubble.triggeredByWhale1 = true;
        kikiBubble.shown = true; kikiBubble.active = true; kikiBubble.startTime = now;
    }
    if (!kikiBubble.triggeredByWhale2 && whale2.krillEaten >= 3) {
        kikiBubble.triggeredByWhale2 = true;
        kikiBubble.shown = true; kikiBubble.active = true; kikiBubble.startTime = now;
    }

    drawEntities();
    // Draw canvas speech bubbles after entities so they overlay whales
    drawSpeechBubbles();
        // draw Bubbles/Kiki bubble after other bubbles so it overlays appropriately
        dialogue2();
    updateHUD(whale1, whale2, baby);

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