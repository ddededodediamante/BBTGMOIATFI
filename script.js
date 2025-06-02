(async () => {
  const buttonHolder = document.getElementById("buttonHolder");
  const informationDiv = document.getElementById("information");
  const perksShop = document.getElementById("perksShop");
  const settingsPopup = document.getElementById("settings");
  const advancementsPopup = document.getElementById("advancements");
  const perksGoldBalls = document.getElementById("perksGoldBalls");
  const perksFastConveyor = document.getElementById("perksFastConveyor");
  const perksSplitBalls = document.getElementById("perksSplitBalls");
  const toggleMusicButton = document.getElementById("toggleMusicButton");
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

  const { Engine, Render, World, Bodies, Events, Body, Runner, Composite } =
    Matter;

  const engine = Engine.create();
  const { world } = engine;

  const canvas = document.getElementById("gameCanvas");
  canvas.width = 800;
  canvas.height = 600;

  function isGUIActive() {
    return [perksShop, settingsPopup, advancementsPopup].some(
      (pop) => pop.style.display === "flex"
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

    let width = Math.min(window.innerWidth, MAX_WIDTH);
    let height = Math.min(window.innerHeight, MAX_HEIGHT);

    if (width / height > ASPECT_RATIO) {
      width = height * ASPECT_RATIO;
    } else {
      height = width / ASPECT_RATIO;
    }

    canvas.style.width = width - 10 + "px";
    canvas.style.height = height - 10 + "px";
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

  var platformWidth = 550,
    platformHeight = 20,
    points = 0,
    spawnInterval = 2000,
    platformAngle = 0.3,
    gravity = 1,
    moneyMultiplier = 1,
    moneyHyperplier = 1,
    bounciness = 0.6,
    perks = [],
    completedAdvancements = [],
    lastPointsEarned = 0;

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

  World.add(world, [
    leftWall,
    rightWall,
    leftPlatform,
    rightPlatform,
    conveyor,
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
        return platformAngle < 0.6;
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
      baseText:
        () => bounciness < 1.2
          ? "+0.1 Bouncy & Hyperplier"
          : "+0.1 Hyperplier",
      upgradeCost: 500,
      upgradeMulti: 1.75,
      whenPurchase: () => {
        if (bounciness < 1.2) bounciness += 0.1;
        moneyHyperplier += 0.1;
      },
      purchaseCondition: () => {
        return moneyHyperplier < 2;
      },
    },
  };

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
    gold_balls: {
      name: "Golden Touch",
      description: "Buy the Gold Balls perk",
      check: () => perks.includes("goldBalls"),
    },
    bouncy_max: {
      name: "Super Bouncy",
      description: "Max out bounciness",
      check: () => bounciness >= 1.2,
    },
    big_earner: {
      name: "Big Earner",
      description: "Earn 100 points in a single impact",
      check: () => lastPointsEarned >= 100,
    },
    bouncy_max: {
      name: "Hyper Earner",
      description: "Max out hyperplier",
      check: () => moneyHyperplier >= 2,
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
        g: buttons,
        h: bounciness,
        i: moneyHyperplier,
        j: perks,
        k: completedAdvancements,
      })
    );
  }

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
    const isGold = perks.includes("goldBalls") && Math.random() < 10 / 100;

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

    World.add(world, obj);
    return obj;
  }

  function updateStuff() {
    informationDiv.innerHTML = [
      `<strong>Points: ${points}</strong>`,
      `Spawn Delay: ${(spawnInterval / 1000).toFixed(2)}`,
      `Steepness: ${platformAngle.toFixed(2)}`,
      `Ball Bounciness: ${bounciness.toFixed(2)}`,
      `Ball Money: x${moneyMultiplier.toFixed(2)}${
        moneyHyperplier !== 1 ? ` (x${moneyHyperplier.toFixed(2)})` : ""
      }`,
      `Gravity: x${gravity.toFixed(2)}`,
    ].join("<br>");

    Body.setAngle(leftPlatform, platformAngle);
    Body.setAngle(rightPlatform, -platformAngle);
    engine.world.gravity.y = gravity;

    for (const key in buttons) {
      const value = buttons[key];
      const button =
        value.element || (value.element = document.getElementById(key));

      let condition = value.purchaseCondition();
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
    });
    buttonHolder.appendChild(newButton);
    value.element = newButton;
  }

  const savedData = localStorage.getItem("gameData");
  if (savedData !== null) {
    const dataXZ = xz(savedData);
    spawnInterval = Math.max(0.37, dataXZ.a ?? 2000);
    points = dataXZ.c ?? 0;
    moneyMultiplier = dataXZ.d ?? 1;
    platformAngle = Math.min(0.6, dataXZ.e ?? 0.3);
    gravity = Math.min(3, dataXZ.f ?? 1);
    bounciness = Math.min(1.2, Math.max(0.6, dataXZ.h ?? 0.6));
    moneyHyperplier = Math.min(2, Math.max(1, dataXZ.i ?? 1));
    perks = dataXZ.j ?? [];
    completedAdvancements = dataXZ.k ?? [];

    if (dataXZ.g) {
      for (const key in dataXZ.g) {
        if (buttons[key]) {
          buttons[key].upgradeCost = dataXZ.g[key].upgradeCost;
        }
      }
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

        const pointsEarned = Math.floor(
          (object.pointValue || 1) * (moneyMultiplier * moneyHyperplier)
        );

        lastPointsEarned = pointsEarned;
        points += pointsEarned;

        updateStuff();

        showFloatingText(
          object.position.x,
          object.position.y,
          "+" + pointsEarned
        );
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
  const maxFps
   = 60;
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

  document.getElementById("openPerksShop").addEventListener("click", () => {
    perksShop.style.display = "flex";
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
      perks.push("goldBalls");
      updateStuff();
    }
  });

  perksFastConveyor.addEventListener("click", () => {
    if (points < 3000) {
      return alert("Not enough points for upgrade!");
    } else {
      points -= 3000;
      perks.push("fastConveyor");
      updateStuff();
    }
  });

  perksSplitBalls.addEventListener("click", () => {
    if (points < 5000) {
      return alert("Not enough points for upgrade!");
    } else {
      points -= 5000;
      perks.push("splitBalls");
      updateStuff();
    }
  });

  function startBackgroundMusic() {
    backgroundMusic.volume = 0.4;

    if (localStorage.getItem("music") === "false") {
      toggleMusicButton.textContent = "Turn Music On";
    } else {
      backgroundMusic.play().catch(() => {});
      toggleMusicButton.textContent = "Turn Music Off";
    }
  }

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

  window.addEventListener(
    "click",
    () => {
      if (localStorage.getItem("music") === "true" && backgroundMusic.paused) {
        backgroundMusic.play().catch(() => {});
      }
    },
    { once: true }
  );

  updateCanvasSize();
  updateStuff();
  startBackgroundMusic();
})();
