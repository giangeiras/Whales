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
  const eduEl = document.getElementById("edu");
  const hintEl = document.getElementById("hint");

  if (s === 0) {
    eduEl.innerHTML =
      "Humpback whales feed on tiny krill in the icy waters of Antarctica to build fat reserves for their long swim north.";
    hintEl.textContent =
      "Mission hint: Guide the whales with your fingers and help them to eat enough krill to start their journey to warmer seas.";
    hintEl.style.color = "#000";
    hintEl.style.textShadow = "none";
  } else if (s === 1) {
    eduEl.innerHTML =
      "As humpbacks travel north past Sydney, they often leap out of the water, a behaviour called <em>breaching</em>. Scientists think whales breach to communicate, remove parasites, or show strength to other whales.";
    hintEl.textContent =
      "Mission hint: Guide the whales to the surface to make them jump! (tip: make them move a little down and then up again)";
    hintEl.style.color = "#fff";
    hintEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.45)";
  } else {
    eduEl.innerHTML =
      "In the warm northern waters, humpback whales mate and give birth to their calves. Warm, calm seas protect newborns as their mothers teach them to swim and breathe.";
    hintEl.textContent =
      "Mission hint: Guide the whales close together, it's time to welcome a new calf!";
    hintEl.style.color = "#fff";
    hintEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.45)";
  }
}

export { setScenarioMessaging };
