"use client";

import { ChangeEvent, useId } from "react";
import { LensShape, Mode } from "@/lib/types";

// Sidebar controls for mode selection, file loading, and lens/sticker settings.
type ControlPanelProps = {
  mode: Mode;
  lensShape: LensShape;
  lensSize: number;
  blurAmount: number;
  magnification: number;
  canSave: boolean;
  textValue: string;
  textColor: string;
  textSize: number;
  textFont: string;
  backgroundMode: "black" | "white" | "image";
  onModeChange: (mode: Mode) => void;
  onLensShapeChange: (shape: LensShape) => void;
  onLensSizeChange: (size: number) => void;
  onBlurAmountChange: (amount: number) => void;
  onMagnificationChange: (amount: number) => void;
  onTextChange: (value: string) => void;
  onTextColorChange: (value: string) => void;
  onTextSizeChange: (value: number) => void;
  onBackgroundModeChange: (value: "black" | "white" | "image") => void;
  onReset: () => void;
  onSave: () => void;
  onFilePicked: (file: File) => void;
  onStickerPicked: (file: File) => void;
};

const modes: Mode[] = ["blur", "magnify", "sticker", "text"];
const shapes: LensShape[] = ["circle", "rounded"];

export function ControlPanel({
  mode,
  lensShape,
  lensSize,
  blurAmount,
  magnification,
  canSave,
  textValue,
  textColor,
  textSize,
  textFont,
  backgroundMode,
  onModeChange,
  onLensShapeChange,
  onLensSizeChange,
  onBlurAmountChange,
  onMagnificationChange,
  onTextChange,
  onTextColorChange,
  onTextSizeChange,
  onBackgroundModeChange,
  onReset,
  onSave,
  onFilePicked,
  onStickerPicked,
}: ControlPanelProps) {
  // Fixed to Terminus only; no font search.
  const inputId = useId();
  const stickerInputId = useId();

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFilePicked(file);
      event.target.value = "";
    }
  };

  const handleStickerFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onStickerPicked(file);
      event.target.value = "";
    }
  };

  return (
    <aside className="sidebar-panel">
      <p className="text-[11px] uppercase tracking-[0.32rem] text-neutral-500">
        Pixel Blur
      </p>

      <Section title="Mode">
        <Select
          value={mode}
          onChange={(value) => onModeChange(value as Mode)}
          options={modes}
        />
      </Section>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => document.getElementById(inputId)?.click()}
          className="control-button control-compact"
        >
          Open Image
        </button>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <button onClick={onReset} className="control-button control-compact">
          Reset
        </button>
        <button
          onClick={onSave}
          className="control-button control-compact disabled:opacity-50"
          disabled={!canSave}
        >
          Save As
        </button>
      </div>

      {mode === "sticker" && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-[0.18rem] text-neutral-500">
            Sticker
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => document.getElementById(stickerInputId)?.click()}
              className="control-button control-compact"
            >
              Open Sticker
            </button>
            <input
              id={stickerInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleStickerFile}
            />
          </div>
        </div>
      )}

      <Section title={mode === "sticker" ? "Sticker Shape" : "Shape"}>
        <Select
          value={lensShape}
          onChange={(value) => onLensShapeChange(value as LensShape)}
          options={shapes}
        />
      </Section>

      <Section title={mode === "sticker" ? "Sticker Size" : "Lens Size"}>
        <Slider
          value={lensSize}
          onChange={onLensSizeChange}
          min={80}
          max={420}
          step={10}
          label={`${Math.round(lensSize)} px`}
        />
      </Section>

      {mode === "blur" && (
        <Section title="Blur Strength">
          <Slider
            value={blurAmount}
            onChange={onBlurAmountChange}
            min={2}
            max={30}
            step={1}
            label={`${blurAmount}px`}
          />
        </Section>
      )}

      {mode === "magnify" && (
        <Section title="Magnification">
          <Slider
            value={magnification}
            onChange={onMagnificationChange}
            min={1}
            max={4}
            step={0.1}
            label={`${magnification.toFixed(1)}x`}
          />
        </Section>
      )}

      {mode === "text" && (
        <>
          <Section title="Text">
            <textarea
              value={textValue}
                  onChange={(e) => onTextChange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  placeholder="Enter text"
                  rows={3}
                />
              </Section>
          <Section title="Text Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColor}
                onChange={(e) => onTextColorChange(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-white/15 bg-transparent p-1"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => onTextColorChange(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              />
            </div>
            <RgbPicker value={textColor} onChange={onTextColorChange} />
          </Section>
          <Section title="Text Font">
            <div className="rounded-lg border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white">
              {textFont} (fixed)
            </div>
          </Section>
          <Section title="Text Size">
            <Slider
              value={textSize}
              onChange={onTextSizeChange}
              min={12}
              max={72}
              step={1}
              label={`${textSize}px`}
            />
          </Section>
        </>
      )}

      <Section title="Background">
        <Select
          value={backgroundMode}
          onChange={(value) =>
            onBackgroundModeChange(value as "black" | "white" | "image")
          }
          options={["image", "black", "white"]}
        />
      </Section>

    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-[0.18rem] text-neutral-500">
        {title}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-compact"
      >
        {options.map((option) => {
          const label = option.charAt(0).toUpperCase() + option.slice(1);
          return (
            <option key={option} value={option} className="bg-[#111] text-white">
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  step,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px] text-neutral-300">
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-input flex-1 max-w-[160px]"
        />
      </div>
    </div>
  );
}

function RgbPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const hexToRgb = (hex: string) => {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  };

  const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
      .join("")}`;

  const rgb = hexToRgb(value || "#ffffff");

  const update = (channel: "r" | "g" | "b", val: number) => {
    const next = { ...rgb, [channel]: val };
    onChange(toHex(next.r, next.g, next.b));
  };

  return (
    <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-[#0f0f0f] p-3">
      {(["r", "g", "b"] as const).map((channel) => (
        <div key={channel} className="flex items-center gap-2 text-xs text-neutral-300">
          <span className="w-6 uppercase">{channel}</span>
          <input
            type="range"
            min={0}
            max={255}
            value={rgb[channel]}
            onChange={(e) => update(channel, Number(e.target.value))}
            className="range-input flex-1"
          />
          <span className="w-10 text-right tabular-nums">{rgb[channel]}</span>
        </div>
      ))}
    </div>
  );
}

export default ControlPanel;
