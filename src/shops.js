import { PRESTIGE_THRESHOLD, COSMIC_THRESHOLD } from "./config.js";
import { clamp } from "./utils.js";

export const prestigeShopItems = [
  {
    id: "prest_money_boost",
    name: "Money Boost",
    desc: "+20% permanent earnings",
    cost: 1,
    costMulti: 1.35,
    requiredLevel: 0,
    whenPurchase: u => {
      u.moneyMult = (u.moneyMult || 0) + 0.2;
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
    whenPurchase: u => {
      u.startPoints = (u.startPoints || 0) + 400;
    },
    condition: () => true
  },
  {
    id: "prest_gold_chance",
    name: "Gold Chance",
    desc: "+5% gold spawn chance",
    cost: 3,
    costMulti: 1.6,
    maxLevel: 10,
    requiredLevel: 1,
    whenPurchase: u => {
      u.goldChance = (u.goldChance || 0) + 0.05;
    },
    condition: u => (u.goldChance || 0) < 0.4
  },
  {
    id: "prest_spawn_rate",
    name: "Faster Spawning",
    desc: "-5% spawn delay",
    cost: 2,
    costMulti: 1.5,
    maxLevel: 6,
    requiredLevel: 3,
    whenPurchase: u => {
      u.spawnRate = (u.spawnRate || 0) + 1;
    },
    condition: u => (u.spawnRate || 0) < 6
  },
  {
    id: "prest_ball_size",
    name: "Bigger Balls",
    desc: "+1 permanent ball size (max +15)",
    cost: 3,
    costMulti: 1.3,
    maxLevel: 20,
    requiredLevel: 6,
    whenPurchase: u => {
      u.ballSize = (u.ballSize || 0) + 1;
    },
    condition: u => (u.ballSize || 0) < 15
  }
];

export const cosmicShopItems = [
  {
    id: "cosm_start_points",
    name: "Galactic Start",
    desc: "+5.00K points at the start of each run",
    cost: 1,
    costMulti: 1.15,
    whenPurchase: u => {
      u.startPoints = (u.startPoints || 0) + 5000;
    },
    condition: () => true
  },
  {
    id: "cosm_diamond",
    name: "Diamond Balls",
    desc: "+5% diamond spawn chance (x8 value, max +50%)",
    cost: 3,
    costMulti: 1.6,
    maxLevel: 10,
    whenPurchase: u => {
      u.diamondChance = (u.diamondChance || 0) + 0.05;
    },
    condition: u => (u.diamondChance || 0) < 0.5
  },
  {
    id: "cosm_crit",
    name: "Mega Crits",
    desc: "+3% crit chance (max +30%)",
    cost: 4,
    costMulti: 1.7,
    maxLevel: 10,
    whenPurchase: u => {
      u.critChance = (u.critChance || 0) + 0.03;
    },
    condition: u => (u.critChance || 0) < 0.3
  },
  {
    id: "cosm_auto",
    name: "Auto-Buyer",
    desc: "Automatically buys the cheapest affordable upgrade",
    cost: 10,
    whenPurchase: u => {
      u.autoBuyer = true;
    },
    condition: u => !u.autoBuyer
  },
  {
    id: "cosm_caps",
    name: "Cosmic Tuning",
    desc: "Raises the gravity, ball size and spawn speed caps",
    cost: 6,
    costMulti: 2.2,
    maxLevel: 5,
    requiredCosmicLevel: 1,
    whenPurchase: u => {
      u.caps = (u.caps || 0) + 1;
    },
    condition: u => (u.caps || 0) < 5
  },
  {
    id: "cosm_springs",
    name: "Spring Pads",
    desc: "Adds two trampolines that launch balls with bonus points",
    cost: 15,
    requiredCosmicLevel: 2,
    whenPurchase: u => {
      u.springs = true;
    },
    condition: u => !u.springs
  },
  {
    id: "cosm_fans",
    name: "Gusty Fans",
    desc: "Adds wind fans that gust balls back into play",
    cost: 25,
    requiredCosmicLevel: 3,
    whenPurchase: u => {
      u.fans = true;
    },
    condition: u => !u.fans
  }
];

export function prestigeItemLevel(item, u) {
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

export function prestigeItemCost(item, u) {
  const level = prestigeItemLevel(item, u);
  return Math.floor(item.cost * Math.pow(item.costMulti || 1, level));
}

export function cosmicItemLevel(item, u) {
  switch (item.id) {
    case "cosm_start_points":
      return Math.round((u.startPoints || 0) / 5000);
    case "cosm_diamond":
      return Math.round((u.diamondChance || 0) / 0.05);
    case "cosm_crit":
      return Math.round((u.critChance || 0) / 0.03);
    case "cosm_caps":
      return u.caps || 0;
    case "cosm_auto":
      return u.autoBuyer ? 1 : 0;
    case "cosm_springs":
      return u.springs ? 1 : 0;
    case "cosm_fans":
      return u.fans ? 1 : 0;
    default:
      return 0;
  }
}

export function cosmicItemCost(item, u) {
  const level = cosmicItemLevel(item, u);
  return Math.floor(item.cost * Math.pow(item.costMulti || 1, level));
}

export function grantPrestigePoints(lifetimePoints, lifetimeBaseline, prestigeLevel) {
  const gain =
    Math.floor((lifetimePoints - lifetimeBaseline) / PRESTIGE_THRESHOLD) - prestigeLevel;
  return Math.max(0, gain);
}

export function prestigeProgress(lifetimePoints, lifetimeBaseline, prestigeLevel) {
  const unclaimed = grantPrestigePoints(lifetimePoints, lifetimeBaseline, prestigeLevel);
  const segmentStart =
    lifetimeBaseline + (prestigeLevel + unclaimed) * PRESTIGE_THRESHOLD;
  const nextAt = segmentStart + PRESTIGE_THRESHOLD;
  const progress = clamp((lifetimePoints - segmentStart) / PRESTIGE_THRESHOLD, 0, 1);
  return { unclaimed, nextAt, progress };
}

export function grantCosmicBalls(lifetimePoints, cosmicLevel) {
  const gain = Math.floor(lifetimePoints / COSMIC_THRESHOLD) - cosmicLevel;
  return Math.max(0, gain);
}

export function cosmicProgress(lifetimePoints, cosmicLevel) {
  const unclaimed = grantCosmicBalls(lifetimePoints, cosmicLevel);
  const segmentStart = (cosmicLevel + unclaimed) * COSMIC_THRESHOLD;
  const nextAt = segmentStart + COSMIC_THRESHOLD;
  const progress = clamp((lifetimePoints - segmentStart) / COSMIC_THRESHOLD, 0, 1);
  return { unclaimed, nextAt, progress };
}
