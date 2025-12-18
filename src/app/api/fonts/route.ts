import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const ALLOWED_EXTS = new Set([".ttf", ".otf"]);

export async function GET() {
  try {
    if (!fs.existsSync(FONT_DIR)) {
      return NextResponse.json({ fonts: [] });
    }

    const files = fs.readdirSync(FONT_DIR);
    const fonts = files
      .filter((file) => ALLOWED_EXTS.has(path.extname(file).toLowerCase()))
      .map((file) => {
        const fullPath = path.join(FONT_DIR, file);
        const data = fs.readFileSync(fullPath);
        const ext = path.extname(file).toLowerCase();
        const name = path.basename(file, ext);
        const mime = ext === ".otf" ? "font/otf" : "font/ttf";
        const dataUrl = `data:${mime};base64,${data.toString("base64")}`;
        return { name, dataUrl };
      });

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error("Failed to read fonts:", error);
    return NextResponse.json({ fonts: [] });
  }
}
