import { Whale } from './entities/whale.js';
import { initScenario, scenario, setScenario } from './scenarios/scenarioManager.js';
import { canvas, ctx, seaLevel, resize } from './utils/canvas.js';
import { updateHUD } from './ui/hud.js';
import { drawLeftArrow, drawEdgeHint } from './ui/arrows.js';

let whale1, whale2;
let baby = null;
let missionReady = false;

export function initGame() {
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

export function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    missionReady = isMissionComplete();
    
    // Update entities
    whale1.update();
    whale2.update();
    
    if (scenario === 2 && !baby) {
        const d = Math.hypot(whale1.x-whale2.x, whale1.y-whale2.y);
        if (d < Math.min(whale1.size, whale2.size) * 0.8) spawnBaby();
    }
    if (baby) updateBaby();
    
    // Draw everything
    drawBackground();
    drawEntities();
    updateHUD();
    
    if (missionReady) {
        drawLeftArrow();
        drawEdgeHint();
        checkScenarioAdvance();
    }
    
    requestAnimationFrame(gameLoop);
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

export { whale1, whale2, baby };