// node tools/charrender.mjs <out.png> [--az=deg] [--el=deg] [--dist=m] [--anim=Name@t]
// Software render of student.glb + student-skin.png — verifies the character
// (skinning, atlas colours, silhouette) without a browser. Decodes the
// meshopt-compressed GLB, applies the rig's skinning (optionally posed by a
// clip sample), rasterises textured triangles with a z-buffer and Lambert +
// warm fill shading, writes a PNG.
import { MeshoptDecoder } from '../node_modules/three/examples/jsm/libs/meshopt_decoder.module.js'
import fs from 'node:fs'
import zlib from 'node:zlib'

const A = process.argv.slice(2)
const OUT = A[0] || '/tmp/char.png'
const opt = (n, d) => { const v = (A.find((x) => x.startsWith('--' + n + '=')) || '').split('=')[1]; return v === undefined || v === '' ? d : v }
const AZ = +opt('az', '25') * Math.PI / 180, EL = +opt('el', '10') * Math.PI / 180
const DIST = +opt('dist', '2.4'), FOV = 32 * Math.PI / 180
const ANIM = opt('anim', '')
const W = 700, H = 800

/* ---------------- png codec (from tools/repaint-student.mjs) --------------- */
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
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = (c ^ x) & 255 ^ (c >>> 8) * 0 >>> 0; return c }
  // (crc table method kept simple below)
  const crc2 = (b) => { let c = 0xffffffff; for (const x of b) c = CT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const mk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const tb = Buffer.concat([Buffer.from(t), d]); return Buffer.concat([l, tb, cb(crc2(tb))]) }
  const cb = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mk('IHDR', ih), mk('IDAT', zlib.deflateSync(rows)), mk('IEND', Buffer.alloc(0))])
}

/* ---------------- glb decode ---------------- */
const b = fs.readFileSync('public/models/student.glb')
const jlen = b.readUInt32LE(12)
const j = JSON.parse(b.subarray(20, 20 + jlen).toString())
const binOff = 20 + jlen + 8
await MeshoptDecoder.ready
const CS = { 5120: [1, Int8Array], 5121: [1, Uint8Array], 5122: [2, Int16Array], 5123: [2, Uint16Array], 5125: [4, Uint32Array], 5126: [4, Float32Array] }
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
function acc(i) {
  const a = j.accessors[i], bv = j.bufferViews[a.bufferView]
  const ext = bv.extensions?.EXT_meshopt_compression
  const [sz, Ty] = CS[a.componentType], nc = NC[a.type]
  let buf
  if (ext) {
    const src = b.subarray(binOff + ext.byteOffset, binOff + ext.byteOffset + ext.byteLength)
    buf = new Uint8Array(ext.count * ext.byteStride)
    if (ext.mode === 'ATTRIBUTES') MeshoptDecoder.decodeVertexBuffer(buf, ext.count, ext.byteStride, src, ext.filter)
    else if (ext.mode === 'TRIANGLES') MeshoptDecoder.decodeIndexBuffer(buf, ext.count, ext.byteStride, src)
    else MeshoptDecoder.decodeGltfBuffer(buf, ext.count, ext.byteStride, src, ext.mode, ext.filter)
    return { a, view: new Ty(buf.buffer, buf.byteOffset + (a.byteOffset || 0), nc * a.count), stride: (a.byteOffset || 0) ? 0 : ext.byteStride / sz }
  }
  const off = binOff + (bv.byteOffset || 0) + (a.byteOffset || 0)
  return { a, view: new Ty(b.buffer, b.byteOffset + off, nc * a.count), stride: bv.byteStride ? bv.byteStride / sz : nc }
}

