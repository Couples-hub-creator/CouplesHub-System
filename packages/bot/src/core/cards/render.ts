import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from '@napi-rs/canvas';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '../logger';
import { fetchImage } from './ssrf';
import { applyVariables, type CardSample, type CardSpec, type CardLayer } from './types';

const fontDir = path.resolve(__dirname, '../../../assets/fonts');
let fontsReady = false;

export function registerFonts(): void {
  if (fontsReady) return;
  fontsReady = true;
  const files = [
    ['Roboto-Regular.ttf', 'Roboto'],
    ['Roboto-Bold.ttf', 'Roboto'],
    ['NotoSansArabic-Regular.ttf', 'Noto Sans Arabic'],
    ['NotoSansArabic-Bold.ttf', 'Noto Sans Arabic'],
  ];
  for (const [file, family] of files) {
    const full = path.join(fontDir, file);
    if (!existsSync(full)) continue;
    try {
      GlobalFonts.registerFromPath(full, family);
    } catch (error) {
      logger.warn(`Could not register font ${file}`, error);
    }
  }

  const emojiCandidates =
    process.platform === 'win32'
      ? ['C:\\Windows\\Fonts\\seguiemj.ttf', 'C:\\Windows\\Fonts\\segoeuiemoji.ttf']
      : [
          '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
          '/usr/share/fonts/noto/NotoColorEmoji.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ];
  for (const candidate of emojiCandidates) {
    if (!existsSync(candidate)) continue;
    try {
      GlobalFonts.registerFromPath(candidate, 'Emoji');
      break;
    } catch {
      // Optional fallback font.
    }
  }
}

const cache = new Map<string, Buffer>();

function cacheKey(spec: CardSpec, sample: CardSample): string {
  return createHash('sha256').update(JSON.stringify({ spec, sample })).digest('hex');
}

function fontFamily(font?: string): string {
  const requested = font?.replace(/["']/g, '').trim();
  if (!requested) return '"Roboto", "Noto Sans Arabic", "Emoji", sans-serif';
  return `"${requested}", "Roboto", "Noto Sans Arabic", "Emoji", sans-serif`;
}

function detectDirection(text: string, requested?: 'auto' | 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  if (requested === 'ltr' || requested === 'rtl') return requested;
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/.test(text) ? 'rtl' : 'ltr';
}

function roundedPath(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius = 0): void {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCover(
  ctx: SKRSContext2D,
  image: Image,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: 'cover' | 'contain' | 'stretch' = 'cover',
  radius = 0,
): void {
  const ratio = image.width / image.height;
  let drawWidth = width;
  let drawHeight = height;
  if (fit === 'contain') {
    if (ratio > width / height) drawHeight = width / ratio;
    else drawWidth = height * ratio;
  } else if (fit === 'cover') {
    if (ratio > width / height) drawWidth = height * ratio;
    else drawHeight = width / ratio;
  }
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;
  ctx.save();
  roundedPath(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

function drawBackground(ctx: SKRSContext2D, spec: CardSpec, background: Image | null): void {
  const { width, height, background: bg } = spec;
  if (bg.type === 'color') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (bg.type === 'gradient') {
    const angle = ((bg.angle ?? 135) * Math.PI) / 180;
    const x = Math.cos(angle) * width;
    const y = Math.sin(angle) * height;
    const gradient = ctx.createLinearGradient(0, 0, x, y);
    gradient.addColorStop(0, bg.from);
    gradient.addColorStop(1, bg.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, width, height);
  if (background) {
    ctx.save();
    ctx.globalAlpha = bg.opacity ?? 1;
    drawCover(ctx, background, 0, 0, width, height, bg.fit ?? 'cover');
    ctx.restore();
  }
  if (bg.overlay) {
    ctx.fillStyle = bg.overlay;
    ctx.fillRect(0, 0, width, height);
  }
}

function wrapLines(ctx: SKRSContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !current) {
        current = next;
        continue;
      }
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
    if (current) lines.push(current);
  }
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    let trimmed = last;
    while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) trimmed = trimmed.slice(0, -1);
    lines[maxLines - 1] = `${trimmed}…`;
  }
  return lines.length ? lines : [''];
}

function drawLayer(ctx: SKRSContext2D, layer: CardLayer, sample: CardSample, images: Map<string, Image>): void {
  ctx.save();
  if (layer.opacity !== undefined) ctx.globalAlpha = layer.opacity;
  if (layer.rotation) {
    ctx.translate(layer.x, layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-layer.x, -layer.y);
  }

  if (layer.type === 'shape') {
    const { x, y, width, height, radius = 0 } = layer;
    if (layer.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
      ctx.closePath();
    } else if (layer.shape === 'line') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
    } else {
      roundedPath(ctx, x, y, width, height, radius);
    }
    if (layer.fill) {
      ctx.fillStyle = layer.fill;
      ctx.fill();
    }
    if (layer.stroke) {
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = layer.strokeWidth ?? 1;
      ctx.stroke();
    }
  } else if (layer.type === 'image') {
    const image = images.get(layer.url);
    if (!image) {
      ctx.restore();
      return;
    }
    drawCover(ctx, image, layer.x, layer.y, layer.width, layer.height, layer.fit ?? 'cover', layer.radius ?? 0);
    if (layer.borderColor && layer.borderWidth) {
      roundedPath(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius ?? 0);
      ctx.strokeStyle = layer.borderColor;
      ctx.lineWidth = layer.borderWidth;
      ctx.stroke();
    }
  } else if (layer.type === 'avatar') {
    const url = layer.url ?? sample.avatarUrl ?? '';
    const image = url ? images.get(url) : undefined;
    const { x, y, size } = layer;
    const radius = layer.shape === 'circle' ? size / 2 : layer.shape === 'square' ? 0 : (layer.radius ?? size * 0.18);
    if (layer.glow) {
      ctx.save();
      ctx.shadowColor = layer.glow;
      ctx.shadowBlur = 28;
      roundedPath(ctx, x, y, size, size, radius);
      ctx.fillStyle = layer.glow;
      ctx.fill();
      ctx.restore();
    }
    if (image) {
      drawCover(ctx, image, x, y, size, size, 'cover', radius);
    } else {
      roundedPath(ctx, x, y, size, size, radius);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.round(size * 0.4)}px ${fontFamily()}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((sample.displayName || sample.username || '?').slice(0, 1).toUpperCase(), x + size / 2, y + size / 2);
    }
    if (layer.borderColor) {
      roundedPath(ctx, x, y, size, size, radius);
      ctx.strokeStyle = layer.borderColor;
      ctx.lineWidth = layer.borderWidth ?? 4;
      ctx.stroke();
    }
  } else if (layer.type === 'text') {
    const text = applyVariables(layer.text, sample);
    const size = layer.size;
    ctx.font = `${layer.weight ?? 'normal'} ${size}px ${fontFamily(layer.font)}`;
    ctx.fillStyle = layer.color ?? '#ffffff';
    ctx.textBaseline = layer.baseline ?? 'middle';
    ctx.textAlign = layer.align ?? 'left';
    ctx.direction = detectDirection(text, layer.direction);
    if (layer.shadow) {
      ctx.shadowColor = layer.shadow.color;
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.x;
      ctx.shadowOffsetY = layer.shadow.y;
    }
    const width = layer.width ?? (ctx.canvas.width - layer.x * 2);
    const lines = wrapLines(ctx, text, width, layer.maxLines ?? 3);
    const lineHeight = size * (layer.lineHeight ?? 1.25);
    const startY =
      layer.baseline === 'top'
        ? layer.y + size
        : layer.baseline === 'bottom'
          ? layer.y - (lines.length - 1) * lineHeight
          : layer.y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => ctx.fillText(line, layer.x, startY + index * lineHeight));
  } else if (layer.type === 'progress') {
    const max = layer.max ?? 100;
    const ratio = Math.max(0, Math.min(1, layer.value / max));
    const radius = layer.radius ?? layer.height / 2;
    roundedPath(ctx, layer.x, layer.y, layer.width, layer.height, radius);
    ctx.fillStyle = layer.track ?? '#1e293b';
    ctx.fill();
    if (ratio > 0) {
      roundedPath(ctx, layer.x, layer.y, Math.max(layer.height, layer.width * ratio), layer.height, radius);
      ctx.fillStyle = layer.fill ?? '#19d68f';
      ctx.fill();
    }
  } else if (layer.type === 'badge') {
    const text = applyVariables(layer.text, sample);
    const size = layer.size ?? 24;
    ctx.font = `600 ${size}px ${fontFamily()}`;
    const paddingX = layer.paddingX ?? 18;
    const paddingY = layer.paddingY ?? 10;
    const width = ctx.measureText(text).width + paddingX * 2;
    const height = size + paddingY * 2;
    roundedPath(ctx, layer.x, layer.y, width, height, layer.radius ?? height / 2);
    ctx.fillStyle = layer.background ?? '#19d68f';
    ctx.fill();
    ctx.fillStyle = layer.color ?? '#04140d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, layer.x + width / 2, layer.y + height / 2);
  }
  ctx.restore();
}

