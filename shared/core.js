// goofyfish kids core. Shared by every game.
// Stick figure, ink drawing, particles and sound are adapted from goofyfish by Kamran Ahmed (MIT).
// Everything below is global (classic script), so each game file can use it directly.

const cv = document.getElementById('c');
let ctx = cv.getContext('2d');
const COL = { bg: '#ffffff', ink: '#141414', fig: '#141414', muted: '#737373', faint: '#d4d4d4', butter: '#fde68a', butterHi: '#fcd34d', accent: '#b45309', dot: 'rgba(31,41,55,0.13)' };
// Soft toy colours for kids games. Ink outlines stay black.
const PAL = ['#ff8a80', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc', '#ffa8d5', '#ffc078'];
const Q = new URLSearchParams(location.search);
const BOT = Q.has('bot');
window.__bot = BOT;
const $ = (id) => document.getElementById(id);

const lerp = (a, b, k) => a + (b - a) * k;
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EASE = {
  io: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  in: (k) => k * k,
  out: (k) => 1 - (1 - k) * (1 - k),
  lin: (k) => k,
  soft: (k) => 0.5 - Math.cos(Math.PI * k) / 2,
};

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


// ── Fitting the world to any screen ────────────────────────────────────────
// Design in fixed world units (a VIEW box, y = 0 is the ground line). Games set Object.assign(VIEW, {...}).
// Landscape: the whole box fits. Portrait: at least VIEW.minW units are visible, centred on VIEW.focusX,
// so keep the action inside that slice. screenRect() gives the visible world edges so scenery can fill the screen.

const VIEW = { x0: -300, x1: 300, y0: -420, y1: 40, minW: 420, focusX: 0 };
let dpr = 1, cw = 0, ch = 0, cam = { s: 1, x: 0, y: 0 };

function fitView() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  cw = innerWidth;
  ch = innerHeight;
  const vw = VIEW.x1 - VIEW.x0, vh = VIEW.y1 - VIEW.y0;
  const portrait = cw < ch;
  const s = Math.min(portrait ? cw / VIEW.minW : cw / vw, ch / vh, 4);
  const cx = portrait ? VIEW.focusX : (VIEW.x0 + VIEW.x1) / 2;
  cam = { s, x: cw / 2 - cx * s, y: ch / 2 - ((VIEW.y0 + VIEW.y1) / 2) * s };
}
function toWorld(px, py) {
  return [(px - cam.x) / cam.s, (py - cam.y) / cam.s];
}
function screenRect() {
  const a = toWorld(0, 0), b = toWorld(cw, ch);
  return { l: a[0], t: a[1], r: b[0], b: b[1] };
}

// ── Stick figure ───────────────────────────────────────────────────────────
// Poses are joint positions in figure space: facing right, feet near y = -8, head near y = -121.
// Draw at (x, groundY + 8) so the feet touch the ground. Needs: Helpers, strokePath, COL.fig.
// Make new poses with mk({...}) by moving a few joints of BASE; play them with an Actor.

const THIGH = 30, SHIN = 30, UARM = 21, FARM = 21;
const LIMB = 5, ARM = 4.2, TORSO = 8.5, HEAD_R = 7.8, FAR = '#9a9a9a';
const BASE = {
  face: 1,
  head: [0, -121], chest: [0, -96], hip: [0, -65],
  fF: [1, -8], fB: [-4, -8], kF: [22, -38], kB: [10, -38],
  hF: [3, -57], hB: [-1, -57], eF: [-6, -78], eB: [-6, -78],
};
const mk = (o, base = BASE) => Object.assign({}, base, o);
const P = {};
P.stand = mk({});
P.ready = mk({ head: [2, -121], hF: [15, -84], eF: [5, -71], hB: [-4, -56], eB: [-6, -77] });
P.crouch = mk({ head: [6, -100], chest: [4, -76], hip: [-2, -46], kF: [24, -30], kB: [12, -28], hF: [16, -60], eF: [10, -56], hB: [-8, -52], eB: [-8, -60] });
P.leap = mk({ head: [4, -124], chest: [2, -99], hip: [0, -68], fF: [14, -30], fB: [-14, -26], kF: [20, -52], kB: [-2, -48], hF: [18, -140], eF: [16, -120], hB: [-14, -134], eB: [-12, -116] });
P.cheer = mk({ head: [0, -122], chest: [0, -97], hip: [0, -67], hF: [16, -136], hB: [-12, -134], eF: [14, -118], eB: [-12, -116] });
P.wince = mk({ head: [-3, -118], chest: [-2, -94], hip: [0, -65], kF: [20, -37], hF: [7, -125], eF: [19, -111], hB: [-7, -125], eB: [-20, -109] });
P.phew = mk({ head: [-1, -120], chest: [-1, -95], hip: [0, -65], hF: [13, -80], eF: [4, -68], hB: [2, -122], eB: [-14, -106] });
P.punch = mk({ head: [8, -118], chest: [6, -94], hip: [0, -64], kF: [24, -36], kB: [-8, -34], fF: [18, -8], fB: [-16, -8], hF: [44, -98], eF: [26, -96], hB: [2, -88], eB: [-6, -78] });

