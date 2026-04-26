// ============================================================
//  rnn-core.js  —  Recurrent Neural Network LOGIC (no DOM)
//
//  Contains:
//    1. RNNCell     — Vanilla RNN cell (Elman network)
//    2. LSTMCell    — Long Short-Term Memory cell
//    3. RNN         — Full network (stack of cells + output layer)
//    4. TextDataset — Character-level dataset builder
//    5. TimeSeriesDataset — Numeric sequence dataset
//
//  REAL LIFE CONNECTION:
//    RNN  = language models, speech recognition (before Transformers)
//    LSTM = Google Translate, Siri, stock prediction, music generation
//    Char-RNN = the famous Karpathy experiment that inspired GPT
//
//  IMPLEMENTATION NOTE:
//    We use pure JS (no Pyodide here — Pyodide runs in rnn-ui.js
//    for Python code execution). This core handles the live
//    step-by-step visualization. Pyodide handles actual training
//    with real Python libraries for the "Python mode" button.
// ============================================================


// ════════════════════════════════════════════════════════════
//  ACTIVATION FUNCTIONS (extended for RNN)
// ════════════════════════════════════════════════════════════

const RNNActivations = {
  tanh: {
    fn:  x => Math.tanh(x),
    der: x => 1 - Math.tanh(x) ** 2,
    label: 'tanh'
  },
  sigmoid: {
    fn:  x => 1 / (1 + Math.exp(-x)),
    der: x => { const s = 1/(1+Math.exp(-x)); return s*(1-s); },
    label: 'σ'
  },
  relu: {
    fn:  x => Math.max(0, x),
    der: x => x > 0 ? 1 : 0,
    label: 'ReLU'
  }
};

function softmax(arr) {
  const max = Math.max(...arr);
  const exp = arr.map(v => Math.exp(v - max));
  const sum = exp.reduce((a,b) => a+b, 0);
  return exp.map(v => v/sum);
}


// ════════════════════════════════════════════════════════════
//  1. VANILLA RNN CELL (Elman)
//
//  Equations:
//    h_t = tanh( W_hh · h_{t-1}  +  W_xh · x_t  +  b_h )
//    y_t = W_hy · h_t  +  b_y
//
//  State h_t is the "memory" — passed to next time step.
//  Real life: simple sequence tasks, but suffers from
//  vanishing gradient for long sequences → use LSTM instead.
// ════════════════════════════════════════════════════════════

class RNNCell {

  constructor(inputSize, hiddenSize) {
    this.inputSize  = inputSize;
    this.hiddenSize = hiddenSize;

    // Xavier initialisation
    const xh_scale = Math.sqrt(2 / (inputSize + hiddenSize));
    const hh_scale = Math.sqrt(2 / hiddenSize);

    this.W_xh = rnn_randMat(hiddenSize, inputSize,  xh_scale);
    this.W_hh = rnn_randMat(hiddenSize, hiddenSize, hh_scale);
    this.b_h  = new Array(hiddenSize).fill(0);

    this.h    = new Array(hiddenSize).fill(0); // hidden state
  }

  // Single time-step forward pass
  // Returns { h, z } where z is pre-activation
  forward(x) {
    const z = this.b_h.map((b, j) => {
      let s = b;
      // W_xh · x
      for (let i = 0; i < this.inputSize; i++)  s += this.W_xh[j][i] * x[i];
      // W_hh · h_{t-1}
      for (let i = 0; i < this.hiddenSize; i++) s += this.W_hh[j][i] * this.h[i];
      return s;
    });
    this.h = z.map(v => Math.tanh(v));
    return { h: this.h.slice(), z: z.slice() };
  }

  reset() {
    this.h = new Array(this.hiddenSize).fill(0);
  }

  // Serialise gradients for display (first 4 values)
  gradientSummary(dh) {
    return dh.slice(0, 4).map(v => round(v, 5));
  }
}


// ════════════════════════════════════════════════════════════
//  2. LSTM CELL
//
//  Gates:
//    f_t = σ( W_f · [h_{t-1}, x_t] + b_f )   ← forget gate
//    i_t = σ( W_i · [h_{t-1}, x_t] + b_i )   ← input gate
//    g_t = tanh( W_g · [h_{t-1}, x_t] + b_g ) ← cell gate
//    o_t = σ( W_o · [h_{t-1}, x_t] + b_o )   ← output gate
//
//  Cell & hidden state:
//    c_t = f_t ⊙ c_{t-1}  +  i_t ⊙ g_t
//    h_t = o_t ⊙ tanh(c_t)
//
//  Real life: LSTM powers Google Translate (pre-Transformer),
//  Siri, most NLP models before 2017, and music generation.
// ════════════════════════════════════════════════════════════

