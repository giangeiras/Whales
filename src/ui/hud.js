import { scenario } from '../scenarios/scenarioManager.js';

function safeName(w, fallback) {
    return (w && w.name) ? w.name : fallback;
}

function safeColor(w, fallback) {
    return (w && w.colors && w.colors.body1) ? w.colors.body1 : fallback;
}

function chipHtml(name, color, meta) {
    return `
      <div class="whale-chip" role="group" aria-label="${name}">
        <span class="whale-dot" style="background:${color}"></span>
        <div class="whale-info">
          <div class="whale-name">${name}</div>
          <div class="whale-meta">${meta}</div>
        </div>
      </div>`;
}

export function updateHUD(whale1, whale2, baby) {
    const counter = document.getElementById('counter');
    if (!counter) return;

    const w1name = safeName(whale1, 'Whale 1');
    const w2name = safeName(whale2, 'Whale 2');
    const w1color = safeColor(whale1, '#0a4770');
    const w2color = safeColor(whale2, '#0b4c78');

    if (scenario === 0) {
        counter.innerHTML = chipHtml(w1name, w1color, `${whale1.krillEaten} / 10 krill`) +
                             chipHtml(w2name, w2color, `${whale2.krillEaten} / 10 krill`);
    } else if (scenario === 1) {
        counter.innerHTML = chipHtml(w1name, w1color, `${whale1.jumpsDone} / 5 jumps`) +
                             chipHtml(w2name, w2color, `${whale2.jumpsDone} / 5 jumps`);
    } else {
        const distance = Math.round(Math.hypot(whale1.x - whale2.x, whale1.y - whale2.y));
        const babyStatus = baby ? `${safeName(baby, 'Calf')} — born` : 'No calf yet';
        counter.innerHTML = chipHtml(w1name, w1color, `Distance: ${distance}px`) +
                             chipHtml(w2name, w2color, babyStatus);
    }
}