const PTS = ['head', 'chest', 'hip', 'fF', 'fB', 'kF', 'kB', 'hF', 'hB', 'eF', 'eB'];

// Joints only bend the way real ones do, in the figure's own facing-right space (y down):
// an elbow folds the forearm toward the front of the body (ARM_BEND), a knee folds the shin back (KNEE_BEND).
// Pass the bend as the last argument; the hint then only matters when the limb is almost straight.
const ARM_BEND = -1, KNEE_BEND = 1;
function ik(a, b, l1, l2, hint, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  // Ease into full extension so a straightening limb's joint doesn't race across the last few units.
  const L = l1 + l2, soft = L * 0.96;
  if (d > soft) {
    d = soft + (L - soft) * (1 - Math.exp(-(d - soft) / (L - soft)));
  }
  d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(L - 0.001, d));
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const ang = Math.acos(c);
  const j1 = [a[0] + l1 * Math.cos(base + ang), a[1] + l1 * Math.sin(base + ang)];
  const j2 = [a[0] + l1 * Math.cos(base - ang), a[1] + l1 * Math.sin(base - ang)];
  if (bend) {
    const side = (j) => (j[0] - a[0]) * (b[1] - j[1]) - (j[1] - a[1]) * (b[0] - j[0]);
    return Math.sign(side(j1)) === bend ? j1 : j2;
  }
  const d1 = Math.hypot(j1[0] - hint[0], j1[1] - hint[1]);
  const d2 = Math.hypot(j2[0] - hint[0], j2[1] - hint[1]);
  return d1 < d2 ? j1 : j2;
}
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function pathPose(list, u) {
  const n = list.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, u * n));
  const i = Math.floor(x), t = x - i;
  const a = list[Math.max(0, i - 1)], b = list[i], c = list[i + 1], d = list[Math.min(n, i + 2)];
  const o = { face: lerp(b.face, c.face, t), hang: lerp(b.hang ?? 1, c.hang ?? 1, t) };
  for (const k of PTS) {
    o[k] = [catmull(a[k][0], b[k][0], c[k][0], d[k][0], t), catmull(a[k][1], b[k][1], c[k][1], d[k][1], t)];
  }
  return o;
}

// An Actor plays queued pose steps: actor.push({ pose: P.crouch, d: 0.12 }, { pose: P.leap, d: 0.2, ez: 'out' }).
// A step can also be { path: [P.a, P.b, P.c], d } for a smooth curve through several poses, or { fn: () => {} } to run code.
class Actor {
  constructor(pose) {
    this.pose = pose || P.ready;
    this.q = [];
    this.step = null;
    this.t = 0;
    this.id = Math.random().toString(36).slice(2);
  }
  push(...steps) {
    this.q.push(...steps);
  }
  clear() {
    this.q = [];
    this.step = null;
  }
  get idle() {
    return !this.step && !this.q.length;
  }
  update(dt) {
    for (let guard = 0; guard < 20; guard++) {
      if (!this.step) {
        if (!this.q.length) {
          return;
        }
        this.step = this.q.shift();
        this.t = 0;
        if (this.step.fn) {
          const fn = this.step.fn;
          this.step = null;
          fn();
          continue;
        }
        const targets = this.step.path || (this.step.pose ? [this.step.pose] : [this.pose]);
        this.step.list = [this.pose, ...targets];
      }
      this.t += dt;
      const s = this.step;
      const k = Math.min(1, this.t / s.d);
      this.pose = pathPose(s.list, (EASE[s.ez] || EASE.soft)(k));
      if (k < 1) {
        return;
      }
      dt = this.t - s.d;
      this.step = null;
    }
  }
}

