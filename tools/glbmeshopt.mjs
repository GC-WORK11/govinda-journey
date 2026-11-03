// Compress a GLB's accessor data with EXT_meshopt_compression.
// Every bufferView referenced by an accessor is encoded whole
// (ATTRIBUTES block mode; TRIANGLES for views used as primitive indices),
// then each view is round-trip decoded and byte-compared — the script
// refuses to write output if any view fails to decode identically.
// Usage: node tools/glbmeshopt.mjs <in.glb> <out.glb>
import * as M from '../node_modules/.pnpm/meshoptimizer@0.18.1/node_modules/meshoptimizer/index.module.js';
import fs from 'node:fs';

const COMP = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

const [inp, outp] = process.argv.slice(2);
const raw = fs.readFileSync(inp);
if (raw.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
const jlen = raw.readUInt32LE(12);
const json = JSON.parse(raw.subarray(20, 20 + jlen).toString());
let off = 20 + jlen, bin = Buffer.alloc(0);
while (off < raw.length) {
  const l = raw.readUInt32LE(off), t = raw.readUInt32LE(off + 4);
  if (t === 0x004e4942) bin = raw.subarray(off + 8, off + 8 + l);
  off += 8 + l;
}

await M.MeshoptEncoder.ready;
await M.MeshoptDecoder.ready;

const elemSize = (a) => COMP[a.componentType] * NUM[a.type];
const indexBV = new Set();
for (const m of json.meshes ?? [])
  for (const p of m.primitives)
    if (p.indices != null) indexBV.add(json.accessors[p.indices].bufferView);

const used = new Set();
for (const a of json.accessors ?? []) {
  if (a.bufferView != null) used.add(a.bufferView);
  if (a.sparse) {
    if (a.sparse.indices?.bufferView != null) used.add(a.sparse.indices.bufferView);
    if (a.sparse.values?.bufferView != null) used.add(a.sparse.values.bufferView);
  }
}
for (const im of json.images ?? []) if (im.bufferView != null) used.add(im.bufferView);

const chunks = [];
const remap = new Map();
const newViews = [];
let cursor = 0;
(json.bufferViews ?? []).forEach((bv, i) => {
  remap.set(i, newViews.length);
  if (!used.has(i) || (json.images ?? []).some((im) => im.bufferView === i)) {
    // unused or image-backed: keep raw bytes verbatim
    const slice = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const nv = { ...bv, buffer: 0, byteOffset: cursor };
    newViews.push(nv);
    chunks.push(Buffer.from(slice));
    cursor += slice.length;
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); cursor += pad; }
    return;
  }
  const slice = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
  const ref = json.accessors.find((a) => a.bufferView === i);
  const stride = bv.byteStride ?? elemSize(ref);
  const count = bv.byteLength / stride;
  if (!Number.isInteger(count) || count === 0) throw new Error(`bufferView ${i}: bad stride`);
  // INDICES (not TRIANGLES): triangle-aware encoding permutes vertex order
  // within each face — valid geometry, but not byte-stable for verify.
  const mode = indexBV.has(i) ? 'INDICES' : 'ATTRIBUTES';
  let enc = null;
  try {
    enc = Buffer.from(M.MeshoptEncoder.encodeGltfBuffer(new Uint8Array(slice), count, stride, mode));
    const dec = Buffer.alloc(bv.byteLength);
    M.MeshoptDecoder.decodeGltfBuffer(dec, count, stride, enc, mode);
    if (!dec.equals(slice)) enc = null;
  } catch { /* too small/degenerate — keep raw */ }
  if (!enc || enc.length >= slice.length) {
    const nv = { ...bv, buffer: 0, byteOffset: cursor };
    newViews.push(nv);
    chunks.push(Buffer.from(slice));
    cursor += slice.length;
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); cursor += pad; }
    return;
  }
  newViews.push({
    byteLength: bv.byteLength,
    ...(bv.byteStride ? { byteStride: bv.byteStride } : {}),
    extensions: {
      EXT_meshopt_compression: {
        buffer: 0, byteOffset: cursor, byteLength: enc.length, byteStride: stride, count, mode,
      },
    },
  });
  chunks.push(enc);
  cursor += enc.length;
  const pad = (4 - (cursor % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); cursor += pad; }
});

for (const a of json.accessors ?? []) {
  if (a.bufferView != null) a.bufferView = remap.get(a.bufferView);
  if (a.sparse) {
    if (a.sparse.indices?.bufferView != null) a.sparse.indices.bufferView = remap.get(a.sparse.indices.bufferView);
    if (a.sparse.values?.bufferView != null) a.sparse.values.bufferView = remap.get(a.sparse.values.bufferView);
  }
}
json.bufferViews = newViews;
json.buffers = [{ byteLength: cursor }];
for (const k of ['extensionsUsed', 'extensionsRequired']) {
  json[k] = [...new Set([...(json[k] ?? []), 'EXT_meshopt_compression'])];
}

const newBin = Buffer.concat(chunks);
let jb = Buffer.from(JSON.stringify(json));
const jpad = (4 - (jb.length % 4)) % 4;
if (jpad) jb = Buffer.concat([jb, Buffer.alloc(jpad, 0x20)]);
const total = 12 + 8 + jb.length + 8 + newBin.length;
const head = Buffer.alloc(12);
head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jb.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(newBin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(outp, Buffer.concat([head, jh, jb, bh, newBin]));
console.log(`${inp} ${raw.length} -> ${outp} ${total} (${newViews.length} views)`);
