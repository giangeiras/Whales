import { ctx } from '../utils/canvas.js';

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
    const x = 32;
    const baseYs = [seaLevel + 70, seaLevel + 190, seaLevel + 310];
    const now = performance.now() / 1000;
    
    ctx.save();
    for (let i = 0; i < baseYs.length; i++) {
        const y = Math.min(window.innerHeight - 40, baseYs[i]);
        const phase = now * 2 + i * 0.8;
        const r = 10 + (Math.sin(phase) * 0.5 + 0.5) * 16;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, r, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();
        
        const bubY = y - (phase % 1) * 18;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(x + 6, bubY, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}