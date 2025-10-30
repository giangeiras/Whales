export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");
export let seaLevel = 0;

export function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    seaLevel = canvas.height * 0.3;
    
    // Update hint position
    const hintEl = document.getElementById("hint");
    const hintY = Math.max(12, Math.floor(seaLevel * 0.38));
    hintEl.style.top = `${hintY}px`;
}