// A back hand resting low under the shoulder hangs from a nearly straight arm, the way a relaxed arm does.
// Set hang: 0 on a pose when the back hand has to work there (it blends between poses like any number).
function relax(sh, t, amount) {
  const dx = t[0] - sh[0], dy = t[1] - sh[1];
  const d = Math.hypot(dx, dy);
  const want = (UARM + FARM) * 0.96;
  if (dy <= 0 || d < 1 || d >= want) {
    return t;
  }
  const w = (amount ?? 1) * Math.min(1, Math.max(0, (dy / d - 0.8) / 0.18));
  const k = w * w * (3 - 2 * w);
  const nd = d + (want - d) * k;
  return [sh[0] + (dx / d) * nd, sh[1] + (dy / d) * nd];
}
function reach(a, b, max) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  if (d <= max) {
    return b;
  }
  return [a[0] + (dx / d) * max, a[1] + (dy / d) * max];
}
function breathe(p, amt) {
  if (!amt) {
    return p;
  }
  const o = Object.assign({}, p);
  const up = (v, k) => [v[0], v[1] - amt * k];
  o.head = up(p.head, 1);
  o.chest = up(p.chest, 0.85);
  o.hF = up(p.hF, 0.6);
  o.hB = up(p.hB, 0.6);
  return o;
}
const prevJ = {};
function mirrorJoint(a, b, j) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy || 1;
  const t = ((j[0] - a[0]) * dx + (j[1] - a[1]) * dy) / L2;
  const px = a[0] + dx * t, py = a[1] + dy * t;
  return [2 * px - j[0], 2 * py - j[1]];
}
function ikC(key, a, b, l1, l2, hint, bend) {
  const j = ik(a, b, l1, l2, hint, bend);
  if (bend) {
    prevJ[key] = j;
    return j;
  }
  const pj = prevJ[key];
  if (pj) {
    const alt = mirrorJoint(a, b, j);
    const dj = Math.hypot(j[0] - pj[0], j[1] - pj[1]);
    const da = Math.hypot(alt[0] - pj[0], alt[1] - pj[1]);
    const dh = Math.hypot(j[0] - hint[0], j[1] - hint[1]) - Math.hypot(alt[0] - hint[0], alt[1] - hint[1]);
    if (da + 1.5 < dj && Math.abs(dh) < 4) {
      prevJ[key] = alt;
      return alt;
    }
  }
  prevJ[key] = j;
  return j;
}
// Figure styles: pick one for the whole game with FIG_STYLE, or per figure with opts.style.
// See references/figure-styles.png. Poses, props and pnpm game:motion work the same in every style.
//   classic      solid head, thick torso, grey far limbs: the house hero
//   doodle       big hollow round head with two line eyes on a thin, even stick body
//   doodleshirt  doodle in a shirt; opts.shirt sets the colour (team colours, goons in grey)
//   sketch       hollow wobbly head and thin pen lines that redraw a few times a second
//   chunky       toy-like: thicker limbs, round mitten hands and little boots
//   googly       a bigger solid head with googly eyes looking the way the figure faces
let FIG_STYLE = 'classic';
const BODY = {
  classic: { head: 1, arm: 1, leg: 1, torso: TORSO },
  doodle: { head: 1.75, arm: 1, leg: 0.92, torso: 4.8, hollow: true, sameFar: true, eyes: true },
  doodleshirt: { head: 1.75, arm: 1, leg: 0.92, torso: 4.8, hollow: true, sameFar: true, eyes: true, shirt: true },
  sketch: { head: 1.6, arm: 0.78, leg: 0.74, torso: 3.6, hollow: true, sameFar: true, sketch: true },
  chunky: { head: 1.15, arm: 1.45, leg: 1.45, torso: TORSO * 1.3, mitts: true },
  googly: { head: 1.6, arm: 1, leg: 1, torso: TORSO, googly: true },
};

