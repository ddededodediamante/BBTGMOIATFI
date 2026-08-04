import {
  CATEGORY_UNCOLLECTED,
  CATEGORY_COLLECTED,
  CATEGORY_INVISIBLE_WALL,
  PRESTIGE_THRESHOLD,
  UNIVERSE_UNLOCK_LEVEL,
  COSMIC_GLOBAL_PER_LEVEL,
  DEFAULTS,
  SMALL_SCREEN_WIDTH
} from "./config.js";
import {
  engine,
  world,
  canvas,
  leftPlatform,
  rightPlatform,
  conveyor,
  trampolineLeft,
  trampolineRight,
  fanLeft,
  fanRight,
  World,
  Bodies,
  Events,
  Body,
  Composite
} from "./physics.js";
import { advancementsData } from "./advancements.js";
import { perksData } from "./perks.js";
import { clamp, formatNumber } from "./utils.js";
import { showFloatingText } from "./ui.js";
import {
  playSoundEffect,
  isSoundEffectsEnabled,
  setSoundEffectsEnabled
} from "./audio.js";
import { updateCanvasSize } from "./popups.js";
import {
  setState,
  setActions,
  showToast,
  openPopup,
  closePopups,
  toggleButtons
} from "./store.js";
import {
  prestigeShopItems,
  cosmicShopItems,
  prestigeItemCost,
  cosmicItemCost,
  grantPrestigePoints,
  grantCosmicBalls
} from "./shops.js";
import { h, render } from "preact";
import { App } from "./components/App.jsx";

const backgroundMusic = document.getElementById("backgroundMusic");

/* Game State */

var points = 0,
  lifetimePoints = 0,
  spawnInterval = DEFAULTS.spawnInterval,
  platformAngle = DEFAULTS.platformAngle,
  gravity = DEFAULTS.gravity,
  moneyMultiplier = DEFAULTS.moneyMultiplier,
  moneyHyperplier = DEFAULTS.moneyHyperplier,
  bounciness = DEFAULTS.bounciness,
  perks = new Set(),
  completedAdvancements = new Set(),
  lastPointsEarned = 0,
  goldenDivorce,
  totalBallsSpawned = 0,
  critsLanded = 0,
  ballSize = DEFAULTS.ballSize;

var prestigePoints = 0,
  prestigeLevel = 0,
  lifetimeBaseline = 0,
  prestigeUpgrades = {
    moneyMult: 0,
    startPoints: 0,
    goldChance: 0,
    spawnRate: 0,
    ballSize: 0
  };

var cosmicLevel = 0,
  cosmicPoints = 0,
  cosmicUpgrades = {
    startPoints: 0,
    diamondChance: 0,
    critChance: 0,
    caps: 0,
    autoBuyer: false,
    springs: false,
    fans: false
  };

engine.world.gravity.y = gravity;

/* Save / Load */

const zx = v => btoa(JSON.stringify(v)).split("").reverse().join("");
const xz = v => JSON.parse(atob(v.split("").reverse().join("")));

function getButtonData() {
  const out = {};
  for (const key in buttons) out[key] = { upgradeCost: buttons[key].upgradeCost };
  return out;
}

function saveGame() {
  localStorage.setItem(
    "gameData",
    zx({
      a: spawnInterval,
      c: points,
      d: moneyMultiplier,
      e: platformAngle,
      f: gravity,
      g: getButtonData(),
      h: bounciness,
      i: moneyHyperplier,
      j: [...perks],
      k: [...completedAdvancements],
      p: prestigePoints,
      q: prestigeLevel,
      r: prestigeUpgrades,
      s: ballSize,
      t: lifetimePoints,
      u: totalBallsSpawned,
      v: critsLanded,
      w: cosmicLevel,
      x: cosmicPoints,
      y: cosmicUpgrades,
      z: lifetimeBaseline
    })
  );
}

