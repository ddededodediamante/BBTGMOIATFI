import { useReducer, useLayoutEffect } from "preact/hooks";
import { SMALL_SCREEN_WIDTH } from "./config.js";
import { playSoundEffect } from "./audio.js";

let state = {
  popup: null,
  toasts: [],
  buttonsOpen: false,
  smallScreen: window.innerWidth <= SMALL_SCREEN_WIDTH,

  points: 0,
  lifetimePoints: 0,
  lastPointsEarned: 0,
  prestigePoints: 0,
  prestigeLevel: 0,
  cosmicPoints: 0,
  cosmicLevel: 0,

  spawnDelay: "2.00",
  platformAngle: 0.3,
  bounciness: 0.6,
  ballSize: 0,
  moneyMultiplier: 1,
  moneyHyperplier: 1,
  gravity: 1,
  cosmicGlobalMult: 1,

  perks: new Set(),
  completedAdvancements: new Set(),
  prestigeUpgrades: {},
  cosmicUpgrades: {},

  buttons: {},
  perksUi: {},

  musicOn: true,
  soundOn: true
};

let actions = {};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(partial) {
  state = { ...state, ...partial };
  for (const listener of [...listeners]) listener();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setActions(map) {
  actions = map;
}

export function getActions() {
  return actions;
}

export function useActions() {
  return actions;
}

export function useUIState() {
  const [, forceUpdate] = useReducer(c => c + 1, 0);
  useLayoutEffect(() => subscribe(forceUpdate), []);
  return getState();
}

/* UI-only actions */

export function openPopup(name) {
  setState({ popup: name, buttonsOpen: false });
}

export function closePopups() {
  setState({ popup: null });
}

export function toggleButtons() {
  setState({ buttonsOpen: !state.buttonsOpen });
}

let toastId = 0;

export function showToast(title, description) {
  playSoundEffect("./sounds/advancement.wav", 1);
  const id = ++toastId;
  setState({ toasts: [...state.toasts, { id, title, description }] });
  setTimeout(() => {
    setState({ toasts: state.toasts.filter(t => t.id !== id) });
  }, 4000);
}
