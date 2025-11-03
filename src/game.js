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

// Sydney bubble for Bubbles (whale1) shown after Sydney modal is dismissed
let sydneyBubble = {
    text: "Let's jump together!",
    shown: false,
    active: false,
    startTime: 0,
    duration: 3000
};

// Splash (whale2) reaction bubble in Sydney triggered after Bubbles (whale1) does 1 jump
let splashSydneyBubble = {
    text: 'That was a mighty breach!',
    shown: false,
    active: false,
    startTime: 0,
    duration: 3000,
    triggered: false
};

// Splash's own jump-exultation bubble (any scenario) - triggers when Splash (whale2) does first jump
let splashJumpBubble = {
    text: 'Woohoo!',
    shown: false,
    active: false,
    startTime: 0,
    duration: 2000,
    triggered: false
};

// Bubbles (whale1) second-jump bubble: triggers when whale1 has done 2 jumps
let bubblesSecondJumpBubble = {
    text: 'Big and brave!',
    shown: false,
    active: false,
    startTime: 0,
    duration: 2000,
    triggered: false
};

// Splash's third-jump delayed bubble: appears 2s after Splash (whale2) does 3 jumps
let splashThirdJumpBubble = {
    text: 'Again!!!!',
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    duration: 2000,
    triggered: false
};

// Bubbles (whale1) fourth-jump bubble: appears immediately when whale1 has done 4 jumps
let bubblesFourthJumpBubble = {
    text: ' One more!!!',
    shown: false,
    active: false,
    startTime: 0,
    duration: 2000,
    triggered: false
};

// Splash bubble that appears 1s after both whales have done 5 jumps; lasts 5s
let splashAfterBothFiveBubble = {
    text: 'We had a lot of fun! Now it’s time to travel north.',
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    duration: 5000,
    triggered: false
};

let scenarioStartTime = Date.now();
// Small flourish state (for bubble pop visuals)
let bubbleFlourishes = [];

// Play a short bubble/pop sound using WebAudio (one-shot)
function playBubbleSound() {
    try {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        const ctxAudio = new C();
        const o = ctxAudio.createOscillator();
        const g = ctxAudio.createGain();
        o.type = 'sine';
        o.frequency.value = 520;
        g.gain.value = 0.001;
        o.connect(g); g.connect(ctxAudio.destination);
        const now = ctxAudio.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        o.start(now);
        o.stop(now + 0.2);
        // close context after sound
        setTimeout(() => { try { ctxAudio.close(); } catch (e) {} }, 400);
    } catch (e) { /* ignore audio errors */ }
}
let loveParticles = [];
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
    // debug: indicate initialization completed
    try { console.debug && console.debug('initGame completed'); } catch (e) {}
}

let __loopStarted = false;