/* ---------------- tiny mat/quat ---------------- */
const m4mul = (a, m) => [
  a[0] * m[0] + a[4] * m[1] + a[8] * m[2] + a[12] * m[3], a[1] * m[0] + a[5] * m[1] + a[9] * m[2] + a[13] * m[3], a[2] * m[0] + a[6] * m[1] + a[10] * m[2] + a[14] * m[3], a[3] * m[0] + a[7] * m[1] + a[11] * m[2] + a[15] * m[3],
  a[0] * m[4] + a[4] * m[5] + a[8] * m[6] + a[12] * m[7], a[1] * m[4] + a[5] * m[5] + a[9] * m[6] + a[13] * m[7], a[2] * m[4] + a[6] * m[5] + a[10] * m[6] + a[14] * m[7], a[3] * m[4] + a[7] * m[5] + a[11] * m[6] + a[15] * m[7],
  a[0] * m[8] + a[4] * m[9] + a[8] * m[10] + a[12] * m[11], a[1] * m[8] + a[5] * m[9] + a[9] * m[10] + a[13] * m[11], a[2] * m[8] + a[6] * m[9] + a[10] * m[10] + a[14] * m[11], a[3] * m[8] + a[7] * m[9] + a[11] * m[10] + a[15] * m[11],
  a[0] * m[12] + a[4] * m[13] + a[8] * m[14] + a[12] * m[15], a[1] * m[12] + a[5] * m[13] + a[9] * m[13] + a[13] * m[15], a[2] * m[12] + a[6] * m[13] + a[10] * m[14] + a[14] * m[15], a[3] * m[12] + a[7] * m[13] + a[11] * m[14] + a[15] * m[15],
]
function trs(n) {
  const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1]
  if (n.matrix) return n.matrix
  const [x, y, z, w] = r
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ]
}
const applyM = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
]

/* ---------------- pose: local TRS per node ---------------- */
const local = j.nodes.map((n) => ({ t: (n.translation || [0, 0, 0]).slice(), r: (n.rotation || [0, 0, 0, 1]).slice(), s: (n.scale || [1, 1, 1]).slice(), m: n.matrix }))
if (ANIM) {
  const [name, tt] = ANIM.split('@'), t = +tt || 0
  const anim = j.animations.find((a) => a.name === name)
  if (!anim) { console.log('no anim', name, '— have:', j.animations.map((a) => a.name).join(',')); }
  else for (const ch of anim.channels) {
    const sm = anim.samplers[ch.sampler]
    const { view: times } = acc(sm.input), { view: vals } = acc(sm.output)
    const n = times.length
    let i = 0; while (i < n - 1 && times[i + 1] < t) i++
    const i2 = Math.min(n - 1, i + 1), span = times[i2] - times[i] || 1
    const f = Math.min(1, Math.max(0, (t - times[i]) / span))
    const nc = { translation: 3, scale: 3, rotation: 4, weights: 1 }[ch.target.path]
    const o = local[ch.target.node]
    for (let c = 0; c < nc; c++) {
      const v0 = vals[i * nc + c], v1 = vals[i2 * nc + c]
      o[ch.target.path === 'rotation' ? 'r' : ch.target.path === 'scale' ? 's' : 't'][c] = v0 + (v1 - v0) * f
    }
    if (ch.target.path === 'rotation') { const q = o.r; const l = Math.hypot(...q) || 1; o.r = q.map((v) => v / l) }
    o.m = null
  }
}

/* world matrices */
const world = new Array(j.nodes.length)
const parent = new Array(j.nodes.length).fill(-1)
j.nodes.forEach((n, i) => (n.children || []).forEach((c) => { parent[c] = i }))
function worldOf(i) {
  if (world[i]) return world[i]
  const lm = local[i].m || trs(local[i] ? { translation: local[i].t, rotation: local[i].r, scale: local[i].s } : {})
  world[i] = parent[i] < 0 ? lm : m4mul(worldOf(parent[i]), lm)
  return world[i]
}
j.nodes.forEach((_, i) => worldOf(i))

/* ---------------- texture ---------------- */
const imgBV = j.bufferViews[j.images[0].bufferView]
let tex
if (fs.existsSync('public/models/student-skin.png')) tex = pngDecode(fs.readFileSync('public/models/student-skin.png'))
else tex = pngDecode(b.subarray(binOff + imgBV.byteOffset, binOff + imgBV.byteOffset + imgBV.byteLength))
const texel = (u, v) => {
  u = u - Math.floor(u); v = v - Math.floor(v)
  const x = Math.min(tex.w - 1, Math.max(0, u * tex.w | 0)), y = Math.min(tex.h - 1, Math.max(0, v * tex.h | 0))
  const k = (y * tex.w + x) * tex.ch
  return [tex.img[k], tex.img[k + 1], tex.img[k + 2]]
}