let SK = null;
function jit(i) {
  const v = Math.sin((SK ? SK.seed : 0) * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
}
function sketchStroke(pts, w) {
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = pass ? w * 0.55 : w;
    ctx.globalAlpha = pass ? 0.55 : 1;
    ctx.beginPath();
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        const off = jit(s * 10 + i + pass * 50) * (pass ? 1.6 : 0.9) * Math.sin(t * Math.PI + 0.3);
        const ext = pass && s === 0 && i === 0 ? -2 : pass && s === pts.length - 2 && i === 4 ? 2 : 0;
        const px = a[0] + dx * t + nx * off + (dx / L) * ext, py = a[1] + dy * t + ny * off + (dy / L) * ext;
        if (s === 0 && i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// tag ({ limb: 'arm' | 'leg', id }) marks a limb for pnpm game:motion, which checks every tagged limb by id.
function strokePath(pts, w, col, tag) {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (SK) {
    sketchStroke(pts, w);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.stroke();
}
function figFill(fill, lw, stroke) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function figSeg(a, b, w, col) {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}
function drawShirt(p, u, n, J, fill) {
  const c = p.chest, h = p.hip;
  const pt = (b, side, w, along) => [b[0] + n[0] * side * w + u[0] * along, b[1] + n[1] * side * w + u[1] * along];
  ctx.beginPath();
  const q = [pt(c, 1, 6.5, 1), pt(c, -1, 6.5, 1), pt(h, -1, 9.5, -8), pt(h, 1, 9.5, -8)];
  ctx.moveTo(q[0][0], q[0][1]);
  for (const v of q.slice(1)) {
    ctx.lineTo(v[0], v[1]);
  }
  ctx.closePath();
  figFill(fill, 2 * J.m, J.ink);
  figSeg(pt(h, 1, 8, 6), pt(h, -1, 8, 6), 2 * J.m, J.ink);
}
function drawMitt(h, col, m) {
  ctx.beginPath();
  ctx.arc(h[0], h[1], 4.8, 0, Math.PI * 2);
  figFill('#fff', 2.2 * m, col);
}
function drawBoot(f, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(f[0] + 3.5, f[1] + 1.5, 7.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawHead(B, hc, hr, ink, m) {
  ctx.beginPath();
  if (B.sketch) {
    const a0 = jit(5) * 3;
    for (let i = 0; i <= 26; i++) {
      const a = a0 + (i / 24) * Math.PI * 2;
      const r = hr * (1 + 0.06 * Math.sin(a * 3 + SK.seed));
      ctx[i ? 'lineTo' : 'moveTo'](hc[0] + Math.cos(a) * r, hc[1] + Math.sin(a) * r);
    }
    figFill('#fff', 2.4 * m, ink);
    return;
  }
  ctx.arc(hc[0], hc[1], hr, 0, Math.PI * 2);
  if (!B.hollow) {
    ctx.fillStyle = ink;
    ctx.fill();
  } else {
    figFill('#fff', 3.6 * m, ink);
  }
  if (B.eyes) {
    const y0 = hc[1] - hr * 0.22, y1 = hc[1] + hr * 0.12;
    figSeg([hc[0] + hr * 0.12, y0], [hc[0] + hr * 0.12, y1], 2.6 * m, ink);
    figSeg([hc[0] + hr * 0.52, y0], [hc[0] + hr * 0.52, y1], 2.6 * m, ink);
  }
  if (B.googly) {
    const r = hr * 0.34;
    for (const [ex, ey] of [[hc[0] + hr * 0.02, hc[1] - hr * 0.18], [hc[0] + hr * 0.6, hc[1] - hr * 0.12]]) {
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      figFill('#fff', 1.1 * m, ink);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex + r * 0.38, ey + r * 0.1, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// opts: { flip: true } faces left, { ink, far } recolours (goons are drawn all grey), { scale } resizes,
// { style, shirt } pick the body (see FIG_STYLE), { lw } thickens every line (icons, share images),
// { rot, pivot } tips the whole body around a point in figure space (falls, rolls), { seed } varies sketch lines,
// { live: false } for one-off drawings such as the share image (skips joint smoothing between frames),
// and under/mid/over(J) draw props behind the body, between the body and the front arm, and on top.
// J gives the joints in figure space: head (centre), hr (head radius), k (head scale for hats), chest, hip,
// handF, handB, eF, eB, ax (the pose's prop angle), ink, far, m (line weight) and goon.
function drawFigure(a, x, y, breath, opts) {
  const o = opts || {};
  const style = o.style || FIG_STYLE;
  const B = BODY[style] || BODY.classic;
  const m = o.lw || 1;
  const ink = o.ink || COL.fig || COL.ink;
  const far = B.sameFar ? ink : o.far || FAR;
  const p = breathe(a.pose, breath || 0);
  const af = Math.min(1, Math.abs(p.face));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((o.flip ? -1 : 1) * (o.scale || 1), o.scale || 1);
  if (o.rot) {
    const pv = o.pivot || [0, -8];
    ctx.translate(pv[0], pv[1]);
    ctx.rotate(o.rot);
    ctx.translate(-pv[0], -pv[1]);
  }
  SK = B.sketch ? { seed: (o.seed || 0) * 7.3 + Math.floor(performance.now() / 130) * 3.1 } : null;
  const sx = p.chest[0] - p.hip[0], sy = p.chest[1] - p.hip[1];
  const sl = Math.hypot(sx, sy) || 1;
  const u = [sx / sl, sy / sl];
  const n = [-u[1], u[0]];
  const sideOff = 6.2 * (1 - af);
  const shF = [p.chest[0] + n[0] * sideOff - u[0], p.chest[1] + n[1] * sideOff - u[1]];
  const shB = [p.chest[0] - n[0] * sideOff - u[0], p.chest[1] - n[1] * sideOff - u[1]];
  const key = a.id || 'me';
  const solve = o.live === false ? (k, aa, bb, l1, l2, h, bd) => ik(aa, bb, l1, l2, h, bd) : (k, aa, bb, l1, l2, h, bd) => ikC(key + k, aa, bb, l1, l2, h, bd);
  const kF = solve('kF', p.hip, p.fF, THIGH, SHIN, p.kF, KNEE_BEND);
  const kB = solve('kB', p.hip, p.fB, THIGH, SHIN, p.kB, KNEE_BEND);
  const handF = reach(shF, p.hF, UARM + FARM);
  const handB = reach(shB, relax(shB, p.hB, p.hang), UARM + FARM);
  const eF = solve('eF', shF, handF, UARM, FARM, p.eF, ARM_BEND);
  const eB = solve('eB', shB, handB, UARM, FARM, p.eB, ARM_BEND);
  const hr = HEAD_R * B.head;
  const hd = [p.head[0] - p.chest[0], p.head[1] - p.chest[1]];
  const hl = Math.hypot(hd[0], hd[1]) || 1;
  const hu = [hd[0] / hl, hd[1] / hl];
  const neck = B.hollow ? 13 + hr : 20.5 + (hr - HEAD_R) * 0.9;
  const hc = [p.chest[0] + hu[0] * neck, p.chest[1] + hu[1] * neck];
  const J = { head: hc, hr, k: B.head, chest: p.chest, hip: p.hip, handF, handB, eF, eB, shF, shB, ax: p.ax || 0, ink, far, m, goon: !!o.goon, style };
  const tag = (limb, side) => ({ limb, id: key + limb + side });
  if (o.under) {
    o.under(J);
  }
  strokePath([shB, eB, handB], ARM * m * B.arm, far, tag('arm', 'B'));
  if (B.mitts) {
    drawMitt(handB, far, m);
  }
  strokePath([p.hip, kB, p.fB], LIMB * m * B.leg, far, tag('leg', 'B'));
  if (B.mitts) {
    drawBoot(p.fB, far);
  }
  const neckTop = B.hollow ? [hc[0] - hu[0] * hr, hc[1] - hu[1] * hr] : [p.chest[0] + u[0] * 0.5, p.chest[1] + u[1] * 0.5];
  strokePath([[p.hip[0] + u[0], p.hip[1] + u[1]], neckTop], B.torso * m, ink);
  strokePath([p.hip, kF, p.fF], LIMB * m * B.leg, ink, tag('leg', 'F'));
  if (B.mitts) {
    drawBoot(p.fF, ink);
  }
  if (B.shirt) {
    drawShirt(p, u, n, J, o.shirt || COL.butterHi || '#fcd34d');
  }
  drawHead(B, hc, hr, ink, m);
  if (o.mid) {
    o.mid(J);
  }
  strokePath([shF, eF, handF], ARM * m * B.arm, ink, tag('arm', 'F'));
  if (B.mitts) {
    drawMitt(handF, ink, m);
  }
  if (o.over) {
    o.over(J);
  }
  SK = null;
  ctx.restore();
  return J;
}

// ── Ink drawing ────────────────────────────────────────────────────────────
// Ground is a wobbly line at y = 0 in world space, never a filled floor.

function line(x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const WOBBLE = Array.from({ length: 512 }, (_, i) => Math.sin(i * 0.37) * 0.35 + Math.sin(i * 1.71 + 1) * 0.22);
function drawGround(xl, xr) {
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const x0 = Math.floor(xl / 6) * 6;
  for (let x = x0; x <= xr + 6; x += 6) {
    const w = WOBBLE[((x / 6) % 512 + 512) % 512];
    if (x === x0) {
      ctx.moveTo(x, w);
    } else {
      ctx.lineTo(x, w);
    }
  }
  ctx.stroke();
}
function contactShadow(x, w, a, y) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, (y || 0) + 1.2, w, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
// Fill and outline the current path: roundRect(...); inkShape('#fff', 1.5);
function inkShape(fill, lw) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw || 1.5;
  ctx.strokeStyle = COL.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
// A thick outlined stick, for handles, poles, planks.
function inkBar(x0, y0, x1, y1, w, fill) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = w + 3;
  line(x0, y0, x1, y1);
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  line(x0, y0, x1, y1);
}

// ── Popups, particles and shake ────────────────────────────────────────────
// popup('Perfect!', 'CHAIN ×2', true) over the action; burst() for hits; dust() for landings.
// Call updateFx(dt) in update() and drawBits(); drawPopups(left, right) last in render(), in world space.

const popups = [];
const bits = [];
let shake = 0, shakeV = 0;

function popup(text, sub, hot, x, y) {
  popups.push({ text, sub, hot, x, y, t: 0 });
}
function burst(x, y, n) {
  const cols = ['#141414', '#141414', '#8d8d8d', '#c8c8c8'];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const sp = 70 + Math.random() * 120;
    bits.push({ x: x + (Math.random() - 0.5) * 30, y: y - 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 18, c: cols[i % cols.length], t: 0, life: 0.8 + Math.random() * 0.5, w: 2 + Math.random() * 1.6, g: 260, drag: 1.5 });
  }
}
function dust(x, y, w, n) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    bits.push({ x: x + side * (w / 2 - 2 - Math.random() * 6), y: y - 1, vx: side * (35 + Math.random() * 75), vy: -(4 + Math.random() * 22), r: (Math.random() - 0.5) * 0.5, vr: (Math.random() - 0.5) * 4, c: i % 3 ? '#b0b0b0' : '#8d8d8d', t: 0, life: 0.3 + Math.random() * 0.25, w: 2 + Math.random() * 2.5, g: 80, drag: 5 });
  }
}
// kick() on big moments; offset the camera by `shake` pixels in render().
function kick(amount) {
  shakeV += amount;
}
function updateFx(dt) {
  shakeV += (-260 * shake - 15 * shakeV) * dt;
  shake += shakeV * dt;
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].t += dt;
    if (popups[i].t > 1.1) {
      popups.splice(i, 1);
    }
  }
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    b.t += dt;
    b.vy += b.g * dt;
    b.vx *= 1 - Math.min(1, b.drag * dt);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.r += b.vr * dt;
    if (b.t > b.life) {
      bits.splice(i, 1);
    }
  }
}
function drawBits() {
  for (const b of bits) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - b.t / b.life);
    ctx.translate(b.x, b.y);
    ctx.rotate(b.r);
    ctx.fillStyle = b.c;
    const bh = b.h || 1.8;
    ctx.fillRect(-b.w / 2, -bh / 2, b.w, bh);
    ctx.restore();
  }
}
// left/right are the visible world edges, so popups never get cut off on narrow phones.
function drawPopups(left, right) {
  for (const p of popups) {
    const k = p.t / 1.1;
    const a = k < 0.12 ? k / 0.12 : clamp(1 - (k - 0.55) / 0.45, 0, 1);
    const y = p.y - 26 - 24 * EASE.out(Math.min(1, k * 1.3));
    const sc = 1 + 0.22 * Math.max(0, 1 - k * 5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = "400 24px 'Balsamiq Sans', system-ui, sans-serif";
    let half = ctx.measureText(p.text).width / 2;
    if (p.sub) {
      ctx.font = "400 10px 'Balsamiq Sans', system-ui, sans-serif";
      half = Math.max(half, ctx.measureText(p.sub).width / 2 + p.sub.length * 0.75);
    }
    half = half * sc + 10;
    const x = right - left > half * 2 ? clamp(p.x, left + half, right - half) : (left + right) / 2;
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = p.hot ? COL.accent : COL.ink;
    ctx.font = "400 24px 'Balsamiq Sans', system-ui, sans-serif";
    ctx.fillText(p.text, 0, 0);
    if (p.sub) {
      ctx.font = "400 10px 'Balsamiq Sans', system-ui, sans-serif";
      ctx.letterSpacing = '1.5px';
      ctx.fillText(p.sub, 0, 12);
      ctx.letterSpacing = '0px';
    }
    ctx.restore();
  }
}
// ── Sound ──────────────────────────────────────────────────────────────────
// Everything is synthesized. Call audio() inside the first tap/key handler (browsers block sound before that).
// partial() is a pitched blip, hiss() a filtered noise burst; mix a few for each sound.

let actx = null, bus = null, verb = null;
function audio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = actx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.connect(actx.destination);
      bus = actx.createGain();
      bus.gain.value = 0.9;
      bus.connect(comp);
      const len = Math.floor(actx.sampleRate * 1.1);
      const ir = actx.createBuffer(2, len, actx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
      }
      const conv = actx.createConvolver();
      conv.buffer = ir;
      verb = actx.createGain();
      verb.gain.value = 0.16;
      verb.connect(conv).connect(comp);
    } catch (e) {
      actx = null;
    }
  }
  if (actx && actx.state === 'suspended') {
    actx.resume();
  }
}
function voice(wet) {
  const g = actx.createGain();
  g.gain.value = 0;
  g.connect(bus);
  if (wet) {
    const w = actx.createGain();
    w.gain.value = wet;
    g.connect(w).connect(verb);
  }
  return g;
}
function partial(freq, f1, dur, vol, type, wet, delay) {
  if (!actx || vol < 0.003) {
    return;
  }
  const t = actx.currentTime + (delay || 0);
  const o = actx.createOscillator();
  const g = voice(wet);
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (f1 && f1 !== freq) {
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function hiss(dur, vol, type, f0, f1, q, wet, attack, delay) {
  if (!actx || vol < 0.003) {
    return;
  }
  const t = actx.currentTime + (delay || 0);
  const n = Math.max(1, Math.floor(actx.sampleRate * dur));
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = Math.random() * 2 - 1;
  }
  const src = actx.createBufferSource();
  src.buffer = buf;
  const f = actx.createBiquadFilter();
  f.type = type;
  f.Q.value = q || 0.7;
  f.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) {
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  }
  const g = voice(wet);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + (attack || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  src.start(t);
}
function buzz(ms) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch (e) {
    return;
  }
}
// A starter set; tune pitches and volumes to the game.
const SND = {
  thunk(k) {
    partial(108, 50, 0.22, 0.6 * k, 'sine', 0.12);
    hiss(0.07, 0.34 * k, 'bandpass', 430, 240, 1.1, 0.18);
  },
  tok(k) {
    partial(190, 140, 0.07, 0.3 * k, 'sine', 0.1);
    hiss(0.03, 0.16 * k, 'bandpass', 520, 400, 1.2, 0.1);
  },
  whoosh() {
    hiss(0.25, 0.08, 'bandpass', 600, 1600, 1.4, 0.1, 0.06);
  },
  perfect() {
    partial(1568, 1568, 0.5, 0.035, 'sine', 0.5, 0.04);
    partial(2093, 2093, 0.45, 0.028, 'sine', 0.5, 0.1);
  },
  streak(m) {
    const base = m >= 6 ? 784 : 659;
    partial(base, base, 0.22, 0.045, 'triangle', 0.4);
    partial(base * 1.5, base * 1.5, 0.3, 0.035, 'triangle', 0.4, 0.08);
  },
  record() {
    [523, 659, 784, 1047].forEach((f, i) => {
      partial(f, f, 0.32, 0.05, 'triangle', 0.45, 0.1 + i * 0.075);
    });
  },
  lose() {
    partial(220, 90, 0.5, 0.25, 'triangle', 0.3);
    hiss(0.3, 0.1, 'lowpass', 900, 200, 0.7, 0.3);
  },
};

