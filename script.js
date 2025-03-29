(async () => {
  let Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Events = Matter.Events,
    Body = Matter.Body;

  let engine = Engine.create();
  let world = engine.world;

  let canvas = document.getElementById("gameCanvas");
  canvas.width = Math.min(window.innerWidth, 800);
  canvas.height = Math.min(window.innerHeight, 600);

  let render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: canvas.width,
      height: canvas.height,
      background: "#222",
      wireframes: false,
      pixelRatio: 1,
    },
  });

  Render.run(render);
  Matter.Runner.run(engine);

  let platformWidth = 550,
    platformHeight = 20,
    points = 0,
    spawnInterval = 2000,
    upgradeCost = 50,
    platformAngle = 0.3,
    gravity = 1,
    moneyMultiplier = 1;

  engine.world.gravity.y = gravity;

  let leftPlatform = Bodies.rectangle(100, canvas.height / 3, platformWidth, platformHeight, {
    isStatic: true,
    angle: platformAngle,
    render: { fillStyle: "#555" },
  });

  let rightPlatform = Bodies.rectangle(canvas.width - 100, canvas.height / 3, platformWidth, platformHeight, {
    isStatic: true,
    angle: -platformAngle,
    render: { fillStyle: "#555" },
  });

  let conveyor = Bodies.rectangle(canvas.width / 2, canvas.height - 30, canvas.width, 20, {
    isStatic: true,
    render: { fillStyle: "#777" },
    label: "conveyor",
  });

  World.add(world, [leftPlatform, rightPlatform, conveyor]);

  let buttons = {
    upgradeSpawnRate: {
      enabled: true,
      baseText: "Reduce Spawn Delay",
      upgradeCost: 50,
      upgradeMulti: 1.5,
      whenPurchase: function () {
        spawnInterval *= 0.9;
        return spawnInterval > 400;
      },
    },
    upgradeMoney: {
      enabled: true,
      baseText: "Multiply Ball Money",
      upgradeCost: 100,
      upgradeMulti: 1.6,
      whenPurchase: function () {
        moneyMultiplier += 0.3;
      },
    },
    upgradeAngle: {
      enabled: true,
      baseText: "Increase Steepness",
      upgradeCost: 50,
      upgradeMulti: 1.3,
      whenPurchase: function () {
        platformAngle += 0.02;
        return platformAngle < 0.6;
      },
    },
    upgradeGravity: {
      enabled: true,
      baseText: "Increment Gravity",
      upgradeCost: 100,
      upgradeMulti: 1.9,
      whenPurchase: function () {
        gravity += 0.2;
        return gravity < 3;
      },
    },
  };

  let buttonHolder = document.getElementById("buttonHolder");
  let informationDiv = document.getElementById("information");

  function zx(v) {
    return btoa(JSON.stringify(v)).split("").reverse().join("");
  }

  function xz(v) {
    return JSON.parse(atob(v.split("").reverse().join("")));
  }

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
      })
    );
  }

  function showFloatingText(x, y, text, width) {
    if (!render) {
      console.error("render is undefined!");
      return;
    }

    const bounds = render.bounds;
    const canvas = render.canvas;

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
    let size = Math.random() * 30 + 20;
    let x = Math.random() * (canvas.width - size) + size / 2;
    let obj = Bodies.circle(x, -50, size / 2, {
      restitution: 0.6,
      label: "fallingObject",
      render: {
        fillStyle: "#" + Math.floor(Math.random() * 16777215).toString(16),
      },
    });

    obj.pointValue = Math.floor(size / 2);
    obj.collected = false;
    World.add(world, obj);
  }

  function updateButtons() {
    for (const key in buttons) {
      const value = buttons[key];
      let button = document.getElementById(key);
      button.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;
    }
  }

  function updateStuff() {
    informationDiv.innerHTML = [
      `Points: ${points}`,
      `Ball Money: x${moneyMultiplier.toFixed(2)}`,
      `Steepness: ${platformAngle.toFixed(2)}`,
      `Gravity: x${gravity.toFixed(2)}`,
    ].join('<br>');

    Body.setAngle(leftPlatform, platformAngle);
    Body.setAngle(rightPlatform, -platformAngle);
    engine.world.gravity.y = gravity;
  }

  for (const key in buttons) {
    const value = buttons[key];

    let newButton = document.createElement("button");
    newButton.disabled = !value.enabled;
    newButton.id = key;
    newButton.innerText = `${value.baseText} (Cost: ${value.upgradeCost})`;
    newButton.addEventListener("click", function () {
      if (points < value.upgradeCost) return alert("Not enough points for upgrade!");
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
  }

  if (localStorage.getItem("gameData") !== null) {
    let data = localStorage.getItem("gameData");
    let dataXZ = xz(data);

    spawnInterval = dataXZ.a ?? 2000;
    upgradeCost = dataXZ.b ?? 50;
    points = dataXZ.c ?? 0;
    moneyMultiplier = dataXZ.d ?? 1;
    platformAngle = dataXZ.e ?? 0.3;
    gravity = dataXZ.f ?? 1;

    if (dataXZ.g) {
      for (const key in dataXZ.g) {
        if (buttons[key]) {
          buttons[key].upgradeCost = dataXZ.g[key].upgradeCost;
          buttons[key].enabled = dataXZ.g[key].enabled;
        }
      }
    }

    updateStuff();
    updateButtons();
  }

  Events.on(engine, "collisionStart", function (event) {
    event.pairs.forEach(function (pair) {
      let object = null;
      if (pair.bodyA.label === "conveyor" && pair.bodyB.label === "fallingObject") object = pair.bodyB;
      if (pair.bodyB.label === "conveyor" && pair.bodyA.label === "fallingObject") object = pair.bodyA;

      if (object) {
        if (!object.collected) {
          object.collected = true;

          let pointsEarned = (object.pointValue || 1) * moneyMultiplier;
          points += Math.floor(pointsEarned);
          updateStuff();
          showFloatingText(
            object.position.x,
            object.position.y,
            "+" + Math.floor(pointsEarned),
            object.circleRadius || 0
          );
        }
      }
    });
  });

  Events.on(engine, "beforeUpdate", function () {
    Matter.Body.setVelocity(conveyor, { x: 2, y: 0 });
  });

  let lastSpawn = Date.now();

  (function gameLoop() {
    let now = Date.now();
    if (now - lastSpawn > spawnInterval) {
      spawnObject();
      lastSpawn = now;
    }

    let bodies = Matter.Composite.allBodies(world);
    bodies.forEach((body) => {
      if (body.label === "fallingObject" && body.collected) {
        if (body.position.x - (body.circleRadius || 0) > canvas.width) {
          World.remove(world, body);
        }
      }
    });

    requestAnimationFrame(gameLoop);
  })();

  setInterval(() => {
    saveGame();
  }, 5000);

  window.addEventListener("resize", function () {
    canvas.width = Math.min(window.innerWidth, 800);
    canvas.height = Math.min(window.innerHeight, 600);
    render.options.width = canvas.width;
    render.options.height = canvas.height;
    Body.setPosition(conveyor, { x: canvas.width / 2, y: canvas.height - 30 });
  });
})();
