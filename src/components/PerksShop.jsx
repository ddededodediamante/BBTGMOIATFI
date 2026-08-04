import { useUIState, useActions } from "../store.js";
import { perksData } from "../perks.js";

export function PerksShop() {
  const s = useUIState();
  const a = useActions();

  const items = [];
  for (const key in perksData) {
    const ui = s.perksUi[key];
    items.push(
      <button key={key} id={key} disabled={ui?.disabled} onClick={() => a.buyPerk(key)}>
        {ui?.text}
      </button>
    );
    items.push(<p key={key + "-desc"}>{perksData[key].description}</p>);
  }

  return (
    <>
      <h2>Perks Shop</h2>
      <div id="perksButtonHolder" class="vertical">
        {items}
      </div>
    </>
  );
}