function initScenario(s) {
    baby = null;
    // reset speech bubble scheduling for the new scenario
    scenarioStartTime = Date.now();
    splashBubble.shown = false;
    splashBubble.active = false;
    splashBubble.startTime = 0;
    if (s === 0) {
        // show the Splash line only after the intro modal is dismissed
        // (we'll activate it from hideAntarcticaModal)
        splashBubble.scheduledAt = 0;
    } else {
        splashBubble.scheduledAt = 0;
    }

    // reset Kiki bubble triggers when a scenario starts
    kikiBubble.shown = false;
    kikiBubble.active = false;
    kikiBubble.startTime = 0;
    kikiBubble.triggeredByWhale1 = false;
    kikiBubble.triggeredByWhale2 = false;
    // reset Sydney bubble as well
    sydneyBubble.shown = false;
    sydneyBubble.active = false;
    sydneyBubble.startTime = 0;

    // reset additional bubbles
    splashSydneyBubble.shown = false; splashSydneyBubble.active = false; splashSydneyBubble.startTime = 0; splashSydneyBubble.triggered = false;
    splashJumpBubble.shown = false; splashJumpBubble.active = false; splashJumpBubble.startTime = 0; splashJumpBubble.triggered = false;
    bubblesSecondJumpBubble.shown = false; bubblesSecondJumpBubble.active = false; bubblesSecondJumpBubble.startTime = 0; bubblesSecondJumpBubble.triggered = false;
    splashThirdJumpBubble.shown = false; splashThirdJumpBubble.active = false; splashThirdJumpBubble.startTime = 0; splashThirdJumpBubble.scheduledAt = 0; splashThirdJumpBubble.triggered = false;
    bubblesFourthJumpBubble.shown = false; bubblesFourthJumpBubble.active = false; bubblesFourthJumpBubble.startTime = 0; bubblesFourthJumpBubble.triggered = false;
    splashAfterBothFiveBubble.shown = false; splashAfterBothFiveBubble.active = false; splashAfterBothFiveBubble.startTime = 0; splashAfterBothFiveBubble.scheduledAt = 0; splashAfterBothFiveBubble.triggered = false;

    // reset whale counters/state
    whale1.krillEaten = 0; whale1.jumpsDone = 0; whale1.joined = false;
    whale2.krillEaten = 0; whale2.jumpsDone = 0; whale2.joined = false;

    // spawn entities per scenario
    if (s === 0) {
        // spawn more groups of krill for better availability (9 swarms x 8 particles)
        spawnKrill(9, 8);
        spawnFish(0);
        spawnSeagulls(0);
        // show Antarctica intro modal which blocks krill-eating until dismissed
        showAntarcticaModal();
    } else if (s === 1) {
        spawnKrill(0);
        spawnFish(0);
        spawnSeagulls(6);
        // ensure any previous modals are hidden, then show Sydney intro modal
        try { hideAntarcticaModal(); } catch (e) {}
        try { showSydneyModal(); } catch (e) { /* ignore if not defined yet */ }
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

// Antarctica intro modal: appears when entering scenario 0 and blocks krill-eating
function createAntarcticaModal() {
    if (document.getElementById('antarctica-modal')) return;
    // shared overlay behind modals
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.6)', zIndex: 100000, display: 'none', pointerEvents: 'auto'
        });
        document.body.appendChild(overlay);
    }

    const modal = document.createElement('div');
    modal.id = 'antarctica-modal';
    // position it in the center of the sky (sky occupies top 30vh; center ~15vh)
    Object.assign(modal.style, {
        position: 'fixed', left: '50%', top: '25%', transform: 'translate(-50%, -50%)',
        zIndex: 100001, background: 'rgba(255,255,255,0.7)', color: '#000', padding: '35px 50px',
        borderRadius: '10px', maxWidth: '520px', width: 'min(64vw, 520px)', boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', lineHeight: '1.4', textAlign: 'center'
    });

    // (no close button — modal must be dismissed with the "x" key)

    const msg = document.createElement('div');
    msg.id = 'antarctica-modal-text';
    msg.textContent = 'Guide the pair to eat krills in Antarctica so they can build energy for their long swim north to warmer seas.';
    // ensure message wraps nicely inside the narrower modal and stays left-aligned
    Object.assign(msg.style, { whiteSpace: 'normal', overflowWrap: 'break-word', textAlign: 'left' });
    modal.appendChild(msg);

    const hint = document.createElement('div');
    hint.id = 'antarctica-modal-hint';
    hint.textContent = "Press 'X' to continue";
    // Rounded transparent container with black stroke, centered and padded
    Object.assign(hint.style, {
        margin: '20px auto 0',
        fontSize: '16px',
        opacity: '0.95',
        textAlign: 'center',
        background: 'lightblue',
        border: '1.5px solid rgba(0,0,0,0.95)',
        borderRadius: '10px',
        padding: '8px 14px',
        display: 'inline-block',
        boxSizing: 'border-box'
    });
    modal.appendChild(hint);

    // keyboard 'x' handler
    modal.__keyHandler = (e) => {
        if (!e) return;
        if (e.key && e.key.toLowerCase() === 'x') {
            hideAntarcticaModal();
        }
    };

    document.body.appendChild(modal);
}

