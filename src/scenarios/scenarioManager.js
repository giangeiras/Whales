export let scenario = 0; // 0: Antarctica, 1: Sydney, 2: Warmer Waters
export const titles = ["Antarctica", "Sydney", "Warmer Waters"];

export function setScenario(newScenario) {
  scenario = newScenario;

  // Update the sky image based on scenario
  updateSkyBackground(newScenario);

  // Keep HUD text in sync (optional if handled elsewhere)
  setScenarioMessaging(newScenario);
  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.textContent = titles[newScenario] ?? titles[0];
}

function updateSkyBackground(s) {
  const skyElement = document.getElementById("sky-background");
  if (!skyElement) return; // safely exit if background not present
  // fade-out then change source, with basic onload/onerror handling
  skyElement.style.transition = "opacity 300ms ease";
  skyElement.style.opacity = "0";

  const setSrc = (src) => {
    // attach handlers
    const onLoad = () => {
      skyElement.removeEventListener('load', onLoad);
      skyElement.removeEventListener('error', onError);
      // show image once loaded
      requestAnimationFrame(() => { skyElement.style.opacity = '1'; });
    };
    const onError = (e) => {
      skyElement.removeEventListener('load', onLoad);
      skyElement.removeEventListener('error', onError);
      console.error('Failed to load sky image:', src, e);
      // fallback to antarctica png if not already trying it
      if (!src.includes('antarctica-sky')) {
        setSrc('src/assets/antarctica-sky.png');
      }
    };

    skyElement.addEventListener('load', onLoad);
    skyElement.addEventListener('error', onError);

    // set the new source (bust cache slightly)
    skyElement.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
  };

  switch (s) {
    case 0:
      setSrc('src/assets/antarctica-sky.png');
      break;
    case 1:
      setSrc('src/assets/opera.png');
      break;
    case 2:
      setSrc('src/assets/warmer-sky.png');
      break;
    default:
      setSrc('src/assets/antarctica-sky.png');
  }
}

function setScenarioMessaging(s) {
  // Hide the educational panel and mission hint — these UI elements are removed
  // from the player's view but leaving the DOM elements or their IDs intact
  // avoids touching other logic that may query them elsewhere.
  const eduEl = document.getElementById("edu");
  const hintEl = document.getElementById("hint");
  if (eduEl) {
    eduEl.style.display = 'none';
    // clear content to be safe
    try { eduEl.innerHTML = ''; } catch (e) { /* ignore */ }
  }
  if (hintEl) {
    hintEl.style.display = 'none';
    try { hintEl.textContent = ''; } catch (e) { /* ignore */ }
  }
}

export { setScenarioMessaging };
