import { canvas, ctx, seaLevel } from '../utils/canvas.js';

export let fish = [];

export function spawnFish(n = 12) {
    fish = [];
    for (let i = 0; i < n; i++) {
        fish.push({
            x: Math.random() * canvas.width,
            y: seaLevel + 80 + Math.random() * (canvas.height - seaLevel - 160),
            size: 6 + Math.random() * 8,
            speed: 0.6 + Math.random() * 1.2
        });
    }
}

export function updateFish() {
    for (let f of fish) {
        f.x -= f.speed;
        if (f.x < -20) f.x = canvas.width + 20;
    }
}

export function drawFish() {
    ctx.fillStyle = "#4a8fba";
    for (let f of fish) {
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x - f.size, f.y - f.size/2);
        ctx.lineTo(f.x - f.size, f.y + f.size/2);
        ctx.closePath();
        ctx.fill();
    }
}