function showAntarcticaModal() {
    createAntarcticaModal();
    const modal = document.getElementById('antarctica-modal');
    if (!modal) return;
    // show shared overlay first so modal is visually on top of it
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'block';
    modal.style.display = 'block';
    // set global flag so whales won't count krill
    try { window.antarcticaDialogActive = true; } catch (e) {}
    window.addEventListener('keydown', modal.__keyHandler);
}

function hideAntarcticaModal() {
    const modal = document.getElementById('antarctica-modal');
    if (!modal) return;
    modal.style.display = 'none';
    // hide overlay
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    try { window.antarcticaDialogActive = false; } catch (e) {}
    // Activate the scheduled Splash bubble immediately when the modal is dismissed
    try {
        if (!splashBubble.shown) {
            splashBubble.shown = true;
            splashBubble.active = true;
            splashBubble.startTime = Date.now();
            // audio + visual flourish
            playBubbleSound();
            bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() });
        }
    } catch (e) { /* ignore if splashBubble isn't defined */ }
    if (modal.__keyHandler) window.removeEventListener('keydown', modal.__keyHandler);
}

// Sydney intro modal: appears when entering scenario 1 and blocks interactions until dismissed
function createSydneyModal() {
    if (document.getElementById('sydney-modal')) return;
    // use shared overlay (created by Antarctica modal if present)
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.6)', zIndex: 100000, display: 'none', pointerEvents: 'auto'
        });
        document.body.appendChild(overlay);
    }

    const modal = document.createElement('div');
    modal.id = 'sydney-modal';
    Object.assign(modal.style, {
        position: 'fixed', left: '50%', top: '40%', transform: 'translate(-50%, -50%)',
        zIndex: 100001, background: 'rgba(255,255,255,0.85)', color: '#000', padding: '30px 44px',
        borderRadius: '10px', maxWidth: '520px', width: 'min(64vw, 520px)', boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', lineHeight: '1.4', textAlign: 'center'
    });

    const msg = document.createElement('div');
    msg.id = 'sydney-modal-text';
    msg.textContent = "Let's help the whales pop up and jump near Sydney! That jump is called a breach. They might be saying hello, getting rid of itchy bugs, or showing they're strong.";
    Object.assign(msg.style, { whiteSpace: 'normal', overflowWrap: 'break-word', textAlign: 'left' });
    modal.appendChild(msg);

    const hint = document.createElement('div');
    hint.id = 'sydney-modal-hint';
    hint.textContent = "Press 'X' to continue";
    Object.assign(hint.style, {
        margin: '20px auto 0', fontSize: '16px', opacity: '0.95', textAlign: 'center',
        background: 'transparent', border: '1.5px solid rgba(0,0,0,0.95)', borderRadius: '10px', padding: '8px 14px',
        display: 'inline-block', boxSizing: 'border-box'
    });
    modal.appendChild(hint);

    // keyboard handler
    modal.__keyHandler = (e) => { if (!e) return; if (e.key && e.key.toLowerCase() === 'x') hideSydneyModal(); };

    document.body.appendChild(modal);
}

function showSydneyModal() {
    createSydneyModal();
    const modal = document.getElementById('sydney-modal');
    if (!modal) return;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'block';
    modal.style.display = 'block';
    try { window.modalDialogActive = true; window.sydneyDialogActive = true; } catch (e) {}
    window.addEventListener('keydown', modal.__keyHandler);
}

