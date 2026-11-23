---------------------------- MODULE SaveLifecycle ----------------------------
(***************************************************************************)
(* What happens to the saved game in localStorage over one browser tab's   *)
(* life: opening the page, the 10 s autosave, hiding the tab, closing it,  *)
(* a crash, the player's Save now / Import / Reset, and other tabs (the    *)
(* same build, or a newer deploy) writing the shared save slot.            *)
(*                                                                         *)
(* The slot is abstracted to what the code distinguishes on load:          *)
(*   "empty"      no save               (readSave -> reason 'empty')       *)
(*   "game"       a save this build reads (decodeSave -> ok)               *)
(*   "unreadable" corrupt or newer      (decodeSave -> 'corrupt'|'newer')  *)
(*                                                                         *)
(* Code map (each action is one step in the code, run to completion):      *)
(*   Open              web/src/App.tsx App(): readSave, startAutosave      *)
(*                     (enabled, and `known` = the slot as loaded)         *)
(*   Autosave          src/store.ts startAutosave: setInterval(save)       *)
(*   TabHidden         src/store.ts startAutosave: visibilitychange->save  *)
(*   PageClose         src/store.ts startAutosave: pagehide -> save        *)
(*   Crash             tab killed: no pagehide                             *)
(*   SaveNow           SavePanel saveNow: autosave.save(true)              *)
(*   Import            SavePanel doImport: game.load, save(true) after     *)
(*                     the flush                                           *)
(*   Reset             SavePanel doReset (2nd click): autosave.clear(),    *)
(*                     game.reset, save(true) after the flush              *)
(*   OtherTabSaves     another tab of this build calls writeSave           *)
(*   OtherTabWritesNewer  a newer build writes { v: SAVE_VERSION + 1 }     *)
(*   StorageEvent      the browser delivers `storage` for that write (a    *)
(*                     separate task, so other steps can come first)       *)
(*                                                                         *)
(* `foreign` is the code's `readRawSave() !== known` check: the slot holds *)
(* something this tab neither loaded nor wrote.                            *)
(***************************************************************************)

VARIABLES
  slot,       \* localStorage[SAVE_KEY], abstracted
  backup,     \* localStorage[BACKUP_KEY]: "none" or "unreadable" (readSave only ever copies an unreadable save there)
  open,       \* is the tab open (App mounted)?
  loaded,     \* what readSave returned when this tab opened: "none" (closed), "ok", "empty", "unreadable"
  enabled,    \* startAutosave's `enabled` flag
  foreign,    \* another tab wrote the slot since this tab last read or wrote it
  halted,     \* startAutosave's `stopped` flag: the tab shows "Paused in this tab" and never writes again
  overwrote,  \* history: this tab replaced an unreadable save without the player choosing to
  clobbered   \* history: this tab wrote over a save another tab had written

vars == <<slot, backup, open, loaded, enabled, foreign, halted, overwrote, clobbered>>

Slots == {"empty", "game", "unreadable"}

TypeOK ==
  /\ slot \in Slots
  /\ backup \in {"none", "unreadable"}
  /\ open \in BOOLEAN
  /\ loaded \in {"none", "ok", "empty", "unreadable"}
  /\ enabled \in BOOLEAN
  /\ foreign \in BOOLEAN
  /\ halted \in BOOLEAN
  /\ overwrote \in BOOLEAN
  /\ clobbered \in BOOLEAN

Init ==
  /\ slot \in Slots
  /\ backup = "none"
  /\ open = FALSE
  /\ loaded = "none"
  /\ enabled = FALSE
  /\ foreign = FALSE
  /\ halted = FALSE
  /\ overwrote = FALSE
  /\ clobbered = FALSE

(* startAutosave's save(force):                                                   *)
(*   if (stopped) return; if (force) enabled = true; if (!enabled) return;        *)
(*   if (slot changed elsewhere) { stopped = true; return }  write; known = slot  *)
(* A write replacing an unreadable save counts as the player's choice only when it *)
(* comes from an explicit action (`chosen`) in a tab that showed the load warning.  *)
Save(force, chosen) ==
  LET on == enabled \/ force
      writes == ~halted /\ on /\ ~foreign
  IN
  /\ enabled' = IF halted THEN enabled ELSE on
  /\ halted' = (halted \/ (on /\ foreign))
  /\ slot' = IF writes THEN "game" ELSE slot
  /\ foreign' = IF writes THEN FALSE ELSE foreign
  /\ overwrote' = (overwrote \/ (writes /\ slot = "unreadable" /\ ~(chosen /\ loaded = "unreadable")))
  /\ clobbered' = (clobbered \/ (writes /\ foreign))

Closed ==
  /\ open' = FALSE /\ loaded' = "none" /\ enabled' = FALSE /\ foreign' = FALSE /\ halted' = FALSE

Open ==
  /\ ~open
  /\ open' = TRUE
  /\ loaded' = CASE slot = "empty" -> "empty"
                 [] slot = "game" -> "ok"
                 [] slot = "unreadable" -> "unreadable"
  \* App.tsx: startAutosave(game, { enabled: loaded.ok || loaded.reason === 'empty' })
  /\ enabled' = (slot # "unreadable")
  \* save.ts readSave: an unreadable save is copied to BACKUP_KEY
  /\ backup' = IF slot = "unreadable" THEN "unreadable" ELSE backup
  /\ foreign' = FALSE /\ halted' = FALSE
  /\ UNCHANGED <<slot, overwrote, clobbered>>

Autosave == open /\ Save(FALSE, FALSE) /\ UNCHANGED <<backup, open, loaded>>

TabHidden == open /\ Save(FALSE, FALSE) /\ UNCHANGED <<backup, open, loaded>>

(* pagehide runs save(), then the tab is gone *)
PageClose ==
  /\ open
  /\ LET writes == ~halted /\ enabled /\ ~foreign IN
     /\ slot' = IF writes THEN "game" ELSE slot
     /\ overwrote' = (overwrote \/ (writes /\ slot = "unreadable"))
     /\ clobbered' = (clobbered \/ (writes /\ foreign))
  /\ Closed
  /\ UNCHANGED backup

Crash == open /\ Closed /\ UNCHANGED <<slot, backup, overwrote, clobbered>>

SaveNow == open /\ Save(TRUE, TRUE) /\ UNCHANGED <<backup, open, loaded>>

Import == open /\ Save(TRUE, TRUE) /\ UNCHANGED <<backup, open, loaded>>

(* autosave.clear() makes the same check as save(), then clearSave(); the save(true) after *)
(* the flush then writes the fresh game. Nothing else runs in between (a microtask).        *)
Reset == open /\ Save(TRUE, TRUE) /\ UNCHANGED <<backup, open, loaded>>

OtherTabSaves ==
  /\ slot' = "game"
  /\ foreign' = open
  /\ UNCHANGED <<backup, open, loaded, enabled, halted, overwrote, clobbered>>

OtherTabWritesNewer ==
  /\ slot' = "unreadable"
  /\ foreign' = open
  /\ UNCHANGED <<backup, open, loaded, enabled, halted, overwrote, clobbered>>

(* The `storage` event handler: changedElsewhere() halts whether or not autosave is on *)
StorageEvent ==
  /\ open /\ foreign /\ ~halted
  /\ halted' = TRUE
  /\ UNCHANGED <<slot, backup, open, loaded, enabled, foreign, overwrote, clobbered>>

Next ==
  \/ Open \/ Autosave \/ TabHidden \/ PageClose \/ Crash
  \/ SaveNow \/ Import \/ Reset
  \/ OtherTabSaves \/ OtherTabWritesNewer \/ StorageEvent

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
(* Rules *)

(* The game never replaces a save it can't read unless the player chose to: *)
(* Save now, Import or Reset in a tab that showed the load warning.         *)
NoSilentOverwrite == ~overwrote

(* A tab never writes over a save another tab wrote after it last read or wrote the slot. *)
NoForeignOverwrite == ~clobbered

(* A tab only pauses when another tab really did write: its own saves and resets never pause it. *)
NoFalseAlarm == halted => foreign

(* While a tab shows the warning and the player hasn't acted, the unreadable save stays in place. *)
WarnedSaveKept == (open /\ loaded = "unreadable" /\ ~enabled /\ ~foreign) => slot = "unreadable"

(* A tab that loaded an unreadable save always leaves a copy in the backup slot. *)
BackupKept == loaded = "unreadable" => backup = "unreadable"
=============================================================================
