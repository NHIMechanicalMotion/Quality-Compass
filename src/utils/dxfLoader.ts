import type { RawTextToken } from './cadOcrParser';

export interface DxfDocumentInfo {
  dataUrl: string;
  width: number;
  height: number;
  tokens: RawTextToken[];
  rawEntitiesCount: number;
  layers: string[];
  filename?: string;
  units: 'mm' | 'inch';
}

export type ParsedDxfDocument = DxfDocumentInfo;

export interface DxfEntity {
  type: string;
  layer: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x3?: number;
  y3?: number;
  x4?: number;
  y4?: number;
  cx?: number;
  cy?: number;
  r?: number;
  startAngle?: number;
  endAngle?: number;
  vertices?: { x: number; y: number }[];
  closed?: boolean;
  text?: string;
  height?: number;
  blockName?: string;
  insX?: number;
  insY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  isDimBlockSubEntity?: boolean;
}

export interface DxfBlock {
  name: string;
  baseX: number;
  baseY: number;
  entities: DxfEntity[];
}

export interface SynthesizedDimensionToken {
  text: string;
  x: number;
  y: number;
  height: number;
}

/**
 * Decodes AutoCAD DXF formatting codes
 * e.g. %%c -> Ø, %%p -> ±, %%d -> °, \P -> newline, and removes MTEXT style codes
 */
