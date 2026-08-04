import { useUIState } from "../store.js";
import { formatNumber } from "../utils.js";

export function Hud() {
  const s = useUIState();

  const info = [
    { bold: true, text: `Points: ${formatNumber(s.points)}` },
    s.prestigeLevel !== 0 && {
      bold: true,
      text: `Prestige Points: ${formatNumber(s.prestigePoints)}`
    },
    s.cosmicLevel !== 0 && {
      bold: true,
      text: `Cosmic Balls: ${formatNumber(s.cosmicLevel)} (x${s.cosmicGlobalMult.toFixed(2)})`
    },
    { bold: false, text: `Lifetime Points: ${formatNumber(s.lifetimePoints)}` },
    { bold: false, text: `Spawn Delay: ${s.spawnDelay}s` },
    { bold: false, text: `Steepness: ${s.platformAngle.toFixed(2)}` },
    { bold: false, text: `Ball Bounciness: ${s.bounciness.toFixed(2)}` },
    { bold: false, text: `Ball Size: +${s.ballSize.toFixed(2)}` },
    {
      bold: false,
      text: `Ball Money: x${s.moneyMultiplier.toFixed(2)}${s.moneyHyperplier !== 1 ? ` (x${s.moneyHyperplier.toFixed(2)})` : ""}`
    },
    { bold: false, text: `Gravity: x${s.gravity.toFixed(2)}` },
  ].filter(Boolean);

  return (
    <div id="information">
      {info.map((line, i) => (
        <p key={i}>{line.bold ? <strong>{line.text}</strong> : line.text}</p>
      ))}
    </div>
  );
}
