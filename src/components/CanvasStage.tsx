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
} from "@/lib/types";
import { renderScene } from "@/lib/canvas";

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
  onStickerAdd: (sticker: Sticker) => void;
  onStickerUpdate: (id: string, sticker: Partial<Sticker>) => void;
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
    const imageMetrics = useMemo(() => {
      if (!image) return null;
      const scale = Math.min(
        size.width / image.naturalWidth,
        size.height / image.naturalHeight,
      );
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const offsetX = (size.width - drawWidth) / 2;
      const offsetY = (size.height - drawHeight) / 2;
      return { scale, offsetX, offsetY, drawWidth, drawHeight };
    }, [image, size.height, size.width]);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    const preview: LensPreview | null = useMemo(() => {
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
            image?.naturalWidth ?? point.x,
          ),
          y: clamp(
            (point.y - imageMetrics.offsetY) / imageMetrics.scale,
            0,
            image?.naturalHeight ?? point.y,
          ),
        };
      },
      [image?.naturalHeight, image?.naturalWidth, imageMetrics],
    );

    const computeSize = useCallback(() => {
      if (!image) return;
      const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth ?? 1024;
      const maxWidth = Math.max(containerWidth - 24, 480);
      const maxHeight = Math.min(
        typeof window !== "undefined" ? window.innerHeight - 180 : 900,
        1000,
      );
      const ratio = Math.min(
        maxWidth / image.naturalWidth,
        maxHeight / image.naturalHeight,
        1,
      );

      setSize({
        width: Math.max(420, Math.round(image.naturalWidth * ratio)),
        height: Math.max(320, Math.round(image.naturalHeight * ratio)),
      });
    }, [image]);

    const handlePointerDown = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (event.button === 2) event.preventDefault();
      const point = toCanvasPoint(event);

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

      if (!image) return;
      setDragStart(point);
      setDragCurrent(point);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = toCanvasPoint(event);

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

    const handlePointerUp = () => {
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

      if (!dragStart) return;
      const end = dragCurrent ?? dragStart;
      let width = Math.abs(end.x - dragStart.x);
      let height = Math.abs(end.y - dragStart.y);
      const isClick = width < 8 && height < 8;

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

    useEffect(() => {
      renderScene({
        canvas: canvasRef.current,
        image,
        lenses,
        stickers,
        preview,
        width: size.width,
        height: size.height,
      });
    }, [image, lenses, preview, size.height, size.width, stickers]);

    return (
      <div
        ref={containerRef}
        className="relative w-full min-h-[70vh] overflow-hidden rounded-[22px] bg-[#0b0b0b] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/5"
      >
        <div className="relative flex w-full items-center justify-center rounded-2xl bg-[#0b0b0b] p-4 ring-1 ring-white/5">
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
      </div>
    );
  },
);

CanvasStage.displayName = "CanvasStage";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

export default CanvasStage;