export function cleanDxfText(raw: string): string {
  if (!raw) return '';

  return raw
    .replace(/%%c/gi, 'Ø')
    .replace(/%%p/gi, '±')
    .replace(/%%d/gi, '°')
    .replace(/\uFFFD(?=\s*\.?\d)/g, '±') // Replace corrupted Windows-1252 byte with ±
    .replace(/\uFFFD/g, '°') // Any remaining replacement character -> °
    .replace(/\\P/gi, ' ') // newline in MTEXT
    .replace(/\\~|\\/g, ' ')
    .replace(/\{|\}/g, '')
    .replace(/\\[A-Za-z0-9]+;?/g, '') // strip font/color/alignment control codes e.g. \A1; \H0.18;
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Helper to parse entity attributes by DXF group code
 */
function parseEntityAttr(
  ent: Partial<DxfEntity>,
  code: number,
  val: string,
  layerSet: Set<string>
) {
  if (code === 8) {
    ent.layer = val;
    layerSet.add(val);
  }

  if (code === 2) ent.blockName = val;

  switch (ent.type) {
    case 'LINE':
      if (code === 10) ent.x1 = parseFloat(val);
      if (code === 20) ent.y1 = parseFloat(val);
      if (code === 11) ent.x2 = parseFloat(val);
      if (code === 21) ent.y2 = parseFloat(val);
      break;

    case 'SOLID':
    case 'TRACE':
      if (code === 10) ent.x1 = parseFloat(val);
      if (code === 20) ent.y1 = parseFloat(val);
      if (code === 11) ent.x2 = parseFloat(val);
      if (code === 21) ent.y2 = parseFloat(val);
      if (code === 12) ent.x3 = parseFloat(val);
      if (code === 22) ent.y3 = parseFloat(val);
      if (code === 13) ent.x4 = parseFloat(val);
      if (code === 23) ent.y4 = parseFloat(val);
      break;

    case 'LWPOLYLINE':
    case 'POLYLINE':
      if (code === 70) ent.closed = parseInt(val, 10) === 1;
      if (code === 10) {
        if (!ent.vertices) ent.vertices = [];
        ent.vertices.push({ x: parseFloat(val), y: 0 });
      }
      if (code === 20 && ent.vertices && ent.vertices.length > 0) {
        ent.vertices[ent.vertices.length - 1].y = parseFloat(val);
      }
      break;

    case 'CIRCLE':
      if (code === 10) ent.cx = parseFloat(val);
      if (code === 20) ent.cy = parseFloat(val);
      if (code === 40) ent.r = parseFloat(val);
      break;

    case 'ARC':
      if (code === 10) ent.cx = parseFloat(val);
      if (code === 20) ent.cy = parseFloat(val);
      if (code === 40) ent.r = parseFloat(val);
      if (code === 50) ent.startAngle = (parseFloat(val) * Math.PI) / 180;
      if (code === 51) ent.endAngle = (parseFloat(val) * Math.PI) / 180;
      break;

    case 'TEXT':
      if (code === 10) ent.x1 = parseFloat(val);
      if (code === 20) ent.y1 = parseFloat(val);
      if (code === 40) ent.height = parseFloat(val);
      if (code === 1) ent.text = val;
      break;

    case 'MTEXT':
      if (code === 10) ent.x1 = parseFloat(val);
      if (code === 20) ent.y1 = parseFloat(val);
      if (code === 40) ent.height = parseFloat(val);
      if (code === 1 || code === 3) {
        ent.text = (ent.text || '') + val;
      }
      break;

    case 'DIMENSION':
      if (code === 10) ent.x1 = parseFloat(val);
      if (code === 20) ent.y1 = parseFloat(val);
      if (code === 11) ent.x2 = parseFloat(val);
      if (code === 21) ent.y2 = parseFloat(val);
      // Group code 1 is text override (e.g. "<>", "(<>)", "<> MAX", "%%c<>")
      // Do NOT append code 3 (which is DIMSTYLE name in DIMENSION entities)
      if (code === 1) ent.text = val;
      break;

    case 'INSERT':
      if (code === 10) ent.insX = parseFloat(val);
      if (code === 20) ent.insY = parseFloat(val);
      if (code === 41) ent.scaleX = parseFloat(val);
      if (code === 42) ent.scaleY = parseFloat(val);
      if (code === 50) ent.rotation = (parseFloat(val) * Math.PI) / 180;
      break;
  }
}

/**
 * Parses raw ASCII DXF string, resolves BLOCKS & anonymous dimension geometry,
 * and extracts all drawing entities and synthesized dimension tokens.
 */
export function parseDxfString(dxfContent: string): {
  entities: DxfEntity[];
  layers: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  dimensionTokens: SynthesizedDimensionToken[];
} {
  const lines = dxfContent.split(/\r?\n/);
  const blocks = new Map<string, DxfBlock>();
  const rawEntities: DxfEntity[] = [];
  const layerSet = new Set<string>();

  let currentSection = '';
  let inBlock: DxfBlock | null = null;
  let currentEntity: Partial<DxfEntity> | null = null;

  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(lines[i]?.trim() || '-1', 10);
    const val = lines[i + 1]?.trim() ?? '';

    // Section markers
    if (code === 0 && val === 'SECTION') {
      const nextCode = parseInt(lines[i + 2]?.trim() || '-1', 10);
      const nextVal = lines[i + 3]?.trim() || '';
      if (nextCode === 2) {
        currentSection = nextVal;
        i += 2;
        continue;
      }
    }

    if (code === 0 && val === 'ENDSEC') {
      if (currentEntity && inBlock) {
        inBlock.entities.push(currentEntity as DxfEntity);
        currentEntity = null;
      } else if (currentEntity && currentSection === 'ENTITIES') {
        rawEntities.push(currentEntity as DxfEntity);
        currentEntity = null;
      }
      currentSection = '';
      continue;
    }

    // 1. BLOCKS SECTION
    if (currentSection === 'BLOCKS') {
      if (code === 0 && val === 'BLOCK') {
        inBlock = { name: '', baseX: 0, baseY: 0, entities: [] };
        currentEntity = null;
        continue;
      }
      if (code === 0 && val === 'ENDBLK') {
        if (currentEntity && inBlock) {
          inBlock.entities.push(currentEntity as DxfEntity);
        }
        if (inBlock && inBlock.name) {
          blocks.set(inBlock.name, inBlock);
        }
        inBlock = null;
        currentEntity = null;
        continue;
      }

      if (inBlock && !currentEntity) {
        if (code === 2) inBlock.name = val;
        if (code === 10) inBlock.baseX = parseFloat(val);
        if (code === 20) inBlock.baseY = parseFloat(val);
      }

      if (code === 0 && inBlock && val !== 'BLOCK' && val !== 'ENDBLK') {
        if (currentEntity) {
          inBlock.entities.push(currentEntity as DxfEntity);
        }
        currentEntity = { type: val, layer: '0' };
        continue;
      }

      if (currentEntity) {
        parseEntityAttr(currentEntity, code, val, layerSet);
      }
      continue;
    }

    // 2. ENTITIES SECTION
    if (currentSection === 'ENTITIES') {
      if (code === 0) {
        if (currentEntity && currentEntity.type) {
          rawEntities.push(currentEntity as DxfEntity);
        }
        currentEntity = { type: val, layer: '0' };
        continue;
      }

      if (currentEntity) {
        parseEntityAttr(currentEntity, code, val, layerSet);
      }
    }
  }

  if (currentEntity && currentEntity.type) {
    rawEntities.push(currentEntity as DxfEntity);
  }

  // 3. Expand DIMENSION blocks and INSERT blocks into full drawing entities
  const expandedEntities: DxfEntity[] = [];
  const dimensionTokens: SynthesizedDimensionToken[] = [];

  for (const ent of rawEntities) {
    if (ent.type === 'DIMENSION') {
      const blk = ent.blockName ? blocks.get(ent.blockName) : null;
      if (blk) {
        // A. Add geometry from dimension block (extension lines, dimension line, arrowheads, arcs)
        for (const bEnt of blk.entities) {
          if (
            bEnt.type === 'LINE' ||
            bEnt.type === 'ARC' ||
            bEnt.type === 'CIRCLE' ||
            bEnt.type === 'SOLID' ||
            bEnt.type === 'TRACE'
          ) {
            expandedEntities.push(bEnt);
          }
        }

        // B. Synthesize dimension text callout from block text entities & dim.text template
        const textEntities = blk.entities.filter(
          (e) => (e.type === 'TEXT' || e.type === 'MTEXT') && e.text
        );

        if (textEntities.length > 0) {
          // Sort text entities: left to right (X), and top to bottom (Y descending for stacked limits)
          const sorted = [...textEntities].sort((a, b) => {
            const ax = a.x1 ?? 0;
            const bx = b.x1 ?? 0;
            if (Math.abs(ax - bx) > 0.05) return ax - bx;
            const ay = a.y1 ?? 0;
            const by = b.y1 ?? 0;
            return by - ay;
          });

          const textParts: string[] = [];
          let prevEnt: DxfEntity | null = null;
          for (const t of sorted) {
            const clean = cleanDxfText(t.text || '');
            if (!clean) continue;
            // If vertically stacked at same X, format as limit range: e.g. "4.520 / 4.400"
            if (
              prevEnt &&
              Math.abs((prevEnt.x1 ?? 0) - (t.x1 ?? 0)) < 0.05 &&
              Math.abs((prevEnt.y1 ?? 0) - (t.y1 ?? 0)) > 0.03
            ) {
              textParts.push('/ ' + clean);
            } else {
              textParts.push(clean);
            }
            prevEnt = t;
          }

          const blockCompositeText = textParts
            .join(' ')
            .replace(/\s+/g, ' ')
            .replace(/\s*\/\s*/g, ' / ')
            .trim();

          const dimTemplate = (ent.text || '').trim();
          let finalCallout = blockCompositeText;

          if (dimTemplate.includes('<>')) {
            let cleanTemplate = cleanDxfText(dimTemplate);
            // Deduplicate symbols already present in the block text
            for (const word of ['Ø', 'MAX', 'MIN', 'REF', 'TYP', 'R', '±']) {
              if (cleanTemplate.includes(word) && blockCompositeText.includes(word)) {
                cleanTemplate = cleanTemplate.replace(word, '').trim();
              }
            }
            finalCallout = cleanTemplate.replace('<>', blockCompositeText);
          } else if (dimTemplate.length > 0 && dimTemplate !== '<>') {
            finalCallout = cleanDxfText(dimTemplate) + ' ' + blockCompositeText;
          }
          finalCallout = finalCallout.replace(/\s+/g, ' ').trim();

          // Render text entities on canvas:
          // If dimension template is parenthesized reference (like `(<>)` with `.785`), format as `(.785)`
          if (textEntities.length === 1 && dimTemplate.includes('(') && dimTemplate.includes(')')) {
            expandedEntities.push({
              ...textEntities[0],
              text: `(${cleanDxfText(textEntities[0].text || '')})`,
              isDimBlockSubEntity: true,
            });
          } else {
            for (const tEnt of textEntities) {
              expandedEntities.push({
                ...tEnt,
                isDimBlockSubEntity: true,
              });
            }
          }

          // Emit synthesized dimension token for Auto-Balloon
          const anchorX = sorted[0].x1 ?? ent.x2 ?? ent.x1 ?? 0;
          const anchorY = sorted[0].y1 ?? ent.y2 ?? ent.y1 ?? 0;
          const textH = sorted[0].height || 0.12;

          dimensionTokens.push({
            text: finalCallout,
            x: anchorX,
            y: anchorY,
            height: textH,
          });
        }
      }
    } else if (ent.type === 'INSERT') {
      // Expand insert geometry (e.g. center mark symbols)
      const blk = ent.blockName ? blocks.get(ent.blockName) : null;
      if (blk) {
        const insX = ent.insX || 0;
        const insY = ent.insY || 0;
        const sx = ent.scaleX ?? 1;
        const sy = ent.scaleY ?? 1;
        const rot = ent.rotation ?? 0;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);

        const transform = (x: number, y: number) => {
          const scaledX = x * sx;
          const scaledY = y * sy;
          return {
            x: insX + (scaledX * cos - scaledY * sin),
            y: insY + (scaledX * sin + scaledY * cos),
          };
        };

        for (const bEnt of blk.entities) {
          if (
            bEnt.type === 'LINE' &&
            bEnt.x1 !== undefined &&
            bEnt.y1 !== undefined &&
            bEnt.x2 !== undefined &&
            bEnt.y2 !== undefined
          ) {
            const p1 = transform(bEnt.x1, bEnt.y1);
            const p2 = transform(bEnt.x2, bEnt.y2);
            expandedEntities.push({ ...bEnt, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          } else if (
            bEnt.type === 'CIRCLE' &&
            bEnt.cx !== undefined &&
            bEnt.cy !== undefined &&
            bEnt.r !== undefined
          ) {
            const p = transform(bEnt.cx, bEnt.cy);
            expandedEntities.push({ ...bEnt, cx: p.x, cy: p.y, r: bEnt.r * Math.abs(sx) });
          } else {
            expandedEntities.push(bEnt);
          }
        }
      }
    } else {
      expandedEntities.push(ent);
    }
  }

  // 4. Calculate drawing bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    if (isNaN(x) || isNaN(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const ent of expandedEntities) {
    if (ent.x1 !== undefined && ent.y1 !== undefined) updateBounds(ent.x1, ent.y1);
    if (ent.x2 !== undefined && ent.y2 !== undefined) updateBounds(ent.x2, ent.y2);
    if (ent.x3 !== undefined && ent.y3 !== undefined) updateBounds(ent.x3, ent.y3);
    if (ent.x4 !== undefined && ent.y4 !== undefined) updateBounds(ent.x4, ent.y4);
    if (ent.cx !== undefined && ent.cy !== undefined && ent.r !== undefined) {
      updateBounds(ent.cx - ent.r, ent.cy - ent.r);
      updateBounds(ent.cx + ent.r, ent.cy + ent.r);
    }
    if (ent.vertices) {
      for (const v of ent.vertices) updateBounds(v.x, v.y);
    }
  }

  // Fallback if empty
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 70;
  }

  return {
    entities: expandedEntities,
    layers: Array.from(layerSet),
    bounds: { minX, minY, maxX, maxY },
    dimensionTokens,
  };
}

