"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Lens,
  LensPreview,
  LensShape,
  Mode,
  StageHandle,
  Sticker,
  TextOverlay,
} from "@/lib/types";
import { renderScene } from "@/lib/canvas";

const measureText = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
  }
  return (text: string, font: string) => {
    if (!ctx) {
      return {
        width: Math.max(30, text.length * 12 * 0.6),
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 3,
      };
    }
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const height =
      (metrics.actualBoundingBoxAscent || 0) +
        (metrics.actualBoundingBoxDescent || 0) ||
      parseInt(font, 10) * 1.2;
    return { width: Math.max(30, metrics.width), height };
  };
})();

const estimateTextBounds = (text: string, size: number, font: string) => {
  const fontString = `${size}px ${font.includes(" ") ? `'${font}'` : font}, Terminus, monospace`;
  const lines = (text || "Text").split(/\r?\n/);
  const lineHeight = size * 1.2;
  const widths = lines.map((line) => measureText(line || " ", fontString).width);
  const width = Math.max(30, ...widths);
  const height = Math.max(lineHeight, lines.length * lineHeight);
  return { width, height, lineHeight, lines };
};

// CanvasStage hosts the drawable surface, pointer handlers, and overlay rendering.
type CanvasStageProps = {
  image: HTMLImageElement | null;
  lenses: Lens[];
  mode: Mode;
  lensShape: LensShape;
  lensSize: number;
  blurAmount: number;
  magnification: number;
  onLensAdd: (lens: Lens) => void;
  onLensUpdate: (id: string, lens: Partial<Lens>) => void;
  stickers: Sticker[];
  stickerImage: HTMLImageElement | null;
  texts: TextOverlay[];
  onStickerAdd: (sticker: Sticker) => void;
  onStickerUpdate: (id: string, sticker: Partial<Sticker>) => void;
  textValue: string;
  textColor: string;
  textSize: number;
  textFont: string;
  onTextAdd: (text: TextOverlay) => void;
  onTextUpdate: (id: string, sticker: Partial<TextOverlay>) => void;
  backgroundMode: "black" | "white" | "image";
  onTextSelect: (text: TextOverlay) => void;
};

