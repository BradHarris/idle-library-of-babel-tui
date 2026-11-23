# Save and settings

Progress saves automatically to this browser's localStorage. The player can also save on demand, export the save as a base64 string, import one, and reset with a two-click confirmation. An unreadable save shows a warning, keeps a backup copy and turns autosave off. The frame-rate cap is a per-device setting stored apart from the save.

## Sub-features

- `save-now` writes the save immediately and shows "Saved".
- `save-export` fills `[data-save-export]` with base64 of the v1 save JSON and tries to copy it to the clipboard.
- `save-import` loads a pasted string (base64 or raw JSON), shows "Save loaded" and saves it.
- `save-import-invalid` refuses garbage with "That is not a save string".
- `save-reset` asks "Click again to reset" on the first click (4 s window). The second click wipes the game and shows "Game reset".
- `save-load-error` handles a corrupt or newer save: it shows `[data-save-load-error]`, copies the raw save to `library-of-babel:save:backup`, and leaves autosave off.
- `settings-fps` stores the frame-rate buttons (5–60) in `library-of-babel:settings`, and the choice survives a reload.

## How to get to it (user POV)

- The `Settings` tab (`#/settings`), on any screen size. Settings comes first, then Save.

## Driving it with babel.mjs

Preconditions:

- `node babel.mjs doctor` exits 0.
- `t.seed('rich')`, so reset and import produce a visible difference (100M pages vs 0).

- **Save now.** Click `button[data-save="now"]`. `[data-save-notice]` reads `Saved`. `t.stored()` has `v: 1` and `pagesGenerated >= 100000000`.
- **Export.** Click `button[data-save="export"]`. `[data-save-export]` holds base64 that decodes to `{"v":1,…}`. The notice reads `Save copied to clipboard` or `Copy the save below`.
- **Reset.** Click `button[data-save="reset"]`. It reads `Click again to reset`, and HUD pages are unchanged. Click again: the notice reads `Game reset`, and the stored `pagesGenerated` is near 0.
- **Import.** Type the exported string into `[data-save-import]` and click `button[data-save="import"]`. The notice reads `Save loaded`, the HUD pages end in `M`, and the stored save has 100M or more pages.
- **Invalid import.** Type `not a save!` and click Import. The notice reads `That is not a save string`.
- **Unreadable save.** Run `t.seedRaw('{"v":1,"state":')`. `[data-save-load-error]` is visible, and `t.stored('library-of-babel:save:backup')` equals that raw string.
- **Frame rate.** Click `button[data-fps="15"]`. It gets `aria-pressed="true"`, `t.stored('library-of-babel:settings')` is `{fps:15}`, and it is still pressed after `t.open()`.
- **Run it.** `node babel.mjs run save`.
- **Proof.** `artifacts/<run>/save/transcript.md`, `01-exported.png`, `02-imported.png`, `03-load-error.png`.

## Gotchas

- Headless Firefox usually denies clipboard access, so the export notice is `Copy the save below`. Both notices are valid.
- The game also saves on `pagehide`, `visibilitychange` and every 10 s, so a stored value can change under you. Read it right after the action.
- With a load error showing, autosave is off until an import or a reset, so a reload keeps the corrupt save in place.
- Reset's confirmation expires after 4 s (`RESET_CONFIRM_MS`). Don't put a slow step between the two clicks.
- Settings are deliberately **not** part of the save or export. Don't expect `fps` in `t.stored()`.