/* ---------------- raster ---------------- */
const TY = 0.95
const cam = [Math.sin(AZ) * Math.cos(EL) * DIST, Math.sin(EL) * DIST + TY, Math.cos(AZ) * Math.cos(EL) * DIST]
const fwd = [0 - cam[0], TY - cam[1], 0 - cam[2]], fl = Math.hypot(...fwd)
fwd[0] /= fl; fwd[1] /= fl; fwd[2] /= fl
const up = [0, 1, 0]
let rgt = [fwd[1] * up[2] - fwd[2] * up[1], fwd[2] * up[0] - fwd[0] * up[2], fwd[0] * up[1] - fwd[1] * up[0]]
let rl = Math.hypot(...rgt); rgt = rgt.map((v) => v / rl)
const upv = [rgt[1] * fwd[2] - rgt[2] * fwd[1], rgt[2] * fwd[0] - rgt[0] * fwd[2], rgt[0] * fwd[1] - rgt[1] * fwd[0]]
const fpx = 0.5 * H / Math.tan(FOV / 2)
const SUN = (() => { const v = [0.45, 0.8, 0.55], l = Math.hypot(...v); return v.map((x) => x / l) })()
const FILL = (() => { const v = [-0.6, 0.35, -0.4], l = Math.hypot(...v); return v.map((x) => x / l) })()

const img = Buffer.alloc(W * H * 3)
const BG = [239, 226, 203]
for (let i = 0; i < W * H; i++) { img[i * 3] = BG[0]; img[i * 3 + 1] = BG[1]; img[i * 3 + 2] = BG[2] }
const zbuf = new Float32Array(W * H).fill(1e9)
const meshColors = {}
let pixN = 0, triN = 0, sb = [1e9, 1e9, -1e9, -1e9]

