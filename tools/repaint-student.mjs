// node tools/repaint-student.mjs  — repaint student.glb's atlas -> public/models/student-skin.png
// Cell-level repaint: the KayKit atlas is one material per 64px cell, so every
// cell used by the rig gets a palette colour scaled by the original texel's
// luminance (keeps the baked gradient shading). Cell usage = rasterised tri
// coverage + vertex hits; semantic table below is hand-mapped from the dump.
import { MeshoptDecoder } from '../node_modules/three/examples/jsm/libs/meshopt_decoder.module.js'
import zlib from 'node:zlib'
import fs from 'node:fs'

const GLB = 'public/models/student.glb'
const TEX_OUT = 'public/models/student-skin.png'
const S = 1024

/* palette */
const SKIN = [169, 113, 63]   // warm brown skin
const HAIR = [36, 28, 22]     // near-black warm hair
const EYES = [22, 15, 10]     // eyes/brows
const CREAM = [237, 225, 203] // shirt
const SCARF = [208, 122, 82]  // neckerchief terracotta
const JEANS = [77, 107, 138]  // trousers
const LEATHER = [74, 52, 35]  // belt/boots/satchel

/* cell -> colour (64px grid over the 1024 atlas) */
const T = {}
const put = (cells, c) => cells.forEach((k) => { T[k] = c })
put(['2,0', '3,0', '2,1', '3,1', '2,2', '3,2', '2,3', '3,3'], HAIR)          // back/side of head
put(['4,0', '5,0', '4,1', '5,1'], EYES)                                     // eyes/brows cells
put(['0,1', '1,1', '0,2', '1,2', '0,3', '1,3'], SKIN)                       // face island
put(['6,0', '7,0', '6,1', '7,1', '6,2', '7,2', '6,3', '7,3'], SCARF)        // neckerchief + earring
put(['10,0', '10,1'], CREAM)                                              // shirt sleeve
put(['10,9', '11,9', '10,10', '11,10', '10,11', '11,11'], SKIN)             // hands
put(['0,4', '1,4', '3,4', '0,5', '1,5', '3,5', '0,6', '1,6', '0,7', '1,7'], CREAM) // tunic + cuffs
put(['2,5', '2,6', '2,7', '2,10'], CREAM)                                   // tunic body cells
put(['10,2', '11,2', '12,2', '11,1', '12,1', '13,1', '12,0', '13,0',
     '12,3', '13,3', '11,3', '10,3', '12,4', '13,4', '14,2', '15,2', '14,3', '15,3'], LEATHER) // strap/belt
put(['14,5', '15,5', '14,6', '15,6', '14,7', '15,7',
     '14,8', '15,8', '14,9', '15,9'], LEATHER)                              // boots + soles
put(['0,8', '1,8', '0,9', '1,9'], SKIN)                                     // bare calf/sock cells
put(['2,4', '3,6', '4,4', '4,5', '4,6', '4,7', '5,6', '5,7',
     '2,8', '3,8', '4,8', '5,8', '2,9', '3,9', '4,9', '5,9',
     '6,8', '7,8', '6,9', '7,9', '6,10', '7,10',
     '4,10', '5,10', '8,10', '9,10', '4,11', '5,11',
     '6,6', '6,7', '7,6', '7,7', '8,7', '9,7', '10,7', '11,7', '12,7', '13,7',
     '8,8', '9,8', '10,8', '11,8', '12,8', '13,8',
     '8,9', '9,9', '12,9', '13,9',
     '10,5', '11,5', '12,5', '13,5', '10,6', '11,6', '12,6', '13,6'], JEANS) // trousers
put(['6,12', '7,12', '8,12', '9,12', '6,13', '7,13', '8,13', '9,13',
     '6,14', '7,14', '8,14', '9,14', '6,15', '7,15', '8,15', '9,15',
     '10,12', '11,12'], JEANS)                                             // body pants (if sampled)
put(['12,12', '13,12', '12,13', '13,13', '12,14', '13,14', '12,15', '13,15',
     '10,13', '11,13', '10,14', '11,14', '10,15', '11,15'], LEATHER)          // satchel/belt bottom
put(['8,10', '9,10', '8,11', '9,11'], LEATHER)

/* ---------------- png codec ---------------- */
function pngDecode(buf) {
  let p = 8, w, h, ct; const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), typ = buf.slice(p + 4, p + 8).toString()
    if (typ === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); ct = buf[p + 8 + 9] }
    if (typ === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + len))
    p += 12 + len
  }
  const ch = ct === 6 ? 4 : 3
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const img = Buffer.alloc(w * h * ch)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w * ch + 1)]
    for (let x = 0; x < w * ch; x++) {
      const v = raw[y * (w * ch + 1) + 1 + x]
      const a = x >= ch ? img[y * w * ch + x - ch] : 0, bb = y > 0 ? img[(y - 1) * w * ch + x] : 0, c = (x >= ch && y > 0) ? img[(y - 1) * w * ch + x - ch] : 0
      let r = v
      if (f === 1) r = (v + a) & 255; else if (f === 2) r = (v + bb) & 255; else if (f === 3) r = (v + ((a + bb) >> 1)) & 255
      else if (f === 4) { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c); r = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255 }
      img[y * w * ch + x] = r
    }
  }
  return { img, w, h, ch }
}
const CT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
function pngEncode(buf, w, h) {
  const rows = Buffer.alloc(h * (w * 3 + 1))
  for (let y = 0; y < h; y++) buf.copy(rows, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = CT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const mk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const tb = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(tb)); return Buffer.concat([l, tb, cb]) }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mk('IHDR', ih), mk('IDAT', zlib.deflateSync(rows)), mk('IEND', Buffer.alloc(0))])
}

