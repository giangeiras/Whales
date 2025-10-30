import { canvas, ctx } from '../utils/canvas.js';

export let corals = [];

export function spawnCorals(n = 8) {
    corals = [];
    for (let i = 0; i < n; i++) {
        corals.push({
            x: 40 + Math.random() * (canvas.width - 80),
            y: canvas.height - (30 + Math.random() * 80),
            h: 20 + Math.random() * 60,
            w: 8 + Math.random() * 18,
        });
    }
}

export function drawCoral(c) {
    ctx.fillStyle = '#b84c3a';
    ctx.beginPath();
    ctx.rect(c.x - c.w / 2, c.y - c.h, c.w, c.h);
    ctx.fill();
}

export function drawCorals() {
    for (const c of corals) drawCoral(c);
}
