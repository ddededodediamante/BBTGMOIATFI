import { render, canvas } from "./physics.js";

export const element = id => document.getElementById(id);
export const onClick = (element, event) => element.addEventListener("click", event);
export const create = (tag, options = {}) => {
  const element = document.createElement(tag);
  for (const key in options) {
    if (key === "style" && typeof options[key] === "object") {
      for (const styleKey in options[key]) {
        element.style[styleKey] = options[key][styleKey];
      }
    } else {
      element[key] = options[key];
    }
  }
  return element;
};

export function showFloatingText(x, y, text, color) {
  const rect = canvas.getBoundingClientRect();
  const worldW = render.bounds.max.x - render.bounds.min.x;
  const worldH = render.bounds.max.y - render.bounds.min.y;
  const scaleX = rect.width / worldW;
  const scaleY = rect.height / worldH;

  const screenX = rect.left + (x - render.bounds.min.x) * scaleX;
  const screenY = rect.top + (y - render.bounds.min.y) * scaleY;

  const floatElem = create("div", {
    className: "floating-text",
    innerText: text,
    style: {
      left: screenX + "px",
      top: screenY - 18 + "px",
      color: color || "inherit"
    }
  });
  document.body.appendChild(floatElem);

  requestAnimationFrame(() => {
    floatElem.style.transform = "translateY(-30px)";
    floatElem.style.opacity = 0;
  });

  setTimeout(() => floatElem.remove(), 1000);
}
