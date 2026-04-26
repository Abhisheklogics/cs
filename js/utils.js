// ============================================================
//  utils.js  —  Shared helpers for ALL modules
// ============================================================

// ── Activation Functions ──────────────────────────────────
const Activations = {
  step: {
    fn:      x => x >= 0 ? 1 : 0,
    dFn:     x => 0,
    formula: "f(x) = 1 if x ≥ 0, else 0",
    label:   "Step",
    desc:    "Binary output: fires (1) or doesn't fire (0). Like a light switch. Used in early perceptrons."
  },
  sigmoid: {
    fn:      x => 1 / (1 + Math.exp(-x)),
    dFn:     x => { const s = 1/(1+Math.exp(-x)); return s*(1-s); },
    formula: "f(x) = 1 / (1 + e^-x)",
    label:   "Sigmoid σ",
    desc:    "Smooth S-curve, output always in (0,1). Good for probability outputs. Suffers from vanishing gradient."
  },
  relu: {
    fn:      x => Math.max(0, x),
    dFn:     x => x > 0 ? 1 : 0,
    formula: "f(x) = max(0, x)",
    label:   "ReLU",
    desc:    "Most popular for hidden layers. Fast, avoids vanishing gradient. Negative inputs → 0 (dead neurons risk)."
  },
  tanh: {
    fn:      x => Math.tanh(x),
    dFn:     x => 1 - Math.tanh(x)**2,
    formula: "f(x) = tanh(x) = (e^x - e^-x) / (e^x + e^-x)",
    label:   "Tanh",
    desc:    "Zero-centered, range (-1,+1). Better than sigmoid for hidden layers. Still suffers from vanishing gradient."
  }
};

// ── Math helpers ──────────────────────────────────────────
const round = (v, n = 4) => Math.round(v * 10**n) / 10**n;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randFloat = (lo = -1, hi = 1) => lo + Math.random() * (hi - lo);
const randInt   = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const makeArray = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
const sum  = arr => arr.reduce((s, v) => s + v, 0);

// ── Canvas helpers ────────────────────────────────────────
function clearCanvas(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#0e1520';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawLabel(ctx, text, x, y, color = '#e8eef8', size = 12, bold = false) {
  ctx.save();
  ctx.font = `${bold ? '700' : '400'} ${size}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawNode(ctx, x, y, r, fillColor, strokeColor = '#2a3d58', label = '', value = null) {
  ctx.save();
  // Glow
  if (fillColor !== '#0e1520' && fillColor !== '#141d2b') {
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  if (value !== null) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(round(value, 2), x, y);
  }
  if (label) {
    ctx.fillStyle = '#7b8faa';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - r - 9);
  }
  ctx.restore();
}

function drawLine(ctx, x1, y1, x2, y2, color = '#2a3d58', width = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// Draw activation curve on a canvas
function drawActivationCurve(canvas, activationName) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx);

  const fn  = Activations[activationName].fn;
  const pad = 24;
  const midY = H / 2;
  const midX = W / 2;

  // Grid lines
  for (let v = -3; v <= 3; v++) {
    const px = midX + (v / 4) * (W/2 - pad);
    ctx.strokeStyle = '#1b2538';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H-pad); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#2a3d58';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, midY); ctx.lineTo(W-pad, midY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(midX, pad); ctx.lineTo(midX, H-pad); ctx.stroke();

  // Axis labels
  ['−4','−2','0','2','4'].forEach((lbl, i) => {
    const px = pad + (i / 4) * (W - pad*2);
    ctx.fillStyle = '#3d5068';
    ctx.font = '8px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, px, midY + 12);
  });
  ctx.textAlign = 'right';
  ctx.fillStyle = '#3d5068';
  ctx.font = '8px JetBrains Mono';
  ctx.fillText('1', midX - 4, pad + 4);
  ctx.fillText('0', midX - 4, midY + 4);
  ctx.fillText('-1', midX - 4, H - pad - 2);

  // Curve
  ctx.save();
  ctx.strokeStyle = '#00e5a0';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00e5a0';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let px = pad; px <= W - pad; px++) {
    const x = ((px - midX) / (W/2 - pad)) * 4;
    const y = fn(x);
    const py = midY - y * (H/2 - pad);
    if (px === pad) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Label
  ctx.fillStyle = '#7b8faa';
  ctx.font = 'bold 9px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText(activationName.toUpperCase(), W/2, H - 6);
}

// Weight color: green=positive, red=negative, dim=near-zero
function weightColor(w) {
  const abs = Math.abs(w);
  if (abs < 0.05) return '#1b2538';
  if (w > 0) return `rgba(0,229,160,${clamp(abs, 0.15, 0.9)})`;
  return `rgba(255,92,92,${clamp(abs, 0.15, 0.9)})`;
}

// ── Log helpers ───────────────────────────────────────────
function logLine(divId, text, cssClass = '') {
  const el = document.getElementById(divId);
  if (!el) return;
  const line = document.createElement('div');
  line.className = cssClass;
  line.textContent = text;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function clearLog(divId, header = '') {
  const el = document.getElementById(divId);
  if (!el) return;
  el.innerHTML = '';
  if (header) logLine(divId, header, 'log-title');
}

// ── Tooltip ───────────────────────────────────────────────
const _tooltip = () => document.getElementById('tooltip');
function showTooltip(html, x, y) {
  const t = _tooltip();
  t.innerHTML = html;
  t.style.left = (x+14) + 'px';
  t.style.top  = (y+14) + 'px';
  t.classList.remove('hidden');
}
function hideTooltip() { _tooltip()?.classList.add('hidden'); }

// ── Exports ───────────────────────────────────────────────
window.Activations       = Activations;
window.round             = round;
window.clamp             = clamp;
window.randFloat         = randFloat;
window.randInt           = randInt;
window.makeArray         = makeArray;
window.mean              = mean;
window.sum               = sum;
window.clearCanvas       = clearCanvas;
window.drawLabel         = drawLabel;
window.drawNode          = drawNode;
window.drawLine          = drawLine;
window.drawActivationCurve = drawActivationCurve;
window.weightColor       = weightColor;
window.logLine           = logLine;
window.clearLog          = clearLog;
window.showTooltip       = showTooltip;
window.hideTooltip       = hideTooltip;