class LSTMCell {

  constructor(inputSize, hiddenSize) {
    this.inputSize  = inputSize;
    this.hiddenSize = hiddenSize;
    const n  = inputSize + hiddenSize;
    const sc = Math.sqrt(2/n);

    // One weight matrix per gate (concat [h,x] input)
    this.W_f = rnn_randMat(hiddenSize, n, sc);
    this.W_i = rnn_randMat(hiddenSize, n, sc);
    this.W_g = rnn_randMat(hiddenSize, n, sc);
    this.W_o = rnn_randMat(hiddenSize, n, sc);

    // Forget gate bias initialised to 1 (helps gradient flow early)
    this.b_f = new Array(hiddenSize).fill(1);
    this.b_i = new Array(hiddenSize).fill(0);
    this.b_g = new Array(hiddenSize).fill(0);
    this.b_o = new Array(hiddenSize).fill(0);

    this.h = new Array(hiddenSize).fill(0); // hidden state
    this.c = new Array(hiddenSize).fill(0); // cell state
  }

  // Forward pass — returns gate values for visualisation
  forward(x) {
    const hx = [...this.h, ...x]; // concat

    const gate = (W, b, actFn) => {
      return W.map((row, j) => {
        const z = b[j] + row.reduce((s, w, i) => s + w*hx[i], 0);
        return actFn(z);
      });
    };

    const sig  = v => 1/(1+Math.exp(-v));

    const f = gate(this.W_f, this.b_f, sig);
    const i = gate(this.W_i, this.b_i, sig);
    const g = gate(this.W_g, this.b_g, Math.tanh);
    const o = gate(this.W_o, this.b_o, sig);

    // Cell state: forget old + add new
    this.c = this.c.map((cv, j) => f[j]*cv + i[j]*g[j]);
    // Hidden state
    this.h = o.map((ov, j) => ov * Math.tanh(this.c[j]));

    return {
      h: this.h.slice(), c: this.c.slice(),
      gates: { f, i, g, o }
    };
  }

  reset() {
    this.h = new Array(this.hiddenSize).fill(0);
    this.c = new Array(this.hiddenSize).fill(0);
  }
}


// ════════════════════════════════════════════════════════════
//  3. FULL RNN NETWORK
//  - Stack of RNN or LSTM cells
//  - Linear output layer (for regression) or softmax (for classification)
//  - BPTT (Backprop Through Time) — simplified 1-step version
// ════════════════════════════════════════════════════════════

class RNNNetwork {

  constructor(config = {}) {
    this.inputSize   = config.inputSize   || 1;
    this.hiddenSize  = config.hiddenSize  || 16;
    this.outputSize  = config.outputSize  || 1;
    this.cellType    = config.cellType    || 'lstm'; // 'rnn' | 'lstm'
    this.lr          = config.lr          || 0.01;
    this.taskType    = config.taskType    || 'regression'; // 'regression' | 'classification'

    this.cell = this.cellType === 'lstm'
      ? new LSTMCell(this.inputSize, this.hiddenSize)
      : new RNNCell(this.inputSize,  this.hiddenSize);

    // Output layer: hiddenSize → outputSize
    const sc = Math.sqrt(2/this.hiddenSize);
    this.W_y = rnn_randMat(this.outputSize, this.hiddenSize, sc);
    this.b_y = new Array(this.outputSize).fill(0);

    this.lossHistory = [];
    this.stepHistory = []; // detailed per-step log for viz
  }

  // Forward through a sequence, collecting states for viz
  forwardSequence(sequence) {
    this.cell.reset();
    const steps = [];

    for (const x of sequence) {
      const inp = Array.isArray(x) ? x : [x];
      const cellOut = this.cell.forward(inp);
      const h = cellOut.h;

      // Output layer
      const y_raw = this.W_y.map((row, j) =>
        this.b_y[j] + row.reduce((s, w, i) => s + w*h[i], 0)
      );
      const y_out = this.taskType === 'classification' ? softmax(y_raw) : y_raw;

      steps.push({
        input:   inp,
        h:       h.slice(),
        c:       cellOut.c ? cellOut.c.slice() : null,
        gates:   cellOut.gates || null,
        y_raw,
        y_out
      });
    }

    return steps;
  }

