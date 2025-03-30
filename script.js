(async () => {
  const { Engine, Render, World, Bodies, Events, Body, Runner, Composite } = Matter;

  const engine = Engine.create();
  const { world } = engine;

  const canvas = document.getElementById("gameCanvas");
  canvas.width = 800;
  canvas.height = 600;

  const ASPECT_RATIO = 800 / 600;
  const MAX_WIDTH = 810;
  const MAX_HEIGHT = 610;
  const CATEGORY_UNCOLLECTED = 0b1;
  const CATEGORY_COLLECTED = 0b10;
  const CATEGORY_INVISIBLE_WALL = 0b100;

  function updateCanvasSize() {
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

  updateCanvasSize();

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

  let platformWidth = 550,
    platformHeight = 20,
    points = 0,
    spawnInterval = 2000,
    upgradeCost = 50,
    platformAngle = 0.3,
    gravity = 1,
    moneyMultiplier = 1,
    moneyHyperplier = 1,
    bounciness = 0.6;

  engine.world.gravity.y = gravity;

  const leftWall = Bodies.rectangle(-10, canvas.height / 2, 20, canvas.height, {
    isStatic: true,
    render: { visible: false },
    collisionFilter: {
      category: CATEGORY_INVISIBLE_WALL,
      mask: CATEGORY_UNCOLLECTED,
    },
  });

  const rightWall = Bodies.rectangle(canvas.width + 10, canvas.height / 2, 20, canvas.height, {
    isStatic: true,
    render: { visible: false },
    collisionFilter: {
      category: CATEGORY_INVISIBLE_WALL,
      mask: CATEGORY_UNCOLLECTED,
    },
  });

  const leftPlatform = Bodies.rectangle(100, canvas.height / 3, platformWidth, platformHeight, {
    isStatic: true,
    angle: platformAngle,
    render: { fillStyle: "#555" },
  });

  const rightPlatform = Bodies.rectangle(canvas.width - 100, canvas.height / 3, platformWidth, platformHeight, {
    isStatic: true,
    angle: -platformAngle,
    render: { fillStyle: "#555" },
  });

  const conveyor = Bodies.rectangle(canvas.width / 2, canvas.height + 5, canvas.width, 50, {
    isStatic: true,
    render: { fillStyle: "#777" },
    label: "conveyor",
  });

  World.add(world, [leftWall, rightWall, leftPlatform, rightPlatform, conveyor]);

  const buttons = {
    upgradeSpawnRate: {
      enabled: true,
      baseText: "Reduce Spawn Delay",
      upgradeCost: 50,
      upgradeMulti: 1.5,
      whenPurchase: () => {
        spawnInterval *= 0.9;
        return spawnInterval > 400;
      },
    },
    upgradeMoney: {
      enabled: true,
      baseText: "Multiply Ball Money",
      upgradeCost: 100,
      upgradeMulti: 1.6,
      whenPurchase: () => {
        moneyMultiplier += 0.3;
      },
    },
    upgradeAngle: {
      enabled: true,
      baseText: "Increase Steepness",
      upgradeCost: 50,
      upgradeMulti: 1.3,
      whenPurchase: () => {
        platformAngle += 0.02;
        return platformAngle < 0.6;
      },
    },
    upgradeGravity: {
      enabled: true,
      baseText: "Increment Gravity",
      upgradeCost: 100,
      upgradeMulti: 1.9,
      whenPurchase: () => {
        gravity += 0.2;
        return gravity < 3;
      },
    },
    upgradeBounciness: {
      enabled: true,
      baseText: "+0.1 Bouncy & Hyperplier",
      upgradeCost: 500,
      upgradeMulti: 1.8,
      whenPurchase: () => {
        bounciness += 0.1;
        moneyHyperplier += 0.1;
        return bounciness < 0.9;
      },
    },
  };

  const buttonHolder = document.getElementById("buttonHolder");
  const informationDiv = document.getElementById("information");

  const zx = (v) => btoa(JSON.stringify(v)).split("").reverse().join("");
  const xz = (v) => JSON.parse(atob(v.split("").reverse().join("")));

  function saveGame() {
    localStorage.setItem(
      "gameData",
      zx({
        a: spawnInterval,
        b: upgradeCost,
        c: points,
        d: moneyMultiplier,
        e: platformAngle,
        f: gravity,
        g: buttons,
        h: bounciness,
        i: moneyHyperplier,
      })
    );
  }

  function showFloatingText(x, y, text, width) {
    if (!render) {
      console.error("render is undefined!");
      return;
    }

    const { bounds, canvas } = render;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / (bounds.max.x - bounds.min.x);
    const scaleY = canvas.height / (bounds.max.y - bounds.min.y);

    const screenX = rect.left + (x - bounds.min.x) * scaleX;
    const screenY = rect.top + (y - bounds.min.y) * scaleY;

    const floatElem = document.createElement("div");
    floatElem.className = "floating-text";
    floatElem.style.left = screenX + "px";
    floatElem.style.top = screenY - 18 + "px";
    floatElem.innerText = text;
    document.body.appendChild(floatElem);

    requestAnimationFrame(() => {
      floatElem.style.transform = "translateY(-50px)";
      floatElem.style.opacity = 0;
    });

    setTimeout(() => {
      floatElem.remove();
    }, 1000);
  }

  function spawnObject() {
    const size = Math.random() * 30 + 20;
    const x = Math.random() * (canvas.width - size) + size / 2;
    const color =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    const obj = Bodies.circle(x, -50, size / 2, {
      restitution: bounciness,
      label: "fallingObject",
      render: { fillStyle: color },
      collisionFilter: {
        category: CATEGORY_UNCOLLECTED,      
        mask: CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED | CATEGORY_INVISIBLE_WALL,     
      },
    });

    obj.pointValue = Math.floor(size / 2);
    obj.collected = false;
    World.add(world, obj);
  }

  function updateStuff() {
    informationDiv.innerHTML = [
      `<strong>Points: ${points}</strong>`,
      `Spawn Delay: ${(spawnInterval / 1000).toFixed(2)}`,
      `Steepness: ${platformAngle.toFixed(2)}`,
      `Ball Bounciness: ${bounciness.toFixed(2)}`,
      `Ball Money: x${moneyMultiplier.toFixed(2)}${moneyHyperplier !== 1 ? ` (x${moneyHyperplier.toFixed(2)})` : ""}`,
      `Gravity: x${gravity.toFixed(2)}`,
    ].join("<br>");

    Body.setAngle(leftPlatform, platformAngle);
    Body.setAngle(rightPlatform, -platformAngle);
    engine.world.gravity.y = gravity;

    for (const key in buttons) {
      const value = buttons[key];
      const button = value.element || (value.element = document.getElementById(key));
      
      if (!value.enabled) {
        button.innerText = `${value.baseText} (Unavailable)`;
        button.disabled = true;
      } else {
        button.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;
        button.disabled = points < value.upgradeCost;
      }
    }
  }

  for (const key in buttons) {
    const value = buttons[key];
    const newButton = document.createElement("button");
    newButton.disabled = !value.enabled || points < value.upgradeCost;
    newButton.id = key;
    newButton.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;
    newButton.addEventListener("click", () => {
      if (points < value.upgradeCost) {
        alert("Not enough points for upgrade!");
        return;
      }
      points -= value.upgradeCost;
      value.upgradeCost = Math.floor(value.upgradeCost * value.upgradeMulti);
      newButton.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;

      if (value.whenPurchase() === false) {
        value.enabled = false;
        newButton.disabled = true;
      }
      updateStuff();
    });
    buttonHolder.appendChild(newButton);
    value.element = newButton;
  }

  const savedData = localStorage.getItem("gameData");
  if (savedData !== null) {
    const dataXZ = xz(savedData);
    spawnInterval = dataXZ.a ?? 2000;
    upgradeCost = dataXZ.b ?? 50;
    points = dataXZ.c ?? 0;
    moneyMultiplier = dataXZ.d ?? 1;
    platformAngle = dataXZ.e ?? 0.3;
    gravity = dataXZ.f ?? 1;
    bounciness = Math.max(0.6, dataXZ.h ?? 0.6);
    moneyHyperplier = Math.max(1, dataXZ.i ?? 1);

    if (dataXZ.g) {
      for (const key in dataXZ.g) {
        if (buttons[key]) {
          buttons[key].upgradeCost = dataXZ.g[key].upgradeCost;
          buttons[key].enabled = dataXZ.g[key].enabled;
        }
      }
    }

    updateStuff();
  }

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      let object = null;
      if (pair.bodyA.label === "conveyor" && pair.bodyB.label === "fallingObject") object = pair.bodyB;
      else if (pair.bodyB.label === "conveyor" && pair.bodyA.label === "fallingObject") object = pair.bodyA;

      if (object && !object.collected) {
        object.collected = true;
        object.collisionFilter.category = CATEGORY_COLLECTED;
        object.collisionFilter.mask = CATEGORY_UNCOLLECTED | CATEGORY_COLLECTED;

        const pointsEarned = Math.floor((object.pointValue || 1) * (moneyMultiplier * moneyHyperplier));
        points += pointsEarned;
        updateStuff();
        showFloatingText(object.position.x, object.position.y, "+" + pointsEarned, object.circleRadius || 0);
      }
    }
  });

  Events.on(engine, "beforeUpdate", () => {
    Body.setVelocity(conveyor, { x: 2, y: 0 });
  });

  let lastSpawn = Date.now();

  (function gameLoop() {
    const now = Date.now();
    if (now - lastSpawn > spawnInterval) {
      spawnObject();
      lastSpawn = now;
    }

    const canvasWidth = canvas.width;
    for (const body of Composite.allBodies(world)) {
      if (body.label === "fallingObject" && body.collected) {
        const radius = body.circleRadius || 0;
        if (body.position.x + radius < 0 || body.position.x - radius > canvasWidth) {
          World.remove(world, body);
        }
      }
    }

    requestAnimationFrame(gameLoop);
  })();

  setInterval(saveGame, 5000);
  window.addEventListener("resize", updateCanvasSize);
})();
