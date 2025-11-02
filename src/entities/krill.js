import { canvas, ctx, seaLevel } from '../utils/canvas.js';

// krill particles (flat array) and swarm centers
export let krill = [];
export let swarms = []; // { x, y, vx, vy, glowTimer, consumed }
// control auto-respawn rate so new swarms don't appear all at once
let lastAddAt = 0;
const addCooldownMs = 1200;

// spawnKrill(swarmCount = 9, perSwarm = 8)
// If called with zero, clears krill.
export function spawnKrill(swarmCount = 9, perSwarm = 8) {
    krill = [];
    swarms = [];
    if (!swarmCount || swarmCount <= 0) return;

    const minY = seaLevel + 60; // keep swarms a comfortable distance below the surface
    const maxYRange = Math.max(40, canvas.height - seaLevel - 160);
    for (let s = 0; s < swarmCount; s++) {
        // swarm centers are nearly stationary to avoid sweeping across the scene
        swarms.push({
            x: Math.random() * canvas.width,
            y: minY + Math.random() * maxYRange,
            vx: (Math.random() * 0.02) - 0.01, // tiny jitter only
            vy: Math.sin(Math.random() * Math.PI * 2) * 0.02,
            glowTimer: 0,
            consumed: false
        });
    }

    // populate particles per swarm
    for (let sId = 0; sId < swarms.length; sId++) {
        const s = swarms[sId];
        for (let i = 0; i < perSwarm; i++) {
            const offset = 6 + Math.random() * 22;
            const angle = Math.random() * Math.PI * 2;
            const x = s.x + Math.cos(angle) * offset + (Math.random() - 0.5) * 6;
            const y = s.y + Math.sin(angle) * offset + (Math.random() - 0.5) * 6;
            // give new particles a very small initial velocity and a settling period
            krill.push({
                x,
                y,
                r: 1 + Math.random() * 1.6,
                speed: 0.2 + Math.random() * 0.4,
                eaten: false,
                swarmId: sId,
                // settling prevents immediate snapping: particles use vx/vy for a short time
                age: 0,
                settling: true,
                settleFrames: 60,
                vx: (Math.random() - 0.5) * 0.08,
                vy: (Math.random() - 0.5) * 0.04,
                anglePhase: angle,
                offsetRadius: offset
            });
        }
    }
}

export function addSwarms(count = 1, perSwarm = 8) {
    if (!count || count <= 0) return;
    const start = swarms.length;
    for (let s = 0; s < count; s++) {
        const cid = start + s;
        const minY = seaLevel + 60;
        const maxYRange = Math.max(40, canvas.height - seaLevel - 160);
        const center = {
            x: Math.random() * canvas.width,
            y: minY + Math.random() * maxYRange,
            vx: (Math.random() * 0.02) - 0.01,
            vy: Math.sin(Math.random() * Math.PI * 2) * 0.02,
            glowTimer: 0,
            consumed: false
        };
        swarms.push(center);
        for (let i = 0; i < perSwarm; i++) {
            const offset = 6 + Math.random() * 22;
            const angle = Math.random() * Math.PI * 2;
            const x = center.x + Math.cos(angle) * offset + (Math.random() - 0.5) * 6;
            const y = center.y + Math.sin(angle) * offset + (Math.random() - 0.5) * 6;
            krill.push({
                x,
                y,
                r: 1 + Math.random() * 1.6,
                speed: 0.2 + Math.random() * 0.4,
                eaten: false,
                swarmId: cid,
                age: 0,
                settling: true,
                settleFrames: 60,
                vx: (Math.random() - 0.5) * 0.08,
                vy: (Math.random() - 0.5) * 0.04,
                anglePhase: angle,
                offsetRadius: offset
            });
        }
    }
}

export function triggerSwarmGlow(swarmId, duration = 700) {
    if (swarms[swarmId]) swarms[swarmId].glowTimer = duration;
}

// consume an entire swarm (returns true if this call actually consumed it)
export function consumeSwarmIfNotConsumed(swarmId) {
    const s = swarms[swarmId];
    if (!s || s.consumed) return false;
    s.consumed = true;
    // mark particles eaten so they are removed next update
    for (const k of krill) if (k.swarmId === swarmId) k.eaten = true;
    triggerSwarmGlow(swarmId, 900);
    return true;
}

export function updateKrill() {
    // update swarms
    for (const s of swarms) {
        // gentle jitter only; clamp centers so they don't leave the sea
        s.x += s.vx;
        s.y += s.vy + Math.sin(Date.now() / 1200) * 0.02;
        // clamp to canvas, keep a small margin
        const margin = 20;
        if (s.x < margin) s.x = margin;
        if (s.x > canvas.width - margin) s.x = canvas.width - margin;
        if (s.glowTimer > 0) s.glowTimer = Math.max(0, s.glowTimer - 16);
        // damp any velocity to avoid buildup
        s.vx *= 0.98;
    }

    for (let k of krill) {
        const s = swarms[k.swarmId];
        if (!k.eaten) {
            // age and settling
            k.age = (k.age || 0) + 1;
            if (k.settling && k.age < (k.settleFrames || 60)) {
                // while settling, move by small vx/vy only (no snapping)
                k.x += k.vx;
                k.y += k.vy;
                // damp velocities so they calm down
                k.vx *= 0.96; k.vy *= 0.96;
                // clamp inside canvas
                const pad = 6;
                if (k.x < pad) k.x = pad;
                if (k.x > canvas.width - pad) k.x = canvas.width - pad;
            } else {
                // finished settling
                k.settling = false;
                // much slower orbiting and gentler follow so krill feel calmer
                const normalPhase = 0.008 + Math.random() * 0.002;
                k.anglePhase += normalPhase;
                const ox = Math.cos(k.anglePhase) * k.offsetRadius;
                const oy = Math.sin(k.anglePhase * 0.9) * (k.offsetRadius * 0.6);
                // follow only (no added drift)
                const follow = 0.04;
                k.x += (s.x + ox - k.x) * follow;
                k.y += (s.y + oy - k.y) * follow;
                // clamp inside canvas
                const pad = 6;
                if (k.x < pad) k.x = pad;
                if (k.x > canvas.width - pad) k.x = canvas.width - pad;
            }
        }
    }

    // remove eaten particles immediately (small circles disappear)
    krill = krill.filter(k => !k.eaten);

    // auto-respawn to keep gameplay flowing: maintain at least 9 active swarms
    const targetActive = 9;
    const active = swarms.reduce((c, s) => (s && !s.consumed ? c + 1 : c), 0);
    if (active < targetActive) {
        const now = Date.now();
        if (now - lastAddAt > addCooldownMs) {
            addSwarms(1, 8);
            lastAddAt = now;
        }
    }
}

export function drawKrill() {
    // draw swarm glows behind particles
    for (const s of swarms) {
        if (s.glowTimer > 0) {
            const t = s.glowTimer / 900;
            const glowR = 20 + (1 - t) * 36;
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
            g.addColorStop(0, `rgba(255,210,120,${0.5 * (t)})`);
            g.addColorStop(1, 'rgba(255,210,120,0)');
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
    }

    for (let k of krill) {
        ctx.fillStyle = "#e6a447";
        ctx.beginPath();
        ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
        ctx.fill();
    }
}