(function () {
  const originalSetItem = Storage.prototype.setItem;
  let savingGame = false;

  Object.defineProperty(Storage.prototype, "setItem", {
    value: function (key, value) {
      if (key === "gameData" && !savingGame) {
        savingGame = true;
        try {
          saveGame();
        } catch (err) {
          console.error("Failed to save game:", err);
        } finally {
          savingGame = false;
        }
        return;
      }
      return originalSetItem.call(this, key, value);
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
})();

/* Buttons / Upgrades */

const buttons = {
  upgradeSpawnRate: {
    baseText: "Reduce Spawn Delay",
    upgradeCost: 50,
    upgradeMulti: 1.5,
    whenPurchase: () => {
      spawnInterval *= 0.9;
    },
    purchaseCondition: () => spawnInterval > 400
  },
  upgradeMoney: {
    baseText: "Multiply Ball Money",
    upgradeCost: 100,
    upgradeMulti: 1.6,
    whenPurchase: () => {
      moneyMultiplier += 0.3;
    },
    purchaseCondition: () => true
  },
  upgradeAngle: {
    baseText: "Increase Steepness",
    upgradeCost: 50,
    upgradeMulti: 1.2,
    whenPurchase: () => {
      platformAngle += 0.02;
    },
    purchaseCondition: () => platformAngle < 0.85
  },
  upgradeBallSize: {
    baseText: "Increase Ball Size",
    upgradeCost: 200,
    upgradeMulti: 1.5,
    whenPurchase: () => {
      ballSize += 2;
    },
    purchaseCondition: () => ballSize < maxBallSize()
  },
  upgradeGravity: {
    baseText: "Increment Gravity",
    upgradeCost: 100,
    upgradeMulti: 1.9,
    whenPurchase: () => {
      gravity += 0.2;
    },
    purchaseCondition: () => gravity < maxGravity()
  },
  upgradeBounciness: {
    baseText: () => (bounciness < 1.1 ? "+0.1 Bouncy & Hyperplier" : "+0.1 Hyperplier"),
    upgradeCost: 500,
    upgradeMulti: 1.75,
    whenPurchase: () => {
      if (bounciness < 1.1) bounciness += 0.1;
      moneyHyperplier = Math.min(2, moneyHyperplier + 0.1);
    },
    purchaseCondition: () => moneyHyperplier < 2
  }
};

/* Perks */

const INITIAL_BUTTON_COSTS = {};
for (const k in buttons) INITIAL_BUTTON_COSTS[k] = buttons[k].upgradeCost;

/* Advancements */

function getAdvancementState() {
  return {
    points,
    lifetimePoints,
    lastPointsEarned,
    prestigeLevel,
    bounciness,
    moneyHyperplier,
    spawnInterval,
    platformAngle,
    gravity,
    ballSize,
    perks,
    perksData,
    goldenDivorce,
    totalBallsSpawned,
    critsLanded,
    cosmicLevel
  };
}

function checkAdvancements() {
  const state = getAdvancementState();
  for (const id in advancementsData) {
    if (!completedAdvancements.has(id) && advancementsData[id].check(state)) {
      completedAdvancements.add(id);
      const { name, description } = advancementsData[id];
      showToast(name, description);
    }
  }
}

/* UI Helpers */

function cosmicGlobalMult() {
  return 1 + cosmicLevel * COSMIC_GLOBAL_PER_LEVEL;
}

function spawnFloor() {
  return Math.max(120 * Math.pow(0.8, cosmicUpgrades.caps || 0), 40);
}

function maxGravity() {
  return 3 + (cosmicUpgrades.caps || 0);
}

function maxBallSize() {
  return 20 + (cosmicUpgrades.caps || 0) * 5;
}

function effectiveSpawnInterval() {
  return Math.max(
    spawnFloor(),
    spawnInterval * Math.pow(0.95, prestigeUpgrades.spawnRate || 0)
  );
}

let lastUIUpdate = 0;

function buildSnapshot() {
  const buttonsState = {};
  for (const key in buttons) {
    const value = buttons[key];

    let condition;
    try {
      condition = value.purchaseCondition() === true;
    } catch (_) {
      condition = false;
    }

    const baseText =
      typeof value.baseText === "function" ? value.baseText() : value.baseText;

    buttonsState[key] = condition
      ? {
          text: `${baseText} (Cost: ${formatNumber(value.upgradeCost)})`,
          disabled: points < value.upgradeCost
        }
      : { text: `${baseText} (Unavailable)`, disabled: true };
  }

  const perksState = {};
  for (const key in perksData) {
    const perk = perksData[key];
    if (perks.has(key)) {
      perksState[key] = { text: `${perk.baseText} (Obtained)`, disabled: true };
    } else if (prestigeLevel < (perk.requiredLevel || 0)) {
      perksState[key] = {
        text: `${perk.baseText} (Requires Prestige Level ${perk.requiredLevel})`,
        disabled: true
      };
    } else {
      perksState[key] = {
        text: `${perk.baseText} (Cost: ${formatNumber(perk.cost)})`,
        disabled: points < perk.cost
      };
    }
  }

  return {
    points,
    lifetimePoints,
    lastPointsEarned,
    prestigePoints,
    prestigeLevel,
    cosmicPoints,
    cosmicLevel,
    lifetimeBaseline,
    spawnDelay: (effectiveSpawnInterval() / 1000).toFixed(2),
    platformAngle,
    bounciness,
    ballSize,
    moneyMultiplier,
    moneyHyperplier,
    gravity,
    cosmicGlobalMult: cosmicGlobalMult(),
    perks: new Set(perks),
    completedAdvancements: new Set(completedAdvancements),
    prestigeUpgrades: { ...prestigeUpgrades },
    cosmicUpgrades: { ...cosmicUpgrades },
    buttons: buttonsState,
    perksUi: perksState,
    musicOn: localStorage.getItem("music") !== "false",
    soundOn: isSoundEffectsEnabled()
  };
}

function updateStuff(force = false) {
  const now = Date.now();
  if (force || now - lastUIUpdate >= 100) {
    lastUIUpdate = now;
    setState(buildSnapshot());
  }

  Body.setAngle(leftPlatform, platformAngle);
  Body.setAngle(rightPlatform, -platformAngle);
  Body.setPosition(leftPlatform, {
    x: 100,
    y: canvas.height / 3 - platformAngle * 90
  });
  Body.setPosition(rightPlatform, {
    x: canvas.width - 100,
    y: canvas.height / 3 - platformAngle * 90
  });

  engine.world.gravity.y = gravity;

  checkAdvancements();
}

/* Prestige */

function clearBalls() {
  for (const body of [...Composite.allBodies(world)]) {
    if (body.label === "fallingObject") World.remove(world, body);
  }
}

function resetRun() {
  clearBalls();
  points = 0;
  lastPointsEarned = 0;
  spawnInterval = DEFAULTS.spawnInterval;
  platformAngle = DEFAULTS.platformAngle;
  gravity = DEFAULTS.gravity;
  moneyMultiplier = DEFAULTS.moneyMultiplier;
  bounciness = DEFAULTS.bounciness;
  moneyHyperplier = DEFAULTS.moneyHyperplier;
  ballSize = DEFAULTS.ballSize;
  perks = new Set();

  for (const k in buttons) {
    buttons[k].upgradeCost = INITIAL_BUTTON_COSTS[k];
  }

  if (prestigeUpgrades.startPoints) points += prestigeUpgrades.startPoints;
  if (cosmicUpgrades.startPoints) points += cosmicUpgrades.startPoints;

  saveGame();
  updateStuff();
}

function claimPrestige() {
  const gain = grantPrestigePoints(lifetimePoints, lifetimeBaseline, prestigeLevel);
  if (
    !confirm(
      `Reset your current run and ${gain > 0 ? `claim ${gain} prestige point${gain > 1 ? "s" : ""}` : "claim no prestige points"}? Points, upgrades and perks reset, but permanent upgrades are kept.`
    )
  )
    return;

  if (gain > 0) {
    prestigePoints += gain;
    prestigeLevel += gain;
    showToast("Prestige!", `Gained ${gain} prestige point${gain > 1 ? "s" : ""}!`);
  }

  resetRun();
  playSoundEffect("./sounds/hint.wav", 0.6);
}

/* Universes */

function enterNewUniverse() {
  if (prestigeLevel < UNIVERSE_UNLOCK_LEVEL) {
    return alert(`Entering a new universe requires prestige level ${UNIVERSE_UNLOCK_LEVEL}.`);
  }
  const gain = grantCosmicBalls(lifetimePoints, cosmicLevel);
  if (gain <= 0) return;

  if (
    !confirm(
      `Enter a new universe? This resets your run AND prestige level, prestige upgrades and prestige points, granting ${gain} cosmic ball${gain > 1 ? "s" : ""}. Lifetime points and advancements are kept.`
    )
  )
    return;

  lifetimeBaseline = lifetimePoints;
  prestigePoints = 0;
  prestigeLevel = 0;
  prestigeUpgrades = {
    moneyMult: 0,
    startPoints: 0,
    goldChance: 0,
    spawnRate: 0,
    ballSize: 0
  };

  cosmicPoints += gain;
  cosmicLevel += gain;

  resetRun();
  playSoundEffect("./sounds/hint.wav", 0.6);
  showToast("New Universe!", `Gained ${gain} cosmic ball${gain > 1 ? "s" : ""}!`);
}

/* Game Logic */

const rainbowTexture = (() => {
  const c = document.createElement("canvas");
  c.width = 100;
  c.height = 100;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 100, 100);
  grad.addColorStop(0, "#ff0044");
  grad.addColorStop(0.25, "#ff8800");
  grad.addColorStop(0.5, "#ffee00");
  grad.addColorStop(0.7, "#22ff66");
  grad.addColorStop(0.85, "#2299ff");
  grad.addColorStop(1, "#8800ff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(50, 50, 50, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL();
})();

const diamondTexture = (() => {
  const c = document.createElement("canvas");
  c.width = 100;
  c.height = 100;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(38, 32, 5, 50, 50, 52);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.45, "#cfe6ff");
  grad.addColorStop(1, "#3f7fff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(50, 50, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(38, 32, 12, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL();
})();

function spawnObject({ x, y, size } = {}) {
  totalBallsSpawned++;

  const baseGoldChance = perks.has("goldBalls") ? 0.1 : 0;
  const goldChance = baseGoldChance + (prestigeUpgrades.goldChance || 0);
  const isGold = Math.random() < goldChance;
  const rainbowChance = perks.has("rainbowBalls") ? 0.08 : 0;
  const isRainbow = !isGold && Math.random() < rainbowChance;
  const diamondChance = cosmicUpgrades.diamondChance || 0;
  const isDiamond = !isGold && !isRainbow && Math.random() < diamondChance;

  const _size =
    (size ?? Math.random() * 30 + 20) + ballSize + (prestigeUpgrades.ballSize || 0);
  const _x = x ?? Math.random() * (canvas.width - _size) + _size / 2;
  const _y = y ?? -_size;

  const color =
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");

  const myRender = isGold
    ? {
        sprite: {
          texture: "./images/gold.png",
          xScale: _size / 333,
          yScale: _size / 333
        }
      }
    : isRainbow
      ? {
          sprite: {
            texture: rainbowTexture,
            xScale: _size / 100,
            yScale: _size / 100
          }
        }
      : isDiamond
        ? {
            sprite: {
              texture: diamondTexture,
              xScale: _size / 100,
              yScale: _size / 100
            }
          }
        : { fillStyle: color };

  const obj = Bodies.circle(_x, _y, _size / 2, {
    restitution: bounciness * 0.8,
    label: "fallingObject",
    render: myRender,
    collisionFilter: {
      category: CATEGORY_UNCOLLECTED,
      mask: CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED | CATEGORY_INVISIBLE_WALL
    }
  });

  obj.originSize = _size;
  const typeMult = isGold ? 2 : isRainbow ? 4 : isDiamond ? 8 : 1;
  let pointValue = Math.floor((_size / 2) * typeMult);
  if ((isGold || isRainbow) && perks.has("richBalls")) {
    pointValue = Math.floor(pointValue * 1.5);
  }
  obj.pointValue = pointValue;
  obj.collected = false;
  obj.isGold = isGold;
  obj.isRainbow = isRainbow;
  obj.isDiamond = isDiamond;

  World.add(world, obj);
  return obj;
}

/* Upgrade Buttons */

function buyUpgrade(key) {
  const value = buttons[key];
  if (!value) return false;

  let ok;
  try {
    ok = value.purchaseCondition() === true;
  } catch (_) {
    ok = false;
  }
  if (!ok || points < value.upgradeCost) return false;

  points -= value.upgradeCost;
  value.upgradeCost = Math.floor(value.upgradeCost * value.upgradeMulti);

  if (value.whenPurchase) value.whenPurchase();

  updateStuff(true);
  playSoundEffect("./sounds/hint.wav", 0.6);
  return true;
}

/* Load Save */

const savedData = localStorage.getItem("gameData");
if (savedData !== null) {
  try {
    const dataXZ = xz(savedData);
    spawnInterval = Math.max(37, dataXZ.a ?? DEFAULTS.spawnInterval);
    points = dataXZ.c ?? 0;
    moneyMultiplier = dataXZ.d ?? DEFAULTS.moneyMultiplier;
    platformAngle = Math.min(
      Math.max(DEFAULTS.platformAngle, dataXZ.e ?? DEFAULTS.platformAngle),
      0.85
    );
    prestigePoints = dataXZ.p ?? 0;
    prestigeLevel = dataXZ.q ?? 0;
    prestigeUpgrades = dataXZ.r ?? prestigeUpgrades;
    cosmicLevel = dataXZ.w ?? 0;
    cosmicPoints = dataXZ.x ?? 0;
    cosmicUpgrades = dataXZ.y ?? cosmicUpgrades;
    lifetimeBaseline = dataXZ.z ?? 0;
    gravity = clamp(dataXZ.f ?? DEFAULTS.gravity, 1, maxGravity());
    bounciness = clamp(dataXZ.h ?? DEFAULTS.bounciness, 0.6, 1.1);
    moneyHyperplier = clamp(dataXZ.i ?? DEFAULTS.moneyHyperplier, 1, 2);
    perks = new Set([...(dataXZ.j ?? [])]);
    completedAdvancements = new Set([...(dataXZ.k ?? [])]);
    ballSize = clamp(dataXZ.s ?? DEFAULTS.ballSize, 0, maxBallSize());
    lifetimePoints = dataXZ.t ?? prestigeLevel * PRESTIGE_THRESHOLD;
    totalBallsSpawned = dataXZ.u ?? 0;
    critsLanded = dataXZ.v ?? 0;

    if (cosmicUpgrades.springs) Composite.add(world, [trampolineLeft, trampolineRight]);
    if (cosmicUpgrades.fans) Composite.add(world, [fanLeft, fanRight]);

    if (dataXZ.g) {
      for (const key in dataXZ.g) {
        if (buttons[key]) {
          buttons[key].upgradeCost =
            dataXZ.g[key].upgradeCost || buttons[key].upgradeCost;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to read saved gameData:", e);
  }
}

window.addEventListener("beforeunload", () => {
  if (window.deleteAllMyData === true) localStorage.removeItem("gameData");
  else saveGame();
});
window.addEventListener("storage", () => {
  if (window.deleteAllMyData === true) localStorage.removeItem("gameData");
  else saveGame();
});

/* Physics Events */

function bounceBall(obj) {
  const speed = Math.abs(obj.velocity.y);
  Body.setVelocity(obj, {
    x: obj.velocity.x * 0.6 + (Math.random() - 0.5) * 8,
    y: -Math.max(11, speed * 0.85)
  });
  const total = Math.floor(
    (obj.pointValue || 1) *
      (1 + speed / 8) *
      (moneyMultiplier * moneyHyperplier) *
      (1 + (prestigeUpgrades.moneyMult || 0)) *
      cosmicGlobalMult()
  );
  lastPointsEarned = total;
  points += total;
  lifetimePoints += total;
  showFloatingText(obj.position.x, obj.position.y, "+" + formatNumber(total), "#7fff7f");
  updateStuff();
}

Events.on(engine, "collisionStart", event => {
  for (const pair of event.pairs) {
    if (
      (pair.bodyA.label === "trampoline" && pair.bodyB.label === "fallingObject") ||
      (pair.bodyB.label === "trampoline" && pair.bodyA.label === "fallingObject")
    ) {
      const obj = pair.bodyA.label === "fallingObject" ? pair.bodyA : pair.bodyB;
      if (!obj.collected) bounceBall(obj);
      continue;
    }

    let object = null;
    if (pair.bodyA.label === "conveyor" && pair.bodyB.label === "fallingObject")
      object = pair.bodyB;
    else if (pair.bodyB.label === "conveyor" && pair.bodyA.label === "fallingObject")
      object = pair.bodyA;

    if (object && !object.collected) {
      if (perks.has("splitBalls") && Math.random() < 9 / 100) {
        goldenDivorce = !!object.isGold;

        const originalSize = object.originSize;
        const newSize = Math.max(11, originalSize * 0.8);

        const ballLeft = spawnObject({
          x: object.position.x,
          y: object.position.y,
          size: newSize
        });
        const ballRight = spawnObject({
          x: object.position.x,
          y: object.position.y,
          size: newSize
        });

        const forceMagnitude = 0.02 * ((newSize * 1.6) / 80);
        Body.applyForce(ballLeft, ballLeft.position, {
          x: -forceMagnitude,
          y: -forceMagnitude
        });
        Body.applyForce(ballRight, ballRight.position, {
          x: forceMagnitude,
          y: -forceMagnitude
        });

        showFloatingText(object.position.x, object.position.y, "Split!", "#bd8d4f");
        World.remove(world, object);
        continue;
      }

      object.collected = true;
      object.collisionFilter.category = CATEGORY_COLLECTED;
      object.collisionFilter.mask = CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED;

      const baseEarn = Math.floor(
        (object.pointValue || 1) * (moneyMultiplier * moneyHyperplier)
      );
      let finalEarn = Math.floor(
        baseEarn *
          (1 + (prestigeUpgrades.moneyMult || 0)) *
          cosmicGlobalMult()
      );

      let isCrit = false;
      if (perks.has("critBalls") && Math.random() < 0.12 + (cosmicUpgrades.critChance || 0)) {
        finalEarn *= 5;
        isCrit = true;
        critsLanded++;
      }

      lastPointsEarned = finalEarn;
      points += finalEarn;
      lifetimePoints += finalEarn;

      updateStuff();
      showFloatingText(
        object.position.x,
        object.position.y,
        isCrit ? `+${formatNumber(finalEarn)} CRIT!` : "+" + formatNumber(finalEarn),
        isCrit ? "#ffd700" : undefined
      );
    }
  }
});

Events.on(engine, "beforeUpdate", () => {
  Body.setVelocity(conveyor, { x: perks.has("fastConveyor") ? 4 : 2, y: 0 });
});

/* Game Loop */

let lastSpawn = Date.now();
let lastFrame = Date.now();
let lastFanGust = 0;
let lastAutoBuy = 0;
const maxFps = 60;
const frameDuration = 1000 / maxFps;
const FAN_GUST_INTERVAL = 3000;
const AUTO_BUY_INTERVAL = 4000;

function autoBuy() {
  let bestKey = null;
  let bestCost = Infinity;
  for (const key in buttons) {
    const v = buttons[key];
    let ok;
    try {
      ok = v.purchaseCondition() === true;
    } catch (_) {
      ok = false;
    }
    if (ok && v.upgradeCost <= points && v.upgradeCost < bestCost) {
      bestCost = v.upgradeCost;
      bestKey = key;
    }
  }
  if (bestKey) buyUpgrade(bestKey);
}

(function gameLoop() {
  const now = Date.now();
  const delta = now - lastFrame;

  if (delta >= frameDuration) {
    lastFrame = now - (delta % frameDuration);

    if (now - lastSpawn > effectiveSpawnInterval()) {
      spawnObject();
      if (perks.has("doubleDrop") && Math.random() < 15 / 100) spawnObject();
      lastSpawn = now;
    }

    if (cosmicUpgrades.fans && now - lastFanGust > FAN_GUST_INTERVAL) {
      lastFanGust = now;
      const center = canvas.width / 2;
      for (const body of Composite.allBodies(world)) {
        if (body.label === "fallingObject" && !body.collected) {
          const dir = body.position.x < center ? 1 : -1;
          Body.applyForce(body, body.position, {
            x: dir * 0.02 * ((body.circleRadius || 20) / 20),
            y: 0.02
          });
        }
      }
    }

    if (cosmicUpgrades.autoBuyer && now - lastAutoBuy > AUTO_BUY_INTERVAL) {
      lastAutoBuy = now;
      for (let i = 0; i < 3; i++) autoBuy();
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    for (const body of Composite.allBodies(world)) {
      if (body.label === "fallingObject" && body.collected) {
        const radius = body.circleRadius || 0;
        if (
          body.position.x + radius < 0 ||
          body.position.x - radius > canvasWidth ||
          body.position.y - radius > canvasHeight
        ) {
          World.remove(world, body);
        }
      }
    }
  }

  requestAnimationFrame(gameLoop);
})();

setInterval(saveGame, 5000);
window.addEventListener("resize", () => {
  updateCanvasSize();
  setState({ smallScreen: window.innerWidth <= SMALL_SCREEN_WIDTH });
});

/* UI Actions */

function clickUpgrade(key) {
  const value = buttons[key];
  if (!value) return;

  if (points < value.upgradeCost) {
    alert("Not enough points for upgrade!");
    return;
  }

  let ok;
  try {
    ok = value.purchaseCondition() === true;
  } catch (_) {
    ok = false;
  }
  if (!ok) {
    alert("You cannot purchase this upgrade right now!");
    return;
  }

  buyUpgrade(key);
}

function clickPerk(key) {
  const perk = perksData[key];
  if (points < perk.cost) return alert("Not enough points for upgrade!");
  if (prestigeLevel < (perk.requiredLevel || 0))
    return alert(`This perk requires prestige level ${perk.requiredLevel}.`);
  if (perks.has(key)) return;
  points -= perk.cost;
  perks.add(key);
  updateStuff(true);
  playSoundEffect("./sounds/hint.wav", 0.6);
}

function buyPrestigeItem(id) {
  const item = prestigeShopItems.find(i => i.id === id);
  if (!item) return;
  const cost = prestigeItemCost(item, prestigeUpgrades);
  if (item.requiredLevel > prestigeLevel)
    return alert(`Requires prestige level ${item.requiredLevel}.`);
  if (prestigePoints < cost) return alert("Not enough prestige points.");
  if (!item.condition(prestigeUpgrades)) return alert("You can't buy this right now.");
  prestigePoints -= cost;
  if (item.whenPurchase) item.whenPurchase(prestigeUpgrades);
  saveGame();
  updateStuff(true);
  playSoundEffect("./sounds/hint.wav", 0.6);
}

function buyCosmicItem(id) {
  const item = cosmicShopItems.find(i => i.id === id);
  if (!item) return;
  const cost = cosmicItemCost(item, cosmicUpgrades);
  if (item.requiredCosmicLevel > cosmicLevel)
    return alert(`Requires cosmic ball level ${item.requiredCosmicLevel}.`);
  if (cosmicPoints < cost) return alert("Not enough cosmic points.");
  if (!item.condition(cosmicUpgrades)) return alert("You can't buy this right now.");
  cosmicPoints -= cost;
  if (item.whenPurchase) item.whenPurchase(cosmicUpgrades);
  if (item.id === "cosm_springs") Composite.add(world, [trampolineLeft, trampolineRight]);
  if (item.id === "cosm_fans") Composite.add(world, [fanLeft, fanRight]);
  saveGame();
  updateStuff(true);
  playSoundEffect("./sounds/hint.wav", 0.6);
}

function toggleMusic() {
  if (backgroundMusic.paused) {
    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch(() => {});
    localStorage.setItem("music", "true");
  } else {
    backgroundMusic.pause();
    localStorage.setItem("music", "false");
  }
  setState({ musicOn: !backgroundMusic.paused });
}

function setMusicUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    try {
      parsed = new URL("/music/" + url, window.location.href);
    } catch (_) {
      parsed = "/music/Disco con Tutti.mp3";
    }
  }

  const wasPaused = backgroundMusic.paused;
  localStorage.setItem("musicUrl", parsed);
  backgroundMusic.pause();
  backgroundMusic.src = parsed;
  backgroundMusic.load();
  backgroundMusic.addEventListener(
    "loadeddata",
    () => {
      if (!wasPaused) backgroundMusic.play().catch(() => {});
      else backgroundMusic.pause();
    },
    { once: true }
  );
}

function toggleSound() {
  const next = !isSoundEffectsEnabled();
  localStorage.setItem("effects", String(next));
  setSoundEffectsEnabled(next);
  setState({ soundOn: next });
}

function deleteAllData() {
  if (
    window.confirm(
      `Are you REALLY sure? You won't be able to recover this data and it will be lost FOREVER!`
    ) === true
  ) {
    window.deleteAllMyData = true;
    localStorage.removeItem("gameData");
    window.location.reload();
  }
}

setActions({
  buyUpgrade: clickUpgrade,
  buyPerk: clickPerk,
  buyPrestigeItem,
  buyCosmicItem,
  claimPrestige,
  enterUniverse: enterNewUniverse,
  toggleMusic,
  setMusicUrl,
  toggleSound,
  deleteAllData,
  openPopup,
  closePopups,
  toggleButtons
});

/* Init */

if (localStorage.getItem("music") === null) localStorage.setItem("music", "true");

backgroundMusic.onerror = ev => {
  ev.target.pause();
  ev.target.src = "/music/Disco con Tutti.mp3";
  localStorage.setItem("musicUrl", "/music/Disco con Tutti.mp3");
  ev.target.load();
  ev.target.play();
};

window.addEventListener(
  "click",
  () => {
    if (localStorage.getItem("musicUrl"))
      backgroundMusic.src = localStorage.getItem("musicUrl");
    if (localStorage.getItem("music") === "true" && backgroundMusic.paused) {
      backgroundMusic.volume = 0.5;
      backgroundMusic.play().catch(() => {});
    }
  },
  { once: true }
);

updateCanvasSize();
updateStuff(true);
render(h(App), document.getElementById("app"));
