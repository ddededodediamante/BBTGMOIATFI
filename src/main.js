import {
  SMALL_SCREEN_WIDTH,
  ASPECT_RATIO,
  MAX_WIDTH,
  MAX_HEIGHT,
  CATEGORY_UNCOLLECTED,
  CATEGORY_COLLECTED,
  CATEGORY_INVISIBLE_WALL,
  PRESTIGE_THRESHOLD,
  DEFAULTS
} from "./config.js";
import {
  engine,
  world,
  canvas,
  render,
  leftPlatform,
  rightPlatform,
  conveyor,
  Engine,
  Render,
  World,
  Bodies,
  Events,
  Body,
  Runner,
  Composite
} from "./physics.js";
import { advancementsData, advancementCategories } from "./advancements.js";

/* DOM Elements */

const element = id => document.getElementById(id);
const onClick = (element, event) => element.addEventListener("click", event);
const create = (tag, options = {}) => {
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

const buttonHolder = element("buttonHolder");
const informationDiv = element("information");
const perksShop = element("perksShop");
const settingsPopup = element("settings");
const prestigePopup = element("prestige");
const advancementsPopup = element("advancements");
const perksButtonHolder = element("perksButtonHolder");
const toggleMusicButton = element("toggleMusicButton");
const setMusicUrlButton = element("setMusicUrlButton");
const toggleSoundEffectsButton = element("toggleSoundEffectsButton");
const backgroundMusic = element("backgroundMusic");
const advancementsListDiv = element("advancementList");
const openAdvancements = element("openAdvancements");
const toggleButtonHolder = element("toggleButtonHolder");

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
  soundEffectsEnabled = true,
  goldenDivorce,
  totalBallsSpawned = 0,
  critsLanded = 0,
  ballSize = DEFAULTS.ballSize;

var prestigePoints = 0,
  prestigeLevel = 0,
  prestigeUpgrades = {
    moneyMult: 0,
    startPoints: 0,
    goldChance: 0,
    spawnRate: 0,
    ballSize: 0
  };

engine.world.gravity.y = gravity;

/* Save / Load */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const zx = v => btoa(JSON.stringify(v)).split("").reverse().join("");
const xz = v => JSON.parse(atob(v.split("").reverse().join("")));

function formatNumber(value) {
  const n = Math.floor(value);
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + formatNumber(-n);

  const tiers = [
    { limit: 1e15, suffix: "Qa" },
    { limit: 1e12, suffix: "T" },
    { limit: 1e9, suffix: "B" },
    { limit: 1e6, suffix: "M" },
    { limit: 1e3, suffix: "K" }
  ];

  for (const tier of tiers) {
    if (n >= tier.limit) {
      const scaled = n / tier.limit;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return scaled.toFixed(decimals) + tier.suffix;
    }
  }
  return String(n);
}

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
      v: critsLanded
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
    purchaseCondition: () => ballSize < 20
  },
  upgradeGravity: {
    baseText: "Increment Gravity",
    upgradeCost: 100,
    upgradeMulti: 1.9,
    whenPurchase: () => {
      gravity += 0.2;
    },
    purchaseCondition: () => gravity < 3
  },
  upgradeBounciness: {
    baseText: () => (bounciness < 1.1 ? "+0.1 Bouncy & Hyperplier" : "+0.1 Hyperplier"),
    upgradeCost: 500,
    upgradeMulti: 1.75,
    whenPurchase: () => {
      if (bounciness < 1.1) bounciness += 0.1;
      moneyHyperplier += 0.1;
    },
    purchaseCondition: () => moneyHyperplier < 2
  }
};

/* Perks */

const perksData = {
  goldBalls: {
    baseText: "Gold Balls",
    cost: 2400,
    description: "Adds a 10% chance of a ball spawning as gold (x2.5 value)"
  },
  fastConveyor: {
    baseText: "Fast Conveyor",
    cost: 3000,
    description: "Doubles the conveyor belt speed"
  },
  splitBalls: {
    baseText: "Split Balls",
    cost: 5000,
    description: "Adds a 9% chance of a ball splitting on impact"
  },
  rainbowBalls: {
    baseText: "Rainbow Balls",
    cost: 9000,
    description: "Adds an 8% chance of a ball spawning as rainbow (x4 value)"
  },
  richBalls: {
    baseText: "Lucky Gold",
    cost: 15000,
    description: "Gold and rainbow balls are worth 50% more"
  },
  critBalls: {
    baseText: "Critical Balls",
    cost: 23000,
    description: "Adds a 12% chance of a critical hit (x5 points)",
    requiredLevel: 1
  },
  doubleDrop: {
    baseText: "Double Drop",
    cost: 30000,
    description: "Adds a 20% chance of spawning a second ball",
    requiredLevel: 3
  }
};

