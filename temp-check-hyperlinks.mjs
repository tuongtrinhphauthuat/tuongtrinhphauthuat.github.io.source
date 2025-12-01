import * as XLSX from 'xlsx';
import fs from 'node:fs';
import { parseImageRows, mergeImageHyperlinks } from './src/services/imageService.js';

const fileBuffer = fs.readFileSync('sample.xlsx');
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

const IMAGE_HEADER_PREFIX = 'hình ảnh';

function buildHeaderColumnMap(ws) {
  const headers = new Map();
  const ref = ws['!ref'];
  if (!ref) return headers;
  const range = XLSX.utils.decode_range(ref);
  const headerRow = range.s.r;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = ws[addr];
    if (!cell) continue;
    const raw = cell.w ?? cell.v;
    if (raw == null) continue;
    const headerName = String(raw).trim();
    if (headerName) headers.set(c, headerName);
  }
  return headers;
}

function extractHyperlinkTargets(cell) {
  if (!cell || !cell.l) return [];
  const targets = [];
  const source = cell.l;
  const addTarget = (value) => {
    const target = typeof value === 'string'
      ? value.trim()
      : typeof value?.Target === 'string'
        ? value.Target.trim()
        : typeof value?.target === 'string'
          ? value.target.trim()
          : '';
    if (target) targets.push(target);
  };
  if (Array.isArray(source)) {
    source.forEach(link => addTarget(link?.Target ?? link?.target ?? link));
  } else {
    addTarget(source);
  }
  return targets;
}

function collectImageHyperlinks(ws, headerMap) {
  const hyperlinkMap = new Map();
  if (!ws || !headerMap?.size) return hyperlinkMap;

  const imageColumns = new Set();
  headerMap.forEach((name, colIdx) => {
    if (!name) return;
    if (name.toLowerCase().startsWith(IMAGE_HEADER_PREFIX)) {
      imageColumns.add(colIdx);
    }
  });
  if (!imageColumns.size) return hyperlinkMap;

  Object.keys(ws).forEach(address => {
    if (!address || address[0] === '!') return;
    const cell = ws[address];
    const targets = extractHyperlinkTargets(cell);
    if (!targets.length) return;
    const coords = XLSX.utils.decode_cell(address);
    if (!imageColumns.has(coords.c)) return;
    const headerName = headerMap.get(coords.c);
    if (!headerName) return;
    const rowEntry = hyperlinkMap.get(coords.r) || {};
    rowEntry[headerName] = (rowEntry[headerName] || []).concat(targets);
    hyperlinkMap.set(coords.r, rowEntry);
  });

  return hyperlinkMap;
}

const headerMap = buildHeaderColumnMap(worksheet);
const hyperlinkMap = collectImageHyperlinks(worksheet, headerMap);

jsonData.forEach((row, index) => {
  const rowHyperlinks = typeof row.__rowNum__ === 'number' ? hyperlinkMap.get(row.__rowNum__) : null;
  const key = Object.keys(row).find(k => k.toLowerCase().startsWith('hình ảnh'));
  if (!key) return;
  const rawImages = row[key];
  const hyperlinkTargets = rowHyperlinks?.[key];
  const enrichedRaw = hyperlinkTargets?.length ? mergeImageHyperlinks(rawImages, hyperlinkTargets) : rawImages;
  const parsed = parseImageRows(enrichedRaw, { idPrefix: `p${index + 1}` });
  console.log('Row', row.STT, 'raw lines:\n', rawImages);
  console.log('  Hyperlinks:', hyperlinkTargets);
  console.log('  Parsed URLs:', parsed.map(p => p.url));
});
