export const advancementsData = {
  points_100: {
    name: "Bouncy Balls",
    description: "Reach 100 points",
    category: "points",
    sort: 100,
    check: s => s.points >= 100
  },
  points_1000: {
    name: "Bouncier Balls",
    description: "Reach 1.00K points",
    category: "points",
    sort: 1000,
    check: s => s.points >= 1000
  },
  points_10000: {
    name: "I Love Balls",
    description: "Reach 10.0K points",
    category: "points",
    sort: 10000,
    check: s => s.points >= 10000
  },
  points_100000: {
    name: "Boing! Boing!",
    description: "Reach 100K points",
    category: "points",
    sort: 100000,
    check: s => s.points >= 100000
  },
  points_1m: {
    name: "Ballin'",
    description: "Reach 1.00M points",
    category: "points",
    sort: 1000000,
    check: s => s.points >= 1000000
  },
  big_earner: {
    name: "Big Earner",
    description: "Earn 100 or more points in a single impact",
    category: "earnings",
    sort: 100,
    check: s => s.lastPointsEarned >= 100
  },
  bigger_earner: {
    name: "Bigger Earner",
    description: "Earn 586 or more points in a single impact",
    category: "earnings",
    sort: 586,
    check: s => s.lastPointsEarned >= 586
  },
  mega_earner: {
    name: "Mega Earner",
    description: "Earn 5.60K or more points in a single impact",
    category: "earnings",
    sort: 10000,
    check: s => s.lastPointsEarned >= 5600
  },
  bouncy_max: {
    name: "Super Bouncy",
    description: "Max out bounciness",
    category: "upgrades",
    sort: 110,
    check: s => s.bounciness >= 1.1
  },
  hyper_earner: {
    name: "Hyper Earner",
    description: "Max out hyperplier",
    category: "upgrades",
    sort: 200,
    check: s => s.moneyHyperplier >= 2
  },
  all_maxed: {
    name: "Perfection",
    description: "Max out all normal upgrades",
    category: "upgrades",
    sort: 999,
    check: s =>
      s.spawnInterval <= 400 &&
      s.platformAngle >= 0.85 &&
      s.gravity >= 3 &&
      s.bounciness >= 1.1 &&
      s.moneyHyperplier >= 2 &&
      s.ballSize >= 20
  },
  gold_balls: {
    name: "Golden Touch",
    description: "Buy the Gold Balls perk",
    category: "perks",
    sort: 1,
    check: s => s.perks.has("goldBalls")
  },
  fast_conveyor: {
    name: "Vroom Vroom",
    description: "Buy the Fast Conveyor perk",
    category: "perks",
    sort: 2,
    check: s => s.perks.has("fastConveyor")
  },
  split_balls: {
    name: "Divide and Conquer",
    description: "Buy the Split Balls perk",
    category: "perks",
    sort: 3,
    check: s => s.perks.has("splitBalls")
  },
  rainbow_balls: {
    name: "Taste the Rainbow",
    description: "Buy the Rainbow Balls perk",
    category: "perks",
    sort: 4,
    check: s => s.perks.has("rainbowBalls")
  },
  rich_balls: {
    name: "Bling Bling",
    description: "Buy the Lucky Gold perk",
    category: "perks",
    sort: 5,
    check: s => s.perks.has("richBalls")
  },
  crit_balls: {
    name: "Critical Thinking",
    description: "Buy the Critical Balls perk",
    category: "perks",
    sort: 6,
    check: s => s.perks.has("critBalls")
  },
  double_drop: {
    name: "Double Trouble",
    description: "Buy the Double Drop perk",
    category: "perks",
    sort: 7,
    check: s => s.perks.has("doubleDrop")
  },
  all_perks: {
    name: "Fully Perked",
    description: "Own every perk at the same time",
    category: "perks",
    sort: 8,
    check: s => Object.keys(s.perksData).every(k => s.perks.has(k))
  },
  golden_divorce: {
    name: "Golden Divorce",
    description: "A golden ball has split upon impact",
    category: "luck",
    sort: 1,
    check: s => s.goldenDivorce
  },
  crits_10: {
    name: "Crit Machine",
    description: "Land 10 critical hits",
    category: "luck",
    sort: 10,
    check: s => s.critsLanded >= 10
  },
  balls_1000: {
    name: "A Lot of Balls",
    description: "Spawn 1.00K balls total",
    category: "balls",
    sort: 1000,
    check: s => s.totalBallsSpawned >= 1000
  },
  balls_10000: {
    name: "Balls, Balls, Balls",
    description: "Spawn 10.0K balls total",
    category: "balls",
    sort: 10000,
    check: s => s.totalBallsSpawned >= 10000
  },
  start_over: {
    name: "Start Over",
    description: "Reach prestige level 1",
    category: "prestige",
    sort: 1,
    check: s => s.prestigeLevel >= 1
  },
  radiant_revival: {
    name: "Radiant Revival",
    description: "Reach prestige level 5",
    category: "prestige",
    sort: 5,
    check: s => s.prestigeLevel >= 5
  },
  prestige_10: {
    name: "Prestige Enthusiast",
    description: "Reach prestige level 10",
    category: "prestige",
    sort: 10,
    check: s => s.prestigeLevel >= 10
  },
  prestige_25: {
    name: "Prestige Addict",
    description: "Reach prestige level 25",
    category: "prestige",
    sort: 25,
    check: s => s.prestigeLevel >= 25
  },
  prestige_50: {
    name: "Prestige Master",
    description: "Reach prestige level 50",
    category: "prestige",
    sort: 50,
    check: s => s.prestigeLevel >= 50
  },
  prestige_100: {
    name: "Prestige Legend",
    description: "Reach prestige level 100",
    category: "prestige",
    sort: 100,
    check: s => s.prestigeLevel >= 100
  },
  lifetime_100000: {
    name: "Lifetime Earner",
    description: "Earn 100K lifetime points",
    category: "lifetime",
    sort: 100000,
    check: s => s.lifetimePoints >= 100000
  },
  lifetime_1000000: {
    name: "Lifetime Achiever",
    description: "Earn 1.00M lifetime points",
    category: "lifetime",
    sort: 1000000,
    check: s => s.lifetimePoints >= 1000000
  },
  lifetime_10m: {
    name: "Ballionaire",
    description: "Earn 10.0M lifetime points",
    category: "lifetime",
    sort: 10000000,
    check: s => s.lifetimePoints >= 10000000
  },
  lifetime_100m: {
    name: "Galactic Balling",
    description: "Earn 100M lifetime points",
    category: "lifetime",
    sort: 100000000,
    check: s => s.lifetimePoints >= 100000000
  },
  lifetime_1b: {
    name: "Balling Addiction",
    description: "Earn 1.00B lifetime points",
    category: "lifetime",
    sort: 1000000000,
    check: s => s.lifetimePoints >= 1000000000
  },
  cosmic_1: {
    name: "A New Universe",
    description: "Enter a new universe for the first time",
    category: "universes",
    sort: 1,
    check: s => s.cosmicLevel >= 1
  },
  cosmic_5: {
    name: "Cosmic Explorer",
    description: "Reach cosmic ball level 5",
    category: "universes",
    sort: 5,
    check: s => s.cosmicLevel >= 5
  },
  cosmic_10: {
    name: "Cosmic Voyager",
    description: "Reach cosmic ball level 10",
    category: "universes",
    sort: 10,
    check: s => s.cosmicLevel >= 10
  },
  cosmic_25: {
    name: "Galactic Wanderer",
    description: "Reach cosmic ball level 25",
    category: "universes",
    sort: 25,
    check: s => s.cosmicLevel >= 25
  },
  cosmic_50: {
    name: "Intergalactic Legend",
    description: "Reach cosmic ball level 50",
    category: "universes",
    sort: 50,
    check: s => s.cosmicLevel >= 50
  }
};

export const advancementCategories = [
  { id: "points", name: "Points" },
  { id: "earnings", name: "Earnings" },
  { id: "upgrades", name: "Upgrades" },
  { id: "perks", name: "Perks" },
  { id: "luck", name: "Luck" },
  { id: "balls", name: "Balls" },
  { id: "prestige", name: "Prestige" },
  { id: "lifetime", name: "Lifetime" },
  { id: "universes", name: "Universes" }
];