function hideSydneyModal() {
    const modal = document.getElementById('sydney-modal');
    if (!modal) return;
    modal.style.display = 'none';
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    try { window.modalDialogActive = false; window.sydneyDialogActive = false; } catch (e) {}
    // Activate Bubbles (whale1) Sydney bubble when the modal is dismissed
    try {
        if (!sydneyBubble.shown) {
            sydneyBubble.shown = true;
            sydneyBubble.active = true;
            sydneyBubble.startTime = Date.now();
            // audio + visual flourish
            playBubbleSound();
            bubbleFlourishes.push({ x: whale1.x, y: whale1.y - (whale1.size || 40), t: Date.now() });
        }
    } catch (e) { /* ignore if sydneyBubble undefined */ }
    if (modal.__keyHandler) window.removeEventListener('keydown', modal.__keyHandler);
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
    if (baby) { ctx.save(); ctx.globalAlpha = baby.opacity; baby.draw(); drawLoveParticles(); ctx.restore(); }

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
    b.opacity = 0;
    // Name the calf
    b.name = 'Sandy';
    baby = b;
        
        const centerX = (whale1.x + whale2.x) / 2;
        const centerY = (whale1.y + whale2.y) / 2;
        
        // spawn de 18 corações - EXPLOSÃO EM TODAS AS DIREÇÕES
        for (let i = 0; i < 18; i++) {
            
            const angle = (Math.PI * 4 * i) / 18; // ângulo proporcional (baseado na quantia de coraçoes) da explosão
            
            // velocidade da explosão - AJUSTE AQUI para controlar velocidade (mas se liga pq vai mudar o angulo tb)
            const speed = 0.5 + Math.random() * 0.8;
            
            const size = 20 + Math.random() * 15; // tamanho dos corações
            
            loveParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed * 2,
                vy: Math.sin(angle) * speed * 2,
                life: 1.3,
                size: size,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.01,  // rotação mais lenta
                color: ['#dd3da8ff', '#fc68b9ff', '#cc59bdff', '#ff00eaff', '#ce67d1ff'][Math.floor(Math.random() * 5)],
                initialSpeed: speed
            });
        }
    }

// Função para atualizar as partículas (chame no loop principal)
function updateLoveParticles() {
    for (let i = loveParticles.length - 1; i >= 0; i--) {
        const p = loveParticles[i];
        
        // Física suave
        p.vy -= 0.01; // Flutuam para cima
        p.vx *= 0.98; // Resistência do ar
        p.vy *= 0.98;
        
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        
        // Fade out lento
        p.life -= 0.004;
        
        // Remover partículas mortas
        if (p.life <= 0) {
            loveParticles.splice(i, 1);
        }
    }
}

// Função para desenhar os corações (chame após desenhar as baleias)
function drawLoveParticles() {
    for (const p of loveParticles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        drawHeart(p.size, p.color);
        
        ctx.restore();
    }
}

// Função para desenhar um coração
function drawHeart(size, color) {
    const s = size / 20;
    
    // Coração preenchido
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, s * 5);
    
    // Lado esquerdo
    ctx.bezierCurveTo(-s * 10, s * -2, -s * 15, s * 5, -s * 8, s * 12);
    ctx.bezierCurveTo(-s * 5, s * 15, 0, s * 18, 0, s * 5);
    
    // Lado direito
    ctx.bezierCurveTo(0, s * 18, s * 5, s * 15, s * 8, s * 12);
    ctx.bezierCurveTo(s * 15, s * 5, s * 10, s * -2, 0, s * 5);
    ctx.closePath();
    ctx.fill();
    
    // Borda branca suave
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Brilho interno
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 3, s * 2, s * 3, 0, Math.PI * 2);
    ctx.fill();
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

// draw Sydney bubble anchored to whale1 (Bubbles)
function drawSydneyBubble() {
    if (!sydneyBubble.active) return;
    if (scenario !== 1) return; // only in Sydney
    const now = Date.now();
    const elapsed = now - sydneyBubble.startTime;
    if (elapsed > sydneyBubble.duration) { sydneyBubble.active = false; return; }

    const fadeIn = 200, fadeOut = 300;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > sydneyBubble.duration - fadeOut) alpha = Math.max(0, (sydneyBubble.duration - elapsed) / fadeOut);

    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const text = sydneyBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(80, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale1.y - whale1.size - bH - 8);

    // rounded rect
    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // text
    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw Splash's reaction bubble for Sydney (anchored to whale2)
