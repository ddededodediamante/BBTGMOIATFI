(async () => {
  /* Variables */

  const buttonHolder = document.getElementById("buttonHolder");
  const informationDiv = document.getElementById("information");
  const perksShop = document.getElementById("perksShop");
  const settingsPopup = document.getElementById("settings");
  const prestigePopup = document.getElementById("prestige");
  const advancementsPopup = document.getElementById("advancements");
  const perksGoldBalls = document.getElementById("perksGoldBalls");
  const perksFastConveyor = document.getElementById("perksFastConveyor");
  const perksSplitBalls = document.getElementById("perksSplitBalls");
  const toggleMusicButton = document.getElementById("toggleMusicButton");
  const setMusicUrlButton = document.getElementById("setMusicUrlButton");
  const toggleSoundEffectsButton = document.getElementById(
    "toggleSoundEffectsButton"
  );
  const backgroundMusic = document.getElementById("backgroundMusic");
  const advancementsListDiv = document.getElementById("advancementList");
  const openAdvancements = document.getElementById("openAdvancements");
  const toggleButtonHolder = document.getElementById("toggleButtonHolder");

  const SMALL_SCREEN_WIDTH = 750;
  const ASPECT_RATIO = 800 / 600;
  const MAX_WIDTH = 810;
  const MAX_HEIGHT = 610;
  const CATEGORY_UNCOLLECTED = 0b1;
  const CATEGORY_COLLECTED = 0b10;
  const CATEGORY_INVISIBLE_WALL = 0b100;

  /* Engine */

  const { Engine, Render, World, Bodies, Events, Body, Runner, Composite } =
    Matter;

  const engine = Engine.create();
  const { world } = engine;

  const canvas = document.getElementById("gameCanvas");
  canvas.width = 800;
  canvas.height = 600;

  function isGUIActive() {
    return [perksShop, settingsPopup, advancementsPopup, prestigePopup].some(
      (i) => i.style.display === "flex"
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

    // Run sizing in the next frame so layout is updated
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

  const render = Render.create({
    canvas,
    engine,
    options: {
      width: canvas.width,
      height: canvas.height,
      background: "#222",
      wireframes: false,
      pixelRatio: 1,
    },
  });

  Render.run(render);
  Runner.run(Runner.create(), engine);

  const DEFAULTS = {
    spawnInterval: 2000,
    platformAngle: 0.3,
    gravity: 1,
    moneyMultiplier: 1,
    bounciness: 0.6,
    moneyHyperplier: 1,
  };

  var platformWidth = 550,
    platformHeight = 20,
    points = 0,
    spawnInterval = DEFAULTS.spawnInterval,
    platformAngle = DEFAULTS.platformAngle,
    gravity = DEFAULTS.gravity,
    moneyMultiplier = DEFAULTS.moneyMultiplier,
    moneyHyperplier = DEFAULTS.moneyHyperplier,
    bounciness = DEFAULTS.bounciness,
    perks = [],
    completedAdvancements = [],
    lastPointsEarned = 0,
    soundEffectsEnabled = true,
    goldenDivorce;

  var prestigePoints = 0,
    prestigeLevel = 0,
    prestigeUpgrades = {
      moneyMult: 0,
      startPoints: 0,
      goldChance: 0,
    };

  engine.world.gravity.y = gravity;

  const leftWall = Bodies.rectangle(-10, canvas.height / 2, 20, canvas.height, {
    isStatic: true,
    render: { visible: false },
    collisionFilter: {
      category: CATEGORY_INVISIBLE_WALL,
      mask: CATEGORY_UNCOLLECTED,
    },
  });

  const rightWall = Bodies.rectangle(
    canvas.width + 10,
    canvas.height / 2,
    20,
    canvas.height,
    {
      isStatic: true,
      render: { visible: false },
      collisionFilter: {
        category: CATEGORY_INVISIBLE_WALL,
        mask: CATEGORY_UNCOLLECTED,
      },
    }
  );

  const leftPlatform = Bodies.rectangle(
    100,
    canvas.height / 3,
    platformWidth,
    platformHeight,
    {
      isStatic: true,
      angle: platformAngle,
      render: { fillStyle: "#555" },
    }
  );

  const rightPlatform = Bodies.rectangle(
    canvas.width - 100,
    canvas.height / 3,
    platformWidth,
    platformHeight,
    {
      isStatic: true,
      angle: -platformAngle,
      render: { fillStyle: "#555" },
    }
  );

  const conveyor = Bodies.rectangle(
    canvas.width / 2,
    canvas.height + 5,
    canvas.width,
    50,
    {
      isStatic: true,
      render: { fillStyle: "#777" },
      label: "conveyor",
    }
  );

  const roof = Bodies.rectangle(canvas.width / 2, -100, canvas.width, 50, {
    isStatic: true,
    render: { fillStyle: "#777" },
  });

  World.add(world, [
    leftWall,
    rightWall,
    leftPlatform,
    rightPlatform,
    conveyor,
    roof,
  ]);

  const buttons = {
    upgradeSpawnRate: {
      baseText: "Reduce Spawn Delay",
      upgradeCost: 50,
      upgradeMulti: 1.5,
      whenPurchase: () => {
        spawnInterval *= 0.9;
      },
      purchaseCondition: () => {
        return spawnInterval > 400;
      },
    },
    upgradeMoney: {
      baseText: "Multiply Ball Money",
      upgradeCost: 100,
      upgradeMulti: 1.6,
      whenPurchase: () => {
        moneyMultiplier += 0.3;
      },
      purchaseCondition: () => {
        return true;
      },
    },
    upgradeAngle: {
      baseText: "Increase Steepness",
      upgradeCost: 50,
      upgradeMulti: 1.2,
      whenPurchase: () => {
        platformAngle += 0.02;
      },
      purchaseCondition: () => {
        return platformAngle < 0.8;
      },
    },
    upgradeGravity: {
      baseText: "Increment Gravity",
      upgradeCost: 100,
      upgradeMulti: 1.9,
      whenPurchase: () => {
        gravity += 0.2;
      },
      purchaseCondition: () => {
        return gravity < 3;
      },
    },
    upgradeBounciness: {
      baseText: () =>
        bounciness < 1.1 ? "+0.1 Bouncy & Hyperplier" : "+0.1 Hyperplier",
      upgradeCost: 500,
      upgradeMulti: 1.75,
      whenPurchase: () => {
        if (bounciness < 1.1) bounciness += 0.1;
        moneyHyperplier += 0.1;
      },
      purchaseCondition: () => {
        return moneyHyperplier < 2;
      },
    },
  };

  const INITIAL_BUTTON_COSTS = {};
  for (const k in buttons) INITIAL_BUTTON_COSTS[k] = buttons[k].upgradeCost;

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
      description: "Earn 986 or more points in a single impact",
      check: () => lastPointsEarned >= 986,
    },
    hyper_earner: {
      name: "Hyper Earner",
      description: "Max out hyperplier",
      check: () => moneyHyperplier >= 2,
    },
    gold_balls: {
      name: "Golden Touch",
      description: "Buy the Gold Balls perk",
      check: () => perks.includes("goldBalls"),
    },
    golden_divorce: {
      name: "Golden Divorce",
      description: "A golden ball has split upon impact",
      check: () => goldenDivorce,
    },
  };

  function checkAdvancements() {
    for (const id in advancementsData) {
      if (!completedAdvancements.includes(id) && advancementsData[id].check()) {
        completedAdvancements.push(id);
        const { name, description } = advancementsData[id];
        showAdvancementPopup(name, description);
      }
    }
  }

  function showAdvancementPopup(title, description) {
    const audio = new Audio("./sounds/Advancement.wav");
    audio.volume = 1;
    audio.play().catch(() => {});

    const popup = document.createElement("div");
    popup.className = "advancement-popup";
    popup.innerHTML = `<strong>${title}</strong><br>${description}`;
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 4000);
  }

  const zx = (v) => btoa(JSON.stringify(v)).split("").reverse().join("");
  const xz = (v) => JSON.parse(atob(v.split("").reverse().join("")));

  function saveGame() {
    localStorage.setItem(
      "gameData",
      zx({
        a: spawnInterval,
        c: points,
        d: moneyMultiplier,
        e: platformAngle,
        f: gravity,
        g: (() => {
          const out = {};
          for (const key in buttons)
            out[key] = { upgradeCost: buttons[key].upgradeCost };
          return out;
        })(),
        h: bounciness,
        i: moneyHyperplier,
        j: perks,
        k: completedAdvancements,
        p: prestigePoints,
        q: prestigeLevel,
        r: prestigeUpgrades,
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
      enumerable: false,
    });
  })();

  function showFloatingText(x, y, text, color) {
    const rect = canvas.getBoundingClientRect();

    const worldW = render.bounds.max.x - render.bounds.min.x;
    const worldH = render.bounds.max.y - render.bounds.min.y;

    const scaleX = rect.width / worldW;
    const scaleY = rect.height / worldH;

    const screenX = rect.left + (x - render.bounds.min.x) * scaleX;
    const screenY = rect.top + (y - render.bounds.min.y) * scaleY;

    const floatElem = document.createElement("div");
    floatElem.className = "floating-text";
    floatElem.style.left = screenX + "px";
    floatElem.style.top = screenY - 18 + "px";
    if (color) floatElem.style.color = color;
    floatElem.innerText = text;
    document.body.appendChild(floatElem);

    requestAnimationFrame(() => {
      floatElem.style.transform = "translateY(-30px)";
      floatElem.style.opacity = 0;
    });

    setTimeout(() => floatElem.remove(), 1000);
  }

  function spawnObject({ x, y, size } = {}) {
    const baseGoldChance = perks.includes("goldBalls") ? 0.1 : 0;
    const goldChance = baseGoldChance + (prestigeUpgrades.goldChance || 0);
    const isGold = Math.random() < goldChance;

    const _size = size ?? Math.random() * 30 + 20;
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
      restitution: bounciness,
      label: "fallingObject",
      render: myRender,
      collisionFilter: {
        category: CATEGORY_UNCOLLECTED,
        mask:
          CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED | CATEGORY_INVISIBLE_WALL,
      },
    });

    obj.originSize = _size;
    obj.pointValue = Math.floor(_size / (isGold ? 1 : 2));
    obj.collected = false;
    obj.isGold = isGold;

    World.add(world, obj);
    return obj;
  }

  function updateStuff() {
    const information = [
      `<strong>Points: ${points}</strong>`,
      prestigeLevel !== 0 &&
        `<strong>Prestige Points: ${prestigePoints}</strong>`,
      `Spawn Delay: ${(spawnInterval / 1000).toFixed(2)}`,
      `Steepness: ${platformAngle.toFixed(2)}`,
      `Ball Bounciness: ${bounciness.toFixed(2)}`,
      `Ball Money: x${moneyMultiplier.toFixed(2)}${
        moneyHyperplier !== 1 ? ` (x${moneyHyperplier.toFixed(2)})` : ""
      }`,
      `Gravity: x${gravity.toFixed(2)}`,
      ,
    ].filter(Boolean);
    informationDiv.innerHTML = information.join("<br>");

    Body.setAngle(leftPlatform, platformAngle);
    Body.setAngle(rightPlatform, -platformAngle);
    engine.world.gravity.y = gravity;

    for (const key in buttons) {
      const value = buttons[key];
      const button =
        value.element || (value.element = document.getElementById(key));

      let condition;
      try {
        condition = value.purchaseCondition();
      } catch (_) {
        condition = false;
      }
      let baseText =
        typeof value.baseText === "function"
          ? value.baseText()
          : value.baseText;

      if (condition === true) {
        button.innerText = `${baseText} (Cost: ${value.upgradeCost})`;
        button.disabled = points < value.upgradeCost;
      } else {
        button.innerText = `${baseText} (Unavailable)`;
        button.disabled = true;
      }
    }

    if (perks.includes("goldBalls")) {
      perksGoldBalls.innerText = "Gold Balls (Obtained)";
      perksGoldBalls.disabled = true;
    } else perksGoldBalls.disabled = points < 2400;

    if (perks.includes("fastConveyor")) {
      perksFastConveyor.innerText = "Fast Conveyor (Obtained)";
      perksFastConveyor.disabled = true;
    } else perksFastConveyor.disabled = points < 3000;

    if (perks.includes("splitBalls")) {
      perksSplitBalls.innerText = "Split Balls (Obtained)";
      perksSplitBalls.disabled = true;
    } else perksSplitBalls.disabled = points < 5000;

    checkAdvancements();
  }

  for (const key in buttons) {
    const value = buttons[key];
    const newButton = document.createElement("button");
    newButton.disabled =
      value.purchaseCondition() || points < value.upgradeCost;
    newButton.id = key;
    newButton.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;
    newButton.addEventListener("click", (e) => {
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
        const audio = new Audio("./sounds/Hint.wav");
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    });
    buttonHolder.appendChild(newButton);
    value.element = newButton;
  }

  const savedData = localStorage.getItem("gameData");
  if (savedData !== null) {
    try {
      const dataXZ = xz(savedData);
      spawnInterval = Math.max(37, dataXZ.a ?? DEFAULTS.spawnInterval);
      points = dataXZ.c ?? 0;
      moneyMultiplier = dataXZ.d ?? DEFAULTS.moneyMultiplier;
      platformAngle = Math.min(
        Math.max(DEFAULTS.platformAngle, dataXZ.e ?? DEFAULTS.platformAngle),
        0.8
      );
      gravity = Math.min(3, Math.max(1, dataXZ.f ?? DEFAULTS.gravity));
      bounciness = Math.min(
        1.1,
        Math.max(0.6, dataXZ.h ?? DEFAULTS.bounciness)
      );
      moneyHyperplier = Math.min(
        2,
        Math.max(1, dataXZ.i ?? DEFAULTS.moneyHyperplier)
      );
      perks = dataXZ.j ?? [];
      completedAdvancements = dataXZ.k ?? [];
      prestigePoints = dataXZ.p ?? 0;
      prestigeLevel = dataXZ.q ?? 0;
      prestigeUpgrades = dataXZ.r ?? prestigeUpgrades;

      if (dataXZ.g) {
        for (const key in dataXZ.g) {
          if (buttons[key]) {
            buttons[key].upgradeCost =
              dataXZ.g[key].upgradeCost || buttons[key].upgradeCost;
          }
        }
      }

      if (points > 2e104) {window.deleteAllMyData = true;localStorage.removeItem('gameData');window.location.reload();return;}
    } catch (e) {
      console.warn("Failed to read saved gameData:", e);
    }
  }

  window.addEventListener("beforeunload", () => {
    if (window.deleteAllMyData === true) {
      localStorage.removeItem("gameData");
    } else {
      saveGame();
    }
  });

  window.addEventListener("storage", () => {
    if (window.deleteAllMyData === true) {
      localStorage.removeItem("gameData");
    } else {
      saveGame();
    }
  });

  updateStuff();

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      let object = null;
      if (
        pair.bodyA.label === "conveyor" &&
        pair.bodyB.label === "fallingObject"
      )
        object = pair.bodyB;
      else if (
        pair.bodyB.label === "conveyor" &&
        pair.bodyA.label === "fallingObject"
      )
        object = pair.bodyA;

      if (object && !object.collected) {
        if (perks.includes("splitBalls") && Math.random() < 9 / 100) {
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

          showFloatingText(
            object.position.x,
            object.position.y,
            "Split!",
            "#bd8d4f"
          );

          World.remove(world, object);
          continue;
        }

        object.collected = true;
        object.collisionFilter.category = CATEGORY_COLLECTED;
        object.collisionFilter.mask = CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED;

        const baseEarn = Math.floor(
          (object.pointValue || 1) * (moneyMultiplier * moneyHyperplier)
        );
        const finalEarn = Math.floor(
          baseEarn * (1 + (prestigeUpgrades.moneyMult || 0))
        );

        lastPointsEarned = finalEarn;
        points += finalEarn;

        updateStuff();

        showFloatingText(object.position.x, object.position.y, "+" + finalEarn);
      }
    }
  });

  Events.on(engine, "beforeUpdate", () => {
    Body.setVelocity(conveyor, {
      x: perks.includes("fastConveyor") ? 4 : 2,
      y: 0,
    });
  });

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
      for (const body of Composite.allBodies(world)) {
        if (body.label === "fallingObject" && body.collected) {
          const radius = body.circleRadius || 0;
          if (
            body.position.x + radius < 0 ||
            body.position.x - radius > canvasWidth
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

  /* Perks Shop & Settings */

  toggleButtonHolder.addEventListener("click", () => {
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

  document.getElementById("openPerksShop").addEventListener("click", () => {
    perksShop.style.display = "flex";
    buttonHolder.style.display = "none";
    toggleButtonHolder.style.display = "none";
  });
  document.getElementById("openPrestige").addEventListener("click", () => {
    renderPrestigePopup();
    prestigePopup.style.display = "flex";
    buttonHolder.style.display = "none";
    toggleButtonHolder.style.display = "none";
  });
  document.getElementById("openSettings").addEventListener("click", () => {
    settingsPopup.style.display = "flex";
    buttonHolder.style.display = "none";
    toggleButtonHolder.style.display = "none";
  });

  document.querySelectorAll("button.closePopup").forEach((el) => {
    el.addEventListener("click", () => {
      document
        .querySelectorAll("div.popup")
        .forEach((p) => (p.style.display = "none"));

      updateCanvasSize();
    });
  });

  perksGoldBalls.addEventListener("click", () => {
    if (points < 2400) {
      return alert("Not enough points for upgrade!");
    } else {
      points -= 2400;
      if (!perks.includes("goldBalls")) perks.push("goldBalls");
      updateStuff();
    }
  });

  perksFastConveyor.addEventListener("click", () => {
    if (points < 3000) {
      return alert("Not enough points for upgrade!");
    } else {
      points -= 3000;
      if (!perks.includes("fastConveyor")) perks.push("fastConveyor");
      updateStuff();
    }
  });

  perksSplitBalls.addEventListener("click", () => {
    if (points < 5000) {
      return alert("Not enough points for upgrade!");
    } else {
      points -= 5000;
      if (!perks.includes("splitBalls")) perks.push("splitBalls");
      updateStuff();
    }
  });

  toggleMusicButton.addEventListener("click", () => {
    if (backgroundMusic.paused) {
      backgroundMusic.play();
      localStorage.setItem("music", "true");
      toggleMusicButton.textContent = "Turn Music Off";
    } else {
      backgroundMusic.pause();
      localStorage.setItem("music", "false");
      toggleMusicButton.textContent = "Turn Music On";
    }
  });

  setMusicUrlButton.addEventListener("click", () => {
    const musicUrlInput = document.getElementById("musicUrlInput").value;

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

    localStorage.setItem("musicUrl", url);
    backgroundMusic.src = url;
    backgroundMusic.load();
    backgroundMusic.play();
  });

  toggleSoundEffectsButton.addEventListener("click", () => {
    if (!soundEffectsEnabled) {
      localStorage.setItem("effects", "true");
      toggleSoundEffectsButton.textContent = "Disable Sound Effects";
    } else {
      localStorage.setItem("effects", "false");
      toggleSoundEffectsButton.textContent = "Enable Sound Effects";
    }

    soundEffectsEnabled = !soundEffectsEnabled;
  });

  openAdvancements.addEventListener("click", () => {
    advancementsPopup.style.display = "flex";
    buttonHolder.style.display = "none";
    toggleButtonHolder.style.display = "none";

    advancementsListDiv.innerHTML = "";

    for (const id in advancementsData) {
      const adv = advancementsData[id];
      const isDone = completedAdvancements.includes(id);

      const element = document.createElement("div");
      element.classList.add("advancement-list");
      if (isDone) element.classList.add("done");
      element.innerHTML = `<strong>${adv.name}</strong><br><small>${adv.description}</small>`;

      advancementsListDiv.appendChild(element);
    }
  });

  if (localStorage.getItem("music") === null)
    localStorage.setItem("music", "true");
  if (localStorage.getItem("effects") === null)
    localStorage.setItem("effects", "true");

  backgroundMusic.onerror = (ev) => {
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
        backgroundMusic.volume = 0.4;
        backgroundMusic.play().catch(() => {});
      }
    },
    { once: true }
  );

  updateCanvasSize();
  updateStuff();

  toggleMusicButton.textContent =
    localStorage.getItem("music") === "false"
      ? "Turn Music On"
      : "Turn Music Off";
  soundEffectsEnabled = localStorage.getItem("effects") !== "false";
  toggleSoundEffectsButton.textContent = soundEffectsEnabled
    ? "Disable Sound Effects"
    : "Enable Sound Effects";

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
      desc: "+400 points after prestiging (stackable)",
      cost: 2,
      whenPurchase: () => {
        prestigeUpgrades.startPoints =
          (prestigeUpgrades.startPoints || 0) + 400;
      },
      condition: () => true,
    },
    {
      id: "prest_gold_chance",
      name: "Gold Chance",
      desc: "+5% gold spawn chance (permanent)",
      cost: 3,
      whenPurchase: () => {
        prestigeUpgrades.goldChance = (prestigeUpgrades.goldChance || 0) + 0.05;
      },
      condition: () => true,
    },
  ];

  const PRESTIGE_THRESHOLD = 10000;

  function renderPrestigePopup() {
    const content = document.getElementById("prestigePopupContent");
    content.innerHTML = "";

    const h = document.createElement("h2");
    h.textContent = "Prestige";
    content.appendChild(h);

    const potentialGain = Math.floor(points / PRESTIGE_THRESHOLD);

    const info = document.createElement("div");
    info.innerHTML = `
    <p>Total prestige level: <strong>${prestigeLevel}</strong></p>
    <p>Prestiging grants <strong>${potentialGain}</strong> prestige point(s) (1 per ${PRESTIGE_THRESHOLD} points).</p>
    <p>Prestiging will reset most normal progress, but your prestige shop upgrades are permanent.</p>
    `;
    info.style.marginBottom = "10px";
    content.appendChild(info);

    const prestigeNowBtn = document.createElement("button");
    prestigeNowBtn.textContent =
      potentialGain > 0
        ? `Prestige Now (Gain ${potentialGain})`
        : `Prestige Now (Need ${PRESTIGE_THRESHOLD} points)`;
    prestigeNowBtn.disabled = potentialGain <= 0;
    prestigeNowBtn.addEventListener("click", () => {
      if (
        !confirm(
          `Are you sure you want to prestige and gain ${potentialGain} prestige point(s)? This will reset normal progress.`
        )
      )
        return;

      prestigePoints += potentialGain;
      prestigeLevel += potentialGain;

      points = 0;
      spawnInterval = DEFAULTS.spawnInterval;
      platformAngle = DEFAULTS.platformAngle;
      gravity = DEFAULTS.gravity;
      moneyMultiplier = DEFAULTS.moneyMultiplier;
      bounciness = DEFAULTS.bounciness;
      moneyHyperplier = DEFAULTS.moneyHyperplier;
      perks = [];

      for (const k in buttons) {
        buttons[k].upgradeCost = INITIAL_BUTTON_COSTS[k];
        if (buttons[k].element) {
          const baseText =
            typeof buttons[k].baseText === "function"
              ? buttons[k].baseText()
              : buttons[k].baseText;
          buttons[
            k
          ].element.innerText = `${baseText} (Cost: ${buttons[k].upgradeCost})`;
        }
      }

      if (prestigeUpgrades.startPoints) {
        points += prestigeUpgrades.startPoints;
      }

      saveGame();
      updateStuff();
      renderPrestigePopup();

      if (soundEffectsEnabled) {
        const audio = new Audio("./sounds/Hint.wav");
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }

      alert(`Prestiged! You gained ${potentialGain} prestige point(s).`);
    });

    content.appendChild(prestigeNowBtn);

    const shopContainer = document.createElement("div");
    shopContainer.className = "prestigeShopDiv";

    const shopTitle = document.createElement("div");
    shopTitle.innerHTML = `<h3>Prestige Shop</h3>
    <p>Buy permanent upgrades using Prestige Points.</p>`;
    shopContainer.appendChild(shopTitle);

    const shopList = document.createElement("div");
    shopList.style.display = "flex";
    shopList.style.flexDirection = "column";
    shopList.style.gap = "8px";

    for (const item of prestigeShopItems) {
      const row = document.createElement("div");
      row.className = "prestigeShopItem";
      row.innerHTML = `<div><strong>${item.name}</strong><br><small>${item.desc}</small></div>`;

      const buy = document.createElement("button");
      buy.textContent = `Buy (Cost: ${item.cost})`;
      buy.disabled = prestigePoints < item.cost;
      buy.addEventListener("click", () => {
        if (prestigePoints < item.cost) {
          return alert("Not enough prestige points.");
        }
        if (!item.condition()) {
          return alert("You can't buy this right now.");
        }
        prestigePoints -= item.cost;
        if (item.whenPurchase) item.whenPurchase();
        saveGame();
        updateStuff();
        renderPrestigePopup();
        if (soundEffectsEnabled) {
          const audio = new Audio("./sounds/Hint.wav");
          audio.volume = 0.6;
          audio.play().catch(() => {});
        }
      });

      row.appendChild(buy);
      shopList.appendChild(row);
    }

    shopContainer.appendChild(shopList);

    const current = document.createElement("div");
    current.innerHTML = `
    <h3>Current Prestige Upgrades</h3>
    <p>Money Boost: +${Math.round((prestigeUpgrades.moneyMult || 0) * 100)}%</p>
    <p>Start Points: ${prestigeUpgrades.startPoints || 0}</div>
    <p>Gold Chance Bonus: +${Math.round(
      (prestigeUpgrades.goldChance || 0) * 100
    )}%</p>
    `;
    shopContainer.appendChild(current);

    content.appendChild(shopContainer);
  }
})();
