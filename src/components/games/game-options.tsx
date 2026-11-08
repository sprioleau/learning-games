"use client";
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useGamePlatform } from "./game-provider";
import type { GameOptions } from "@/lib/games/options";

export function GameOptionsPanel() {
  const { state, send, isBusy } = useGamePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<GameOptions | null>(null);
  function openOptions() {
    if (state) setDraft(state.options);
    setIsOpen(true);
  }
  async function save() {
    if (!draft) return;
    const result = await send({ kind: "options", options: draft });
    if (result) setIsOpen(false);
  }
  return (
    <>
      <Button
        variant="outline"
        className="round-button"
        aria-label="Game options"
        disabled={!state || isBusy}
        onClick={openOptions}
      >
        <Settings2 size={20} />
        <span className="sr-only">Grown-up settings</span>
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="options-dialog" shouldScrollContent>
          <DialogTitle>Make play feel just right</DialogTitle>
          <DialogDescription>
            Word collection changes apply to the next board. Sound, hints, and
            animations apply right away.
          </DialogDescription>
          {draft && (
            <div className="options-form">
              <fieldset>
                <legend>Word collection</legend>
                <div className="option-buttons">
                  {(
                    [
                      ["starter", "Starter words", "cat, sun, hop"],
                      ["sight", "Sight words", "the, see, you"],
                    ] as const
                  ).map(([id, title, description]) => (
                    <Button
                      key={id}
                      variant="outline"
                      className={draft.wordSet === id ? "is-selected" : ""}
                      aria-pressed={draft.wordSet === id}
                      onClick={() => setDraft({ ...draft, wordSet: id })}
                    >
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </Button>
                  ))}
                </div>
              </fieldset>
              <label className="setting-row" htmlFor="word-hints">
                <span>
                  <strong>Show the spoken word</strong>
                  <small>A little extra help for new readers</small>
                </span>
                <Switch
                  id="word-hints"
                  checked={draft.hasWordHints}
                  onCheckedChange={(hasWordHints) =>
                    setDraft({ ...draft, hasWordHints })
                  }
                />
              </label>
              <label className="setting-row" htmlFor="sound-effects">
                <span>
                  <strong>Sound effects</strong>
                  <small>Gentle chimes for little discoveries</small>
                </span>
                <Switch
                  id="sound-effects"
                  checked={draft.isSoundEnabled}
                  onCheckedChange={(isSoundEnabled) =>
                    setDraft({ ...draft, isSoundEnabled })
                  }
                />
              </label>
              <label className="setting-row" htmlFor="background-music">
                <span>
                  <strong>Background music</strong>
                  <small>A gentle tune throughout your adventure</small>
                </span>
                <Switch
                  id="background-music"
                  checked={draft.isMusicEnabled}
                  onCheckedChange={(isMusicEnabled) =>
                    setDraft({ ...draft, isMusicEnabled })
                  }
                />
              </label>
              <label className="setting-row" htmlFor="celebrations">
                <span>
                  <strong>Celebration animations</strong>
                  <small>Always respects reduced motion settings</small>
                </span>
                <Switch
                  id="celebrations"
                  checked={draft.isCelebrationEnabled}
                  onCheckedChange={(isCelebrationEnabled) =>
                    setDraft({ ...draft, isCelebrationEnabled })
                  }
                />
              </label>
              <fieldset>
                <legend>Speaking speed</legend>
                <div className="option-buttons">
                  {(
                    [
                      ["gentle", "Nice and slow"],
                      ["normal", "Regular"],
                    ] as const
                  ).map(([id, label]) => (
                    <Button
                      key={id}
                      variant="outline"
                      aria-pressed={draft.speechRate === id}
                      className={draft.speechRate === id ? "is-selected" : ""}
                      onClick={() => setDraft({ ...draft, speechRate: id })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <p className="small-note">
                No time limit, lost points, or login. Progress belongs to this
                browser. Clearing browser cookies starts a new adventure.
              </p>
              <Button className="play-button" disabled={isBusy} onClick={save}>
                {isBusy ? "Saving…" : "Save settings"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
