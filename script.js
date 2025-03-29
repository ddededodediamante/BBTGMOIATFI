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

  let platformWidth = 500,
    platformHeight = 20;

  let leftPlatform = Bodies.rectangle(100, canvas.height / 3, platformWidth, platformHeight, {
    isStatic: true,
    angle: 0.3,
    render: { fillStyle: "#555" },
  });

  let rightPlatform = Bodies.rectangle(canvas.width - 100, canvas.height / 3, platformWidth, platformHeight, {
    isStatic: true,
    angle: -0.3,
    render: { fillStyle: "#555" },
  });

  let conveyor = Bodies.rectangle(canvas.width / 2, canvas.height - 30, canvas.width, 20, {
    isStatic: true,
    render: { fillStyle: "#777" },
    label: "conveyor",
  });

  World.add(world, [leftPlatform, rightPlatform, conveyor]);

  const scoreDiv = document.getElementById("score");

  let score = 0;
  let spawnInterval = 2000;
  let upgradeCost = 50;

  function zx(v) {
    return btoa(JSON.stringify(v)).split('').reverse().join('');;
  }

  function xz(v) {
    return JSON.parse(atob(v.split('').reverse().join('')));
  }

  if (localStorage.getItem("gameData") !== null) {
    let data = localStorage.getItem("gameData");
    let dataXZ = xz(data);

    spawnInterval = dataXZ.a ?? 2000, upgradeCost = dataXZ.b ?? 50, score = dataXZ.c ?? 0;
  }

  function saveGame() {
    localStorage.setItem("gameData", zx({ a: spawnInterval, b: upgradeCost, c: score }));
  }

  function updateScoreDisplay() {
    scoreDiv.innerText = "Score: " + score;
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

  let lastSpawn = Date.now();

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

    obj.pointValue = Math.floor(size);
    obj.collected = false;
    World.add(world, obj);
  }

  Events.on(engine, "collisionStart", function (event) {
    event.pairs.forEach(function (pair) {
      let object = null;
      if (pair.bodyA.label === "conveyor" && pair.bodyB.label === "fallingObject") object = pair.bodyB;
      if (pair.bodyB.label === "conveyor" && pair.bodyA.label === "fallingObject") object = pair.bodyA;

      if (object) {
        if (!object.collected) {
          object.collected = true;

          let pointsEarned = object.pointValue || 1;
          score += pointsEarned;
          updateScoreDisplay();
          showFloatingText(object.position.x, object.position.y, "+" + pointsEarned, object.circleRadius || 0);
        }
      }
    });
  });
  Events.on(engine, "beforeUpdate", function () {
    Matter.Body.setVelocity(conveyor, { x: 2, y: 0 });
  });

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

  document.getElementById("upgrade").addEventListener("click", function () {
    if (score >= upgradeCost) {
      score -= upgradeCost;
      updateScoreDisplay();
      spawnInterval = Math.max(500, spawnInterval * 0.9);
      upgradeCost = Math.floor(upgradeCost * 1.5);
      this.innerText = "Upgrade Spawn Rate (Cost: " + upgradeCost + ")";
    } else {
      alert("Not enough points for upgrade!");
    }
  });

  window.addEventListener("resize", function () {
    canvas.width = Math.min(window.innerWidth, 800);
    canvas.height = Math.min(window.innerHeight, 600);
    render.options.width = canvas.width;
    render.options.height = canvas.height;
    Body.setPosition(conveyor, { x: canvas.width / 2, y: canvas.height - 30 });
  });

  setTimeout(() => {
    saveGame();
  }, 5000);
})();
