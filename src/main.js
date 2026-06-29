import {
  SMALL_SCREEN_WIDTH,
  ASPECT_RATIO,
  MAX_WIDTH,
  MAX_HEIGHT,
  CATEGORY_UNCOLLECTED,
  CATEGORY_COLLECTED,
  CATEGORY_INVISIBLE_WALL,
  PRESTIGE_THRESHOLD,
  DEFAULTS,
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
  Composite,
} from "./physics.js";

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
  ballSize = DEFAULTS.ballSize;

var prestigePoints = 0,
  prestigeLevel = 0,
  prestigeUpgrades = {
    moneyMult: 0,
    startPoints: 0,
    goldChance: 0,
  };

engine.world.gravity.y = gravity;

/* Save / Load */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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
    }),
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
    enumerable: false,
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
    purchaseCondition: () => spawnInterval > 400,
  },
  upgradeMoney: {
    baseText: "Multiply Ball Money",
    upgradeCost: 100,
    upgradeMulti: 1.6,
    whenPurchase: () => {
      moneyMultiplier += 0.3;
    },
    purchaseCondition: () => true,
  },
  upgradeAngle: {
    baseText: "Increase Steepness",
    upgradeCost: 50,
    upgradeMulti: 1.2,
    whenPurchase: () => {
      platformAngle += 0.02;
    },
    purchaseCondition: () => platformAngle < 0.85,
  },
  upgradeBallSize: {
    baseText: "Increase Ball Size",
    upgradeCost: 200,
    upgradeMulti: 1.5,
    whenPurchase: () => {
      ballSize += 2;
    },
    purchaseCondition: () => ballSize < 20,
  },
  upgradeGravity: {
    baseText: "Increment Gravity",
    upgradeCost: 100,
    upgradeMulti: 1.9,
    whenPurchase: () => {
      gravity += 0.2;
    },
    purchaseCondition: () => gravity < 3,
  },
  upgradeBounciness: {
    baseText: () => (bounciness < 1.1 ? "+0.1 Bouncy & Hyperplier" : "+0.1 Hyperplier"),
    upgradeCost: 500,
    upgradeMulti: 1.75,
    whenPurchase: () => {
      if (bounciness < 1.1) bounciness += 0.1;
      moneyHyperplier += 0.1;
    },
    purchaseCondition: () => moneyHyperplier < 2,
  },
};

/* Perks */

const perksData = {
  goldBalls: {
    baseText: "Gold Balls",
    cost: 2400,
    description: "Adds a 10% chance of a ball spawning as gold (x2.5 value)",
  },
  fastConveyor: {
    baseText: "Fast Conveyor",
    cost: 3000,
    description: "Doubles the conveyor belt speed",
  },
  splitBalls: {
    baseText: "Split Balls",
    cost: 5000,
    description: "Adds a 9% chance of a ball splitting on impact",
  },
};

const INITIAL_BUTTON_COSTS = {};
for (const k in buttons) INITIAL_BUTTON_COSTS[k] = buttons[k].upgradeCost;

/* Advancements */

