import { ASPECT_RATIO, MAX_WIDTH, MAX_HEIGHT } from "./config.js";
import { element } from "./ui.js";

export function updateCanvasSize() {
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
