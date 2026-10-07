/**
 * Raster emitters: character grid → SVG, PNG, or plain text.
 *
 * SVG keeps the film as *text* — every mark is a real glyph positioned on a
 * grid and coloured from the palette. That is why an ASCII film can be
 * diffed, versioned and reviewed like source.
 */

import { paletteFor, inkColor, GLYPH_W, GLYPH_H, glyphRows } from './renderer.js';

const FONT_STACK =
  "'SFMono-Regular', 'SF Mono', Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";

/**
 * @param {import('./renderer.js').Grid} grid
 * @param {{palette?:string, cellW?:number, cellH?:number, title?:string, fontSize?:number}} [opts]
 * @returns {string} SVG document
 */
export function gridToSvg(grid, opts = {}) {
  const cellW = opts.cellW ?? 9;
  const cellH = opts.cellH ?? 16;
  const pal = paletteFor(opts.palette ?? 'brutalist-digital');
  const fontSize = opts.fontSize ?? cellH * 1.06;
  const w = grid.cols * cellW;
  const h = grid.rows * cellH;

  // Group cells by (layer, quantised weight) so the file stays small and the
  // structure of the image is legible in the source.
  const buckets = new Map();
  for (const c of grid.cells()) {
    const key = `${c.layer}:${Math.round(c.weight * 7)}`;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push(c);
  }

  const paths = [];
  for (const [key, cells] of [...buckets.entries()].sort()) {
    const [layerStr, qStr] = key.split(':');
    const weight = Number(qStr) / 7;
    const color = inkColor(pal, { layer: Number(layerStr), weight });
    const hex = `#${color.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    let d = '';
    for (const c of cells) {
      // Emit the real glyph outline as rects so the SVG holds no font
      // dependency; the mark is the character, not a text node.
      const rows = glyphRows(c.code);
      const x0 = c.x * cellW;
      const y0 = c.y * cellH;
      const px = cellW / GLYPH_W;
      const py = cellH / GLYPH_H;
      for (let gy = 0; gy < GLYPH_H; gy++) {
        const mask = rows[gy];
        let runStart = -1;
        for (let gx = 0; gx <= GLYPH_W; gx++) {
          const on = gx < GLYPH_W && (mask & (1 << (GLYPH_W - 1 - gx))) !== 0;
          if (on && runStart < 0) runStart = gx;
          if (!on && runStart >= 0) {
            const rx = (x0 + runStart * px).toFixed(1);
            const ry = (y0 + gy * py).toFixed(1);
            const rw = ((gx - runStart) * px).toFixed(1);
            const rh = py.toFixed(1);
            d += `M${rx} ${ry}h${rw}v${rh}h-${rw}z`;
            runStart = -1;
          }
        }
      }
    }
    if (d) paths.push(`  <path fill="${hex}" fill-opacity="${weight.toFixed(3)}" d="${d}"/>`);
  }

  const title = opts.title ? `<title>${escapeXml(opts.title)}</title>` : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">`,
    `  <desc>ASCII H3 Director — deterministic character raster. ${grid.cols}×${grid.rows} cells.</desc>`,
    title,
    `  <rect width="${w}" height="${h}" fill="${pal.bg}"/>`,
    ...paths,
    '</svg>',
    '',
  ].filter(Boolean).join('\n');
}

/**
 * Render a grid to raw RGB using the same glyph bitmaps as the SVG path, so
 * PNG and SVG agree pixel for pixel in structure.
 *
 * @param {import('./renderer.js').Grid} grid
 * @param {{palette?:string, cellW?:number, cellH?:number}} [opts]
 * @returns {{width:number, height:number, rgb:Uint8Array}}
 */
export function gridToRgb(grid, opts = {}) {
  const cellW = opts.cellW ?? 9;
  const cellH = opts.cellH ?? 16;
  const pal = paletteFor(opts.palette ?? 'brutalist-digital');
  const bg = hexToRgbLocal(pal.bg);
  const width = grid.cols * cellW;
  const height = grid.rows * cellH;
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = bg[0];
    rgb[i * 3 + 1] = bg[1];
    rgb[i * 3 + 2] = bg[2];
  }
  const px = cellW / GLYPH_W;
  const py = cellH / GLYPH_H;
  for (const c of grid.cells()) {
    const color = inkColor(pal, { layer: c.layer, weight: c.weight });
    const rows = glyphRows(c.code);
    const x0 = c.x * cellW;
    const y0 = c.y * cellH;
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const mask = rows[gy];
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (!(mask & (1 << (GLYPH_W - 1 - gx)))) continue;
        const sx = Math.floor(x0 + gx * px);
        const sy = Math.floor(y0 + gy * py);
        const ex = Math.floor(x0 + (gx + 1) * px);
        const ey = Math.floor(y0 + (gy + 1) * py);
        for (let y = sy; y < ey; y++) {
          if (y < 0 || y >= height) continue;
          for (let x = sx; x < ex; x++) {
            if (x < 0 || x >= width) continue;
            const o = (y * width + x) * 3;
            rgb[o] = color[0];
            rgb[o + 1] = color[1];
            rgb[o + 2] = color[2];
          }
        }
      }
    }
  }
  return { width, height, rgb };
}

/** Plain-text frame with trailing spaces trimmed. */
export function gridToText(grid) {
  return grid.toText();
}

function hexToRgbLocal(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (ch) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[ch]);
}