const INITIAL_BUTTON_COSTS = {};
for (const k in buttons) INITIAL_BUTTON_COSTS[k] = buttons[k].upgradeCost;

/* Advancements */

function showAdvancementPopup(title, description) {
  const audio = new Audio("./sounds/advancement.wav");
  audio.volume = 1;
  audio.play().catch(() => {});

  const popup = create("div", {
    className: "advancement-popup",
    innerHTML: `<strong>${title}</strong><br>${description}`
  });
  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 4000);
}

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
    critsLanded
  };
}

function checkAdvancements() {
  const state = getAdvancementState();
  for (const id in advancementsData) {
    if (!completedAdvancements.has(id) && advancementsData[id].check(state)) {
      completedAdvancements.add(id);
      const { name, description } = advancementsData[id];
      showAdvancementPopup(name, description);
      renderAdvancementsPopup();
    }
  }
}

/* UI Helpers */

function isGUIActive() {
  return [perksShop, settingsPopup, advancementsPopup, prestigePopup].some(
    i => i.style.display === "flex"
  );
}

function updateCanvasSize() {
  const guiActive = isGUIActive();

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

function showFloatingText(x, y, text, color) {
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

function effectiveSpawnInterval() {
  return Math.max(120, spawnInterval * Math.pow(0.95, prestigeUpgrades.spawnRate || 0));
}

function updateStuff({ onlyInformation = false } = {}) {
  const information = [
    `<strong>Points: ${formatNumber(points)}</strong>`,
    prestigeLevel !== 0 &&
      `<strong>Prestige Points: ${formatNumber(prestigePoints)}</strong>`,
    `Lifetime Points: ${formatNumber(lifetimePoints)}`,
    `Spawn Delay: ${(effectiveSpawnInterval() / 1000).toFixed(2)}s`,
    `Steepness: ${platformAngle.toFixed(2)}`,
    `Ball Bounciness: ${bounciness.toFixed(2)}`,
    `Ball Size: +${ballSize.toFixed(2)}`,
    `Ball Money: x${moneyMultiplier.toFixed(2)}${moneyHyperplier !== 1 ? ` (x${moneyHyperplier.toFixed(2)})` : ""}`,
    `Gravity: x${gravity.toFixed(2)}`
  ].filter(Boolean);
  informationDiv.innerHTML = information.join("<br>");

  if (onlyInformation) return;

  Body.setAngle(leftPlatform, platformAngle);
  Body.setAngle(rightPlatform, -platformAngle);
  engine.world.gravity.y = gravity;

  for (const key in buttons) {
    const value = buttons[key];
    const button = value.element || (value.element = element(key));

    let condition;
    try {
      condition = value.purchaseCondition();
    } catch (_) {
      condition = false;
    }

    const baseText =
      typeof value.baseText === "function" ? value.baseText() : value.baseText;

    if (condition === true) {
      button.innerText = `${baseText} (Cost: ${formatNumber(value.upgradeCost)})`;
      button.disabled = points < value.upgradeCost;
    } else {
      button.innerText = `${baseText} (Unavailable)`;
      button.disabled = true;
    }
  }

  for (const key in perksData) {
    const perk = perksData[key];
    if (!perk.element) continue;
    if (perks.has(key)) {
      perk.element.innerText = `${perk.baseText} (Obtained)`;
      perk.element.disabled = true;
    } else if (prestigeLevel < (perk.requiredLevel || 0)) {
      perk.element.innerText = `${perk.baseText} (Requires Prestige Level ${perk.requiredLevel})`;
      perk.element.disabled = true;
    } else {
      perk.element.innerText = `${perk.baseText} (Cost: ${formatNumber(perk.cost)})`;
      perk.element.disabled = points < perk.cost;
    }
  }

  checkAdvancements();
  refreshOpenPrestigePopup();
}

function renderAdvancementsPopup() {
  advancementsListDiv.innerHTML = "";

  for (const cat of advancementCategories) {
    const categoryEl = create("div", { className: "advancement-category" });
    categoryEl.appendChild(
      create("h3", { textContent: cat.name, className: "advancement-label" })
    );

    const grid = create("div", { className: "advancement-grid" });
    const items = Object.keys(advancementsData)
      .filter(id => (advancementsData[id].category || "") === cat.id)
      .sort((a, b) => (advancementsData[a].sort ?? 0) - (advancementsData[b].sort ?? 0));

    for (const id of items) {
      const adv = advancementsData[id];
      const isDone = completedAdvancements.has(id);

      const el = create("div", {
        className: "advancement-list",
        innerHTML: `<strong>${adv.name}</strong><br><small>${adv.description}</small>`
      });
      if (isDone) el.classList.add("done");
      grid.appendChild(el);
    }

    categoryEl.appendChild(grid);
    advancementsListDiv.appendChild(categoryEl);
  }
}

/* Prestige */

const prestigeShopItems = [
  {
    id: "prest_money_boost",
    name: "Money Boost",
    desc: "+20% permanent earnings",
    cost: 1,
    costMulti: 1.35,
    requiredLevel: 0,
    whenPurchase: () => {
      prestigeUpgrades.moneyMult = (prestigeUpgrades.moneyMult || 0) + 0.2;
    },
    condition: () => true
  },
  {
    id: "prest_start_points",
    name: "Start Points",
    desc: "+400 points at the start of each run",
    cost: 2,
    costMulti: 1.1,
    requiredLevel: 0,
    whenPurchase: () => {
      prestigeUpgrades.startPoints = (prestigeUpgrades.startPoints || 0) + 400;
    },
    condition: () => true
  },
  {
    id: "prest_gold_chance",
    name: "Gold Chance",
    desc: "+5% gold spawn chance (max +40%)",
    cost: 3,
    costMulti: 1.6,
    maxLevel: 10,
    requiredLevel: 0,
    whenPurchase: () => {
      prestigeUpgrades.goldChance = (prestigeUpgrades.goldChance || 0) + 0.05;
    },
    condition: () => (prestigeUpgrades.goldChance || 0) < 0.4
  },
  {
    id: "prest_spawn_rate",
    name: "Faster Spawning",
    desc: "-5% spawn delay, permanent (max 20)",
    cost: 2,
    costMulti: 1.45,
    maxLevel: 20,
    requiredLevel: 3,
    whenPurchase: () => {
      prestigeUpgrades.spawnRate = (prestigeUpgrades.spawnRate || 0) + 1;
    },
    condition: () => (prestigeUpgrades.spawnRate || 0) < 20
  },
  {
    id: "prest_ball_size",
    name: "Bigger Balls",
    desc: "+1 permanent ball size (max +15)",
    cost: 3,
    costMulti: 1.3,
    maxLevel: 20,
    requiredLevel: 6,
    whenPurchase: () => {
      prestigeUpgrades.ballSize = (prestigeUpgrades.ballSize || 0) + 1;
    },
    condition: () => (prestigeUpgrades.ballSize || 0) < 15
  }
];

function prestigeItemLevel(item) {
  const u = prestigeUpgrades;
  switch (item.id) {
    case "prest_money_boost":
      return Math.round((u.moneyMult || 0) / 0.2);
    case "prest_start_points":
      return Math.round((u.startPoints || 0) / 400);
    case "prest_gold_chance":
      return Math.round((u.goldChance || 0) / 0.05);
    case "prest_spawn_rate":
      return u.spawnRate || 0;
    case "prest_ball_size":
      return u.ballSize || 0;
    default:
      return 0;
  }
}

function prestigeItemCost(item) {
  const level = prestigeItemLevel(item);
  return Math.floor(item.cost * Math.pow(item.costMulti || 1, level));
}

function resetRun() {
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
    if (buttons[k].element) {
      const baseText =
        typeof buttons[k].baseText === "function"
          ? buttons[k].baseText()
          : buttons[k].baseText;
      buttons[k].element.innerText =
        `${baseText} (Cost: ${formatNumber(buttons[k].upgradeCost)})`;
    }
  }

  if (prestigeUpgrades.startPoints) points += prestigeUpgrades.startPoints;

  saveGame();
  updateStuff();
}

function grantPrestigePoints() {
  const gain = Math.floor(lifetimePoints / PRESTIGE_THRESHOLD) - prestigeLevel;
  return Math.max(0, gain);
}

const prestigeUI = {
  open: false,
  lastRefresh: 0,
  el: {},
  currentEls: {},
  buyButtons: []
};

function prestigeProgress() {
  const unclaimed = grantPrestigePoints();
  const segmentStart = (prestigeLevel + unclaimed) * PRESTIGE_THRESHOLD;
  const nextAt = segmentStart + PRESTIGE_THRESHOLD;
  const progress = clamp((lifetimePoints - segmentStart) / PRESTIGE_THRESHOLD, 0, 1);
  return { unclaimed, nextAt, progress };
}

function renderPrestigePopup() {
  const content = element("prestigePopupContent");
  content.innerHTML = "";

  const h = create("h2", {
    textContent: "Prestige"
  });
  content.appendChild(h);

  const info = create("div", {
    innerHTML: `
    <p>Prestige points come from your <strong>lifetime points</strong> (1 per ${formatNumber(PRESTIGE_THRESHOLD)} earned across all runs). They are claimed when you reset the run.</p>
    <p>Lifetime Points: <strong id="prLifetime"></strong></p>
    <p>Prestige Level: <strong id="prLevel"></strong></p>
    <p>Spendable Prestige Points: <strong id="prSpendable"></strong></p>
    <p>Next prestige point at <strong id="prNext"></strong> lifetime points (<strong id="prPct"></strong>)</p>
  `,
    style: {
      marginBottom: "10px"
    }
  });
  content.appendChild(info);

  const bar = create("div", { className: "prestige-bar" });
  const barFill = create("div", { className: "prestige-bar-fill" });
  bar.appendChild(barFill);
  content.appendChild(bar);

  const resetBtn = create("button");
  onClick(resetBtn, () => {
    const gain = grantPrestigePoints();
    if (
      !confirm(
        `Reset your current run and ${gain > 0 ? `claim ${gain} prestige point${gain > 1 ? "s" : ""}` : "claim no prestige points"}? Points, upgrades and perks reset, but permanent upgrades are kept.`
      )
    )
      return;

    if (gain > 0) {
      prestigePoints += gain;
      prestigeLevel += gain;
      showAdvancementPopup(
        "Prestige!",
        `Gained ${gain} prestige point${gain > 1 ? "s" : ""}!`
      );
    }

    resetRun();
    refreshPrestigePopup();
    if (soundEffectsEnabled) {
      const audio = new Audio("./sounds/hint.wav");
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
  });
  content.appendChild(resetBtn);

  const shopContainer = create("div", {
    className: "prestigeShopDiv"
  });

  const shopTitle = create("div", {
    innerHTML: `<h3>Prestige Shop</h3><p>Buy permanent upgrades using Prestige Points.</p>`
  });
  shopContainer.appendChild(shopTitle);

  const shopList = create("div", {
    className: "vertical"
  });

  const buyButtons = [];

  for (const item of prestigeShopItems) {
    const row = create("div", { className: "prestigeShopItem" });
    const info = create("div");
    info.appendChild(create("strong", { textContent: item.name }));
    info.appendChild(create("br"));
    info.appendChild(create("small", { textContent: item.desc }));
    const levelEl = create("div", { className: "prestigeShopLevel" });
    info.appendChild(levelEl);
    row.appendChild(info);

    const buy = create("button");
    onClick(buy, () => {
      const cost = prestigeItemCost(item);
      if (item.requiredLevel > prestigeLevel)
        return alert(`Requires prestige level ${item.requiredLevel}.`);
      if (prestigePoints < cost) return alert("Not enough prestige points.");
      if (!item.condition()) return alert("You can't buy this right now.");
      prestigePoints -= cost;
      if (item.whenPurchase) item.whenPurchase();
      saveGame();
      updateStuff();
      refreshPrestigePopup();
      if (soundEffectsEnabled) {
        const audio = new Audio("./sounds/hint.wav");
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    });

    buyButtons.push({ button: buy, item, levelEl });
    row.appendChild(buy);
    shopList.appendChild(row);
  }

  shopContainer.appendChild(shopList);

  const current = create("div", {
    innerHTML: `
    <h3>Current Prestige Upgrades</h3>
    <p id="prMoneyBoost"></p>
    <p id="prStartPoints"></p>
    <p id="prGoldChance"></p>
    <p id="prSpawnRate"></p>
    <p id="prBallSize"></p>
  `
  });
  shopContainer.appendChild(current);
  content.appendChild(shopContainer);

  prestigeUI.el = {
    lifetime: element("prLifetime"),
    level: element("prLevel"),
    spendable: element("prSpendable"),
    next: element("prNext"),
    pct: element("prPct"),
    barFill,
    resetBtn
  };
  prestigeUI.currentEls = {
    moneyBoost: element("prMoneyBoost"),
    startPoints: element("prStartPoints"),
    goldChance: element("prGoldChance"),
    spawnRate: element("prSpawnRate"),
    ballSize: element("prBallSize")
  };
  prestigeUI.buyButtons = buyButtons;

  refreshPrestigePopup();
}

function refreshPrestigePopup() {
  const el = prestigeUI.el;
  if (!el.lifetime) return;

  const { unclaimed, nextAt, progress } = prestigeProgress();

  el.lifetime.textContent = formatNumber(lifetimePoints);
  el.level.textContent = formatNumber(prestigeLevel);
  el.spendable.textContent = formatNumber(prestigePoints);
  el.next.textContent = formatNumber(nextAt);
  el.pct.textContent = Math.round(progress * 100) + "%";
  el.barFill.style.width = Math.round(progress * 100) + "%";
  el.resetBtn.textContent =
    unclaimed > 0
      ? `Reset Run (Claim ${formatNumber(unclaimed)} Prestige Point${unclaimed > 1 ? "s" : ""})`
      : "Reset Run (No Prestige Points to Claim)";

  for (const { button, item, levelEl } of prestigeUI.buyButtons) {
    const isGated = item.requiredLevel > prestigeLevel;
    const level = prestigeItemLevel(item);
    levelEl.textContent = item.maxLevel
      ? `Level ${level} / ${item.maxLevel}`
      : `Level ${level}`;

    if (isGated) {
      button.textContent = `Unlocks at Prestige Level ${item.requiredLevel}`;
      button.disabled = true;
    } else if (!item.condition()) {
      button.textContent = "Maxed";
      button.disabled = true;
    } else {
      const cost = prestigeItemCost(item);
      button.textContent = `Buy (Cost: ${formatNumber(cost)})`;
      button.disabled = prestigePoints < cost;
    }
  }

  const c = prestigeUI.currentEls;
  c.moneyBoost.textContent = `Money Boost: +${Math.round((prestigeUpgrades.moneyMult || 0) * 100)}%`;
  c.startPoints.textContent = `Start Points: ${formatNumber(prestigeUpgrades.startPoints || 0)}`;
  c.goldChance.textContent = `Gold Chance Bonus: +${Math.round((prestigeUpgrades.goldChance || 0) * 100)}%`;
  c.spawnRate.textContent = `Spawn Rate: -${Math.round((1 - Math.pow(0.95, prestigeUpgrades.spawnRate || 0)) * 100)}%`;
  c.ballSize.textContent = `Ball Size Boost: +${prestigeUpgrades.ballSize || 0}`;
}

function refreshOpenPrestigePopup() {
  if (!prestigeUI.open) return;
  const now = Date.now();
  if (now - prestigeUI.lastRefresh < 250) return;
  prestigeUI.lastRefresh = now;
  refreshPrestigePopup();
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

function spawnObject({ x, y, size } = {}) {
  totalBallsSpawned++;

  const baseGoldChance = perks.has("goldBalls") ? 0.1 : 0;
  const goldChance = baseGoldChance + (prestigeUpgrades.goldChance || 0);
  const isGold = Math.random() < goldChance;
  const rainbowChance = perks.has("rainbowBalls") ? 0.08 : 0;
  const isRainbow = !isGold && Math.random() < rainbowChance;

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
      : { fillStyle: color };

  const obj = Bodies.circle(_x, _y, _size / 2, {
    restitution: bounciness * 0.95,
    label: "fallingObject",
    render: myRender,
    collisionFilter: {
      category: CATEGORY_UNCOLLECTED,
      mask: CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED | CATEGORY_INVISIBLE_WALL
    }
  });

  obj.originSize = _size;
  const typeMult = isGold ? 2 : isRainbow ? 4 : 1;
  let pointValue = Math.floor((_size / 2) * typeMult);
  if ((isGold || isRainbow) && perks.has("richBalls")) {
    pointValue = Math.floor(pointValue * 1.5);
  }
  obj.pointValue = pointValue;
  obj.collected = false;
  obj.isGold = isGold;
  obj.isRainbow = isRainbow;

  World.add(world, obj);
  return obj;
}

/* Upgrade Buttons */

for (const key in buttons) {
  const value = buttons[key];
  const newButton = create("button", {
    disabled: value.purchaseCondition() || points < value.upgradeCost,
    id: key,
    innerText: `${value.baseText} (Cost: ${formatNumber(value.upgradeCost)})`
  });

  onClick(newButton, e => {
    if (!e.isTrusted || newButton.disabled) return;

    if (points < value.upgradeCost) {
      alert("Not enough points for upgrade!");
      return;
    }

    if (!value.purchaseCondition()) {
      alert("You cannot purchase this upgrade right now!");
      return;
    }

    points -= value.upgradeCost;
    value.upgradeCost = Math.floor(value.upgradeCost * value.upgradeMulti);
    newButton.innerText = `${value.baseText} (Cost: ${formatNumber(value.upgradeCost)})`;

    if (value.whenPurchase) value.whenPurchase();

    updateStuff();

    if (soundEffectsEnabled) {
      const audio = new Audio("./sounds/hint.wav");
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
  });

  buttonHolder.appendChild(newButton);
  value.element = newButton;
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
    gravity = clamp(dataXZ.f ?? DEFAULTS.gravity, 1, 3);
    bounciness = clamp(dataXZ.h ?? DEFAULTS.bounciness, 0.6, 1.1);
    moneyHyperplier = clamp(dataXZ.i ?? DEFAULTS.moneyHyperplier, 1, 2);
    perks = new Set([...(dataXZ.j ?? [])]);
    completedAdvancements = new Set([...(dataXZ.k ?? [])]);
    prestigePoints = dataXZ.p ?? 0;
    prestigeLevel = dataXZ.q ?? 0;
    prestigeUpgrades = dataXZ.r ?? prestigeUpgrades;
    ballSize = clamp(dataXZ.s ?? DEFAULTS.ballSize, 0, 20);
    lifetimePoints = dataXZ.t ?? prestigeLevel * PRESTIGE_THRESHOLD;
    totalBallsSpawned = dataXZ.u ?? 0;
    critsLanded = dataXZ.v ?? 0;

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

Events.on(engine, "collisionStart", event => {
  for (const pair of event.pairs) {
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
      let finalEarn = Math.floor(baseEarn * (1 + (prestigeUpgrades.moneyMult || 0)));

      let isCrit = false;
      if (perks.has("critBalls") && Math.random() < 12 / 100) {
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
const maxFps = 60;
const frameDuration = 1000 / maxFps;

(function gameLoop() {
  const now = Date.now();
  const delta = now - lastFrame;

  if (delta >= frameDuration) {
    lastFrame = now - (delta % frameDuration);

    if (now - lastSpawn > effectiveSpawnInterval()) {
      spawnObject();
      if (perks.has("doubleDrop") && Math.random() < 20 / 100) spawnObject();
      lastSpawn = now;
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
window.addEventListener("resize", updateCanvasSize);

/* Popup & Settings Event Listeners */

onClick(toggleButtonHolder, () => {
  const isOpen = buttonHolder.style.display !== "none";
  toggleButtonHolder.classList.toggle("active", !isOpen);

  if (!isOpen) {
    buttonHolder.style.display = "flex";
    buttonHolder.style.animation = "appear 0.3s ease-out forwards";
    buttonHolder.addEventListener(
      "animationend",
      () => {
        buttonHolder.style.animation = "";
      },
      { once: true }
    );
  } else {
    buttonHolder.style.animation = "disappear 0.3s ease-in forwards";
    buttonHolder.addEventListener(
      "animationend",
      () => {
        buttonHolder.style.display = "none";
        buttonHolder.style.animation = "";
      },
      { once: true }
    );
  }
});

onClick(element("openPerksShop"), () => {
  perksShop.style.display = "flex";
  buttonHolder.style.display = "none";
  toggleButtonHolder.style.display = "none";
});
onClick(element("openPrestige"), () => {
  prestigeUI.open = true;
  prestigeUI.lastRefresh = 0;
  renderPrestigePopup();
  prestigePopup.style.display = "flex";
  buttonHolder.style.display = "none";
  toggleButtonHolder.style.display = "none";
});
onClick(element("openSettings"), () => {
  settingsPopup.style.display = "flex";
  buttonHolder.style.display = "none";
  toggleButtonHolder.style.display = "none";
});

document.querySelectorAll("button.closePopup").forEach(el => {
  onClick(el, () => {
    document.querySelectorAll("div.popup").forEach(p => (p.style.display = "none"));
    prestigeUI.open = false;
    updateCanvasSize();
  });
});

/* Perk Buttons */

for (const key in perksData) {
  const perk = perksData[key];
  const button = create("button", {
    id: key,
    innerText: `${perk.baseText} (Cost: ${formatNumber(perk.cost)})`
  });
  onClick(button, () => {
    if (points < perk.cost) return alert("Not enough points for upgrade!");
    if (prestigeLevel < (perk.requiredLevel || 0))
      return alert(`This perk requires prestige level ${perk.requiredLevel}.`);
    if (perks.has(key)) return;
    points -= perk.cost;
    perks.add(key);
    updateStuff();
  });
  const description = create("p", { innerText: perk.description });
  perksButtonHolder.appendChild(button);
  perksButtonHolder.appendChild(description);
  perk.element = button;
}

onClick(toggleMusicButton, () => {
  if (backgroundMusic.paused) {
    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch(() => {});
    localStorage.setItem("music", "true");
    toggleMusicButton.textContent = "Turn Music Off";
  } else {
    backgroundMusic.pause();
    localStorage.setItem("music", "false");
    toggleMusicButton.textContent = "Turn Music On";
  }
});

onClick(setMusicUrlButton, () => {
  const musicUrlInput = element("musicUrlInput").value;

  let url;
  try {
    url = new URL(musicUrlInput);
  } catch (_) {
    try {
      url = new URL("/music/" + musicUrlInput, window.location.href);
    } catch (_) {
      url = "/music/Disco con Tutti.mp3";
    }
  }

  const wasPaused = backgroundMusic.paused;
  localStorage.setItem("musicUrl", url);
  backgroundMusic.pause();
  backgroundMusic.src = url;
  backgroundMusic.load();
  backgroundMusic.addEventListener(
    "loadeddata",
    () => {
      if (!wasPaused) backgroundMusic.play().catch(() => {});
      else backgroundMusic.pause();
    },
    { once: true }
  );
});

onClick(toggleSoundEffectsButton, () => {
  if (!soundEffectsEnabled) {
    localStorage.setItem("effects", "true");
    toggleSoundEffectsButton.textContent = "Disable Sound Effects";
  } else {
    localStorage.setItem("effects", "false");
    toggleSoundEffectsButton.textContent = "Enable Sound Effects";
  }
  soundEffectsEnabled = !soundEffectsEnabled;
});

onClick(openAdvancements, () => {
  advancementsPopup.style.display = "flex";
  buttonHolder.style.display = "none";
  toggleButtonHolder.style.display = "none";
  renderAdvancementsPopup();
});

/* Init */

if (localStorage.getItem("music") === null) localStorage.setItem("music", "true");
if (localStorage.getItem("effects") === null) localStorage.setItem("effects", "true");

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
updateStuff();

toggleMusicButton.textContent =
  localStorage.getItem("music") === "false" ? "Turn Music On" : "Turn Music Off";
soundEffectsEnabled = localStorage.getItem("effects") !== "false";
toggleSoundEffectsButton.textContent = soundEffectsEnabled
  ? "Disable Sound Effects"
  : "Enable Sound Effects";
