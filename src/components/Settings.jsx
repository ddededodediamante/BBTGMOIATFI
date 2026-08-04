import { useState } from "preact/hooks";
import { useUIState, useActions } from "../store.js";

export function Settings() {
  const s = useUIState();
  const a = useActions();
  const [url, setUrl] = useState("");

  return (
    <>
      <h2>Settings</h2>

      <div className="inline">
        <button onClick={a.toggleMusic}>
          {s.musicOn ? "Turn Music Off" : "Turn Music On"}
        </button>
        <button onClick={a.toggleSound}>
          {s.soundOn ? "Disable Sound Effects" : "Enable Sound Effects"}
        </button>
      </div>

      <div className="inline">
        <datalist id="musicPaths">
          <option value="Disco con Tutti.mp3" />
          <option value="Meadow Thoughts.ogg" />
          <option value="Summer Park.ogg" />
          <option value="Jolly Song.m4a" />
        </datalist>
        <input
          type="url"
          placeholder="Music URL"
          list="musicPaths"
          id="musicUrlInput"
          value={url}
          onInput={e => setUrl(e.target.value)}
        />
        <button onClick={() => a.setMusicUrl(url)}>Set Music URL</button>
      </div>

      <p>
        "Disco con Tutti" Kevin MacLeod (incompetech.com)
        <br />
        Licensed under Creative Commons: By{" "}
        <a href="http://creativecommons.org/licenses/by/4.0/">Attribution 4.0 License</a>
      </p>

      <br />

      <button class="red" onClick={a.deleteAllData}>
        Delete all data
      </button>
    </>
  );
}