/**
 * Loads and renders a DXF file into high-DPI raster blueprint image and vector tokens.
 * Accurately decodes Windows-1252/ANSI text, renders AutoCAD arrowheads and dimension blocks.
 */
export async function loadDxfDocument(fileOrString: File | Blob | string): Promise<DxfDocumentInfo> {
  let content: string;

  if (typeof fileOrString === 'string') {
    content = fileOrString;
  } else {
    // Read raw buffer and auto-detect encoding (UTF-8 with Windows-1252 fallback for ± and ° symbols)
    const buffer = await fileOrString.arrayBuffer();
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      content = new TextDecoder('windows-1252').decode(buffer);
    }
  }

  const { entities, layers, bounds, dimensionTokens } = parseDxfString(content);

  const rawWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const rawHeight = Math.max(bounds.maxY - bounds.minY, 1);

  // Render canvas setup (2400 x 1600 high DPI)
  const canvasWidth = 2400;
  const canvasHeight = 1600;
  const padding = 100;

  const renderW = canvasWidth - padding * 2;
  const renderH = canvasHeight - padding * 2;

  const scaleX = renderW / rawWidth;
  const scaleY = renderH / rawHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padding + (renderW - rawWidth * scale) / 2;
  // DXF Y is bottom-up (Cartesian), Canvas Y is top-down
  const offsetY = canvasHeight - padding - (renderH - rawHeight * scale) / 2;

  // Coordinate transform functions
  const toCanvasX = (x: number) => Math.round(offsetX + (x - bounds.minX) * scale);
  const toCanvasY = (y: number) => Math.round(offsetY - (y - bounds.minY) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create Canvas 2D context for DXF rendering');

  // 1. Crisp white engineering drawing background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Blueprint border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(30, 30, canvasWidth - 60, canvasHeight - 60);

  // 3. Render vector geometry
  ctx.strokeStyle = '#1e293b';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const tokens: RawTextToken[] = [];

  for (const ent of entities) {
    switch (ent.type) {
      case 'LINE':
        if (
          ent.x1 !== undefined &&
          ent.y1 !== undefined &&
          ent.x2 !== undefined &&
          ent.y2 !== undefined
        ) {
          ctx.beginPath();
          ctx.moveTo(toCanvasX(ent.x1), toCanvasY(ent.y1));
          ctx.lineTo(toCanvasX(ent.x2), toCanvasY(ent.y2));
          ctx.stroke();
        }
        break;

      case 'SOLID':
      case 'TRACE':
        // AutoCAD Arrowheads (filled triangular/quadrilateral polygons)
        if (
          ent.x1 !== undefined &&
          ent.y1 !== undefined &&
          ent.x2 !== undefined &&
          ent.y2 !== undefined &&
          ent.x3 !== undefined &&
          ent.y3 !== undefined
        ) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(toCanvasX(ent.x1), toCanvasY(ent.y1));
          ctx.lineTo(toCanvasX(ent.x2), toCanvasY(ent.y2));
          ctx.lineTo(toCanvasX(ent.x3), toCanvasY(ent.y3));
          if (
            ent.x4 !== undefined &&
            ent.y4 !== undefined &&
            (ent.x4 !== ent.x3 || ent.y4 !== ent.y3)
          ) {
            ctx.lineTo(toCanvasX(ent.x4), toCanvasY(ent.y4));
          }
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'LWPOLYLINE':
      case 'POLYLINE':
        if (ent.vertices && ent.vertices.length > 1) {
          ctx.beginPath();
          ctx.moveTo(toCanvasX(ent.vertices[0].x), toCanvasY(ent.vertices[0].y));
          for (let i = 1; i < ent.vertices.length; i++) {
            ctx.lineTo(toCanvasX(ent.vertices[i].x), toCanvasY(ent.vertices[i].y));
          }
          if (ent.closed) ctx.closePath();
          ctx.stroke();
        }
        break;

      case 'CIRCLE':
        if (ent.cx !== undefined && ent.cy !== undefined && ent.r !== undefined) {
          ctx.beginPath();
          ctx.arc(toCanvasX(ent.cx), toCanvasY(ent.cy), Math.abs(ent.r * scale), 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'ARC':
        if (
          ent.cx !== undefined &&
          ent.cy !== undefined &&
          ent.r !== undefined &&
          ent.startAngle !== undefined &&
          ent.endAngle !== undefined
        ) {
          ctx.beginPath();
          // Adjust for flipped Y coordinate
          ctx.arc(
            toCanvasX(ent.cx),
            toCanvasY(ent.cy),
            Math.abs(ent.r * scale),
            -ent.endAngle,
            -ent.startAngle
          );
          ctx.stroke();
        }
        break;

      case 'TEXT':
      case 'MTEXT':
        if (ent.text && ent.x1 !== undefined && ent.y1 !== undefined) {
          const clean = cleanDxfText(ent.text);
          if (clean.length > 0) {
            const cx = toCanvasX(ent.x1);
            const cy = toCanvasY(ent.y1);
            const fontSize = Math.max(12, Math.round((ent.height || 0.12) * scale));

            ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
            ctx.fillStyle = '#0f172a';
            ctx.fillText(clean, cx, cy);

            // Only emit standalone drawing text entities (notes, title block, etc.) as tokens.
            // Dimension block fragments are handled by the synthesized dimension tokens below.
            if (!ent.isDimBlockSubEntity) {
              const textMetrics = ctx.measureText(clean);
              const textWidth = Math.max(textMetrics.width, 30);
              const textHeight = fontSize * 1.2;

              tokens.push({
                text: clean,
                x: cx,
                y: cy - fontSize,
                width: textWidth,
                height: textHeight,
                confidence: 100,
              });
            }
          }
        }
        break;
    }
  }

  // 4. Add Synthesized Dimension Tokens for Auto-Balloon and Inspection Plan
  for (const dimTok of dimensionTokens) {
    const cx = toCanvasX(dimTok.x);
    const cy = toCanvasY(dimTok.y);
    const fontSize = Math.max(12, Math.round(dimTok.height * scale));

    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    const textMetrics = ctx.measureText(dimTok.text);
    const textWidth = Math.max(textMetrics.width, 35);
    const textHeight = fontSize * 1.2;

    tokens.push({
      text: dimTok.text,
      x: cx,
      y: cy - fontSize,
      width: textWidth,
      height: textHeight,
      confidence: 100,
    });
  }

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const maxSpan = Math.max(rawWidth, rawHeight);
  const units: 'mm' | 'inch' = maxSpan < 35 ? 'inch' : 'mm';

  return {
    dataUrl,
    width: canvasWidth,
    height: canvasHeight,
    tokens,
    rawEntitiesCount: entities.length,
    layers,
    filename:
      typeof fileOrString !== 'string' && 'name' in fileOrString
        ? fileOrString.name
        : 'Drawing.dxf',
    units,
  };
}
