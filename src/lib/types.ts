export type Mode = "blur" | "magnify" | "sticker";

export type LensShape = "circle" | "rounded";

export type Lens = {
  id: string;
  x: number; // top-left of lens display
  y: number;
  width: number;
  height: number;
  sourceX: number; // canvas coordinate used for connector + preview
  sourceY: number;
  sourceImageX: number; // source point in image coordinates
  sourceImageY: number;
  mode: Mode;
  shape: LensShape;
  blur: number;
  magnification: number;
  createdAt: number;
};

export type LensPreview = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: LensShape;
};

export type StageHandle = {
  getCanvas: () => HTMLCanvasElement | null;
};

export type Sticker = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: HTMLImageElement;
  shape: LensShape;
};