// ── Kid effects ────────────────────────────────────────────────────────────
// confetti(x, y, n): coloured paper bits (same `bits` list as burst()). drawStar(x, y, r, rot) traces a star path.
function confetti(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8;
    const sp = 120 + Math.random() * 220;
    bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 20, c: PAL[i % PAL.length], t: 0, life: 1 + Math.random() * 0.8, w: 7 + Math.random() * 6, h: 4 + Math.random() * 3, g: 380, drag: 1.2 });
  }
}
function drawStar(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
// Fill the visible screen with a faint wobbly ground line and nothing else.
function groundLine() {
  const R = screenRect();
  drawGround(R.l - 20, R.r + 20);
}
// A squash-and-stretch helper: call wobble.hit(id) on a tap, read wobble.get(id) as a scale factor.
const wobble = {
  v: new Map(),
  hit(id, amt) {
    const w = this.v.get(id) || { k: 0, v: 0 };
    w.v += amt || 6;
    this.v.set(id, w);
  },
  update(dt) {
    for (const [id, w] of this.v) {
      w.v += (-120 * w.k - 9 * w.v) * dt;
      w.k += w.v * dt;
      if (Math.abs(w.k) < 0.001 && Math.abs(w.v) < 0.01) {
        this.v.delete(id);
      }
    }
  },
  get(id) {
    const w = this.v.get(id);
    return w ? w.k * 0.12 : 0;
  },
};

// ── Kid sounds ─────────────────────────────────────────────────────────────
// Notes come from a pentatonic scale, so anything a toddler mashes still sounds nice.
const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const note = (i, dur, vol, type) => partial(PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length], 0, dur || 0.5, vol || 0.18, type || 'triangle', 0.35);
Object.assign(SND, {
  pop(i) {
    hiss(0.09, 0.3, 'bandpass', 1800, 700, 0.8, 0.15);
    note(i || 0, 0.35, 0.16, 'sine');
  },
  boing(k) {
    partial(180 + 90 * (k || 0), 420 + 140 * (k || 0), 0.28, 0.25, 'sine', 0.2);
    partial(90, 160, 0.2, 0.2, 'triangle', 0.1);
  },
  cheer() {
    [523, 659, 784, 1047].forEach((f, i) => partial(f, f * 1.01, 0.28, 0.07, 'triangle', 0.45, i * 0.06));
  },
  splash() {
    hiss(0.35, 0.22, 'bandpass', 900, 300, 0.6, 0.3, 0.01);
    partial(300, 120, 0.2, 0.15, 'sine', 0.3);
  },
  honk() {
    partial(310, 300, 0.25, 0.14, 'sawtooth', 0.2);
    partial(370, 360, 0.25, 0.1, 'sawtooth', 0.2);
  },
  crash() {
    hiss(0.7, 0.4, 'lowpass', 1400, 120, 0.7, 0.35, 0.005);
    partial(70, 40, 0.5, 0.4, 'sine', 0.2);
  },
  chomp() {
    partial(240, 120, 0.1, 0.2, 'square', 0.1);
    hiss(0.06, 0.12, 'bandpass', 900, 600, 1, 0.1);
  },
  bubble() {
    partial(500 + Math.random() * 300, 1100, 0.1, 0.1, 'sine', 0.3);
  },
  drum(i) {
    if (i % 3 === 0) {
      partial(140, 55, 0.3, 0.5, 'sine', 0.15);
    } else if (i % 3 === 1) {
      hiss(0.18, 0.28, 'bandpass', 2200, 900, 0.9, 0.2);
      partial(220, 160, 0.12, 0.18, 'triangle', 0.1);
    } else {
      hiss(0.07, 0.2, 'highpass', 7000, 6000, 0.7, 0.2);
    }
  },
});
// Mute is a parent setting shared by every page (see shell.js).
function applyMute() {
  if (bus) {
    bus.gain.value = window.GK && GK.muted() ? 0 : 0.9;
  }
}

