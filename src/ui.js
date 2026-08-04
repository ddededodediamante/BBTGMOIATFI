import { render, canvas } from "./physics.js";

export const element = id => document.getElementById(id);

export function showFloatingText(x, y, text, color) {
  const rect = canvas.getBoundingClientRect();
  const worldW = render.bounds.max.x - render.bounds.min.x;
  const worldH = render.bounds.max.y - render.bounds.min.y;
  const scaleX = rect.width / worldW;
  const scaleY = rect.height / worldH;

  const screenX = rect.left + (x - render.bounds.min.x) * scaleX;
  const screenY = rect.top + (y - render.bounds.min.y) * scaleY;

  const floatElem = document.createElement("div");
  floatElem.className = "floating-text";
  floatElem.innerText = text;
  floatElem.style.left = screenX + "px";
  floatElem.style.top = screenY - 18 + "px";
  floatElem.style.color = color || "inherit";
  document.body.appendChild(floatElem);

  requestAnimationFrame(() => {
    floatElem.style.transform = "translateY(-30px)";
    floatElem.style.opacity = 0;
  });

  setTimeout(() => floatElem.remove(), 1000);
}
