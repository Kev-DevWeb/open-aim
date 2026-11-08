// "Your weapon" row in the lobby settings, above the weapon skin rows (local-customization.js).
// The choice is kept by the desktop shell (player-weapon.js), which applies it to every drill
// as it loads. "Drill default" keeps each drill's own weapon.
(() => {
  const api = window.__aimDesktop && window.__aimDesktop.weapon;
  if (!api || window.__aimPlayerWeaponUi) return;
  window.__aimPlayerWeaponUi = true;

  let state = null; // { weapon, weapons }
  api.get().then((value) => { state = value; mount(); }).catch((err) => console.error("PLAYER WEAPON:", err));

  function paint(row) {
    for (const button of row.querySelectorAll("button")) {
      const on = button.dataset.weapon === state.weapon;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-checked", String(on));
    }
  }

  function mount() {
    if (!state) return;
    const anchor = document.querySelector(".es-vandal-row");
    if (!anchor || document.querySelector(".es-weapon-row")) return;
    const row = document.createElement("div");
    row.className = "hall-field hall-choice es-weapon-row";
    for (const a of anchor.attributes) if (a.name.startsWith("data-v-")) row.setAttribute(a.name, a.value);
    row.innerHTML = '<span class="hall-field-text"><b>Your weapon</b><small>Used in every drill. Applied the next time you enter a scene. B still opens the buy menu.</small></span>'
      + '<div class="es-skin-select es-weapon-select" role="radiogroup" aria-label="Your weapon"></div>';
    const list = row.lastChild;
    for (const [id, label] of [["", "Drill default"], ...state.weapons]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.weapon = id;
      button.setAttribute("role", "radio");
      button.title = label;
      if (id) {
        const icon = document.createElement("img");
        icon.src = `/local/equipment-icons/${id}.png`;
        icon.alt = "";
        icon.className = "es-weapon-icon";
        button.append(icon);
      }
      button.append(label);
      button.onclick = () => {
        api.set(id).then((saved) => { state.weapon = saved; paint(row); })
          .catch((err) => console.error("PLAYER WEAPON:", err));
      };
      list.append(button);
    }
    paint(row);
    anchor.before(row);
  }

  let queued = false;
  window.__aimWatchPage(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); });
  }, { subtree: true, childList: true });
})();
