import { useUIState, useActions } from "../store.js";
import {
  cosmicShopItems,
  cosmicItemLevel,
  cosmicItemCost,
  cosmicProgress
} from "../shops.js";
import { formatNumber } from "../utils.js";
import { COSMIC_THRESHOLD, COSMIC_GLOBAL_PER_LEVEL, UNIVERSE_UNLOCK_LEVEL } from "../config.js";

export function Universes() {
  const s = useUIState();
  const a = useActions();
  const { unclaimed, nextAt, progress } = cosmicProgress(s.lifetimePoints, s.cosmicLevel);
  const gated = s.prestigeLevel < UNIVERSE_UNLOCK_LEVEL;

  let resetText;
  let resetDisabled;
  if (gated) {
    resetText = `Unlocks at Prestige Level ${UNIVERSE_UNLOCK_LEVEL}`;
    resetDisabled = true;
  } else if (unclaimed <= 0) {
    resetText = `Enter New Universe (Reach ${formatNumber(nextAt)} lifetime points)`;
    resetDisabled = true;
  } else {
    resetText = `Enter New Universe (Claim ${formatNumber(unclaimed)} Cosmic Ball${unclaimed > 1 ? "s" : ""})`;
    resetDisabled = false;
  }

  return (
    <>
      <h2>Universes</h2>

      <div>
        <p>
          Cosmic balls come from your <strong>lifetime points</strong> (1 per{" "}
          {formatNumber(COSMIC_THRESHOLD)} earned across all runs). Each gives{" "}
          <strong>x{(1 + COSMIC_GLOBAL_PER_LEVEL).toFixed(1)}</strong> to all earnings. Entering a
          new universe resets your run and your prestige.
        </p>
        <p>
          Lifetime Points: <strong>{formatNumber(s.lifetimePoints)}</strong>
        </p>
        <p>
          Cosmic Balls (Level): <strong>{formatNumber(s.cosmicLevel)}</strong>
        </p>
        <p>
          Spendable Cosmic Points: <strong>{formatNumber(s.cosmicPoints)}</strong>
        </p>
        <p>
          Next cosmic ball at <strong>{formatNumber(nextAt)}</strong> lifetime points (
          <strong>{Math.round(progress * 100)}%</strong>)
        </p>
      </div>

      <div class="prestige-bar">
        <div class="prestige-bar-fill" style={{ width: Math.round(progress * 100) + "%" }} />
      </div>

      <button disabled={resetDisabled} onClick={a.enterUniverse}>
        {resetText}
      </button>

      <div class="prestigeShopDiv">
        <div>
          <h3>Cosmic Shop</h3>
          <p>Buy permanent upgrades using Cosmic Points.</p>
        </div>

        <div class="vertical">
          {cosmicShopItems.map(item => {
            const level = cosmicItemLevel(item, s.cosmicUpgrades);
            const gatedLevel = (item.requiredCosmicLevel || 0) > s.cosmicLevel;
            const maxed = !gatedLevel && !item.condition(s.cosmicUpgrades);
            const cost = cosmicItemCost(item, s.cosmicUpgrades);

            let text;
            let disabled;
            if (gatedLevel) {
              text = `Unlocks at Cosmic Level ${item.requiredCosmicLevel}`;
              disabled = true;
            } else if (maxed) {
              text = "Maxed";
              disabled = true;
            } else {
              text = `Buy (Cost: ${formatNumber(cost)})`;
              disabled = s.cosmicPoints < cost;
            }

            return (
              <div key={item.id} class="prestigeShopItem">
                <div>
                  <strong>{item.name}</strong>
                  <br />
                  <small>{item.desc}</small>
                  <div class="prestigeShopLevel">
                    {item.maxLevel ? `Level ${level} / ${item.maxLevel}` : `Level ${level}`}
                  </div>
                </div>
                <button disabled={disabled} onClick={() => a.buyCosmicItem(item.id)}>
                  {text}
                </button>
              </div>
            );
          })}
        </div>

        <div>
          <h3>Current Cosmic Upgrades</h3>
          <p>{`Galactic Start: +${formatNumber(s.cosmicUpgrades.startPoints || 0)}`}</p>
          <p>{`Diamond Balls: +${Math.round((s.cosmicUpgrades.diamondChance || 0) * 100)}% chance (x8 value)`}</p>
          <p>{`Mega Crits: +${Math.round((s.cosmicUpgrades.critChance || 0) * 100)}% crit chance`}</p>
          <p>{`Cosmic Tuning: Level ${s.cosmicUpgrades.caps || 0}`}</p>
          <p>{`Auto-Buyer: ${s.cosmicUpgrades.autoBuyer ? "Active" : "Inactive"}`}</p>
          <p>{`Spring Pads: ${s.cosmicUpgrades.springs ? "Installed" : "Not installed"}`}</p>
          <p>{`Gusty Fans: ${s.cosmicUpgrades.fans ? "Installed" : "Not installed"}`}</p>
        </div>
      </div>
    </>
  );
}
