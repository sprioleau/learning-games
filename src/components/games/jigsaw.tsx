"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Image from "next/image";
import {
  getWorld,
  isWorldUnlocked,
  worlds,
  type WorldId,
} from "@/lib/games/worlds";
import { GameScene, SceneHeader } from "@/components/scene/game-scene";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/hub/mascot";
import { useGamePlatform } from "@/components/games/game-provider";
import { playSound, prepareGameAudio } from "@/lib/platform/audio";
import { Celebration } from "@/components/games/celebration";
import {
  createPuzzlePieces,
  getPieceEdges,
  getPieceTarget,
  isNearPieceTarget,
  puzzleBoard,
  puzzleCanvas,
  puzzleSizes,
  puzzleScenes,
  getPuzzleScene,
  getSavedPuzzleScene,
  puzzleTray,
  type PuzzlePiece,
  type PuzzleSize,
} from "@/lib/games/jigsaw";
import "./jigsaw.css";

function addEdge(
  path: Path2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  sign: number,
  depth: number,
) {
  if (sign === 0) {
    path.lineTo(x + dx, y + dy);
    return;
  }
  const length = Math.hypot(dx, dy);
  const nx = (dy / length) * depth * sign;
  const ny = (-dx / length) * depth * sign;
  function point(t: number, amount: number): [number, number] {
    return [x + dx * t + nx * amount, y + dy * t + ny * amount];
  }
  path.lineTo(...point(0.33, 0));
  path.bezierCurveTo(...point(0.4, 0), ...point(0.36, 1), ...point(0.5, 1));
  path.bezierCurveTo(...point(0.64, 1), ...point(0.6, 0), ...point(0.67, 0));
  path.lineTo(x + dx, y + dy);
}
function makePath(piece: PuzzlePiece, size: PuzzleSize) {
  const width = puzzleBoard.size / size.columns;
  const height = puzzleBoard.size / size.rows;
  const depth = Math.min(width, height) * 0.19;
  const edge = getPieceEdges(piece.row, piece.column, size);
  const path = new Path2D();
  path.moveTo(0, 0);
  addEdge(path, 0, 0, width, 0, edge.top, depth);
  addEdge(path, width, 0, 0, height, edge.right, depth);
  addEdge(path, width, height, -width, 0, edge.bottom, depth);
  addEdge(path, 0, height, 0, -height, edge.left, depth);
  path.closePath();
  return path;
}
type Drag = {
  pointerId: number;
  pieceId: number;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  startRotation: number;
};
export function Jigsaw() {
  const { state, send, isBusy, error, reload, isAdminMode } = useGamePlatform();
  const savedSession = state?.activitySessions.find(
    (item) => item.gameId === "jigsaw",
  );
  const restoredId = useRef<string | null>(null);
  const isStarting = useRef(false);
  const [worldId, setWorldId] = useState<WorldId>("jungle");
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = getPuzzleScene(worldId, sceneIndex);
  const [sizeId, setSizeId] = useState<PuzzleSize["id"]>("3x3");
  const size = puzzleSizes.find((item) => item.id === sizeId) ?? puzzleSizes[0];
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const piecesRef = useRef<PuzzlePiece[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState("");
  const [targetRow, setTargetRow] = useState("1");
  const [targetColumn, setTargetColumn] = useState("1");
  const [message, setMessage] = useState(
    "Open the box and find where each piece belongs!",
  );
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const isImageReady = loadedImage?.getAttribute("src") === scene.image;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const openingTimer = useRef<number | null>(null);
  const paths = useMemo(() => {
    if (typeof Path2D === "undefined") return new Map<number, Path2D>();
    const result = new Map<number, Path2D>();
    for (let row = 0; row < size.rows; row++)
      for (let column = 0; column < size.columns; column++) {
        const piece = {
          id: row * size.columns + column,
          row,
          column,
          x: 0,
          y: 0,
          rotation: 0,
          isPlaced: false,
        };
        result.set(piece.id, makePath(piece, size));
      }
    return result;
  }, [size]);
  const placedCount = pieces.filter((piece) => piece.isPlaced).length;
  const isWon = isStarted && savedSession?.phase === "won";
  function publishPieces(next: PuzzlePiece[]) {
    piecesRef.current = next;
    setPieces(next);
  }
  useEffect(() => {
    if (
      !savedSession ||
      restoredId.current === savedSession.id ||
      isStarting.current
    )
      return;
    const savedSize = puzzleSizes.find((item) => item.id === savedSession.mode);
    if (!savedSize) return;
    const frame = window.requestAnimationFrame(() => {
      restoredId.current = savedSession.id;
      const restored = createPuzzlePieces(savedSize).map((piece) =>
        savedSession.answers.includes(piece.id)
          ? {
              ...piece,
              ...getPieceTarget(piece, savedSize),
              isPlaced: true,
              rotation: 0,
            }
          : piece,
      );
      piecesRef.current = restored;
      setPieces(restored);
      const savedScene = getSavedPuzzleScene(
        savedSession.worldId,
        savedSession.questions[0]?.payload ?? "{}",
      );
      setWorldId(savedScene.worldId);
      setSceneIndex(savedScene.index);
      setSizeId(savedSize.id);
      setIsStarted(true);
      setMessage(
        savedSession.phase === "won"
          ? "You finished the picture! Wonderful work!"
          : "Your puzzle is ready to continue.",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [savedSession]);
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => {
      setLoadedImage(image);
    };
    image.src = scene.image;
    return () => {
      image.onload = null;
      if (openingTimer.current !== null)
        window.clearTimeout(openingTimer.current);
    };
  }, [scene.image]);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(
      canvas.width / puzzleCanvas.width,
      0,
      0,
      canvas.height / puzzleCanvas.height,
      0,
      0,
    );
    context.clearRect(0, 0, puzzleCanvas.width, puzzleCanvas.height);
    context.fillStyle = "#f4dfb8";
    context.strokeStyle = "#b4824d";
    context.lineWidth = 5;
    context.fillRect(
      puzzleBoard.x - 5,
      puzzleBoard.y - 5,
      puzzleBoard.size + 10,
      puzzleBoard.size + 10,
    );
    context.strokeRect(
      puzzleBoard.x - 5,
      puzzleBoard.y - 5,
      puzzleBoard.size + 10,
      puzzleBoard.size + 10,
    );
    if (isImageReady && loadedImage) {
      context.save();
      context.globalAlpha = 0.17;
      context.drawImage(
        loadedImage,
        puzzleBoard.x,
        puzzleBoard.y,
        puzzleBoard.size,
        puzzleBoard.size,
      );
      context.restore();
    }
    context.fillStyle = "#c99660";
    context.strokeStyle = "#85532c";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(
      puzzleTray.x - 10,
      puzzleTray.y - 12,
      puzzleTray.width + 20,
      puzzleTray.height + 24,
      22,
    );
    context.fill();
    context.stroke();
    for (const piece of pieces) {
      const path = paths.get(piece.id);
      if (!path) continue;
      context.save();
      const width = puzzleBoard.size / size.columns;
      const height = puzzleBoard.size / size.rows;
      context.translate(piece.x + width / 2, piece.y + height / 2);
      context.rotate((piece.rotation * Math.PI) / 180);
      context.translate(-width / 2, -height / 2);
      context.shadowColor = "#56331d88";
      context.shadowBlur = 7;
      context.shadowOffsetY = 4;
      context.fillStyle = "#fff5d5";
      context.fill(path);
      context.shadowColor = "transparent";
      if (isImageReady && loadedImage) {
        context.save();
        context.clip(path);
        context.drawImage(
          loadedImage,
          -piece.column * (puzzleBoard.size / size.columns),
          -piece.row * (puzzleBoard.size / size.rows),
          puzzleBoard.size,
          puzzleBoard.size,
        );
        context.restore();
      }
      context.lineWidth = 2;
      context.strokeStyle = piece.isPlaced ? "#986d42" : "#fff8e7";
      context.stroke(path);
      if (isKeyboardOpen && !piece.isPlaced) {
        context.fillStyle = "#fff8e7";
        context.beginPath();
        context.arc(12, 12, 12, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#55351e";
        context.font = "bold 14px sans-serif";
        context.textAlign = "center";
        context.fillText(String(piece.id + 1), 12, 17);
      }
      context.restore();
    }
  }, [pieces, size, paths, isKeyboardOpen, isImageReady, loadedImage]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [draw, isStarted]);
  async function openBox() {
    if (!state || isBusy) return;
    prepareGameAudio();
    setIsOpening(true);
    isStarting.current = true;
    const result = await send({
      kind: "activity-start",
      gameId: "jigsaw",
      mode: size.id,
      worldId,
      sceneIndex,
    });
    if (!result) {
      isStarting.current = false;
      setIsOpening(false);
      return;
    }
    restoredId.current =
      result.state.activitySessions.find((item) => item.gameId === "jigsaw")
        ?.id ?? null;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 550;
    openingTimer.current = window.setTimeout(() => {
      publishPieces(createPuzzlePieces(size));
      setIsStarted(true);
      isStarting.current = false;
      setIsOpening(false);
      setSelectedPiece("");
      setTargetRow("1");
      setTargetColumn("1");
      setMessage("Drag a piece onto its place in the picture.");
    }, delay);
  }
  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * puzzleCanvas.width) / rect.width,
      y: ((event.clientY - rect.top) * puzzleCanvas.height) / rect.height,
    };
  }
  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current || !isStarted || isWon || isBusy) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    const width = puzzleBoard.size / size.columns;
    const height = puzzleBoard.size / size.rows;
    let localX = 0;
    let localY = 0;
    const piece = [...piecesRef.current].reverse().find((item) => {
      const path = paths.get(item.id);
      if (item.isPlaced || !path) return false;
      const dx = point.x - item.x - width / 2;
      const dy = point.y - item.y - height / 2;
      const angle = (-item.rotation * Math.PI) / 180;
      const x = dx * Math.cos(angle) - dy * Math.sin(angle) + width / 2;
      const y = dx * Math.sin(angle) + dy * Math.cos(angle) + height / 2;
      if (!context.isPointInPath(path, x, y)) return false;
      localX = x;
      localY = y;
      return true;
    });
    context.restore();
    if (!piece) return;
    canvas.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      pieceId: piece.id,
      dx: localX,
      dy: localY,
      startX: piece.x,
      startY: piece.y,
      startRotation: piece.rotation,
    };
    publishPieces([
      ...piecesRef.current.filter((item) => item.id !== piece.id),
      { ...piece, x: point.x - localX, y: point.y - localY, rotation: 0 },
    ]);
    event.preventDefault();
  }
  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const point = getPoint(event);
    const width = puzzleBoard.size / size.columns;
    const height = puzzleBoard.size / size.rows;
    publishPieces(
      piecesRef.current.map((piece) =>
        piece.id === active.pieceId
          ? {
              ...piece,
              x: Math.max(
                0,
                Math.min(puzzleCanvas.width - width, point.x - active.dx),
              ),
              y: Math.max(
                0,
                Math.min(puzzleCanvas.height - height, point.y - active.dy),
              ),
            }
          : piece,
      ),
    );
    event.preventDefault();
  }
  async function finishPointer(
    event: PointerEvent<HTMLCanvasElement>,
    isCancelled: boolean,
  ) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    let didPlace = false;
    const next = piecesRef.current.map((piece) => {
      if (piece.id !== active.pieceId) return piece;
      if (isCancelled)
        return {
          ...piece,
          x: active.startX,
          y: active.startY,
          rotation: active.startRotation,
        };
      if (isNearPieceTarget(piece, size)) {
        didPlace = true;
        return {
          ...piece,
          ...getPieceTarget(piece, size),
          isPlaced: true,
          rotation: 0,
        };
      }
      return piece;
    });
    const previous = piecesRef.current;
    publishPieces(next);
    if (!didPlace && !isCancelled) {
      const point = getPoint(event);
      if (
        point.x >= puzzleBoard.x &&
        point.x <= puzzleBoard.x + puzzleBoard.size &&
        point.y >= puzzleBoard.y &&
        point.y <= puzzleBoard.y + puzzleBoard.size
      ) {
        setMessage("Not quite there yet. Try another spot!");
        playSound("incorrect", state?.options.isSoundEnabled);
      }
    }
    if (didPlace && savedSession) {
      playSound(
        next.every((piece) => piece.isPlaced) ? "win" : "correct",
        state?.options.isSoundEnabled,
      );
      const result = await send({
        kind: "activity-answer",
        gameId: "jigsaw",
        sessionId: savedSession.id,
        expectedRevision: savedSession.revision,
        answer: active.pieceId,
      });
      if (
        !result ||
        (result.outcome !== "correct" && result.outcome !== "won")
      ) {
        publishPieces(previous);
        return;
      }
      const hasWon = result.outcome === "won";
      setMessage(
        hasWon
          ? "You finished the picture! Wonderful work!"
          : "A piece found its place!",
      );
    }
  }
  async function placeSelectedPiece() {
    const id = Number(selectedPiece);
    const piece = piecesRef.current.find(
      (item) => item.id === id && !item.isPlaced,
    );
    if (!piece || !savedSession || isBusy) return;
    if (
      piece.row + 1 !== Number(targetRow) ||
      piece.column + 1 !== Number(targetColumn)
    ) {
      setMessage("Not that space yet. Try another row or column.");
      playSound("incorrect", state?.options.isSoundEnabled);
      return;
    }
    const next = piecesRef.current.map((item) =>
      item.id === id
        ? {
            ...item,
            ...getPieceTarget(item, size),
            isPlaced: true,
            rotation: 0,
          }
        : item,
    );
    const previous = piecesRef.current;
    publishPieces(next);
    playSound(
      next.every((item) => item.isPlaced) ? "win" : "correct",
      state?.options.isSoundEnabled,
    );
    const result = await send({
      kind: "activity-answer",
      gameId: "jigsaw",
      sessionId: savedSession.id,
      expectedRevision: savedSession.revision,
      answer: id,
    });
    if (!result || (result.outcome !== "correct" && result.outcome !== "won")) {
      publishPieces(previous);
      return;
    }
    setSelectedPiece("");
    const hasWon = result.outcome === "won";
    setMessage(
      hasWon
        ? "You finished the picture! Wonderful work!"
        : "A piece found its place!",
    );
  }
  return (
    <GameScene className="jigsaw-scene" world={worldId}>
      <SceneHeader title={`${getWorld(worldId).shortName} Jigsaw`} />
      {error && (
        <div className="scene-message scene-error" role="alert">
          {error}
          <Button onClick={reload}>Try again</Button>
        </div>
      )}
      {!isStarted ? (
        <>
          <div className="jigsaw-mascot floating-mascot">
            <Mascot pose="wave" />
          </div>
          <section
            className="jigsaw-intro parchment-panel"
            aria-label="Choose a puzzle"
          >
            <h2>Let’s make a picture!</h2>
            <p>Choose a world, a picture, and a puzzle size.</p>
            <div
              className="jigsaw-world-choice"
              role="group"
              aria-label="Puzzle world"
            >
              {worlds.map((world) => {
                const isLocked =
                  !isAdminMode && !isWorldUnlocked(world.id, state?.stars ?? 0);
                return (
                  <Button
                    key={world.id}
                    variant="outline"
                    aria-pressed={worldId === world.id}
                    disabled={isOpening || isLocked}
                    onClick={() => {
                      setWorldId(world.id);
                      setSceneIndex(0);
                    }}
                  >
                    {world.shortName}
                    {isLocked ? ` · ${world.starsRequired} stars` : ""}
                  </Button>
                );
              })}
            </div>
            <div
              className="jigsaw-scene-choice"
              role="group"
              aria-label="Puzzle picture"
            >
              {puzzleScenes
                .filter((item) => item.worldId === worldId)
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-label={item.name}
                    aria-pressed={sceneIndex === item.index}
                    disabled={isOpening}
                    onClick={() => setSceneIndex(item.index)}
                  >
                    <Image src={item.image} alt="" width={180} height={180} />
                    <span>{item.name}</span>
                  </button>
                ))}
            </div>
            <div
              className="jigsaw-size-choice"
              role="group"
              aria-label="Puzzle size"
            >
              {puzzleSizes.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  aria-pressed={sizeId === item.id}
                  disabled={isOpening}
                  onClick={() => setSizeId(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <button
              type="button"
              className={`jigsaw-box ${isOpening ? "is-opening" : ""}`}
              style={{ backgroundImage: `url(${scene.image})` }}
              aria-label="Open puzzle box"
              disabled={isOpening || isBusy || !state}
              onClick={openBox}
            >
              <span>OPEN BOX</span>
            </button>
          </section>
        </>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className="jigsaw-canvas"
            role="img"
            aria-label={`${getWorld(worldId).shortName} puzzle board and scattered pieces`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => finishPointer(event, false)}
            onPointerCancel={(event) => finishPointer(event, true)}
          />
          <div className="jigsaw-toolbar">
            <Button variant="outline" onClick={() => setIsStarted(false)}>
              New puzzle
            </Button>
            <strong>
              {placedCount} / {pieces.length} pieces
            </strong>
            <Button
              variant="outline"
              aria-expanded={isKeyboardOpen}
              onClick={() => setIsKeyboardOpen((value) => !value)}
            >
              Keyboard controls
            </Button>
          </div>
          <p role="status" className="jigsaw-status">
            {message}
          </p>
          {isKeyboardOpen && (
            <section
              className="jigsaw-access-panel parchment-panel"
              aria-label="Place a puzzle piece"
            >
              <p>Choose a numbered piece and a space.</p>
              <label>
                Piece{" "}
                <select
                  aria-label="Piece"
                  disabled={isBusy}
                  value={selectedPiece}
                  onChange={(event) => setSelectedPiece(event.target.value)}
                >
                  <option value="">Choose</option>
                  {pieces
                    .filter((piece) => !piece.isPlaced)
                    .sort((a, b) => a.id - b.id)
                    .map((piece) => (
                      <option key={piece.id} value={piece.id}>
                        Piece {piece.id + 1}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Row{" "}
                <select
                  aria-label="Row"
                  disabled={isBusy}
                  value={targetRow}
                  onChange={(event) => setTargetRow(event.target.value)}
                >
                  {Array.from({ length: size.rows }, (_, index) => (
                    <option key={index} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Column{" "}
                <select
                  aria-label="Column"
                  disabled={isBusy}
                  value={targetColumn}
                  onChange={(event) => setTargetColumn(event.target.value)}
                >
                  {Array.from({ length: size.columns }, (_, index) => (
                    <option key={index} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                disabled={selectedPiece === "" || isBusy}
                onClick={placeSelectedPiece}
              >
                Place piece
              </Button>
            </section>
          )}
          {isWon && (
            <section className="jigsaw-won parchment-panel">
              {state?.options.isCelebrationEnabled && <Celebration />}
              <h2>Picture complete!</h2>
              <p>You put every piece in place! +1 star · +100 points</p>
              <Button
                className="play-button coral-button"
                onClick={() => setIsStarted(false)}
              >
                Play again
              </Button>
            </section>
          )}
        </>
      )}
    </GameScene>
  );
}