const advancementsData = {
  points_100: {
    name: "Bouncy Balls",
    description: "Reach 100 points",
    check: () => points >= 100,
  },
  points_1000: {
    name: "Bouncier Balls",
    description: "Reach 1000 points",
    check: () => points >= 1000,
  },
  points_10000: {
    name: "I Love Balls",
    description: "Reach 10000 points",
    check: () => points >= 10000,
  },
  points_100000: {
    name: "Boing! Boing!",
    description: "Reach 100000 points",
    check: () => points >= 100000,
  },
  bouncy_max: {
    name: "Super Bouncy",
    description: "Max out bounciness",
    check: () => bounciness >= 1.1,
  },
  big_earner: {
    name: "Big Earner",
    description: "Earn 100 or more points in a single impact",
    check: () => lastPointsEarned >= 100,
  },
  bigger_earner: {
    name: "Bigger Earner",
    description: "Earn 586 or more points in a single impact",
    check: () => lastPointsEarned >= 586,
  },
  hyper_earner: {
    name: "Hyper Earner",
    description: "Max out hyperplier",
    check: () => moneyHyperplier >= 2,
  },
  gold_balls: {
    name: "Golden Touch",
    description: "Buy the Gold Balls perk",
    check: () => perks.has("goldBalls"),
  },
  golden_divorce: {
    name: "Golden Divorce",
    description: "A golden ball has split upon impact",
    check: () => goldenDivorce,
  },
  start_over: {
    name: "Start Over",
    description: "Have 1 or more prestige points at once",
    check: () => prestigePoints >= 1,
  },
  radiant_revival: {
    name: "Radiant Revival",
    description: "Have 5 or more prestige points at once",
    check: () => prestigePoints >= 5,
  },
};

function showAdvancementPopup(title, description) {
  const audio = new Audio("./sounds/advancement.wav");
  audio.volume = 1;
  audio.play().catch(() => {});

  const popup = create("div", {
    className: "advancement-popup",
    innerHTML: `<strong>${title}</strong><br>${description}`,
  });
  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 4000);
}

function checkAdvancements() {
  for (const id in advancementsData) {
    if (!completedAdvancements.has(id) && advancementsData[id].check()) {
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
    i => i.style.display === "flex",
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
      color: color || "inherit",
    },
  });
  document.body.appendChild(floatElem);

  requestAnimationFrame(() => {
    floatElem.style.transform = "translateY(-30px)";
    floatElem.style.opacity = 0;
  });

  setTimeout(() => floatElem.remove(), 1000);
}

function updateStuff({ onlyInformation = false } = {}) {
  const information = [
    `<strong>Points: ${points}</strong>`,
    prestigeLevel !== 0 && `<strong>Prestige Points: ${prestigePoints}</strong>`,
    `Spawn Delay: ${(spawnInterval / 1000).toFixed(2)}`,
    `Steepness: ${platformAngle.toFixed(2)}`,
    `Ball Bounciness: ${bounciness.toFixed(2)}`,
    `Ball Size: +${ballSize.toFixed(2)}`,
    `Ball Money: x${moneyMultiplier.toFixed(2)}${moneyHyperplier !== 1 ? ` (x${moneyHyperplier.toFixed(2)})` : ""}`,
    `Gravity: x${gravity.toFixed(2)}`,
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
      button.innerText = `${baseText} (Cost: ${value.upgradeCost})`;
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
    } else {
      perk.element.innerText = `${perk.baseText} (Cost: ${perk.cost})`;
      perk.element.disabled = points < perk.cost;
    }
  }

  checkAdvancements();
}

function renderAdvancementsPopup() {
  advancementsListDiv.innerHTML = "";

  for (const id in advancementsData) {
    const adv = advancementsData[id];
    const isDone = completedAdvancements.has(id);

    const el = create("div", {
      className: "advancement-list",
      innerHTML: `<strong>${adv.name}</strong><br><small>${adv.description}</small>`,
    });
    if (isDone) el.classList.add("done");
    advancementsListDiv.appendChild(el);
  }
}

/* Prestige */

const prestigeShopItems = [
  {
    id: "prest_money_boost",
    name: "Money Boost",
    desc: "+20% permanent earnings",
    cost: 1,
    whenPurchase: () => {
      prestigeUpgrades.moneyMult = (prestigeUpgrades.moneyMult || 0) + 0.2;
    },
    condition: () => true,
  },
  {
    id: "prest_start_points",
    name: "Start Points",
    desc: "+400 points after prestiging",
    cost: 2,
    whenPurchase: () => {
      prestigeUpgrades.startPoints = (prestigeUpgrades.startPoints || 0) + 400;
    },
    condition: () => true,
  },
  {
    id: "prest_gold_chance",
    name: "Gold Chance",
    desc: "+5% gold spawn chance",
    cost: 3,
    whenPurchase: () => {
      prestigeUpgrades.goldChance = (prestigeUpgrades.goldChance || 0) + 0.05;
    },
    condition: () => prestigeUpgrades.goldChance < 0.5,
  },
];

