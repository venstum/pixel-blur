import { Lens, LensPreview, Sticker, TextOverlay } from "./types";

type RenderArgs = {
  canvas: HTMLCanvasElement | null;
  image: HTMLImageElement | null;
  lenses: Lens[];
  stickers: Sticker[];
  texts: TextOverlay[];
  preview: LensPreview | null;
  width: number;
  height: number;
  backgroundColor: string;
  showPlaceholder: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// renderScene paints the base image, stickers, lenses, and drag preview.
export function renderScene({
  canvas,
  image,
  lenses,
  stickers,
  texts,
  preview,
  width,
  height,
  backgroundColor,
  showPlaceholder,
}: RenderArgs) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);

  let draw = null as
    | { offsetX: number; offsetY: number; drawWidth: number; drawHeight: number; scale: number }
    | null;

  if (image) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;
    draw = { offsetX, offsetY, drawWidth, drawHeight, scale };
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight,
    );
  } else {
    drawPlaceholder(ctx, width, height, backgroundColor, showPlaceholder);
  }

  // Stickers sit above the base image.
  if (draw) {
    stickers.forEach((sticker) => drawSticker(ctx, sticker));
  }

  // Text sits above stickers but below lenses.
  texts.forEach((text) => drawText(ctx, text));

  // Draw connectors behind lenses.
  lenses
    .filter((lens) => lens.mode === "magnify")
    .forEach((lens) => {
      if (draw) drawConnector(ctx, lens, draw);
    });

  // Draw lenses above connectors.
  lenses.forEach((lens) => drawLens(ctx, image, width, height, lens, draw));

  if (preview) {
    drawPreview(ctx, preview);
  }
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string,
  showPlaceholder: boolean,
) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  if (!showPlaceholder) return;

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "700 24px var(--font-terminus, 'Inter', sans-serif)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("OPEN AN IMAGE TO START EDITING.", width / 2, height / 2);
}

function drawLens(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  canvasWidth: number,
  canvasHeight: number,
  lens: Lens,
  draw:
    | {
        offsetX: number;
        offsetY: number;
        drawWidth: number;
        drawHeight: number;
        scale: number;
      }
    | null,
) {
  if (!image || !draw) return;

  ctx.save();
  const radius = Math.min(lens.width, lens.height) * 0.2;
  drawShape(ctx, lens, radius);
  ctx.clip();

  if (lens.mode === "blur") {
    ctx.filter = `blur(${lens.blur}px)`;
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      draw.offsetX,
      draw.offsetY,
      draw.drawWidth,
      draw.drawHeight,
    );
    ctx.filter = "none";
  } else {
    const centerX = lens.x + lens.width / 2;
    const centerY = lens.y + lens.height / 2;
    const sourceDisplayX = draw.offsetX + lens.sourceImageX * draw.scale;
    const sourceDisplayY = draw.offsetY + lens.sourceImageY * draw.scale;
    ctx.translate(centerX, centerY);
    ctx.scale(clamp(lens.magnification, 1, 4), clamp(lens.magnification, 1, 4));
    ctx.translate(-sourceDisplayX, -sourceDisplayY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      draw.offsetX,
      draw.offsetY,
      draw.drawWidth,
      draw.drawHeight,
    );
  }

  ctx.restore();

  ctx.save();
  if (lens.mode === "magnify") {
    drawGlassOverlay(ctx, lens, radius);
  }

  ctx.restore();
}

function drawConnector(
  ctx: CanvasRenderingContext2D,
  lens: Lens,
  draw: {
    offsetX: number;
    offsetY: number;
    drawWidth: number;
    drawHeight: number;
    scale: number;
  },
) {
  const targetX = lens.x + lens.width / 2;
  const targetY = lens.y + lens.height / 2;
  const sourceX = draw.offsetX + lens.sourceImageX * draw.scale;
  const sourceY = draw.offsetY + lens.sourceImageY * draw.scale;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const endWidth = Math.min(lens.width * 0.12, 16);
  const startWidth = 4;

  const start1 = { x: sourceX + nx * startWidth, y: sourceY + ny * startWidth };
  const start2 = { x: sourceX - nx * startWidth, y: sourceY - ny * startWidth };
  const end1 = { x: targetX + nx * endWidth, y: targetY + ny * endWidth };
  const end2 = { x: targetX - nx * endWidth, y: targetY - ny * endWidth };

  const gradient = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.16)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.08)");

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(start1.x, start1.y);
  ctx.lineTo(end1.x, end1.y);
  ctx.lineTo(end2.x, end2.y);
  ctx.lineTo(start2.x, start2.y);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.arc(sourceX, sourceY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawGlassOverlay(ctx: CanvasRenderingContext2D, lens: Lens, radius: number) {
  const cx = lens.x + lens.width / 2;
  const cy = lens.y + lens.height / 2;
  const gradient = ctx.createRadialGradient(
    cx - lens.width * 0.2,
    cy - lens.height * 0.2,
    lens.width * 0.05,
    cx,
    cy,
    lens.width * 0.7,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.2)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.05)");
  gradient.addColorStop(1, "rgba(255,255,255,0.01)");

  ctx.save();
  drawShape(ctx, lens, radius);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(lens.x, lens.y, lens.width, lens.height);
  ctx.restore();
}

function drawSticker(ctx: CanvasRenderingContext2D, sticker: Sticker) {
  ctx.save();
  const radius = Math.min(sticker.width, sticker.height) * 0.2;
  drawShape(ctx, sticker, radius);
  ctx.clip();
  ctx.drawImage(
    sticker.image,
    0,
    0,
    sticker.image.naturalWidth,
    sticker.image.naturalHeight,
    sticker.x,
    sticker.y,
    sticker.width,
    sticker.height,
  );
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: TextOverlay) {
  ctx.save();
  ctx.fillStyle = text.color;
  const safeFont = text.font.includes(" ") ? `'${text.font}'` : text.font;
  ctx.font = `${text.size}px ${safeFont}, Terminus, monospace`;
  ctx.textBaseline = "top";

  const lines = text.text.split(/\r?\n/);
  const lineHeight = text.size * 1.2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, text.x, text.y + idx * lineHeight);
  });
  ctx.restore();
}

function drawPreview(ctx: CanvasRenderingContext2D, preview: LensPreview) {
  const radius = Math.min(preview.width, preview.height) * 0.2;
  ctx.save();
  ctx.strokeStyle = "rgba(154, 246, 227, 0.65)";
  ctx.fillStyle = "rgba(154, 246, 227, 0.08)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 6]);
  drawShape(ctx, preview, radius);
  ctx.fill();
  drawShape(ctx, preview, radius);
  ctx.stroke();
  ctx.restore();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  lens: { x: number; y: number; width: number; height: number; shape: string },
  radius: number,
) {
  ctx.beginPath();
  if (lens.shape === "circle") {
    ctx.ellipse(
      lens.x + lens.width / 2,
      lens.y + lens.height / 2,
      lens.width / 2,
      lens.height / 2,
      0,
      0,
      Math.PI * 2,
    );
  } else {
    const r = clamp(radius, 8, Math.min(lens.width, lens.height) / 2);
    roundedRect(ctx, lens.x, lens.y, lens.width, lens.height, r);
  }
  ctx.closePath();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
