import { useUIState, useActions } from "../store.js";
import { Hud } from "./Hud.jsx";
import { UpgradeButtons } from "./UpgradeButtons.jsx";
import { PerksShop } from "./PerksShop.jsx";
import { Settings } from "./Settings.jsx";
import { Advancements } from "./Advancements.jsx";
import { Prestige } from "./Prestige.jsx";
import { Universes } from "./Universes.jsx";
import { Toasts } from "./Toasts.jsx";

function Popup({ children }) {
  const a = useActions();
  return (
    <div class="popup">
      <button class="closePopup" onClick={a.closePopups}>
        <img src="images/x.svg" />
      </button>
      {children}
    </div>
  );
}

export function App() {
  const s = useUIState();

  return (
    <>
      <Hud />
      <UpgradeButtons />
      {s.popup === "perksShop" && (
        <Popup>
          <PerksShop />
        </Popup>
      )}
      {s.popup === "settings" && (
        <Popup>
          <Settings />
        </Popup>
      )}
      {s.popup === "advancements" && (
        <Popup>
          <Advancements />
        </Popup>
      )}
      {s.popup === "prestige" && (
        <Popup>
          <Prestige />
        </Popup>
      )}
      {s.popup === "universes" && (
        <Popup>
          <Universes />
        </Popup>
      )}
      <Toasts />
    </>
  );
}