for (const [ni, n] of j.nodes.entries()) {
  if (n.mesh === undefined) continue
  const nodeM = world[ni]
  const skin = n.skin !== undefined ? j.skins[n.skin] : null
  const jm = skin ? skin.joints.map((jnt, k) => m4mul(nodeM === undefined ? world[jnt] : world[jnt], new Float32Array(acc(skin.inverseBindMatrices).view.slice(k * 16, k * 16 + 16)))) : null
  const prims = j.meshes[n.mesh].primitives
  for (const prim of prims) {
    const P = acc(prim.attributes.POSITION), N = prim.attributes.NORMAL !== undefined ? acc(prim.attributes.NORMAL) : null
    const U = acc(prim.attributes.TEXCOORD_0), J = acc(prim.attributes.JOINTS_0), Wt = acc(prim.attributes.WEIGHTS_0)
    const IX = acc(prim.indices)
    const inv = (a) => a.a.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.a.componentType] || 1 : 1
    const uvx = [U, inv(U)], wS = inv(Wt)
    const vert = (vi) => {
      const ps = P.stride || 3, us = U.stride || 2, js = J.stride || 4, ws = Wt.stride || 4
      let p = [P.view[vi * ps] / inv(P), P.view[vi * ps + 1] / inv(P), P.view[vi * ps + 2] / inv(P)]
      if (jm) {
        const out = [0, 0, 0]
        for (let k = 0; k < 4; k++) {
          const w = Wt.view[vi * ws + k] / wS; if (!w) continue
          const q = applyM(jm[J.view[vi * js + k]], p)
          out[0] += q[0] * w; out[1] += q[1] * w; out[2] += q[2] * w
        }
        p = out
      } else p = applyM(nodeM, p)
      return { p, uv: [U.view[vi * us] / uvx[1], U.view[vi * us + 1] / uvx[1]] }
    }
    const part = j.meshes[n.mesh].name
    for (let t = 0; t < IX.a.count; t += 3) {
      const v0 = vert(IX.view[t]), v1 = vert(IX.view[t + 1]), v2 = vert(IX.view[t + 2])
      // centroid colour for the part report
      const tc = texel((v0.uv[0] + v1.uv[0] + v2.uv[0]) / 3, (v0.uv[1] + v1.uv[1] + v2.uv[1]) / 3)
      const mc = meshColors[part] || (meshColors[part] = [0, 0, 0, 0])
      mc[0] += tc[0]; mc[1] += tc[1]; mc[2] += tc[2]; mc[3]++
      // face normal (world space)
      const e1 = [v1.p[0] - v0.p[0], v1.p[1] - v0.p[1], v1.p[2] - v0.p[2]]
      const e2 = [v2.p[0] - v0.p[0], v2.p[1] - v0.p[1], v2.p[2] - v0.p[2]]
      let nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      const nl = Math.hypot(...nrm) || 1; nrm = nrm.map((x) => x / nl)
      const ld = Math.max(0, nrm[0] * SUN[0] + nrm[1] * SUN[1] + nrm[2] * SUN[2])
      const lf = Math.max(0, nrm[0] * FILL[0] + nrm[1] * FILL[1] + nrm[2] * FILL[2])
      const amb = 0.45, lit = amb + 0.55 * ld + 0.25 * lf
      // project
      const prj = (v) => {
        const d = [v.p[0] - cam[0], v.p[1] - cam[1], v.p[2] - cam[2]]
        const zz = d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2]
        const xx = d[0] * rgt[0] + d[1] * rgt[1] + d[2] * rgt[2]
        const yy = d[0] * upv[0] + d[1] * upv[1] + d[2] * upv[2]
        return [W / 2 + fpx * xx / zz, H / 2 - fpx * yy / zz, zz]
      }
      const s0 = prj(v0), s1 = prj(v1), s2 = prj(v2)
      triN++
      for (const s of [s0, s1, s2]) { if (s[0] < sb[0]) sb[0] = s[0]; if (s[1] < sb[1]) sb[1] = s[1]; if (s[0] > sb[2]) sb[2] = s[0]; if (s[1] > sb[3]) sb[3] = s[1] }
      if (s0[2] < 0.05 && s1[2] < 0.05 && s2[2] < 0.05) continue
      const xmin = Math.max(0, Math.floor(Math.min(s0[0], s1[0], s2[0]))), xmax = Math.min(W - 1, Math.ceil(Math.max(s0[0], s1[0], s2[0])))
      const ymin = Math.max(0, Math.floor(Math.min(s0[1], s1[1], s2[1]))), ymax = Math.min(H - 1, Math.ceil(Math.max(s0[1], s1[1], s2[1])))
      const d = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1])
      if (!d) continue
      for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
        const w0 = ((s1[0] - x) * (s2[1] - y) - (s2[0] - x) * (s1[1] - y)) / d
        const w1 = ((s2[0] - x) * (s0[1] - y) - (s0[0] - x) * (s2[1] - y)) / d
        const w2 = 1 - w0 - w1
        if (w0 < -0.003 || w1 < -0.003 || w2 < -0.003) continue
        const zz = 1 / (w0 / s0[2] + w1 / s1[2] + w2 / s2[2])
        const k = y * W + x
        if (zz > zbuf[k]) continue
        zbuf[k] = zz
        const u = (w0 * v0.uv[0] / s0[2] + w1 * v1.uv[0] / s1[2] + w2 * v2.uv[0] / s2[2]) * zz
        const vv = (w0 * v0.uv[1] / s0[2] + w1 * v1.uv[1] / s1[2] + w2 * v2.uv[1] / s2[2]) * zz
        const c = texel(u, vv)
        // Lambert + slight warm fill + tiny emissive-ish floor (mirrors the material)
        const lift = lit + 0.16
        let r = Math.min(255, c[0] * lift + 6), g = Math.min(255, c[1] * lift + 4), bb = Math.min(255, c[2] * lift + 2)
        img[k * 3] = r | 0; img[k * 3 + 1] = g | 0; img[k * 3 + 2] = bb | 0
        pixN++
      }
    }
  }
}

fs.writeFileSync(OUT, pngEncode(img, W, H))
console.log('wrote', OUT, '| tris', triN, 'pix', pixN, 'screen x', sb[0].toFixed(0), '..', sb[2].toFixed(0), 'y', sb[1].toFixed(0), '..', sb[3].toFixed(0))
for (const [m, c] of Object.entries(meshColors)) {
  if (!c[3]) continue
  console.log(m.padEnd(26), 'mean rgb', (c[0] / c[3]).toFixed(0), (c[1] / c[3]).toFixed(0), (c[2] / c[3]).toFixed(0), ' tris', c[3])
}