const CanvasStage = forwardRef<StageHandle, CanvasStageProps>(
  (
    {
      image,
      lenses,
      mode,
      lensShape,
      lensSize,
    blurAmount,
    magnification,
    onLensAdd,
    onLensUpdate,
    stickers,
    stickerImage,
    onStickerAdd,
    onStickerUpdate,
    texts,
    textValue,
    textColor,
    textSize,
    textFont,
    onTextAdd,
    onTextUpdate,
    backgroundMode,
    onTextSelect,
  },
  ref,
) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 920, height: 620 });
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
      null,
    );
    const [dragCurrent, setDragCurrent] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [activeLensId, setActiveLensId] = useState<string | null>(null);
    const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
    const [resizeState, setResizeState] = useState<{
      id: string;
      start: { x: number; y: number; width: number; height: number };
      startPoint: { x: number; y: number };
    } | null>(null);
    const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
    const stickerDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
    const [stickerResizeState, setStickerResizeState] = useState<{
      id: string;
      start: { x: number; y: number; width: number; height: number };
      startPoint: { x: number; y: number };
    } | null>(null);
    const [activeTextId, setActiveTextId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<string>("");
    const textDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
    const [textResizeState, setTextResizeState] = useState<{
      id: string;
      start: { x: number; y: number; width: number; height: number };
      startPoint: { x: number; y: number };
    } | null>(null);
    const effectiveImage = backgroundMode === "image" ? image : null;

    const imageMetrics = useMemo(() => {
      if (!effectiveImage) return null;
      const scale = Math.min(
        size.width / effectiveImage.naturalWidth,
        size.height / effectiveImage.naturalHeight,
      );
      const drawWidth = effectiveImage.naturalWidth * scale;
      const drawHeight = effectiveImage.naturalHeight * scale;
      const offsetX = (size.width - drawWidth) / 2;
      const offsetY = (size.height - drawHeight) / 2;
      return { scale, offsetX, offsetY, drawWidth, drawHeight };
    }, [effectiveImage, size.height, size.width]);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    const preview: LensPreview | null = useMemo(() => {
      if (mode === "text") return null;
      if (!dragStart || !dragCurrent) return null;

      if (mode === "magnify") {
        const centerX = dragCurrent.x;
        const centerY = dragCurrent.y;
        return {
          x: centerX - lensSize / 2,
          y: centerY - lensSize / 2,
          width: lensSize,
          height: lensSize,
          shape: lensShape,
        };
      }

      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragStart.x - dragCurrent.x);
      const height = Math.abs(dragStart.y - dragCurrent.y);
      return {
        x,
        y,
        width,
        height,
        shape: lensShape,
      };
    }, [dragCurrent, dragStart, lensShape, lensSize, mode]);

    const toCanvasPoint = useCallback(
      (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x =
          ((event.clientX - rect.left) / rect.width) * (size.width || 1);
        const y =
          ((event.clientY - rect.top) / rect.height) * (size.height || 1);
        return { x, y };
      },
      [size.height, size.width],
    );

    const toImagePoint = useCallback(
      (point: { x: number; y: number }) => {
        if (!imageMetrics) return { x: point.x, y: point.y };
        return {
          x: clamp(
            (point.x - imageMetrics.offsetX) / imageMetrics.scale,
            0,
            effectiveImage?.naturalWidth ?? point.x,
          ),
          y: clamp(
            (point.y - imageMetrics.offsetY) / imageMetrics.scale,
            0,
            effectiveImage?.naturalHeight ?? point.y,
          ),
        };
      },
      [effectiveImage?.naturalHeight, effectiveImage?.naturalWidth, imageMetrics],
    );

    const computeSize = useCallback(() => {
      const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth ?? 1024;
      const containerHeight = containerRef.current?.clientHeight ?? window.innerHeight ?? 900;
      const maxWidth = Math.max(containerWidth - 24, 480);
      const maxHeight = Math.max(420, containerHeight - 40);

      if (effectiveImage) {
        const ratio = Math.min(
          maxWidth / effectiveImage.naturalWidth,
          maxHeight / effectiveImage.naturalHeight,
          1,
        );

        setSize({
          width: Math.max(420, Math.round(effectiveImage.naturalWidth * ratio)),
          height: Math.max(320, Math.round(effectiveImage.naturalHeight * ratio)),
        });
        return;
      }

      // Fallback size when no image is loaded (for text-on-blank workflows).
      // Target 1920x1080 canvas, scaled down to fit the viewport while preserving 16:9.
      const targetW = 1920;
      const targetH = 1080;
      let width = Math.min(maxWidth, targetW);
      let height = Math.round(width * (targetH / targetW));
      if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * (targetW / targetH));
      }
      setSize({
        width: Math.max(640, width),
        height: Math.max(360, height),
      });
    }, [effectiveImage]);

    const handlePointerDown = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (event.button === 2) event.preventDefault();
      const point = toCanvasPoint(event);

      // Text drag/resize hit-test.
      const textHit = texts
        .slice()
        .reverse()
        .find((t) => isWithinText(t, point));
      if (textHit && event.button === 0) {
        event.currentTarget.setPointerCapture(event.pointerId);
        setActiveTextId(textHit.id);
        textDragOffsetRef.current = {
          dx: point.x - textHit.x,
          dy: point.y - textHit.y,
        };
        onTextSelect(textHit);
        setEditingText(textHit.text);
        return;
      }
      if (textHit && event.button === 2) {
        const bounds = getTextBounds(textHit);
        setActiveTextId(textHit.id);
        onTextSelect(textHit);
        setEditingText(textHit.text);
    setTextResizeState({
      id: textHit.id,
      start: {
        x: textHit.x,
        y: textHit.y,
            width: bounds.width,
            height: bounds.height,
          },
          startPoint: point,
        });
        return;
      }

      // If clicking on an existing lens, start dragging it.
      const stickerHit = stickers
        .slice()
        .reverse()
        .find((s) => isWithinLens(s, point));
      if (stickerHit && event.button === 0) {
        setActiveStickerId(stickerHit.id);
        stickerDragOffsetRef.current = {
          dx: point.x - stickerHit.x,
          dy: point.y - stickerHit.y,
        };
        return;
      }
      if (stickerHit && event.button === 2) {
        setStickerResizeState({
          id: stickerHit.id,
          start: {
            x: stickerHit.x,
            y: stickerHit.y,
            width: stickerHit.width,
            height: stickerHit.height,
          },
          startPoint: point,
        });
        return;
      }

      const hit = lenses
        .slice()
        .reverse()
        .find((lens) => isWithinLens(lens, point));
      if (hit && event.button === 0) {
        setActiveLensId(hit.id);
        dragOffsetRef.current = {
          dx: point.x - hit.x,
          dy: point.y - hit.y,
        };
        return;
      }

      if (hit && event.button === 2) {
        setResizeState({
          id: hit.id,
          start: {
            x: hit.x,
            y: hit.y,
            width: hit.width,
            height: hit.height,
          },
          startPoint: point,
        });
        return;
      }

      if (!effectiveImage && mode !== "text") {
        setActiveTextId(null);
        setEditingText("");
        textDragOffsetRef.current = null;
        return;
      }
      // Clicking empty space clears active text selection (and stops placement for this click).
      if (!textHit && !stickerHit && !hit) {
        if (activeTextId) {
          setActiveTextId(null);
          setEditingText("");
          textDragOffsetRef.current = null;
          return;
        }
      }
      setDragStart(point);
      setDragCurrent(point);
    };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event);

      if (textResizeState) {
        const { start, startPoint, id } = textResizeState;
        const dx = point.x - startPoint.x;
        const dy = point.y - startPoint.y;
        const nextWidth = Math.max(30, start.width + dx);
        const nextHeight = Math.max(18, start.height + dy);
        const currentText = texts.find((t) => t.id === id);
        if (currentText) {
          const lines = currentText.text.split(/\r?\n/);
          const longest = lines.reduce((max, line) => Math.max(max, line.length), 1);
          const newSize = Math.max(
            10,
            Math.min(
              200,
              Math.min(nextWidth / Math.max(1, longest) / 0.6, nextHeight / 1.2 / lines.length),
            ),
          );
          onTextUpdate(id, { size: newSize });
        }
        return;
      }

    if (activeTextId && textDragOffsetRef.current) {
      const text = texts.find((t) => t.id === activeTextId);
      if (text) {
        const bounds = getTextBounds(text);
        const newX = clamp(
          point.x - textDragOffsetRef.current.dx,
            0,
            size.width - bounds.width,
          );
          const newY = clamp(
            point.y - textDragOffsetRef.current.dy,
            0,
            size.height - bounds.height,
          );
          onTextUpdate(text.id, { x: newX, y: newY });
        }
        return;
      }

      if (stickerResizeState && stickerImage) {
        const { start, startPoint, id } = stickerResizeState;
        const dx = point.x - startPoint.x;
        const dy = point.y - startPoint.y;
        const ratio =
          stickerImage.naturalWidth && stickerImage.naturalHeight
            ? stickerImage.naturalWidth / stickerImage.naturalHeight
            : 1;
        let newWidth = start.width + dx;
        let newHeight = newWidth / ratio;

        if (newHeight < start.height + dy) {
          newHeight = start.height + dy;
          newWidth = newHeight * ratio;
        }

        newWidth = clamp(newWidth, 40, size.width - start.x);
        newHeight = clamp(newHeight, 40, size.height - start.y);

        onStickerUpdate(id, { width: newWidth, height: newHeight });
        return;
      }

      if (activeStickerId && stickerDragOffsetRef.current) {
        const sticker = stickers.find((s) => s.id === activeStickerId);
        if (sticker) {
          const newX = clamp(
            point.x - stickerDragOffsetRef.current.dx,
            0,
            size.width - sticker.width,
          );
          const newY = clamp(
            point.y - stickerDragOffsetRef.current.dy,
            0,
            size.height - sticker.height,
          );
          onStickerUpdate(sticker.id, { x: newX, y: newY });
        }
        return;
      }

      if (resizeState) {
        const { start, startPoint, id } = resizeState;
        const dx = point.x - startPoint.x;
        const dy = point.y - startPoint.y;
        let newWidth = clamp(start.width + dx, 60, size.width - start.x);
        let newHeight = clamp(start.height + dy, 60, size.height - start.y);

        if (["circle"].includes(lenses.find((l) => l.id === id)?.shape ?? "")) {
          const unified = Math.min(
            Math.max(newWidth, newHeight),
            Math.min(size.width - start.x, size.height - start.y),
          );
          newWidth = unified;
          newHeight = unified;
        }

        onLensUpdate(id, { width: newWidth, height: newHeight });
        return;
      }

      if (activeLensId && dragOffsetRef.current) {
        const lens = lenses.find((l) => l.id === activeLensId);
        if (lens) {
          const newX = clamp(
            point.x - dragOffsetRef.current!.dx,
            0,
            size.width - lens.width,
          );
          const newY = clamp(
            point.y - dragOffsetRef.current!.dy,
            0,
            size.height - lens.height,
          );
          onLensUpdate(lens.id, {
            x: newX,
            y: newY,
            sourceX: lens.sourceX + (newX - lens.x),
            sourceY: lens.sourceY + (newY - lens.y),
          });
        }
        return;
      }

      if (!dragStart) return;
      setDragCurrent(point);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if not captured
      }
      if (textResizeState) {
        setTextResizeState(null);
        return;
      }

      // Clear text drag offset on pointer release so it doesn't follow cursor.
      textDragOffsetRef.current = null;

      if (stickerResizeState) {
        setStickerResizeState(null);
        return;
      }

      if (activeStickerId) {
        setActiveStickerId(null);
        stickerDragOffsetRef.current = null;
        return;
      }

      if (resizeState) {
        setResizeState(null);
        return;
      }

      if (activeLensId) {
        setActiveLensId(null);
        dragOffsetRef.current = null;
        return;
      }

      if (!dragStart) {
        textDragOffsetRef.current = null;
        return;
      }
      const end = dragCurrent ?? dragStart;
      let width = Math.abs(end.x - dragStart.x);
      let height = Math.abs(end.y - dragStart.y);
      const isClick = width < 8 && height < 8;

      if (mode === "text") {
        const content = textValue.trim();
        if (!content) {
          setDragStart(null);
          setDragCurrent(null);
          return;
        }
        const { width: estWidth, height: estHeight } = estimateTextBounds(
          content,
          textSize,
          textFont,
        );
        const x = clamp(
          (isClick ? dragStart.x - estWidth / 2 : Math.min(dragStart.x, end.x)),
          0,
          size.width - estWidth,
        );
        const y = clamp(
          (isClick ? dragStart.y - estHeight / 2 : Math.min(dragStart.y, end.y)),
          0,
          size.height - estHeight,
        );

        const id = crypto.randomUUID();
        const newText = {
          id,
          x,
          y,
          text: content,
          color: textColor,
          size: textSize,
          font: textFont,
        };
        onTextAdd(newText);
        onTextSelect(newText);
        setActiveTextId(id);
        textDragOffsetRef.current = null;
        setDragStart(null);
        setDragCurrent(null);
        return;
      }

      if (mode === "sticker" && stickerImage) {
        let width = Math.abs(end.x - dragStart.x);
        let height = Math.abs(end.y - dragStart.y);
        const isClick = width < 8 && height < 8;
        if (isClick) {
          width = lensSize;
          height = lensSize;
        }

        // Preserve sticker aspect ratio.
        const ratio =
          stickerImage.naturalWidth && stickerImage.naturalHeight
            ? stickerImage.naturalWidth / stickerImage.naturalHeight
            : 1;
        if (width / height > ratio) {
          width = height * ratio;
        } else {
          height = width / ratio;
        }

        // Use top-left when dragging, center when click-only.
        const x = isClick
          ? dragStart.x - width / 2
          : Math.min(dragStart.x, end.x);
        const y = isClick
          ? dragStart.y - height / 2
          : Math.min(dragStart.y, end.y);

        const clampedWidth = clamp(width, 40, size.width);
        const clampedHeight = clamp(height, 40, size.height);
        const clampedX = clamp(x, 0, size.width - clampedWidth);
        const clampedY = clamp(y, 0, size.height - clampedHeight);

        onStickerAdd({
          id: crypto.randomUUID(),
          x: clampedX,
          y: clampedY,
          width: clampedWidth,
          height: clampedHeight,
          image: stickerImage,
          shape: lensShape,
        });

        setDragStart(null);
        setDragCurrent(null);
        return;
      }

      let lens: Lens | null = null;

      if (mode === "magnify") {
        const widthHeight = Math.min(lensSize, size.width, size.height);
        const targetCenter = isClick
          ? {
              x: clamp(dragStart.x + widthHeight * 0.65, 0, size.width),
              y: clamp(dragStart.y - widthHeight * 0.25, 0, size.height),
            }
          : { x: end.x, y: end.y };
        const x = clamp(
          targetCenter.x - widthHeight / 2,
          0,
          size.width - widthHeight,
        );
        const y = clamp(
          targetCenter.y - widthHeight / 2,
          0,
          size.height - widthHeight,
        );
        const imagePoint = toImagePoint(dragStart);

        lens = {
          id: crypto.randomUUID(),
          x,
          y,
          width: widthHeight,
          height: widthHeight,
          sourceX: clamp(dragStart.x, 0, size.width),
          sourceY: clamp(dragStart.y, 0, size.height),
          sourceImageX: imagePoint.x,
          sourceImageY: imagePoint.y,
          shape: lensShape,
          mode,
          blur: blurAmount,
          magnification,
          createdAt: Date.now(),
        };
      } else {
        if (isClick) {
          width = lensSize;
          height = lensSize;
        }
        const x = isClick
          ? dragStart.x - width / 2
          : Math.min(dragStart.x, end.x);
        const y = isClick
          ? dragStart.y - height / 2
          : Math.min(dragStart.y, end.y);

        const clampedWidth = Math.min(width, size.width);
        const clampedHeight = Math.min(height, size.height);
        const clampedX = clamp(x, 0, size.width - clampedWidth);
        const clampedY = clamp(y, 0, size.height - clampedHeight);
        const imagePoint = toImagePoint({ x: clampedX + clampedWidth / 2, y: clampedY + clampedHeight / 2 });

        lens = {
          id: crypto.randomUUID(),
          x: clampedX,
          y: clampedY,
          width: clampedWidth,
          height: clampedHeight,
          sourceX: clampedX + clampedWidth / 2,
          sourceY: clampedY + clampedHeight / 2,
          sourceImageX: imagePoint.x,
          sourceImageY: imagePoint.y,
          shape: lensShape,
          mode,
          blur: blurAmount,
          magnification,
          createdAt: Date.now(),
        };
      }

      if (lens) onLensAdd(lens);
      setDragStart(null);
      setDragCurrent(null);
    };

    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      computeSize();
    }, [computeSize]);

  useEffect(() => {
    const observer = new ResizeObserver(computeSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [computeSize]);

    // Keep inline editor in sync with the selected text value.
    useEffect(() => {
      if (!activeTextId) return;
      setEditingText(textValue);
    }, [activeTextId, textValue]);

    // Allow escape to clear text selection quickly.
    useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setActiveTextId(null);
          setEditingText("");
          textDragOffsetRef.current = null;
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
      const backgroundColor =
        backgroundMode === "white"
          ? "#ffffff"
          : backgroundMode === "black"
            ? "#000000"
            : "#0a0a0a";

      renderScene({
        canvas: canvasRef.current,
        image: effectiveImage,
        lenses,
        stickers,
        texts,
        preview,
        width: size.width,
        height: size.height,
        backgroundColor,
        showPlaceholder: backgroundMode === "image",
      });
    }, [
      backgroundMode,
      effectiveImage,
      lenses,
      preview,
      size.height,
      size.width,
      stickers,
      texts,
    ]);

  // Live-update the selected text overlay when its controls change.
  useEffect(() => {
    if (!activeTextId) return;
    onTextUpdate(activeTextId, {
      text: textValue,
      color: textColor,
      size: textSize,
      font: textFont,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTextId, textColor, textFont, textSize, textValue]);

    return (
      <div
        ref={containerRef}
        className="relative flex w-full min-h-[75vh] flex-col overflow-hidden rounded-[22px] bg-[#0b0b0b] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/5"
      >
        <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-[#0b0b0b] p-4 ring-1 ring-white/5">
          <canvas
            ref={canvasRef}
            width={size.width}
            height={size.height}
            style={{
              width: `${size.width}px`,
              height: `${size.height}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            className="cursor-crosshair rounded-xl bg-[#0a0d15] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          />
        </div>
        {activeTextId && (
          <div className="mt-3 w-full max-w-md rounded-lg border border-white/10 bg-black/60 p-3 text-sm text-white backdrop-blur">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14rem] text-neutral-400">
              Edit selected text
            </div>
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                onTextUpdate(activeTextId, { text: e.target.value });
                const existing = texts.find((t) => t.id === activeTextId);
                if (existing) {
                  onTextSelect({ ...existing, text: e.target.value });
                }
              }}
              rows={3}
              className="w-full rounded-md border border-white/15 bg-[#0f0f0f] px-3 py-2 text-white outline-none focus:border-white/40"
              placeholder="Edit text"
            />
          </div>
        )}
      </div>
    );
  },
);

CanvasStage.displayName = "CanvasStage";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function getTextBounds(text: TextOverlay) {
  const { width, height, lineHeight, lines } = estimateTextBounds(
    text.text,
    text.size,
    text.font,
  );
  return { width, height, lineHeight, lines };
}

function isWithinLens(
  lens: { x: number; y: number; width: number; height: number; shape: string },
  point: { x: number; y: number },
) {
  const withinRect =
    point.x >= lens.x &&
    point.x <= lens.x + lens.width &&
    point.y >= lens.y &&
    point.y <= lens.y + lens.height;

  if (!withinRect) return false;
  if (lens.shape === "rounded") return true;

  // circle/ellipse hit test
  const rx = lens.width / 2;
  const ry = lens.height / 2;
  const cx = lens.x + rx;
  const cy = lens.y + ry;
  const norm =
    Math.pow(point.x - cx, 2) / Math.pow(rx, 2) +
    Math.pow(point.y - cy, 2) / Math.pow(ry, 2);
  return norm <= 1;
}

function isWithinText(text: TextOverlay, point: { x: number; y: number }) {
  const bounds = getTextBounds(text);
  return (
    point.x >= text.x &&
    point.x <= text.x + bounds.width &&
    point.y >= text.y &&
    point.y <= text.y + bounds.height
  );
}

export default CanvasStage;