function renderPrestigePopup() {
  const content = element("prestigePopupContent");
  content.innerHTML = "";

  const h = create("h2", {
    textContent: "Prestige",
  });
  content.appendChild(h);

  const potentialGain = Math.floor(points / PRESTIGE_THRESHOLD);

  const info = create("div", {
    innerHTML: `
    <p>Total prestige level: <strong>${prestigeLevel}</strong></p>
    <p>Prestiging grants <strong>${potentialGain}</strong> prestige point(s) (1 per ${PRESTIGE_THRESHOLD} points).</p>
    <p>Prestiging will reset most normal progress, but your prestige shop upgrades are permanent.</p>
  `,
    style: {
      marginBottom: "10px",
    },
  });
  content.appendChild(info);

  const prestigeNowBtn = create("button", {
    textContent:
      potentialGain > 0
        ? `Prestige Now (Gain ${potentialGain})`
        : `Prestige Now (Need ${PRESTIGE_THRESHOLD} points)`,
    disabled: potentialGain <= 0,
  });
  onClick(prestigeNowBtn, () => {
    if (
      !confirm(
        `Are you sure you want to prestige and gain ${potentialGain} prestige point(s)? This will reset normal progress.`,
      )
    )
      return;

    prestigePoints += potentialGain;
    prestigeLevel += potentialGain;

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
        buttons[k].element.innerText = `${baseText} (Cost: ${buttons[k].upgradeCost})`;
      }
    }

    if (prestigeUpgrades.startPoints) points += prestigeUpgrades.startPoints;

    saveGame();
    updateStuff();
    renderPrestigePopup();

    if (soundEffectsEnabled) {
      const audio = new Audio("./sounds/hint.wav");
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }

    alert(`Prestiged! You gained ${potentialGain} prestige point(s).`);
  });
  content.appendChild(prestigeNowBtn);

  const shopContainer = create("div", {
    className: "prestigeShopDiv",
  });

  const shopTitle = create("div", {
    innerHTML: `<h3>Prestige Shop</h3><p>Buy permanent upgrades using Prestige Points.</p>`,
  });
  shopContainer.appendChild(shopTitle);

  const shopList = create("div", {
    className: "vertical",
  });

  for (const item of prestigeShopItems) {
    const row = create("div", {
      className: "prestigeShopItem",
      innerHTML: `<div><strong>${item.name}</strong><br><small>${item.desc}</small></div>`,
    });

    const buy = create("button", {
      textContent: `Buy (Cost: ${item.cost})`,
      disabled: prestigePoints < item.cost,
    });
    onClick(buy, () => {
      if (prestigePoints < item.cost) return alert("Not enough prestige points.");
      if (!item.condition()) return alert("You can't buy this right now.");
      prestigePoints -= item.cost;
      if (item.whenPurchase) item.whenPurchase();
      saveGame();
      updateStuff();
      renderPrestigePopup();
      if (soundEffectsEnabled) {
        const audio = new Audio("./sounds/hint.wav");
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    });

    row.appendChild(buy);
    shopList.appendChild(row);
  }

  shopContainer.appendChild(shopList);

  const current = create("div", {
    innerHTML: `
    <h3>Current Prestige Upgrades</h3>
    <p>Money Boost: +${Math.round((prestigeUpgrades.moneyMult || 0) * 100)}%</p>
    <p>Start Points: ${prestigeUpgrades.startPoints || 0}</p>
    <p>Gold Chance Bonus: +${Math.round((prestigeUpgrades.goldChance || 0) * 100)}%</p>
  `,
  });
  shopContainer.appendChild(current);
  content.appendChild(shopContainer);
}

