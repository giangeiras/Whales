import { spawnKrill } from '../entities/krill.js';
import { spawnFish } from '../entities/fish.js';
import { spawnSeagulls } from '../entities/seagulls.js';
import { spawnCorals } from '../entities/corals.js';
import { whale1, whale2, baby } from '../game.js';
import { canvas } from '../utils/canvas.js';

export let scenario = 0; // 0: Antarctica, 1: Sydney, 2: Warmer Waters
export const titles = ["Antarctica", "Sydney", "Warmer Waters"];

export function setScenario(newScenario) {
    scenario = newScenario;
}

export function initScenario(s) {
    // Reset whales
    whale1.krillEaten = 0;
    whale1.jumpsDone = 0;
    whale1.joined = false;
    whale2.krillEaten = 0;
    whale2.jumpsDone = 0;
    whale2.joined = false;

    // Spawn appropriate entities for each scenario
    if (s === 0) { // Antarctica
        spawnKrill(28);
        spawnFish(0);
        spawnSeagulls(0);
        spawnCorals(0);
    } else if (s === 1) { // Sydney
        spawnKrill(0);
        spawnFish(0);
        spawnSeagulls(6);
        spawnCorals(0);
    } else { // Warm waters
        spawnKrill(0);
        spawnFish(10);
        spawnSeagulls(4);
        spawnCorals(0);
    }

    // Position whales
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

function setScenarioMessaging(s) {
    const eduEl = document.getElementById("edu");
    const hintEl = document.getElementById("hint");

    if (s === 0) {
        eduEl.innerHTML = "Humpback whales feed on tiny krill in the icy waters of Antarctica to build fat reserves for their long swim north.";
        hintEl.textContent = "Mission hint: Guide the whales with your fingers and help them to eat enough krill to start their journey to warmer seas.";
        hintEl.style.color = "#000";
        hintEl.style.textShadow = "none";
    } else if (s === 1) {
        eduEl.innerHTML = "As humpbacks travel north past Sydney, they often leap out of the water, a behaviour called <em>breaching</em>. Scientists think whales breach to communicate, remove parasites, or show strength to other whales.";
        hintEl.textContent = "Mission hint: Guide the whales to the surface to make them jump! (tip: make them move a little down and then up again)";
        hintEl.style.color = "#fff";
        hintEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.45)";
    } else {
        eduEl.innerHTML = "In the warm northern waters, humpback whales mate and give birth to their calves. Warm, calm seas protect newborns as their mothers teach them to swim and breathe.";
        hintEl.textContent = "Mission hint: Guide the whales close together, it's time to welcome a new calf!";
        hintEl.style.color = "#fff";
        hintEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.45)";
    }
}