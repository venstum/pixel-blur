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
  onModeChange: (mode: Mode) => void;
  onLensShapeChange: (shape: LensShape) => void;
  onLensSizeChange: (size: number) => void;
  onBlurAmountChange: (amount: number) => void;
  onMagnificationChange: (amount: number) => void;
  onReset: () => void;
  onSave: () => void;
  onFilePicked: (file: File) => void;
  onStickerPicked: (file: File) => void;
};

const modes: Mode[] = ["blur", "magnify", "sticker"];
const shapes: LensShape[] = ["circle", "rounded"];

export function ControlPanel({
  mode,
  lensShape,
  lensSize,
  blurAmount,
  magnification,
  canSave,
  onModeChange,
  onLensShapeChange,
  onLensSizeChange,
  onBlurAmountChange,
  onMagnificationChange,
  onReset,
  onSave,
  onFilePicked,
  onStickerPicked,
}: ControlPanelProps) {
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
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#111] text-white">
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
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

export default ControlPanel;
