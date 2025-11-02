import { ctx, seaLevel } from '../utils/canvas.js';
import { keys } from '../utils/input.js';
import { scenario } from '../scenarios/scenarioManager.js';
import { krill } from './krill.js';

export class Whale {
    constructor(x, y, controls, colors) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
    // slightly larger than before so whales appear closer to the original size
    this.size = Math.min(window.innerWidth, window.innerHeight) * 0.08;
        this.tail = 0;
        this.jumping = false;
        this.jumpPhase = 0;
        this.canJump = true;
        this.controls = controls;
        this.colors = colors;
        this.driftAngle = Math.random() * Math.PI * 2;
        this.krillEaten = 0;
        this.jumpsDone = 0;
        this.joined = false;
        this.target = null;
        this.targetActive = false;
    }

    update() {
        this.updateMovement();
        this.updatePhysics();
        this.checkBoundaries();
        this.updateJump();
        // krill eating (only in Antarctica scenario)
        if (scenario === 0 && Array.isArray(krill)) {
            for (const k of krill) {
                if (!k.eaten) {
                    const dx = this.x - k.x, dy = this.y - k.y;
                    if (Math.hypot(dx, dy) < this.size * 0.6) {
                        k.eaten = true;
                        if (this.krillEaten < 10) this.krillEaten++;
                    }
                }
            }
        }
        this.tail += 0.08;
    }

    updateMovement() {
        const speed = 0.18;
        let isControlled = false;

        if (!this.jumping && this.targetActive && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 8) {
                const ux = dx / dist, uy = dy / dist;
                this.vx += ux * 0.22;
                this.vy += uy * 0.18;
                isControlled = true;
            } else {
                this.targetActive = false;
            }
        }

        if (!this.jumping && !this.targetActive) {
            if (keys[this.controls.left])  { this.vx -= speed; isControlled = true; }
            if (keys[this.controls.right]) { this.vx += speed; isControlled = true; }
            if (keys[this.controls.up])    { this.vy -= speed; isControlled = true; }
            if (keys[this.controls.down])  { this.vy += speed; isControlled = true; }
        }

        if (!isControlled && !this.jumping) {
            this.driftAngle += 0.008 + Math.random() * 0.003;
            this.vx += Math.cos(this.driftAngle) * 0.02;
            this.vy += Math.sin(this.driftAngle * 0.8) * 0.008;
        }
    }

    updatePhysics() {
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.x += this.vx;
        this.y += this.vy;
    }

    checkBoundaries() {
        if (!this.jumping) {
            if (this.y < seaLevel + 20) {
                this.y = seaLevel + 20;
                if (this.vy < -0.1 && this.canStartJump()) {
                    this.startJump();
                }
            }
        }
        this.y = Math.min(window.innerHeight - this.size * 1.6, this.y);
    }

    canStartJump() {
        return !this.jumping && this.y >= seaLevel - 5;
    }

    startJump() {
        this.jumping = true;
        this.jumpPhase = 0;
        if (scenario === 1) {
            this.jumpsDone = Math.min(this.jumpsDone + 1, 9999);
        }
    }

    updateJump() {
        if (!this.jumping) return;

        this.jumpPhase += 0.015;
        const t = this.jumpPhase;
        const jumpHeight = 150;
        this.y = seaLevel - Math.sin(Math.PI * t) * jumpHeight + 20;

        if (this.targetActive && this.target) {
            const dx = this.target.x - this.x;
            const ux = Math.sign(dx) * 0.08;
            this.vx += ux;
        } else {
            if (keys[this.controls.left])  this.vx -= 0.45 * 0.18;
            if (keys[this.controls.right]) this.vx += 0.45 * 0.18;
        }

        if (t >= 1) {
            this.jumping = false;
            this.jumpPhase = 0;
            this.vy = 0;
        }
    }

    draw() {
        const s = this.size;
        ctx.save();
        ctx.translate(this.x, this.y);
        const flip = this.vx < 0 ? -1 : 1;
        ctx.scale(flip, 1);
        
        let angle = 0;
        if (this.jumping) {
            angle = -Math.sin(Math.PI * this.jumpPhase) * 0.5;
        } else {
            angle = (this.vy || 0) * 0.05;
        }
        ctx.rotate(angle);

        this.drawBody(s);
        this.drawTail(s);
        this.drawFin(s);
        this.drawEye(s);
        
        ctx.restore();
    }

    drawBody(s) {
        const grad = ctx.createLinearGradient(-s*1.5, 0, s*1.5, 0);
        grad.addColorStop(0, this.colors.body1);
        grad.addColorStop(1, this.colors.body2);
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(-s*1.5, 0);
        ctx.bezierCurveTo(-s*1.2, -s*0.6, s*1.2, -s*0.6, s*1.5, 0);
        ctx.bezierCurveTo(s*1.2, s*0.6, -s*1.2, s*0.6, -s*1.5, 0);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(-s*0.5, s*0.2);
        ctx.quadraticCurveTo(s*0.8, s*0.5, s*1.2, 0);
        ctx.fill();
    }

    drawTail(s) {
        ctx.save();
        ctx.translate(-s*1.5, 0);
        ctx.rotate(Math.sin(this.tail)*0.5);
        ctx.fillStyle = this.colors.tail;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-s*0.3, -s*0.4, -s*1.2, -s*0.4, -s*1.2, 0);
        ctx.bezierCurveTo(-s*1.2, s*0.4, -s*0.3, s*0.4, 0, 0);
        ctx.fill();
        ctx.restore();
    }

    drawFin(s) {
        ctx.save();
        ctx.translate(-s*0.2, s*0.2);
        ctx.rotate(-0.5);
        ctx.fillStyle = this.colors.tail;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-s*0.6, s*0.4, -s*0.9, s*0.1);
        ctx.fill();
        ctx.restore();
    }

    drawEye(s) {
        ctx.beginPath();
        ctx.arc(s*0.3, -s*0.15, s*0.07, 0, Math.PI*2);
        ctx.fillStyle = "#001622";
        ctx.fill();
    }
}