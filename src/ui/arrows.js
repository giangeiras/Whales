import { ctx, seaLevel } from '../utils/canvas.js';

let arrowPulse = 0;

export function drawLeftArrow() {
    const ax = 40, ay = window.innerHeight/2;
    arrowPulse += 0.05;
    const p = 1 + Math.sin(arrowPulse) * 0.08;
    
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(p, p);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, -14);
    ctx.lineTo(20, -6);
    ctx.lineTo(60, -6);
    ctx.lineTo(60, 6);
    ctx.lineTo(20, 6);
    ctx.lineTo(20, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function drawEdgeHint() {
    // No-op: edge hint visuals removed to keep a single blinking arrow (use drawLeftArrow)
    return;
}