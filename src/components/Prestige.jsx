import { useUIState, useActions } from "../store.js";
import {
  prestigeShopItems,
  prestigeItemLevel,
  prestigeItemCost,
  prestigeProgress
} from "../shops.js";
import { formatNumber } from "../utils.js";
import { PRESTIGE_THRESHOLD } from "../config.js";

export function Prestige() {
  const s = useUIState();
  const a = useActions();
  const { unclaimed, nextAt, progress } = prestigeProgress(
    s.lifetimePoints,
    s.lifetimeBaseline,
    s.prestigeLevel
  );

  return (
    <>
      <h2>Prestige</h2>

      <div>
        <p>
          Prestige points come from your <strong>lifetime points</strong> (1 per{" "}
          {formatNumber(PRESTIGE_THRESHOLD)} earned across all runs). They are claimed when you
          reset the run.
        </p>
        <p>
          Lifetime Points: <strong>{formatNumber(s.lifetimePoints)}</strong>
        </p>
        <p>
          Prestige Level: <strong>{formatNumber(s.prestigeLevel)}</strong>
        </p>
        <p>
          Spendable Prestige Points: <strong>{formatNumber(s.prestigePoints)}</strong>
        </p>
        <p>
          Next prestige point at <strong>{formatNumber(nextAt)}</strong> lifetime points (
          <strong>{Math.round(progress * 100)}%</strong>)
        </p>
      </div>

      <div class="prestige-bar">
        <div class="prestige-bar-fill" style={{ width: Math.round(progress * 100) + "%" }} />
      </div>

      <button onClick={a.claimPrestige}>
        {unclaimed > 0
          ? `Reset Run (Claim ${formatNumber(unclaimed)} Prestige Point${unclaimed > 1 ? "s" : ""})`
          : "Reset Run (No Prestige Points to Claim)"}
      </button>

      <div class="prestigeShopDiv">
        <div>
          <h3>Prestige Shop</h3>
          <p>Buy permanent upgrades using Prestige Points.</p>
        </div>

        <div class="vertical">
          {prestigeShopItems.map(item => {
            const level = prestigeItemLevel(item, s.prestigeUpgrades);
            const isGated = item.requiredLevel > s.prestigeLevel;
            const maxed = !isGated && !item.condition(s.prestigeUpgrades);
            const cost = prestigeItemCost(item, s.prestigeUpgrades);

            let text;
            let disabled;
            if (isGated) {
              text = `Unlocks at Prestige Level ${item.requiredLevel}`;
              disabled = true;
            } else if (maxed) {
              text = "Maxed";
              disabled = true;
            } else {
              text = `Buy (Cost: ${formatNumber(cost)})`;
              disabled = s.prestigePoints < cost;
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
                <button disabled={disabled} onClick={() => a.buyPrestigeItem(item.id)}>
                  {text}
                </button>
              </div>
            );
          })}
        </div>

        <div>
          <h3>Current Prestige Upgrades</h3>
          <p>{`Money Boost: +${Math.round((s.prestigeUpgrades.moneyMult || 0) * 100)}%`}</p>
          <p>{`Start Points: ${formatNumber(s.prestigeUpgrades.startPoints || 0)}`}</p>
          <p>{`Gold Chance Bonus: +${Math.round((s.prestigeUpgrades.goldChance || 0) * 100)}%`}</p>
          <p>{`Spawn Rate: -${Math.round((1 - Math.pow(0.95, s.prestigeUpgrades.spawnRate || 0)) * 100)}%`}</p>
          <p>{`Ball Size Boost: +${s.prestigeUpgrades.ballSize || 0}`}</p>
        </div>
      </div>
    </>
  );
}