function drawSplashSydneyBubble() {
    if (!splashSydneyBubble.active) return;
    if (scenario !== 1) return;
    const now = Date.now();
    const elapsed = now - splashSydneyBubble.startTime;
    if (elapsed > splashSydneyBubble.duration) { splashSydneyBubble.active = false; return; }

    const fadeIn = 200, fadeOut = 300;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > splashSydneyBubble.duration - fadeOut) alpha = Math.max(0, (splashSydneyBubble.duration - elapsed) / fadeOut);

    const x = whale2.x + Math.min(whale2.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const text = splashSydneyBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(80, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale2.y - whale2.size - bH - 8);

    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw Splash's short exultation bubble ("Woohoo!") anchored to whale2
function drawSplashJumpBubble() {
    if (!splashJumpBubble.active) return;
    const now = Date.now();
    const elapsed = now - splashJumpBubble.startTime;
    if (elapsed > splashJumpBubble.duration) { splashJumpBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > splashJumpBubble.duration - fadeOut) alpha = Math.max(0, (splashJumpBubble.duration - elapsed) / fadeOut);

    const x = whale2.x + Math.min(whale2.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const text = splashJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale2.y - whale2.size - bH - 8);

    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw Bubbles' second-jump bubble ("Big and brave!") anchored to whale1
function drawBubblesSecondJumpBubble() {
    if (!bubblesSecondJumpBubble.active) return;
    const now = Date.now();
    const elapsed = now - bubblesSecondJumpBubble.startTime;
    if (elapsed > bubblesSecondJumpBubble.duration) { bubblesSecondJumpBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > bubblesSecondJumpBubble.duration - fadeOut) alpha = Math.max(0, (bubblesSecondJumpBubble.duration - elapsed) / fadeOut);

    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const text = bubblesSecondJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale1.y - whale1.size - bH - 8);

    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw Bubbles' fourth-jump bubble (" One more!!!") anchored to whale1
function drawBubblesFourthJumpBubble() {
    if (!bubblesFourthJumpBubble.active) return;
    const now = Date.now();
    const elapsed = now - bubblesFourthJumpBubble.startTime;
    if (elapsed > bubblesFourthJumpBubble.duration) { bubblesFourthJumpBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > bubblesFourthJumpBubble.duration - fadeOut) alpha = Math.max(0, (bubblesFourthJumpBubble.duration - elapsed) / fadeOut);

    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const text = bubblesFourthJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale1.y - whale1.size - bH - 8);

    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw Splash's third-jump delayed bubble (activates after scheduledAt) anchored to whale2
function drawSplashThirdJumpBubble() {
    const now = Date.now();
    // if scheduled and time reached, activate
    if (!splashThirdJumpBubble.shown && splashThirdJumpBubble.scheduledAt && now >= splashThirdJumpBubble.scheduledAt) {
        splashThirdJumpBubble.shown = true;
        splashThirdJumpBubble.active = true;
        splashThirdJumpBubble.startTime = now;
        // play sound + flourish when it actually appears
        try { playBubbleSound(); bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() }); } catch (e) {}
    }
    if (!splashThirdJumpBubble.active) return;
    const elapsed = now - splashThirdJumpBubble.startTime;
    if (elapsed > splashThirdJumpBubble.duration) { splashThirdJumpBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > splashThirdJumpBubble.duration - fadeOut) alpha = Math.max(0, (splashThirdJumpBubble.duration - elapsed) / fadeOut);

    const x = whale2.x + Math.min(whale2.size * 0.6, 32);
    const maxW = Math.min(220, canvas.width * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.012))}px system-ui, sans-serif`;
    const text = splashThirdJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale2.y - whale2.size - bH - 8);

    const radius = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw Splash bubble that appears after both whales do 5 jumps (scheduled)
function drawSplashAfterBothFiveBubble() {
    const now = Date.now();
    if (!splashAfterBothFiveBubble.shown && splashAfterBothFiveBubble.scheduledAt && now >= splashAfterBothFiveBubble.scheduledAt) {
        splashAfterBothFiveBubble.shown = true;
        splashAfterBothFiveBubble.active = true;
        splashAfterBothFiveBubble.startTime = now;
        try { playBubbleSound(); bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() }); } catch (e) {}
    }
    if (!splashAfterBothFiveBubble.active) return;
    const elapsed = now - splashAfterBothFiveBubble.startTime;
    if (elapsed > splashAfterBothFiveBubble.duration) { splashAfterBothFiveBubble.active = false; return; }
    const fadeIn = 300, fadeOut = 400;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > splashAfterBothFiveBubble.duration - fadeOut) alpha = Math.max(0, (splashAfterBothFiveBubble.duration - elapsed) / fadeOut);

    const x = whale2.x + Math.min(whale2.size * 0.6, 32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(14, Math.round(canvas.width * 0.013))}px system-ui, sans-serif`;
    const text = splashAfterBothFiveBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 10;
    // Prefer a width that fits the text plus padding, but don't exceed the canvas width
    const availableW = Math.max(120, canvas.width - 16);
    const desiredW = Math.round(textW) + padding * 2 + 20; // extra breathing room
    const bW = Math.min(availableW, Math.max(desiredW, 100));
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.2);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > canvas.width - 8) bX = canvas.width - bW - 8;
    let bY = Math.max(8, whale2.y - whale2.size - bH - 8);

    const radius = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bX + radius, bY);
    ctx.arcTo(bX + bW, bY, bX + bW, bY + bH, radius);
    ctx.arcTo(bX + bW, bY + bH, bX, bY + bH, radius);
    ctx.arcTo(bX, bY + bH, bX, bY, radius);
    ctx.arcTo(bX, bY, bX + bW, bY, radius);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    ctx.fillText(text, bX + padding, bY + padding);
    ctx.restore();
}

