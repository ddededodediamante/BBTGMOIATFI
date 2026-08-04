import { useUIState } from "../store.js";
import { advancementsData, advancementCategories } from "../advancements.js";

export function Advancements() {
  const s = useUIState();

  return (
    <>
      <h2>Advancements</h2>
      <div id="advancementList">
        {advancementCategories.map(cat => {
          const items = Object.keys(advancementsData)
            .filter(id => (advancementsData[id].category || "") === cat.id)
            .sort((a, b) => (advancementsData[a].sort ?? 0) - (advancementsData[b].sort ?? 0));
          return (
            <div key={cat.id} class="advancement-category">
              <h3 class="advancement-label">{cat.name}</h3>
              <div class="advancement-grid">
                {items.map(id => {
                  const adv = advancementsData[id];
                  const isDone = s.completedAdvancements.has(id);
                  return (
                    <div
                      key={id}
                      class={`advancement-list${isDone ? " done" : ""}`}
                    >
                      <strong>{adv.name}</strong>
                      <br />
                      <small>{adv.description}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
