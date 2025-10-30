export let scenario = 0; // 0: Antarctica, 1: Sydney, 2: Warmer Waters
export const titles = ["Antarctica", "Sydney", "Warmer Waters"];

export function setScenario(newScenario) {
    scenario = newScenario;
}

function setScenarioMessaging(s) {
    const eduEl = document.getElementById("edu");
    const hintEl = document.getElementById("hint");

    if (s === 0) {
        eduEl.innerHTML = "Humpback whales feed on tiny krill in the icy waters of Antarctica to build fat reserves for their long swim north.";
        hintEl.textContent = "Mission hint: Guide the whales with your fingers and help them to eat enough krill to start their journey to warmer seas.";
        hintEl.style.color = "#000";
        hintEl.style.textShadow = "none";
    } else if (s === 1) {
        eduEl.innerHTML = "As humpbacks travel north past Sydney, they often leap out of the water, a behaviour called <em>breaching</em>. Scientists think whales breach to communicate, remove parasites, or show strength to other whales.";
        hintEl.textContent = "Mission hint: Guide the whales to the surface to make them jump! (tip: make them move a little down and then up again)";
        hintEl.style.color = "#fff";
        hintEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.45)";
    } else {
        eduEl.innerHTML = "In the warm northern waters, humpback whales mate and give birth to their calves. Warm, calm seas protect newborns as their mothers teach them to swim and breathe.";
        hintEl.textContent = "Mission hint: Guide the whales close together, it's time to welcome a new calf!";
        hintEl.style.color = "#fff";
        hintEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.45)";
    }
}

export { setScenarioMessaging };