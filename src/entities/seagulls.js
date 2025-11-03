import { canvas, ctx, seaLevel, W, H } from '../utils/canvas.js';

export let seagulls = [];

export function spawnSeagulls(n = 4) {
    seagulls = [];
    for (let i = 0; i < n; i++) {
        seagulls.push({
            x: Math.random() * W,
            y: seaLevel - 40 - Math.random() * 80,
            speed: 0.4 + Math.random() * 0.6,
            wing: Math.random() * Math.PI * 2
        });
    }
}

export function updateSeagulls() {
    for (let g of seagulls) {
        g.x += g.speed;
    if (g.x > W + 50) g.x = -50;
        g.wing += 0.2;
    }
}

export function drawSeagulls() {
    for (let g of seagulls) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x + 10, g.y + Math.sin(g.wing) * 5);
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x - 10, g.y + Math.sin(g.wing) * 5);
        ctx.stroke();
    }
}