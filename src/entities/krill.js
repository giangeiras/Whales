import { canvas, ctx, seaLevel } from '../utils/canvas.js';

export let krill = [];

export function spawnKrill(n = 30) {
    krill = [];
    const minDist = 36;
    
    for (let i = 0; i < n; i++) {
        let attempts = 0;
        let x, y, ok;
        
        do {
            x = Math.random() * canvas.width;
            y = seaLevel + 20 + Math.random() * (canvas.height - seaLevel - 40);
            ok = true;
            
            for (const k of krill) {
                if (Math.hypot(k.x - x, k.y - y) < minDist) {
                    ok = false;
                    break;
                }
            }
            attempts++;
        } while (!ok && attempts < 12);

        krill.push({
            x,
            y,
            r: 3,
            speed: 0.3 + Math.random() * 0.6,
            eaten: false
        });
    }
}

export function updateKrill() {
    for (let k of krill) {
        if (!k.eaten) {
            k.x -= k.speed;
            if (k.x < -10) k.x = canvas.width + 10;
        } else {
            k.y -= 0.6;
            k.x += Math.sin(k.y * 0.02) * 0.2;
            if (k.y < seaLevel + 10) k.y = seaLevel + 10;
        }
    }
}

export function drawKrill() {
    for (let k of krill) {
        if (!k.eaten) {
            ctx.fillStyle = "#e6a447";
            ctx.beginPath();
            ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}