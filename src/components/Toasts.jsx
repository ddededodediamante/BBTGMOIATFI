import { useUIState } from "../store.js";

export function Toasts() {
  const s = useUIState();

  return (
    <>
      {s.toasts.map(t => (
        <div key={t.id} class="advancement-popup">
          <strong>{t.title}</strong>
          <br />
          {t.description}
        </div>
      ))}
    </>
  );
}