// draw short-lived flourishes when bubbles appear
function drawBubbleFlourishes() {
    if (!bubbleFlourishes || bubbleFlourishes.length === 0) return;
    const now = Date.now();
    // lifespan in ms
    const life = 420;
    for (let i = bubbleFlourishes.length - 1; i >= 0; i--) {
        const f = bubbleFlourishes[i];
        const t = now - f.t;
        if (t > life) { bubbleFlourishes.splice(i, 1); continue; }
        const p = t / life;
        const alpha = 1 - p;
        const radius = 6 + (1 - p) * 18;
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.4, 'rgba(150,220,255,0.6)');
        grad.addColorStop(1, 'rgba(150,220,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// compatibility wrapper: previously the bubble drawer was renamed to dialogue2
// Some call sites may still expect `dialogue2` — forward to the real function.
function dialogue2() {
    try { return drawKikiBubble(); } catch (e) { /* if drawKikiBubble is missing, fail silently */ }
}

function updateBaby() {
    if (!baby || !baby.mother) return;
    const m = baby.mother;

    if (baby.opacity < 1) {
        baby.opacity += 0.007; // FADE IN DO BEBÊ AQUI LINDA (quanto menor, mais devagar)
    }
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

    if (!__loopStarted) { __loopStarted = true; try { console.debug && console.debug('game loop started'); } catch (e) {} }

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
    updateLoveParticles();
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

    // Splash reaction bubble in Sydney: when Bubbles (whale1) has done 1 jump,
    // show Splash's line once (anchored to whale2)
    try {
        if (scenario === 1 && !splashSydneyBubble.triggered && whale1.jumpsDone >= 1) {
            splashSydneyBubble.triggered = true;
            splashSydneyBubble.shown = true;
            splashSydneyBubble.active = true;
            splashSydneyBubble.startTime = now;
            // small audio/visual feedback consistent with other bubbles
            try { playBubbleSound(); bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() }); } catch (e) {}
        }
    } catch (e) {}

    // Splash's own jump bubble: when Splash (whale2) completes 1 jump, show 'Woohoo!' for 2s
    try {
        if (!splashJumpBubble.triggered && whale2.jumpsDone >= 1) {
            splashJumpBubble.triggered = true;
            splashJumpBubble.shown = true; splashJumpBubble.active = true; splashJumpBubble.startTime = now;
            try { playBubbleSound(); bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() }); } catch (e) {}
        }
    } catch (e) {}

    // Bubbles' second-jump bubble: when Bubbles (whale1) completes 2 jumps, show 'Big and brave!' for 2s
    try {
        if (!bubblesSecondJumpBubble.triggered && whale1.jumpsDone >= 2) {
            bubblesSecondJumpBubble.triggered = true;
            bubblesSecondJumpBubble.shown = true; bubblesSecondJumpBubble.active = true; bubblesSecondJumpBubble.startTime = now;
            try { playBubbleSound(); bubbleFlourishes.push({ x: whale1.x, y: whale1.y - (whale1.size || 40), t: Date.now() }); } catch (e) {}
        }
    } catch (e) {}

    // Bubbles' fourth-jump bubble: when Bubbles (whale1) completes 4 jumps, show ' One more!!!' for 2s
    try {
        if (!bubblesFourthJumpBubble.triggered && whale1.jumpsDone >= 4) {
            bubblesFourthJumpBubble.triggered = true;
            bubblesFourthJumpBubble.shown = true; bubblesFourthJumpBubble.active = true; bubblesFourthJumpBubble.startTime = now;
            try { playBubbleSound(); bubbleFlourishes.push({ x: whale1.x, y: whale1.y - (whale1.size || 40), t: Date.now() }); } catch (e) {}
        }
    } catch (e) {}

    // Splash after both whales have done 5 jumps: schedule Splash bubble to appear 1s later and last 5s
    try {
        if (!splashAfterBothFiveBubble.triggered && whale1.jumpsDone >= 5 && whale2.jumpsDone >= 5) {
            splashAfterBothFiveBubble.triggered = true;
            splashAfterBothFiveBubble.scheduledAt = now + 1000; // show after 1 second
        }
    } catch (e) {}

    // Splash's third-jump bubble: schedule "Again!!!!" to appear 2s after Splash (whale2) does 3 jumps
    try {
        if (!splashThirdJumpBubble.triggered && whale2.jumpsDone >= 3) {
            splashThirdJumpBubble.triggered = true;
            splashThirdJumpBubble.scheduledAt = now + 2000; // ms
        }
    } catch (e) {}

    drawEntities();
    // Draw canvas speech bubbles after entities so they overlay whales
    drawSpeechBubbles();
    // draw Bubbles/Kiki bubble after other bubbles so it overlays appropriately
    dialogue2();
    // draw Sydney-specific bubble (Bubbles) if active
    try { drawSydneyBubble(); } catch (e) { /* ignore if not available */ }
    // draw Splash's reaction bubble in Sydney if active
    try { drawSplashSydneyBubble(); } catch (e) {}
    // draw Splash's short jump bubble if active
    try { drawSplashJumpBubble(); } catch (e) {}
    // draw Bubbles' second-jump bubble if active
    try { drawBubblesSecondJumpBubble(); } catch (e) {}
    // draw Splash's third-jump delayed bubble if scheduled/active
    try { drawSplashThirdJumpBubble(); } catch (e) {}
    // draw Bubbles' fourth-jump bubble if active
    try { drawBubblesFourthJumpBubble(); } catch (e) {}
    // draw Splash's bubble after both whales reach 5 jumps (if scheduled/active)
    try { drawSplashAfterBothFiveBubble(); } catch (e) {}
    // small visual flourishes for bubble pops
    try { drawBubbleFlourishes(); } catch (e) {}
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