/* Game Logic */

function spawnObject({ x, y, size } = {}) {
  const baseGoldChance = perks.has("goldBalls") ? 0.1 : 0;
  const goldChance = baseGoldChance + (prestigeUpgrades.goldChance || 0);
  const isGold = Math.random() < goldChance;

  const _size = size ?? Math.random() * 30 + 20 + ballSize;
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
          yScale: _size / 333,
        },
      }
    : { fillStyle: color };

  const obj = Bodies.circle(_x, _y, _size / 2, {
    restitution: bounciness * 0.95,
    label: "fallingObject",
    render: myRender,
    collisionFilter: {
      category: CATEGORY_UNCOLLECTED,
      mask: CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED | CATEGORY_INVISIBLE_WALL,
    },
  });

  obj.originSize = _size;
  obj.pointValue = Math.floor(_size / (isGold ? 1 : 2));
  obj.collected = false;
  obj.isGold = isGold;

  World.add(world, obj);
  return obj;
}

/* Upgrade Buttons */

for (const key in buttons) {
  const value = buttons[key];
  const newButton = create("button", {
    disabled: value.purchaseCondition() || points < value.upgradeCost,
    id: key,
    innerText: `${value.baseText} (Cost: ${value.upgradeCost})`,
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
    newButton.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;

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
      0.85,
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
          size: newSize,
        });
        const ballRight = spawnObject({
          x: object.position.x,
          y: object.position.y,
          size: newSize,
        });

        const forceMagnitude = 0.02 * ((newSize * 1.6) / 80);
        Body.applyForce(ballLeft, ballLeft.position, {
          x: -forceMagnitude,
          y: -forceMagnitude,
        });
        Body.applyForce(ballRight, ballRight.position, {
          x: forceMagnitude,
          y: -forceMagnitude,
        });

        showFloatingText(object.position.x, object.position.y, "Split!", "#bd8d4f");
        World.remove(world, object);
        continue;
      }

      object.collected = true;
      object.collisionFilter.category = CATEGORY_COLLECTED;
      object.collisionFilter.mask = CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED;

      const baseEarn = Math.floor(
        (object.pointValue || 1) * (moneyMultiplier * moneyHyperplier),
      );
      const finalEarn = Math.floor(baseEarn * (1 + (prestigeUpgrades.moneyMult || 0)));

      lastPointsEarned = finalEarn;
      points += finalEarn;

      updateStuff();
      showFloatingText(object.position.x, object.position.y, "+" + finalEarn);
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

    if (now - lastSpawn > spawnInterval) {
      spawnObject();
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
      { once: true },
    );
  } else {
    buttonHolder.style.animation = "disappear 0.3s ease-in forwards";
    buttonHolder.addEventListener(
      "animationend",
      () => {
        buttonHolder.style.display = "none";
        buttonHolder.style.animation = "";
      },
      { once: true },
    );
  }
});

onClick(element("openPerksShop"), () => {
  perksShop.style.display = "flex";
  buttonHolder.style.display = "none";
  toggleButtonHolder.style.display = "none";
});
onClick(element("openPrestige"), () => {
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
    updateCanvasSize();
  });
});

/* Perk Buttons */

for (const key in perksData) {
  const perk = perksData[key];
  const button = create("button", {
    id: key,
    innerText: `${perk.baseText} (Cost: ${perk.cost})`,
  });
  onClick(button, () => {
    if (points < perk.cost) return alert("Not enough points for upgrade!");
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
    { once: true },
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
  { once: true },
);

updateCanvasSize();
updateStuff();

toggleMusicButton.textContent =
  localStorage.getItem("music") === "false" ? "Turn Music On" : "Turn Music Off";
soundEffectsEnabled = localStorage.getItem("effects") !== "false";
toggleSoundEffectsButton.textContent = soundEffectsEnabled
  ? "Disable Sound Effects"
  : "Enable Sound Effects";
