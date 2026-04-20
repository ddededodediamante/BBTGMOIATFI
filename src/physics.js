import Matter from "matter-js";
import { DEFAULTS, CATEGORY_UNCOLLECTED, CATEGORY_INVISIBLE_WALL } from "./config.js";

export const { Engine, Render, World, Bodies, Events, Body, Runner, Composite } = Matter;

export const engine = Engine.create();
export const { world } = engine;

export const canvas = document.getElementById("gameCanvas");
canvas.width = 800;
canvas.height = 600;

export const render = Render.create({
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

const platformWidth = 550;
const platformHeight = 20;

export const leftWall = Bodies.rectangle(-10, canvas.height / 2, 20, canvas.height, {
  isStatic: true,
  render: { visible: false },
  collisionFilter: {
    category: CATEGORY_INVISIBLE_WALL,
    mask: CATEGORY_UNCOLLECTED,
  },
});

export const rightWall = Bodies.rectangle(
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
  },
);

export const leftPlatform = Bodies.rectangle(
  100,
  canvas.height / 3,
  platformWidth,
  platformHeight,
  {
    isStatic: true,
    angle: DEFAULTS.platformAngle,
    render: { fillStyle: "#555" },
  },
);

export const rightPlatform = Bodies.rectangle(
  canvas.width - 100,
  canvas.height / 3,
  platformWidth,
  platformHeight,
  {
    isStatic: true,
    angle: -DEFAULTS.platformAngle,
    render: { fillStyle: "#555" },
  },
);

export const conveyor = Bodies.rectangle(
  canvas.width / 2,
  canvas.height + 5,
  canvas.width,
  50,
  {
    isStatic: true,
    render: { fillStyle: "#777" },
    label: "conveyor",
  },
);

export const roof = Bodies.rectangle(canvas.width / 2, -100, canvas.width, 50, {
  isStatic: true,
  render: { fillStyle: "#777" },
});

World.add(world, [leftWall, rightWall, leftPlatform, rightPlatform, conveyor, roof]);
