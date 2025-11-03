export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");
export let seaLevel = 0;
export let W = 0; // logical (CSS) width in CSS pixels
export let H = 0; // logical (CSS) height in CSS pixels
export let DPR = 1;

export function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    DPR = window.devicePixelRatio || 1;

    // set CSS size (what the element appears as)
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // set backing buffer to physical pixels for crisp rendering
    canvas.width = Math.max(1, Math.round(cssW * DPR));
    canvas.height = Math.max(1, Math.round(cssH * DPR));

    // make drawing calls operate in CSS pixels by scaling the context
    // to account for devicePixelRatio
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // logical sizes (CSS pixels) exported for layout calculations
    W = cssW;
    H = cssH;

    seaLevel = H * 0.3;

    // Update hint position
    const hintEl = document.getElementById("hint");
    if (hintEl) {
        const hintY = Math.max(12, Math.floor(seaLevel * 0.38));
        hintEl.style.top = `${hintY}px`;
    }
}

// initial resize to set sensible defaults on load
resize();