// ── The game shell ─────────────────────────────────────────────────────────
// kid({ view, setup, update(dt), draw(R), down(x, y, id), move(x, y, id), up(x, y, id), key(code) }) starts a game.
//  - view: partial VIEW (world box) for this game.
//  - down / move / up get world coordinates; id is the pointer (so several fingers work).
//  - Mouse and touch both work. On a keyboard, any key is a tap at a random spot (the game can use key() for
//    something smarter and return true). Arrow keys call game.arrow(dx, dy) if it exists, else act as a tap.
//  - ?bot taps and drags at random by itself, which the checks use. No game ever ends.
// Audio needs one tap first, so the first press starts it. There is no start screen: the game is already playing.

let game = null, clock = 0;
const keyHeld = new Set();
function randomSpot() {
  const R = screenRect();
  const w = Math.min(R.r, VIEW.x1) - Math.max(R.l, VIEW.x0), h = VIEW.y1 - VIEW.y0;
  return [Math.max(R.l, VIEW.x0) + Math.random() * w, VIEW.y0 + h * 0.15 + Math.random() * h * 0.7];
}
function toWorldEv(e) {
  return toWorld(e.clientX, e.clientY);
}
function kid(g) {
  game = g;
  Object.assign(VIEW, g.view || {});
  function resize() {
    fitView();
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
  }
  addEventListener('resize', resize);
  resize();
  if (g.setup) {
    g.setup();
  }

  const press = (x, y, id) => {
    audio();
    applyMute();
    if (game.down) {
      game.down(x, y, id);
    }
  };
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (err) {
      // not all pointers can be captured
    }
    const [x, y] = toWorldEv(e);
    press(x, y, e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (game.move && e.buttons !== 0 || game.move && e.pointerType === 'touch') {
      const [x, y] = toWorldEv(e);
      game.move(x, y, e.pointerId);
    }
  });
  const release = (e) => {
    const [x, y] = toWorldEv(e);
    if (game.up) {
      game.up(x, y, e.pointerId);
    }
  };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('gesturestart', (e) => e.preventDefault());

  // Keyboard (Mac laptops): any key is a tap at a random spot unless the game handles it.
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.code === 'Escape' || e.code === 'Tab') {
      return;
    }
    e.preventDefault();
    audio();
    applyMute();
    if (e.repeat || keyHeld.has(e.code)) {
      return;
    }
    keyHeld.add(e.code);
    if (game.key && game.key(e.code, true)) {
      return;
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.code] && game.arrow) {
      game.arrow(arrows[e.code][0], arrows[e.code][1]);
      return;
    }
    const [x, y] = randomSpot();
    press(x, y, 'key');
    setTimeout(() => game.up && game.up(x, y, 'key'), 90);
  });
  addEventListener('keyup', (e) => {
    keyHeld.delete(e.code);
    if (game.key) {
      game.key(e.code, false);
    }
  });

  // Test bot: random taps and short drags, like a toddler mashing the screen.
  let botIn = 0.6, botUp = 0, botPos = null;
  function bot(dt) {
    botIn -= dt;
    if (botPos && (botUp -= dt) <= 0) {
      game.up && game.up(botPos[0], botPos[1], 'bot');
      botPos = null;
    }
    if (botIn <= 0 && !botPos) {
      botPos = randomSpot();
      botIn = 0.15 + Math.random() * 0.5;
      botUp = 0.05 + Math.random() * 0.5;
      press(botPos[0], botPos[1], 'bot');
      if (game.move) {
        for (let i = 1; i <= 4; i++) {
          setTimeout(() => botPos && game.move(botPos[0] + i * 12, botPos[1] - i * 6, 'bot'), i * 60);
        }
      }
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    clock += dt;
    if (BOT) {
      bot(dt);
    }
    wobble.update(dt);
    updateFx(dt);
    if (game.update) {
      game.update(dt);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.x, dpr * (cam.y + shake));
    game.draw(screenRect());
    drawBits();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
