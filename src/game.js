import { Whale } from './entities/whale.js';
import { canvas, ctx, seaLevel, resize, W, H, DPR } from './utils/canvas.js';
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

// Warmer-waters bubble for Bubbles (whale1) shown after warmer-waters modal is dismissed.
// This bubble stays active until the whales swim close together (handled in draw).
let warmerBubble = {
    text: "It's time. Swim close to me.",
    shown: false,
    active: false,
    startTime: 0,
    triggered: false
};

// Sky banner shown after a calf is born: typewriter animation in the sky area
let skyBanner = {
    text: 'A calf is born! Warm northern seas are perfect for babies.',
    shown: false,
    active: false,
    startTime: 0,
    typingSpeed: 45, // ms per character
    displayDuration: 6000, // ms to keep full text visible after typing
    finished: false,
    finishTime: 0
};

// Second sky banner to appear shortly after the first one hides
let skyBanner2 = {
    text: "The pod is complete! Let's have a gentle swim before saying goodbye?",
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    typingSpeed: 45,
    displayDuration: 5000,
    finished: false,
    finishTime: 0
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

// Baby-announce bubbles: appear shortly after the calf is born
let splashBabyBubble = {
    text: 'Welcome, tiny swimmer.',
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    duration: 4000,
    triggered: false
};

let bubblesBabyBubble = {
    text: 'Stay by my side, little one.',
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    duration: 4000,
    triggered: false
};

// Final thank-you bubbles shown after the second sky banner finishes
let finalBubblesBubble = {
    text: 'Thank you for helping our family.',
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    duration: 4000,
    triggered: false
};

let finalSplashBubble = {
    text: 'You guided us well. Farewell, friend!',
    shown: false,
    active: false,
    startTime: 0,
    scheduledAt: 0,
    duration: 4000,
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

// end-of-sequence visual/audio state
let endSequenceTriggered = false;
let cameraEase = {
    active: false,
    startTime: 0,
    duration: 1600,
    from: 1,
    to: 0.92
};
let currentCameraScale = 1;

let endSceneFrozen = false;

let gradientTransition = {
    active: false,
    startTime: 0,
    duration: 8000,
    speed: 0.6,
    intensity: 0.95,
    // crossfade duration in ms for smooth transition from game -> gradient
    crossfadeDuration: 4000,
    finished: false,
    // typewriter text shown during the final gradient
    text: "Thank you for playing :) Whales say thanks.",
    typingSpeed: 55, // ms per character
    typeStartTime: 0,
    typeStarted: false
};

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
// corals image removed for final scene; do not load external asset
coralsImg.src = '';

function initGame() {
    window.addEventListener("resize", resize, {passive: true});
    resize();

    whale1 = new Whale(W/2, seaLevel + 200,
        {up:'w', down:'s', left:'a', right:'d', jump:'t'},
        {body1:'#0a4770', body2:'#0c628f', tail:'#093e5f'}
    );
    
    whale2 = new Whale(W/2 + 180, seaLevel + 260,
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
    // reset sky banners
    if (typeof skyBanner !== 'undefined') { skyBanner.shown = false; skyBanner.active = false; skyBanner.startTime = 0; skyBanner.finished = false; skyBanner.finishTime = 0; }
    if (typeof skyBanner2 !== 'undefined') { skyBanner2.shown = false; skyBanner2.active = false; skyBanner2.startTime = 0; skyBanner2.scheduledAt = 0; skyBanner2.finished = false; skyBanner2.finishTime = 0; }
    // reset baby-announcement bubbles
    splashBabyBubble.shown = false; splashBabyBubble.active = false; splashBabyBubble.startTime = 0; splashBabyBubble.scheduledAt = 0; splashBabyBubble.triggered = false;
    bubblesBabyBubble.shown = false; bubblesBabyBubble.active = false; bubblesBabyBubble.startTime = 0; bubblesBabyBubble.scheduledAt = 0; bubblesBabyBubble.triggered = false;

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
        // show warmer waters intro modal which invites players to visit the newborn calf
        try { showWarmerModal(); } catch (e) {}
    }

    // position whales
    const centerX = W / 2;
    const horizSpacing = Math.max(whale1.size, 120);
    whale1.x = centerX - horizSpacing;
    whale2.x = centerX + horizSpacing;
    whale1.y = H / 2;
    whale2.y = H / 2 + Math.min(whale2.size * 0.35, 40);
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
    // style to match Sydney modal (compact, centered)
    Object.assign(modal.style, {
        position: 'fixed', left: '50%', top: '35%', transform: 'translate(-50%, -50%)',
        zIndex: 100001, background: 'rgba(255,255,255,0.95)', color: '#000', padding: '20px 28px',
        borderRadius: '10px', maxWidth: '420px', width: 'min(80vw, 420px)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', lineHeight: '1.35', textAlign: 'center'
    });

    // (no close button — modal must be dismissed with the "x" key)
    // message element for the modal
    const msg = document.createElement('div');
    msg.id = 'antarctica-modal-text';
    // emphasize the action phrases so they stand out in the intro modal
    msg.innerHTML = "Guide the pair to <strong>eat krills</strong> in Antarctica so they can <strong>build energy</strong> for their <strong>long swim north to warmer seas</strong>.";
    // ensure message wraps nicely and is centered like Sydney modal; cap visually to ~3 lines
    Object.assign(msg.style, {
        whiteSpace: 'normal',
        overflowWrap: 'break-word',
        textAlign: 'center',
        maxHeight: '66px',
        overflow: 'hidden',
        color: '#1a8fc9'
    });
    modal.appendChild(msg);

    const hint = document.createElement('div');
    hint.id = 'antarctica-modal-hint';
    hint.textContent = "Press 'X' to continue";
    // Rounded transparent hint matching Sydney modal
    Object.assign(hint.style, {
        margin: '12px auto 0', fontSize: '13px', opacity: '0.95', textAlign: 'center',
        background: '#1a8fc9', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '8px', padding: '6px 10px',
        display: 'inline-block', boxSizing: 'border-box', color: '#ffffff'
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
        position: 'fixed', left: '50%', top: '35%', transform: 'translate(-50%, -50%)',
        zIndex: 100001, background: 'rgba(255,255,255,0.95)', color: '#000', padding: '20px 28px',
        borderRadius: '10px', maxWidth: '420px', width: 'min(80vw, 420px)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', lineHeight: '1.35', textAlign: 'center'
    });

    const msg = document.createElement('div');
    msg.id = 'sydney-modal-text';
    // allow natural wrapping and center the text; cap visually to ~3 lines with maxHeight
    // add emphasis to important phrases
    msg.innerHTML = "Let's help the whales <strong>pop up and jump</strong> near Sydney! That jump is called a <strong>breach</strong>. They might be saying hello, getting rid of itchy bugs, or showing they're strong.";
    Object.assign(msg.style, {
        whiteSpace: 'normal',
        overflowWrap: 'break-word',
        textAlign: 'center',
        maxHeight: '66px', // ~3 lines at 16px font + line-height
        overflow: 'hidden',
        color: '#1a8fc9'
    });
    modal.appendChild(msg);

    const hint = document.createElement('div');
    hint.id = 'sydney-modal-hint';
    hint.textContent = "Press 'X' to continue";
    Object.assign(hint.style, {
        margin: '12px auto 0', fontSize: '13px', opacity: '0.95', textAlign: 'center',
        background: '#1a8fc9', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '8px', padding: '6px 10px',
        display: 'inline-block', boxSizing: 'border-box', color: '#ffffff'
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

// Warmer-waters intro modal: appears when entering the warmer seas scenario and blocks interactions
function createWarmerModal() {
    if (document.getElementById('warmer-modal')) return;
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
    modal.id = 'warmer-modal';
    Object.assign(modal.style, {
        position: 'fixed', left: '50%', top: '35%', transform: 'translate(-50%, -50%)',
        zIndex: 100001, background: 'rgba(255,255,255,0.95)', color: '#000', padding: '20px 28px',
        borderRadius: '10px', maxWidth: '420px', width: 'min(80vw, 420px)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', lineHeight: '1.35', textAlign: 'center'
    });

    const msg = document.createElement('div');
    msg.id = 'warmer-modal-text';
    // message for warmer waters
    msg.innerHTML = 'In the warm northern seas, mums and dads stay close to welcome a newborn calf. <strong>Guide the whales together to say hello to the baby.</strong>';
    Object.assign(msg.style, {
        whiteSpace: 'normal',
        overflowWrap: 'break-word',
        textAlign: 'center',
        maxHeight: '66px',
        overflow: 'hidden',
        color: '#1a8fc9'
    });
    modal.appendChild(msg);

    const hint = document.createElement('div');
    hint.id = 'warmer-modal-hint';
    hint.textContent = "Press 'X' to continue";
    Object.assign(hint.style, {
        margin: '12px auto 0', fontSize: '13px', opacity: '0.95', textAlign: 'center',
        background: '#1a8fc9', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '8px', padding: '6px 10px',
        display: 'inline-block', boxSizing: 'border-box', color: '#ffffff'
    });
    modal.appendChild(hint);

    modal.__keyHandler = (e) => { if (!e) return; if (e.key && e.key.toLowerCase() === 'x') hideWarmerModal(); };

    document.body.appendChild(modal);
}

function showWarmerModal() {
    createWarmerModal();
    const modal = document.getElementById('warmer-modal');
    if (!modal) return;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'block';
    modal.style.display = 'block';
    try { window.modalDialogActive = true; window.warmerDialogActive = true; } catch (e) {}
    window.addEventListener('keydown', modal.__keyHandler);
}

function hideWarmerModal() {
    const modal = document.getElementById('warmer-modal');
    if (!modal) return;
    modal.style.display = 'none';
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    try { window.modalDialogActive = false; window.warmerDialogActive = false; } catch (e) {}
    // Activate Bubbles' warmer-waters bubble when the modal is dismissed
    try {
        if (!warmerBubble.shown) {
            warmerBubble.shown = true;
            warmerBubble.active = true;
            warmerBubble.startTime = Date.now();
            warmerBubble.triggered = true;
            try { playBubbleSound(); bubbleFlourishes.push({ x: whale1.x, y: whale1.y - (whale1.size || 40), t: Date.now() }); } catch (e) {}
        }
    } catch (e) { /* ignore if warmerBubble undefined */ }
    if (modal.__keyHandler) window.removeEventListener('keydown', modal.__keyHandler);
}

function drawBackground() {
    const w = W, h = H;
    // draw regular background (sky is provided by the image behind the canvas)

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
            const imgW = coralsImg.naturalWidth || W;
            const imgH = coralsImg.naturalHeight || Math.floor(H * 0.18);
            // scale image to canvas width while preserving aspect ratio
            const scale = W / imgW;
            const drawH = imgH * scale;
            // subtle vertical sway based on time (slow sine) — amplitude is small and scales with canvas height
            const t = Date.now() / 1000; // seconds
            const amp = Math.max(3, Math.min(10, H * 0.008));
            const sway = Math.sin(t * 0.6) * amp; // slow gentle motion
            const drawY = H - drawH + sway;
            try { ctx.drawImage(coralsImg, 0, drawY, W, drawH); } catch (e) { /* ignore draw errors */ }
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
    const fontSize = Math.max(10, Math.round(W * 0.014));
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
            const y = Math.min(H - 8, whale1.y + yOff);
            ctx.strokeText(whale1.name, x, y);
            ctx.fillText(whale1.name, x, y);
        }

        if (whale2 && whale2.name) {
            const yOff = (whale2.size || 40) * 0.9;
            const x = whale2.x;
            const y = Math.min(H - 8, whale2.y + yOff);
            ctx.strokeText(whale2.name, x, y);
            ctx.fillText(whale2.name, x, y);
        }

        if (baby && baby.name) {
            const yOff = (baby.size || 30) * 0.9;
            const x = baby.x;
            const y = Math.min(H - 8, baby.y + yOff);
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
    const maxW = Math.min(180, W * 0.28);
            ctx.save();
            ctx.globalAlpha = alpha;

            // prepare text wrap and respect explicit newlines
            ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
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
            if (bX + bW > W - 8) bX = W - bW - 8;
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
        // trigger sky banner announcing the calf birth
        try {
            skyBanner.shown = true;
            skyBanner.active = true;
            skyBanner.startTime = Date.now();
            skyBanner.finished = false;
            skyBanner.finishTime = 0;
            // schedule baby-related speech bubbles: Splash after 2s, Bubbles after 3s
            const now = Date.now();
            splashBabyBubble.scheduledAt = now + 2000;
            splashBabyBubble.triggered = false; splashBabyBubble.shown = false; splashBabyBubble.active = false; splashBabyBubble.startTime = 0;
            bubblesBabyBubble.scheduledAt = now + 3000;
            bubblesBabyBubble.triggered = false; bubblesBabyBubble.shown = false; bubblesBabyBubble.active = false; bubblesBabyBubble.startTime = 0;
        } catch (e) { /* ignore if skyBanner missing */ }
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
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
    if (bX + bW > W - 8) bX = W - bW - 8;
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = sydneyBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(80, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = splashSydneyBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(80, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

// draw warm-waters bubble anchored to whale1 (Bubbles). This bubble remains
// visible until the two whales are close together.
function drawWarmerBubble() {
    if (!warmerBubble.active) return;
    if (scenario !== 2) return; // only in warmer waters
    const now = Date.now();
    const elapsed = now - warmerBubble.startTime;

    // determine if whales are close enough to dismiss the bubble
    try {
        const d = Math.hypot(whale1.x - whale2.x, whale1.y - whale2.y);
        const closeThreshold = Math.min(whale1.size || 40, whale2.size || 40) * 0.8;
        if (d <= closeThreshold) {
            // they are close enough — hide the bubble
            warmerBubble.active = false;
            warmerBubble.shown = false;
            return;
        }
    } catch (e) {
        // if whales are undefined for some reason, just bail out
        return;
    }

    // simple fade-in for a little polish
    const fadeIn = 220;
    let alpha = Math.min(1, Math.max(0.15, elapsed / fadeIn));

    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(260, W * 0.36);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(13, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = warmerBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(100, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

    // tail triangle pointing downwards toward the whale
    ctx.beginPath();
    const tailX = Math.min(whale1.x + 8, bX + bW - 12);
    ctx.moveTo(tailX, bY + bH);
    ctx.lineTo(tailX + 8, bY + bH + 12);
    ctx.lineTo(tailX + 18, bY + bH);
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = splashJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = bubblesSecondJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = bubblesFourthJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = splashThirdJumpBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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
    ctx.font = `${Math.max(14, Math.round(W * 0.013))}px system-ui, sans-serif`;
    const text = splashAfterBothFiveBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 10;
    // Prefer a width that fits the text plus padding, but don't exceed the canvas width
    const availableW = Math.max(120, W - 16);
    const desiredW = Math.round(textW) + padding * 2 + 20; // extra breathing room
    const bW = Math.min(availableW, Math.max(desiredW, 100));
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.2);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

// draw Splash baby-welcome bubble: scheduled activation after baby spawn, anchored to whale2
function drawSplashBabyBubble() {
    const now = Date.now();
    if (!splashBabyBubble.shown && splashBabyBubble.scheduledAt && now >= splashBabyBubble.scheduledAt) {
        splashBabyBubble.shown = true;
        splashBabyBubble.active = true;
        splashBabyBubble.startTime = now;
        try { playBubbleSound(); bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() }); } catch (e) {}
    }
    if (!splashBabyBubble.active) return;
    const elapsed = now - splashBabyBubble.startTime;
    if (elapsed > splashBabyBubble.duration) { splashBabyBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > splashBabyBubble.duration - fadeOut) alpha = Math.max(0, (splashBabyBubble.duration - elapsed) / fadeOut);
    const x = whale2.x + Math.min(whale2.size * 0.6, 32);
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = splashBabyBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

// draw Bubbles baby-welcome bubble: scheduled activation after baby spawn, anchored to whale1
function drawBubblesBabyBubble() {
    const now = Date.now();
    if (!bubblesBabyBubble.shown && bubblesBabyBubble.scheduledAt && now >= bubblesBabyBubble.scheduledAt) {
        bubblesBabyBubble.shown = true;
        bubblesBabyBubble.active = true;
        bubblesBabyBubble.startTime = now;
        try { playBubbleSound(); bubbleFlourishes.push({ x: whale1.x, y: whale1.y - (whale1.size || 40), t: Date.now() }); } catch (e) {}
    }
    if (!bubblesBabyBubble.active) return;
    const elapsed = now - bubblesBabyBubble.startTime;
    if (elapsed > bubblesBabyBubble.duration) { bubblesBabyBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > bubblesBabyBubble.duration - fadeOut) alpha = Math.max(0, (bubblesBabyBubble.duration - elapsed) / fadeOut);
    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(220, W * 0.32);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = bubblesBabyBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(60, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

// draw final Bubbles thank-you bubble: scheduled after second sky banner
function drawFinalBubblesBubble() {
    const now = Date.now();
    if (!finalBubblesBubble.shown && finalBubblesBubble.scheduledAt && now >= finalBubblesBubble.scheduledAt) {
        finalBubblesBubble.shown = true;
        finalBubblesBubble.active = true;
        finalBubblesBubble.startTime = now;
        try { playBubbleSound(); bubbleFlourishes.push({ x: whale1.x, y: whale1.y - (whale1.size || 40), t: Date.now() }); } catch (e) {}
    }
    if (!finalBubblesBubble.active) return;
    const elapsed = now - finalBubblesBubble.startTime;
    if (elapsed > finalBubblesBubble.duration) { finalBubblesBubble.active = false; return; }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > finalBubblesBubble.duration - fadeOut) alpha = Math.max(0, (finalBubblesBubble.duration - elapsed) / fadeOut);
    const x = whale1.x + Math.min(whale1.size * 0.6, 32);
    const maxW = Math.min(260, W * 0.36);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = finalBubblesBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(80, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

// draw final Splash farewell bubble: scheduled after second sky banner (+2s)
function drawFinalSplashBubble() {
    const now = Date.now();
    if (!finalSplashBubble.shown && finalSplashBubble.scheduledAt && now >= finalSplashBubble.scheduledAt) {
        finalSplashBubble.shown = true;
        finalSplashBubble.active = true;
        finalSplashBubble.startTime = now;
        try { playBubbleSound(); bubbleFlourishes.push({ x: whale2.x, y: whale2.y - (whale2.size || 40), t: Date.now() }); } catch (e) {}
    }
    if (!finalSplashBubble.active) return;
    const elapsed = now - finalSplashBubble.startTime;
    if (elapsed > finalSplashBubble.duration) {
        finalSplashBubble.active = false;
        // Trigger end sequence (camera ease, whale song, gradient) once
        try {
            if (!endSequenceTriggered) {
                endSequenceTriggered = true;
                startEndSequence();
            }
        } catch (e) {}
        return;
    }
    const fadeIn = 120, fadeOut = 160;
    let alpha = 1;
    if (elapsed < fadeIn) alpha = elapsed / fadeIn;
    else if (elapsed > finalSplashBubble.duration - fadeOut) alpha = Math.max(0, (finalSplashBubble.duration - elapsed) / fadeOut);
    const x = whale2.x + Math.min(whale2.size * 0.6, 32);
    const maxW = Math.min(260, W * 0.36);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(12, Math.round(W * 0.012))}px system-ui, sans-serif`;
    const text = finalSplashBubble.text;
    const textW = ctx.measureText(text).width;
    const padding = 8;
    const bW = Math.min(maxW, Math.max(80, Math.round(textW))) + padding * 2;
    const lineHeight = Math.ceil(parseInt(ctx.font,10) * 1.05);
    const bH = lineHeight + padding * 2;
    let bX = x;
    if (bX + bW > W - 8) bX = W - bW - 8;
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

// Draw a moving soft gradient overlay (used for the end-of-sequence screen)
function drawGradientOverlay(blend) {
    if (!gradientTransition || !gradientTransition.active) return;
    const now = Date.now();
    const w = W, h = H;

    // blend: when provided, use it (0..1). Otherwise fall back to automatic timing
    let alpha = gradientTransition.intensity;
    if (typeof blend === 'number') {
        alpha = gradientTransition.intensity * Math.max(0, Math.min(1, blend));
    } else {
        const t = Math.max(0, now - gradientTransition.startTime);
        const fadeIn = Math.min(1500, gradientTransition.crossfadeDuration);
        if (t < fadeIn) alpha = gradientTransition.intensity * (t / fadeIn);
    }

    // base vertical gradient (full-screen background)
    const baseShift = Math.sin((now / 1000) * (gradientTransition.speed * 0.4)) * 40;
    const base = ctx.createLinearGradient(0, 0 + baseShift, 0, h + baseShift);
    base.addColorStop(0, '#37beefff');
    base.addColorStop(0.3, '#d7f3ff');
    base.addColorStop(0.6, '#13a387ff');
    base.addColorStop(1, '#1f7fb0');

    // To guarantee full coverage even with any transforms, draw the gradient
    // and blobs into an offscreen canvas slightly larger than the viewport,
    // then blit it centered onto the main canvas.
    const margin = 0.18; // 18% extra on each dimension
    const offW = Math.ceil(w * (1 + margin));
    const offH = Math.ceil(h * (1 + margin));
    const off = document.createElement('canvas');
    off.width = offW; off.height = offH;
    const octx = off.getContext('2d');

    // base gradient on offscreen
    const baseShiftOff = Math.sin((now / 1000) * (gradientTransition.speed * 0.4)) * 40;
    const baseOff = octx.createLinearGradient(0, 0 + baseShiftOff, 0, offH + baseShiftOff);
    // gently animate the gradient colors over time by shifting a hue base
    const hueBase = 195 + Math.sin(now / 8000) * 18; // slow oscillation
    baseOff.addColorStop(0, `hsla(${Math.round(hueBase)}, 85%, 55%, 1)`);
    baseOff.addColorStop(0.3, `hsla(${Math.round(hueBase + 18)}, 95%, 96%, 1)`);
    baseOff.addColorStop(0.6, `hsla(${Math.round(hueBase - 24)}, 60%, 40%, 1)`);
    baseOff.addColorStop(1, `hsla(${Math.round(hueBase - 6)}, 55%, 35%, 1)`);
    octx.fillStyle = baseOff;
    octx.fillRect(0, 0, offW, offH);

    // blobs on offscreen
    const blobCount = 9;
    // compute per-blob gentle color variations from the hue base
    function blobColor(i, a) {
        const h = Math.round(hueBase + (i - blobCount/2) * 6 + Math.sin(now/1300 + i) * 6);
        const s = 85 - Math.abs(i - blobCount/2) * 3;
        const l = 92 - Math.abs(i - blobCount/2) * 6;
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }
    const globalDriftX = Math.sin(now / 4500) * (offW * 0.02);
    const globalDriftY = Math.cos(now / 5200) * (offH * 0.02);
    for (let i = 0; i < blobCount; i++) {
        const speed = 0.08 + (i * 0.02);
        const phase = (now / 1000) * (speed) + (i * 0.9);
        const bx = 0.12 + 0.76 * ((i * 1.37) % blobCount) / blobCount;
        const by = 0.18 + 0.64 * ((blobCount - i) / blobCount);

        const cxB = bx * offW + globalDriftX + Math.cos(phase * (0.6 + i * 0.07)) * (offW * (0.06 + i * 0.01));
        const cyB = by * offH + globalDriftY + Math.sin(phase * (0.7 + i * 0.06)) * (offH * (0.05 + i * 0.008));

        const radius = Math.max(120, Math.min(offW * 0.55, 520)) * (0.85 + 0.35 * Math.sin(phase * (0.9 + i * 0.03)));
        const g2 = octx.createRadialGradient(cxB, cyB, Math.max(8, radius * 0.02), cxB, cyB, radius);
    g2.addColorStop(0, blobColor(i, 0.30));
    g2.addColorStop(0.45, blobColor(i, 0.10));
        g2.addColorStop(1, 'rgba(6,30,60,0)');
        octx.globalCompositeOperation = 'lighter';
        octx.fillStyle = g2;
        octx.beginPath(); octx.arc(cxB, cyB, radius, 0, Math.PI * 2); octx.fill();
    }

    // blit offscreen to main canvas centered, using alpha blend
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(alpha, 1));
    const dx = -Math.round((offW - w) / 2);
    const dy = -Math.round((offH - h) / 2);
    ctx.drawImage(off, dx, dy, offW, offH);
    ctx.restore();

    // draw centered typewriter text on top of the gradient if configured
    try {
        if (gradientTransition && gradientTransition.typeStarted) {
            const txt = (typeof gradientTransition.text === 'string') ? gradientTransition.text : 'Thank you for playing with the whales :)';
            const t0 = gradientTransition.typeStartTime || gradientTransition.startTime || now;
            // do not render any text until the scheduled typeStartTime
            if (now >= t0) {
                const elapsedType = now - t0;
                const chars = Math.min(txt.length, Math.floor(elapsedType / Math.max(1, gradientTransition.typingSpeed || 55)));
                let toShow = txt.slice(0, chars);
                // blinking cursor while typing (only once typing has started)
                if (chars < txt.length) {
                    const blink = Math.floor(now / 400) % 2 === 0 ? '|' : ' ';
                    toShow = toShow + blink;
                }

                const fontSize = Math.max(14, Math.round(W * 0.036));
                ctx.save();
                ctx.font = `${fontSize}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // use requested text color and remove shadow for a clean look
                ctx.fillStyle = '#1f7fb0';
                // place text at the visual center of the canvas
                const y = Math.round(H / 2);
                // respect overall overlay alpha so text fades with the gradient
                ctx.globalAlpha = Math.max(0, Math.min(alpha, 1));
                ctx.fillText(toShow, Math.round(W / 2), y);
                ctx.restore();
            }
        }
    } catch (e) { /* non-fatal drawing error */ }
}

// (audio removed) end-of-sequence includes only camera ease and gradient overlay

// Kick off the end-of-sequence effects: camera zoom-out, gradient, and whale song
function startEndSequence() {
    try {
        cameraEase.active = true; cameraEase.startTime = Date.now(); currentCameraScale = cameraEase.from;
        gradientTransition.active = true; gradientTransition.startTime = Date.now(); gradientTransition.finished = false;
        // kick off typewriter text at the same time as the gradient
        // schedule typewriter to begin 2000ms after the gradient appears
        gradientTransition.typeStartTime = Date.now() + 2000;
        gradientTransition.typeStarted = true;
    } catch (e) {}
}

// Apply camera transform (scale about canvas center) if cameraEase is active
function applyCameraTransform() {
    const now = Date.now();
    if (!cameraEase || (!cameraEase.active && currentCameraScale === 1)) return false;
    const t = Math.min(1, (now - cameraEase.startTime) / Math.max(1, cameraEase.duration));
    // ease-out cubic
    const p = 1 - Math.pow(1 - t, 3);
    currentCameraScale = cameraEase.from + (cameraEase.to - cameraEase.from) * p;
    // once finished, keep final scale but mark inactive
    if (t >= 1) { cameraEase.active = false; }
    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(currentCameraScale, currentCameraScale);
    ctx.translate(-cx, -cy);
    return true;
}

// draw a single-line typewriter banner in the sky after a calf is born
function drawSkyBanner() {
    if (!skyBanner || !skyBanner.active || !skyBanner.shown) return;
    if (scenario !== 2) return; // only in warmer waters
    const now = Date.now();
    const elapsed = now - skyBanner.startTime;
    const total = skyBanner.text.length;
    // number of characters to show based on typingSpeed
    const chars = Math.min(total, Math.floor(elapsed / Math.max(1, skyBanner.typingSpeed)));
    let toShow = skyBanner.text.slice(0, chars);
    const fontSize = Math.max(16, Math.round(W * 0.02));
    ctx.save();
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // sky area: vertically place at roughly 35% of seaLevel (above the horizon), moved slightly down
    const y = Math.max(28, seaLevel * 0.35) + 20;
    const x = W / 2;
    // add a blinking cursor while typing
    if (chars < total) {
        const blink = Math.floor(now / 400) % 2 === 0 ? '|' : ' ';
        toShow = toShow + blink;
    }
    // draw the text without a shadow
    ctx.fillStyle = '#053e63';
    ctx.fillText(toShow, x, y);

    // if finished typing, schedule hide after displayDuration
    if (chars >= total) {
        if (!skyBanner.finished) {
            skyBanner.finished = true;
            skyBanner.finishTime = now;
        } else {
            if (now - skyBanner.finishTime > skyBanner.displayDuration) {
                skyBanner.active = false;
                skyBanner.shown = false;
                // schedule the second sky banner to appear 1s after the first finishes
                try {
                    if (skyBanner2 && !skyBanner2.scheduledAt) {
                        skyBanner2.scheduledAt = now + 1000;
                        skyBanner2.shown = false; skyBanner2.active = false; skyBanner2.finished = false; skyBanner2.finishTime = 0;
                    }
                } catch (e) {}
            }
        }
    }
    ctx.restore();
}

// draw the second sky banner (typewriter) when scheduled
function drawSkyBanner2() {
    if (!skyBanner2) return;
    const now = Date.now();
    // if scheduled and time reached, activate
    if (!skyBanner2.shown && skyBanner2.scheduledAt && now >= skyBanner2.scheduledAt) {
        skyBanner2.shown = true;
        skyBanner2.active = true;
        skyBanner2.startTime = now;
        skyBanner2.finished = false;
        skyBanner2.finishTime = 0;
    }
    if (!skyBanner2.active || !skyBanner2.shown) return;
    const elapsed = now - skyBanner2.startTime;
    const total = skyBanner2.text.length;
    const chars = Math.min(total, Math.floor(elapsed / Math.max(1, skyBanner2.typingSpeed)));
    let toShow = skyBanner2.text.slice(0, chars);
    const fontSize = Math.max(16, Math.round(W * 0.02));
    ctx.save();
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = Math.max(28, seaLevel * 0.35) + 20;
    const x = W / 2;
    if (chars < total) {
        const blink = Math.floor(now / 400) % 2 === 0 ? '|' : ' ';
        toShow = toShow + blink;
    }
    ctx.fillStyle = '#053e63';
    ctx.fillText(toShow, x, y);

    // if finished typing, schedule hide after displayDuration
    if (chars >= total) {
        if (!skyBanner2.finished) {
            skyBanner2.finished = true;
            skyBanner2.finishTime = now;
        } else {
            if (now - skyBanner2.finishTime > skyBanner2.displayDuration) {
                // schedule final thank-you bubbles once the second banner finishes
                try {
                    if (finalBubblesBubble && !finalBubblesBubble.scheduledAt) {
                        finalBubblesBubble.scheduledAt = now; // immediately after banner gone
                        finalBubblesBubble.shown = false; finalBubblesBubble.active = false; finalBubblesBubble.triggered = false; finalBubblesBubble.startTime = 0;
                    }
                    if (finalSplashBubble && !finalSplashBubble.scheduledAt) {
                        finalSplashBubble.scheduledAt = now + 2000; // 2s after banner gone
                        finalSplashBubble.shown = false; finalSplashBubble.active = false; finalSplashBubble.triggered = false; finalSplashBubble.startTime = 0;
                    }
                } catch (e) {}
                skyBanner2.active = false;
                skyBanner2.shown = false;
                skyBanner2.scheduledAt = 0;
            }
        }
    }
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
    baby.y = Math.min(H - baby.size*1.6, baby.y);
    baby.x = Math.max(-baby.size*3, Math.min(W + baby.size*3, baby.x));

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
    ctx.clearRect(0,0,W,H);

    if (!__loopStarted) { __loopStarted = true; try { console.debug && console.debug('game loop started'); } catch (e) {} }

    drawBackground();

    // (no early-return here) continue with normal updates; gradient overlay
    // will be drawn later in the loop to allow a smooth crossfade.

    // sky banners (typewriter) — first appears after calf birth, second is scheduled after the first
    try { drawSkyBanner(); } catch (e) {}
    try { drawSkyBanner2(); } catch (e) {}

    missionReady = isMissionComplete();

    // Entities + updates
    if (scenario === 0) {
        // krill handled inside drawEntities
    }

    // Update whales movement (skip if final scene has frozen)
    if (!endSceneFrozen) {
        whale1.update();
        whale2.update();
    }

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

    // Apply camera transform if the end sequence requested a gentle zoom-out
    let cameraPushed = false;
    try { cameraPushed = applyCameraTransform(); } catch (e) { cameraPushed = false; }

    // Draw entities (skip if final scene frozen)
    if (!endSceneFrozen) drawEntities();
    // Draw canvas speech bubbles after entities so they overlay whales
    drawSpeechBubbles();
    // draw Bubbles/Kiki bubble after other bubbles so it overlays appropriately
    dialogue2();
    // draw Sydney-specific bubble (Bubbles) if active
    try { drawSydneyBubble(); } catch (e) { /* ignore if not available */ }
    // draw warmer-waters bubble if active
    try { drawWarmerBubble(); } catch (e) {}
    // draw baby-welcome bubbles if scheduled/active
    try { drawSplashBabyBubble(); } catch (e) {}
    try { drawBubblesBabyBubble(); } catch (e) {}
    // draw final thank-you bubbles if scheduled/active
    try { drawFinalBubblesBubble(); } catch (e) {}
    try { drawFinalSplashBubble(); } catch (e) {}
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

    // If a gradient crossfade is active, compute progress and draw it on top
    if (gradientTransition && gradientTransition.active) {
        const now2 = Date.now();
        const elapsed = Math.max(0, now2 - gradientTransition.startTime);
        const dd = Math.max(1, gradientTransition.crossfadeDuration || 4000);
        let p = Math.min(1, elapsed / dd);
        // ease-out cubic for a smooth slow transition
        const eased = 1 - Math.pow(1 - p, 3);
        try { drawGradientOverlay(eased); } catch (e) {}
        // fade DOM overlays gradually
        const domOpacity = Math.max(0, 1 - eased);
        try { const sb = document.getElementById('sky-background'); if (sb) sb.style.opacity = domOpacity; } catch (e) {}
        try { const cnt = document.getElementById('counter'); if (cnt) cnt.style.opacity = domOpacity; } catch (e) {}
        try { const ttl = document.getElementById('title'); if (ttl) ttl.style.opacity = domOpacity; } catch (e) {}
        try { const overlay = document.getElementById('modal-overlay'); if (overlay) overlay.style.opacity = domOpacity; } catch (e) {}

        // once fully transitioned, mark finished and remove DOM elements from layout
        if (p >= 1 && !gradientTransition.finished) {
            gradientTransition.finished = true; endSceneFrozen = true;
            try { const sb = document.getElementById('sky-background'); if (sb) sb.style.display = 'none'; } catch (e) {}
            try { const cnt = document.getElementById('counter'); if (cnt) cnt.style.display = 'none'; } catch (e) {}
            try { const ttl = document.getElementById('title'); if (ttl) ttl.style.display = 'none'; } catch (e) {}
            try { const overlay = document.getElementById('modal-overlay'); if (overlay) overlay.style.display = 'none'; } catch (e) {}
        }
    }

    // restore camera transform (if applied) before drawing HUD/DOM overlays
    try { if (cameraPushed) ctx.restore(); } catch (e) {}

    // If end scene has frozen, skip HUD updates; otherwise update normally
    if (!endSceneFrozen) updateHUD(whale1, whale2, baby);

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