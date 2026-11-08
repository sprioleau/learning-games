"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, RotateCcw } from "lucide-react";
import { GameScene, SceneHeader } from "@/components/scene/game-scene";
import { Mascot } from "@/components/hub/mascot";
import { Button } from "@/components/ui/button";
import { playSound, prepareGameAudio } from "@/lib/platform/audio";
import { useGamePlatform } from "./game-provider";
import { Celebration } from "./celebration";
import {
  getCafeFood,
  getFractionName,
  isCafeOrderComplete,
  type CafeOrder,
} from "@/lib/games/fraction-cafe";
import "./fraction-cafe.css";

export function FractionCafe() {
  const { state, isBusy, error, reload, send } = useGamePlatform();
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("Tap the pieces you want to serve.");
  const session = state?.activitySessions.find(
    (item) => item.gameId === "fraction-cafe",
  );
  const isComplete = session?.phase === "won";
  const question = session?.questions[session.cursor];
  const order = question ? (JSON.parse(question.payload) as CafeOrder) : null;
  const label = order ? getFractionName(order) : "";
  const food = order ? getCafeFood(order.food) : null;

  async function startGame() {
    prepareGameAudio();
    const result = await send({
      kind: "activity-start",
      gameId: "fraction-cafe",
      worldId: "jungle",
      mode: "default",
    });
    if (result) {
      setSelected([]);
      setMessage("Tap the pieces you want to serve.");
    }
  }
  function toggleSlice(index: number) {
    setSelected((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  }
  async function serveOrder() {
    if (!session || !order || isBusy) return;
    const isCorrect = isCafeOrderComplete(order, selected);
    playSound(
      isCorrect
        ? session.cursor + 1 === session.questions.length
          ? "win"
          : "correct"
        : "incorrect",
      state?.options.isSoundEnabled,
    );
    const result = await send({
      kind: "activity-answer",
      gameId: "fraction-cafe",
      sessionId: session.id,
      expectedRevision: session.revision,
      answer: selected,
    });
    if (!result) return;
    if (result.outcome === "incorrect") {
      setMessage(
        `Try again! ${label} means ${order.numerator} of ${order.denominator} equal pieces.`,
      );
    } else if (result.outcome === "correct" || result.outcome === "won") {
      setSelected([]);
      setMessage("Yum! A new order is ready.");
    } else {
      setSelected([]);
      setMessage("Your saved order has changed. Try this one!");
    }
  }
  return (
    <GameScene className="fraction-cafe-scene">
      <SceneHeader title="Fraction Café" />
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error}
          <Button onClick={reload}>Try again</Button>
        </div>
      )}
      <div className="fraction-cafe-mascot floating-mascot">
        <Mascot pose={isComplete ? "cheer" : "wave"} />
      </div>
      <section className="fraction-cafe-panel parchment-panel">
        {!state ? (
          <div className="fraction-cafe-intro" role="status">
            Finding your café…
          </div>
        ) : !session ? (
          <div className={"fraction-cafe-intro"}>
            <Image
              className="fraction-cafe-food"
              src="/assets/game-art/fraction-cafe-pizza.webp"
              width={512}
              height={512}
              alt=""
            />
            <span className="panel-eyebrow">WELCOME TO THE CAFÉ</span>
            <h2>Let’s share a little!</h2>
            <p>Tap equal pieces to make the fraction your customer ordered.</p>
            <Button
              className="play-button coral-button"
              disabled={isBusy}
              onClick={startGame}
            >
              <Play fill="currentColor" /> Let’s play
            </Button>
          </div>
        ) : isComplete ? (
          <div className={"fraction-cafe-intro"}>
            {state?.options.isCelebrationEnabled && <Celebration />}
            <span className="panel-eyebrow">FIVE HAPPY CUSTOMERS</span>
            <h2>Delicious work!</h2>
            <p>You served every order and practiced sharing equal pieces.</p>
            <p>+1 star · +100 points</p>
            <Button
              className="play-button coral-button"
              disabled={isBusy}
              onClick={startGame}
            >
              <RotateCcw /> Play again
            </Button>
            <Link href="/" className={"fraction-cafe-back"}>
              Back to my adventure
            </Link>
          </div>
        ) : (
          order && (
            <>
              <div className={"fraction-cafe-order"}>
                <span className="panel-eyebrow">
                  ORDER {session.cursor + 1} OF {session.questions.length}
                </span>
                <h2>Can I have {label}?</h2>
                <p>
                  Choose {order.numerator} of the {order.denominator} equal
                  pieces of {food?.label}.
                </p>
                <strong className={"fraction-cafe-fraction"}>
                  {order.numerator}/{order.denominator}
                </strong>
              </div>
              <div
                className={"fraction-cafe-plate"}
                data-pieces={order.denominator}
                data-shape={food?.shape}
                data-food={order.food}
                role="group"
                aria-label={`${food?.label} divided into ${order.denominator} equal pieces`}
              >
                {Array.from({ length: order.denominator }, (_, index) => {
                  const isSelected = selected.includes(index);
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant="ghost"
                      className={`fraction-cafe-slice ${isSelected ? "fraction-cafe-selected" : ""}`}
                      aria-label={`Piece ${index + 1}`}
                      aria-pressed={isSelected}
                      disabled={isBusy}
                      onClick={() => toggleSlice(index)}
                      style={
                        {
                          "--slice-index": index,
                          "--slice-count": order.denominator,
                        } as React.CSSProperties
                      }
                    >
                      <span aria-hidden="true">{isSelected ? "✓" : ""}</span>
                    </Button>
                  );
                })}
              </div>
              <div className={"fraction-cafe-controls"}>
                <p role="status" aria-live="polite">
                  {message}
                </p>
                <Button
                  className="play-button coral-button"
                  disabled={isBusy}
                  onClick={serveOrder}
                >
                  Serve order
                </Button>
              </div>
            </>
          )
        )}
      </section>
    </GameScene>
  );
}
