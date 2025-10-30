export const keys = Object.create(null);

export function initInput() {
    window.addEventListener("keydown", e => {
        const k = e.key.toLowerCase();
        keys[k] = true;
        if (k.startsWith('arrow')) e.preventDefault();
    }, {passive: false});

    window.addEventListener("keyup", e => {
        keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener("keydown", e => {
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }
    }, {passive: false});
}