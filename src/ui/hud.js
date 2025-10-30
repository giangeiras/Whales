import { whale1, whale2 } from '../game.js';
import { scenario } from '../scenarios/scenarioManager.js';

export function updateHUD() {
    const counter = document.getElementById('counter');
    
    if (scenario === 0) {
        counter.innerHTML = `Whale1: ${whale1.krillEaten} / 10<br/>Whale2: ${whale2.krillEaten} / 10`;
    } else if (scenario === 1) {
        counter.innerHTML = `Whale1: ${whale1.jumpsDone} / 5 jumps<br/>Whale2: ${whale2.jumpsDone} / 5 jumps`;
    } else {
        const distance = Math.round(Math.hypot(whale1.x - whale2.x, whale1.y - whale2.y));
        counter.innerHTML = `Join the whales!<br/>Distance: ${distance} px`;
    }
}