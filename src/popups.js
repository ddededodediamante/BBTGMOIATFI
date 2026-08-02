import { SMALL_SCREEN_WIDTH, ASPECT_RATIO, MAX_WIDTH, MAX_HEIGHT } from "./config.js";
import { element, create } from "./ui.js";
import { playSoundEffect } from "./audio.js";

function isGUIActive() {
  return [
    element("perksShop"),
    element("settings"),
    element("advancements"),
    element("prestige")
  ].some(i => i.style.display === "flex");
}

export function updateCanvasSize() {
  const guiActive = isGUIActive();
  const buttonHolder = element("buttonHolder");
  const toggleButtonHolder = element("toggleButtonHolder");

  if (window.innerWidth <= SMALL_SCREEN_WIDTH) {
    buttonHolder.style.top = "55px";
    toggleButtonHolder.style.display = guiActive ? "none" : "block";
    buttonHolder.style.display = "none";
  } else {
    buttonHolder.style.top = "10px";
    toggleButtonHolder.style.display = "none";
    buttonHolder.style.display = guiActive ? "none" : "flex";
  }

  requestAnimationFrame(() => {
    const canvas = element("gameCanvas");
    let width = Math.min(document.documentElement.clientWidth, MAX_WIDTH);
    let height = Math.min(document.documentElement.clientHeight, MAX_HEIGHT);

    if (width / height > ASPECT_RATIO) {
      width = height * ASPECT_RATIO;
    } else {
      height = width / ASPECT_RATIO;
    }

    canvas.style.width = width - 10 + "px";
    canvas.style.height = height - 10 + "px";
  });
}

export function openPopup(el) {
  element("buttonHolder").style.display = "none";
  element("toggleButtonHolder").style.display = "none";
  el.style.display = "flex";
}

export function closePopups() {
  document.querySelectorAll("div.popup").forEach(p => (p.style.display = "none"));
  updateCanvasSize();
}

export function showToast(title, description) {
  playSoundEffect("./sounds/advancement.wav", 1);

  const popup = create("div", {
    className: "advancement-popup",
    innerHTML: `<strong>${title}</strong><br>${description}`
  });
  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 4000);
}
