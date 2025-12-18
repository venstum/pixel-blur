"use client";

import { useEffect, useRef, useState } from "react";
import CanvasStage from "@/components/CanvasStage";
import ControlPanel from "@/components/ControlPanel";
import {
  Lens,
  LensShape,
  Mode,
  StageHandle,
  Sticker,
  TextOverlay,
} from "@/lib/types";

const fallbackImage = "";

export default function Home() {
  // Central app state: current image, overlays, and undo history.
  const [imageSrc, setImageSrc] = useState<string>(fallbackImage);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stickerSrc, setStickerSrc] = useState<string | null>(null);
  const [stickerImage, setStickerImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>("blur");
  const [lensShape, setLensShape] = useState<LensShape>("circle");
  const [lensSize, setLensSize] = useState(320);
  const [blurAmount, setBlurAmount] = useState(12);
  const [magnification, setMagnification] = useState(2);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [textValue, setTextValue] = useState("Sample text");
  const [textColor, setTextColor] = useState("#f5f5f5");
  const [textSize, setTextSize] = useState(28);
  const textFont = "Terminus";
  const [backgroundMode, setBackgroundMode] = useState<"black" | "white" | "image">("image");
  const stageRef = useRef<StageHandle>(null);
  const historyRef = useRef<{ lenses: Lens[]; stickers: Sticker[]; texts: TextOverlay[] }[]>([]);
  const isUndoingRef = useRef(false);

  const pushHistory = (
    lensSnapshot: Lens[],
    stickerSnapshot: Sticker[],
    textSnapshot: TextOverlay[],
  ) => {
    if (isUndoingRef.current) return;
    const trimmed = historyRef.current.slice(-49);
    trimmed.push({
      lenses: lensSnapshot.map((l) => ({ ...l })),
      stickers: stickerSnapshot.map((s) => ({ ...s })),
      texts: textSnapshot.map((t) => ({ ...t })),
    });
    historyRef.current = trimmed;
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;
    isUndoingRef.current = true;
    setLenses(snapshot.lenses);
    setStickers(snapshot.stickers);
    setTexts(snapshot.texts);
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
  };

  useEffect(() => {
    if (!imageSrc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!stickerSrc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStickerImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setStickerImage(img);
    img.src = stickerSrc;
  }, [stickerSrc]);

  // Using local Terminus font only; skip dynamic font fetching.

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleLensAdd = (lens: Lens) => {
    pushHistory(lenses, stickers, texts);
    setLenses((prev) => [...prev, lens]);
  };

  const handleFilePicked = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageSrc(result);
      setLenses([]);
      setStickers([]);
      setTexts([]);
      historyRef.current = [];
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    pushHistory(lenses, stickers, texts);
    setLenses([]);
    setStickers([]);
    setTexts([]);
    setStickerSrc((prev) => prev); // keep sticker source
  };

  const handleSave = () => {
    const canvas = stageRef.current?.getCanvas();
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "pixel-blur.png";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleStickerPicked = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setStickerSrc(result);
      historyRef.current = [];
    };
    reader.readAsDataURL(file);
  };

  const handleStickerAdd = (sticker: Sticker) => {
    pushHistory(lenses, stickers, texts);
    setStickers((prev) => [...prev, sticker]);
  };

  const handleTextAdd = (text: TextOverlay) => {
    if (!text.text.trim()) return;
    pushHistory(lenses, stickers, texts);
    setTexts((prev) => [...prev, text]);
  };

  const handleTextSelect = (text: TextOverlay) => {
    setTextValue(text.text);
    setTextColor(text.color);
    setTextSize(text.size);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.05),transparent_22%),#050505] text-white">
      <div className="flex min-h-screen w-full flex-col gap-6 px-6 py-8 lg:flex-row lg:items-start lg:gap-10 lg:px-10">
        <div className="w-full max-w-[340px] shrink-0 self-start lg:sticky lg:top-8">
          <ControlPanel
            mode={mode}
            lensShape={lensShape}
            lensSize={lensSize}
            blurAmount={blurAmount}
            magnification={magnification}
            canSave={Boolean(image)}
            textValue={textValue}
            textColor={textColor}
            textSize={textSize}
            textFont={textFont}
            backgroundMode={backgroundMode}
            onModeChange={setMode}
            onLensShapeChange={setLensShape}
            onLensSizeChange={setLensSize}
            onBlurAmountChange={setBlurAmount}
            onMagnificationChange={setMagnification}
            onTextChange={setTextValue}
            onTextColorChange={setTextColor}
            onTextSizeChange={setTextSize}
            onBackgroundModeChange={setBackgroundMode}
            onFilePicked={handleFilePicked}
            onStickerPicked={handleStickerPicked}
            onReset={handleReset}
            onSave={handleSave}
          />
        </div>

        <div className="flex flex-1 min-w-0 items-start justify-center">
          <CanvasStage
            ref={stageRef}
            image={image}
            lenses={lenses}
            stickers={stickers}
            texts={texts}
            stickerImage={stickerImage}
            mode={mode}
            lensShape={lensShape}
            lensSize={lensSize}
            blurAmount={blurAmount}
            magnification={magnification}
            textValue={textValue}
            textColor={textColor}
            textSize={textSize}
            textFont={textFont}
            backgroundMode={backgroundMode}
            onTextSelect={handleTextSelect}
            onLensAdd={handleLensAdd}
            onLensUpdate={(id, payload) =>
              setLenses((prev) => {
                pushHistory(prev, stickers, texts);
                return prev.map((lens) =>
                  lens.id === id ? { ...lens, ...payload } : lens,
                );
              })
            }
            onStickerAdd={handleStickerAdd}
            onStickerUpdate={(id, payload) =>
              setStickers((prev) => {
                pushHistory(lenses, prev, texts);
                return prev.map((sticker) =>
                  sticker.id === id ? { ...sticker, ...payload } : sticker,
                );
              })
            }
            onTextAdd={handleTextAdd}
            onTextUpdate={(id, payload) =>
              setTexts((prev) => {
                pushHistory(lenses, stickers, prev);
                return prev.map((text) =>
                  text.id === id ? { ...text, ...payload } : text,
                );
              })
            }
          />
        </div>
      </div>
    </main>
  );
}