  // Train one sequence (MSE loss, simple gradient step)
  trainStep(sequence, targets, lr) {
    const steps   = this.forwardSequence(sequence);
    const preds   = steps.map(s => s.y_out[0]);
    const losses  = preds.map((p, i) => (p - (targets[i] || 0)) ** 2);
    const totalMSE = losses.reduce((a,b)=>a+b,0) / losses.length;

    // Simplified gradient update on output weights only (demo)
    for (let t = 0; t < steps.length; t++) {
      const err   = preds[t] - (targets[t] || 0);
      const dLoss = 2 * err / steps.length;
      const h     = steps[t].h;
      this.W_y[0] = this.W_y[0].map((w, i) => w - (lr || this.lr) * dLoss * h[i]);
      this.b_y[0] -= (lr || this.lr) * dLoss;
    }

    this.lossHistory.push(round(totalMSE, 6));
    return { steps, preds, losses, totalMSE };
  }

  reset() {
    this.lossHistory = [];
    this.stepHistory = [];
    this.cell.reset();
  }
}


// ════════════════════════════════════════════════════════════
//  4. TEXT DATASET (character-level)
//
//  Converts text → one-hot vectors.
//  Real life: char-RNN (Karpathy), early language models.
// ════════════════════════════════════════════════════════════

class TextDataset {

  constructor(text) {
    this.text  = text;
    this.chars = [...new Set(text)].sort();
    this.size  = this.chars.length;
    this.ch2i  = Object.fromEntries(this.chars.map((c,i) => [c,i]));
    this.i2ch  = Object.fromEntries(this.chars.map((c,i) => [i,c]));
  }

  // One-hot encode a character
  encode(ch) {
    const v = new Array(this.size).fill(0);
    v[this.ch2i[ch] ?? 0] = 1;
    return v;
  }

  // Get input-target pairs for a window
  getSequence(start, len) {
    const seq    = [];
    const targets = [];
    for (let i = start; i < Math.min(start+len, this.text.length-1); i++) {
      seq.push(this.encode(this.text[i]));
      targets.push(this.ch2i[this.text[i+1]]);
    }
    return { seq, targets };
  }

  // Decode index → char
  decode(i) { return this.i2ch[i] ?? '?'; }
}


// ════════════════════════════════════════════════════════════
//  5. TIME SERIES DATASET
//
//  Generates common sequences for regression tasks.
//  Real life: stock prices, weather prediction, ECG signals.
// ════════════════════════════════════════════════════════════

const TimeSeriesDatasets = {

  sine(n = 60, freq = 1, noise = 0.05) {
    const t = makeArray(n, i => i / n * 2 * Math.PI * freq);
    return t.map(v => Math.sin(v) + (Math.random()-0.5)*noise*2);
  },

  sawtooth(n = 60) {
    return makeArray(n, i => ((i % 20) / 20) * 2 - 1);
  },

  random_walk(n = 60) {
    const data = [0];
    for (let i = 1; i < n; i++) {
      data.push(Math.max(-1, Math.min(1, data[i-1] + (Math.random()-0.5)*0.3)));
    }
    return data;
  },

  xor_sequence(n = 40) {
    const data = makeArray(n, () => randInt(0,1));
    const targets = data.map((v,i) => i===0 ? 0 : v ^ data[i-1]);
    return { inputs: data, targets };
  },

  fibonacci(n = 20) {
    const data = [0, 1];
    for (let i=2; i<n; i++) data.push(data[i-1]+data[i-2]);
    const maxV = Math.max(...data);
    return data.map(v => v/maxV);
  }
};


// ════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════

// Create a matrix of given size with random normal values * scale
function rnn_randMat(rows, cols, scale = 0.1) {
  return makeArray(rows, () =>
    makeArray(cols, () => (Math.random()*2-1) * scale)
  );
}


// ── Export ────────────────────────────────────────────────
window.RNNCell            = RNNCell;
window.LSTMCell           = LSTMCell;
window.RNNNetwork         = RNNNetwork;
window.TextDataset        = TextDataset;
window.TimeSeriesDatasets = TimeSeriesDatasets;
window.RNNActivations     = RNNActivations;
window.softmax            = softmax;