import { useUIState, useActions } from "../store.js";

export function UpgradeButtons() {
  const s = useUIState();
  const a = useActions();

  const holderShown = s.popup === null && (s.smallScreen ? s.buttonsOpen : true);
  const toggleShown = s.smallScreen && s.popup === null;

  return (
    <>
      {toggleShown && (
        <button id="toggleButtonHolder" onClick={a.toggleButtons}>
          <img src="/images/menu.svg" />
        </button>
      )}
      {holderShown && (
        <div id="buttonHolder">
          <div class="inline">
            <button onClick={() => a.openPopup("settings")}>Settings</button>
            <button onClick={() => a.openPopup("advancements")}>Advancements</button>
          </div>
          <div class="line"></div>
          <div class="inline">
            <button onClick={() => a.openPopup("perksShop")}>Perks Shop</button>
            <button onClick={() => a.openPopup("prestige")}>Prestige</button>
            <button onClick={() => a.openPopup("universes")}>Universes</button>
          </div>
          <div class="line"></div>
          {Object.entries(s.buttons).map(([key, b]) => (
            <button key={key} id={key} disabled={b.disabled} onClick={() => a.buyUpgrade(key)}>
              {b.text}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