async function loadAllImages(spec: CardSpec, sample: CardSample): Promise<Map<string, Image>> {
  const urls = new Set<string>();
  if (spec.background.type === 'image') urls.add(spec.background.url);
  for (const layer of spec.layers) {
    if (layer.type === 'image') urls.add(layer.url);
    if (layer.type === 'avatar') {
      if (layer.url) urls.add(layer.url);
      else if (sample.avatarUrl) urls.add(sample.avatarUrl);
    }
  }
  const images = new Map<string, Image>();
  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const { buffer } = await fetchImage(url);
        images.set(url, await loadImage(buffer));
      } catch (error) {
        logger.warn(`Card image skipped: ${url}`, error);
      }
    }),
  );
  return images;
}

export async function renderCardUncached(spec: CardSpec, sample: CardSample): Promise<Buffer> {
  registerFonts();
  const images = await loadAllImages(spec, sample);
  const canvas = createCanvas(spec.width, spec.height);
  const ctx = canvas.getContext('2d');
  const background = spec.background.type === 'image' ? images.get(spec.background.url) ?? null : null;
  drawBackground(ctx, spec, background);
  for (const layer of spec.layers) drawLayer(ctx, layer, sample, images);
  return canvas.toBuffer('image/png');
}

export async function renderCard(spec: CardSpec, sample: CardSample): Promise<Buffer> {
  const key = cacheKey(spec, sample);
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  let buffer: Buffer;
  try {
    buffer = await renderCardUncached(spec, sample);
  } catch (error) {
    logger.error('Card render failed; using text fallback', error);
    buffer = fallbackCard(sample, spec);
  }
  cache.set(key, buffer);
  const limit = Math.max(16, Number(process.env.CARD_CACHE_SIZE || 256));
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  return buffer;
}

function fallbackCard(sample: CardSample, spec?: CardSpec): Buffer {
  const width = spec?.width ?? 900;
  const height = spec?.height ?? 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#19d68f';
  ctx.fillRect(0, 0, 8, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(Math.min(64, height / 5))}px ${fontFamily()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sample.displayName || sample.username || 'Couples Hub', width / 2, height / 2 - 16);
  ctx.font = `28px ${fontFamily()}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(sample.serverName || 'Couples Hub', width / 2, height / 2 + 34);
  return canvas.toBuffer('image/png');
}

export function clearCardCache(): void {
  cache.clear();
}
