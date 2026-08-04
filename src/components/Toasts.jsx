import { useUIState } from "../store.js";

export function Toasts() {
  const s = useUIState();

  return (
    <div id="advancement-toasts">
      {s.toasts.map(t => (
        <div key={t.id} class="advancement-popup">
          <strong>{t.title}</strong>
          <br />
          {t.description}
        </div>
      ))}
    </div>
  );
}