/* ---------------- glb decode ---------------- */
await MeshoptDecoder.ready
const b = fs.readFileSync(GLB)
const jsonLen = b.readUInt32LE(12)
const j = JSON.parse(b.slice(20, 20 + jsonLen).toString())
const binStart = 20 + jsonLen + 8
function viewBytes(vi) {
  const v = j.bufferViews[vi]; const ext = v.extensions && v.extensions.EXT_meshopt_compression
  if (ext) { const out = new Uint8Array(ext.count * ext.byteStride)
    MeshoptDecoder.decodeGltfBuffer(out, ext.count, ext.byteStride, b.slice(binStart + ext.byteOffset, binStart + ext.byteOffset + ext.byteLength), ext.mode, ext.filter)
    return { buf: out, stride: ext.byteStride } }
  return { buf: b.slice(binStart + v.byteOffset, binStart + v.byteOffset + v.byteLength), stride: v.byteStride }
}
const u16 = (a, o) => a[o] | (a[o + 1] << 8)

const imgView = j.bufferViews[j.images[0].bufferView]
const orig = pngDecode(b.slice(binStart + imgView.byteOffset, binStart + imgView.byteOffset + imgView.byteLength))
const lum = (x, y) => { const k = (y * S + x) * 4; return 0.2126 * orig.img[k] + 0.7152 * orig.img[k + 1] + 0.0722 * orig.img[k + 2] }

/* ---------------- usage: vertex hits + raster coverage ---------------- */
const used = new Uint16Array(256)
j.meshes.forEach((m) => {
  const pr = m.primitives[0]
  const uvA = j.accessors[pr.attributes.TEXCOORD_0]
  const ixA = j.accessors[pr.indices]
  const { buf: uvR, stride: uvS } = viewBytes(uvA.bufferView)
  const { buf: ixR, stride: ixS } = viewBytes(ixA.bufferView)
  const UV = (i) => {
    const u = u16(uvR, i * uvS) / 65535, v = u16(uvR, i * uvS + 2) / 65535
    used[Math.min(15, v * 16 | 0) * 16 + Math.min(15, u * 16 | 0)]++
    return [u, v]
  }
  const IX = (i) => ixA.componentType === 5125 ? (ixR[i * ixS] | ixR[i * ixS + 1] << 8 | ixR[i * ixS + 2] << 16 | ixR[i * ixS + 3] << 24) >>> 0 : u16(ixR, i * ixS)
  for (let t = 0; t < ixA.count; t += 3) {
    let u0 = UV(IX(t)), u1 = UV(IX(t + 1)), u2 = UV(IX(t + 2))
    const w = (d) => d - Math.round(d)
    u1 = [u0[0] + w(u1[0] - u0[0]), u0[1] + w(u1[1] - u0[1])]
    u2 = [u0[0] + w(u2[0] - u0[0]), u0[1] + w(u2[1] - u0[1])]
    const [ax, ay] = [u0[0] * S, u0[1] * S], [bx, by] = [u1[0] * S, u1[1] * S], [cxx, cyy] = [u2[0] * S, u2[1] * S]
    const mnx = Math.max(-S, Math.floor(Math.min(ax, bx, cxx))), mxx = Math.min(2 * S, Math.ceil(Math.max(ax, bx, cxx)))
    const mny = Math.max(-S, Math.floor(Math.min(ay, by, cyy))), mxy = Math.min(2 * S, Math.ceil(Math.max(ay, by, cyy)))
    const d = (bx - ax) * (cyy - ay) - (cxx - ax) * (by - ay); if (!d) continue
    for (let y = mny; y <= mxy; y += 4) for (let x = mnx; x <= mxx; x += 4) {
      const w0 = ((bx - x) * (cyy - y) - (cxx - x) * (by - y)) / d
      const w1 = ((cxx - x) * (ay - y) - (ax - x) * (cyy - y)) / d
      const w2 = 1 - w0 - w1
      if (w0 < -0.002 || w1 < -0.002 || w2 < -0.002) continue
      const wy = ((y % S) + S) % S, wx = ((x % S) + S) % S
      used[Math.min(15, wy / 64 | 0) * 16 + Math.min(15, wx / 64 | 0)] += 4
    }
  }
})

/* ---------------- paint ---------------- */
const out = Buffer.alloc(S * S * 3)
for (let i = 0; i < S * S; i++) { out[i * 3] = orig.img[i * 4]; out[i * 3 + 1] = orig.img[i * 4 + 1]; out[i * 3 + 2] = orig.img[i * 4 + 2] }
for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
  const col = T[cx + ',' + cy]
  if (!col || used[cy * 16 + cx] < 6) continue
  let ml = 0, n = 0
  for (let y = cy * 64; y < cy * 64 + 64; y += 3) for (let x = cx * 64; x < cx * 64 + 64; x += 3) { ml += lum(x, y); n++ }
  ml /= n; if (ml < 10) ml = 10
  for (let y = cy * 64; y < cy * 64 + 64; y++) for (let x = cx * 64; x < cx * 64 + 64; x++) {
    const k = (y * S + x) * 3, l = lum(x, y) / ml
    out[k] = Math.min(255, Math.round(col[0] * l))
    out[k + 1] = Math.min(255, Math.round(col[1] * l))
    out[k + 2] = Math.min(255, Math.round(col[2] * l))
  }
}
fs.writeFileSync(TEX_OUT, pngEncode(out, S, S))
console.log('wrote', TEX_OUT)
