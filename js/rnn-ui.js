// ============================================================
//  rnn-ui.js  —  RNN + LSTM Tab: Full UI + Pyodide Python mode
//
//  Tabs:
//    1. Time Series   — predict sine/sawtooth/random walk
//    2. Text (Char-RNN) — learn character patterns
//    3. Python Mode   — real training via Pyodide + NumPy
//
//  Features:
//    - Step-by-step unrolled RNN / LSTM visualization
//    - Gate value heatmap for LSTM (f,i,g,o gates)
//    - Hidden state bar chart (live update)
//    - Loss curve per epoch
//    - Pyodide: run actual Python/NumPy RNN in browser
//    - Upload custom CSV dataset
//    - Pre-built datasets (sine, XOR, text snippets)
// ============================================================

// ── Module state ──────────────────────────────────────────
let rnn_model       = null;
let rnn_dataset     = null;
let rnn_trainTimer  = null;
let rnn_pyodide     = null;
let rnn_pyReady     = false;
let rnn_customData  = null;
let rnn_epoch       = 0;


// ════════════════════════════════════════════════════════════
//  BUILD HTML
// ════════════════════════════════════════════════════════════

function buildRnnTab() {
  const container = document.getElementById('tab-rnn');
  container.innerHTML = `
    <div class="panel-layout">

      <!-- LEFT: Controls -->
      <div class="control-panel">

        <div class="concept-box">
          <strong>Recurrent Neural Networks</strong><br>
          RNNs process <em>sequences</em> by maintaining a hidden state
          that carries context from past steps. LSTM adds gating to
          control what to remember and forget — solving the vanishing
          gradient problem of vanilla RNNs.
          <code class="formula">h_t = tanh(W_hh·h_{t-1} + W_xh·x_t + b)</code>
        </div>

        <!-- Sub-tabs -->
        <div class="nav-tabs" style="margin-bottom:14px;flex-wrap:wrap;gap:5px">
          <button class="nav-tab active" onclick="rnn_switchTab('ts',this)">Time Series</button>
          <button class="nav-tab"        onclick="rnn_switchTab('text',this)">Char-RNN</button>
          <button class="nav-tab"        onclick="rnn_switchTab('py',this)">🐍 Python Mode</button>
        </div>

        <!-- ── TIME SERIES PANEL ── -->
        <div id="rnn-panel-ts">

          <h3>Network Architecture</h3>

          <div class="form-group">
            <label>Cell Type</label>
            <select id="rnn-cell-type">
              <option value="lstm">LSTM (recommended)</option>
              <option value="rnn">Vanilla RNN</option>
            </select>
          </div>

          <div class="form-group">
            <label>Hidden Units</label>
            <div class="slider-row">
              <input type="range" id="rnn-hidden" min="4" max="64" step="4" value="16">
              <span class="slider-val" id="rnn-hidden-val">16</span>
            </div>
          </div>

          <div class="form-group">
            <label>Learning Rate</label>
            <div class="slider-row">
              <input type="range" id="rnn-lr" min="0.001" max="0.1" step="0.001" value="0.01">
              <span class="slider-val" id="rnn-lr-val">0.01</span>
            </div>
          </div>

          <h3>Dataset</h3>

          <div class="form-group">
            <label>Sequence Type</label>
            <select id="rnn-seq-type">
              <option value="sine">Sine Wave (smooth, easy)</option>
              <option value="sawtooth">Sawtooth (sharp edges)</option>
              <option value="random_walk">Random Walk (noisy)</option>
              <option value="fibonacci">Fibonacci (normalized)</option>
              <option value="custom">Custom CSV Upload</option>
            </select>
          </div>

          <div id="rnn-csv-upload" style="display:none">
            <div class="dip-upload-zone" onclick="document.getElementById('rnn-csv-inp').click()"
                 style="padding:10px;margin-bottom:8px">
              <input type="file" id="rnn-csv-inp" accept=".csv,.txt" style="display:none">
              <strong style="font-size:.82rem">Upload CSV (1 column of numbers)</strong>
            </div>
          </div>

          <div class="form-group">
            <label>Sequence Length</label>
            <div class="slider-row">
              <input type="range" id="rnn-seqlen" min="10" max="80" step="5" value="40">
              <span class="slider-val" id="rnn-seqlen-val">40</span>
            </div>
          </div>

          <div class="form-group">
            <label>Look-back window (steps to predict from)</label>
            <div class="slider-row">
              <input type="range" id="rnn-lookback" min="2" max="20" step="1" value="8">
              <span class="slider-val" id="rnn-lookback-val">8</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary"   id="rnn-init-btn">Init Network</button>
            <button class="btn btn-secondary" id="rnn-step-btn" disabled>▶ One Step</button>
            <button class="btn btn-accent"    id="rnn-train-btn" disabled>⟳ Train 50</button>
            <button class="btn btn-ghost"     id="rnn-reset-btn">Reset</button>
          </div>

          <div class="form-group">
            <label>Animation Speed</label>
            <div class="slider-row">
              <input type="range" id="rnn-speed" min="100" max="1500" step="100" value="500">
              <span class="slider-val" id="rnn-speed-val">500ms</span>
            </div>
          </div>

        </div>

        <!-- ── CHAR-RNN PANEL ── -->
        <div id="rnn-panel-text" style="display:none">
          <h3>Character-Level RNN</h3>
          <div class="concept-box" style="font-size:.8rem">
            <strong>Char-RNN</strong> (Karpathy, 2015): feed characters one by one.
            The RNN learns to predict the <em>next character</em>.
            Given enough data and training, it generates text that
            mimics the style of the input corpus.
          </div>

          <div class="form-group">
            <label>Text Corpus</label>
            <select id="rnn-text-preset">
              <option value="abc">Simple ABC sequence</option>
              <option value="hello">Hello World pattern</option>
              <option value="math">Math sequences (1+2=3)</option>
              <option value="custom">Custom text input</option>
            </select>
          </div>

          <div class="form-group" id="rnn-custom-text-wrap" style="display:none">
            <label>Custom text (min 50 chars)</label>
            <textarea id="rnn-custom-text" rows="3"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:.78rem;padding:8px;border-radius:7px;resize:vertical"
              placeholder="Enter any text here…"></textarea>
          </div>

          <div class="form-group">
            <label>Hidden Size</label>
            <div class="slider-row">
              <input type="range" id="rnn-text-hidden" min="8" max="64" step="8" value="32">
              <span class="slider-val" id="rnn-text-hidden-val">32</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary"   id="rnn-text-init-btn">Init Char-RNN</button>
            <button class="btn btn-accent"    id="rnn-text-train-btn" disabled>⟳ Train 100 Steps</button>
            <button class="btn btn-secondary" id="rnn-text-gen-btn"   disabled>✦ Generate Text</button>
          </div>
        </div>

        <!-- ── PYTHON MODE PANEL ── -->
        <div id="rnn-panel-py" style="display:none">
          <h3>🐍 Python Mode (Pyodide)</h3>
          <div class="concept-box" style="font-size:.8rem">
            <strong>Real Python in the browser!</strong> Pyodide runs
            CPython + NumPy + Matplotlib inside WebAssembly.
            Write actual Python RNN code and run it here.
            <em>First load takes ~5-10 seconds (downloads Pyodide).</em>
          </div>

          <div class="form-group">
            <label>Python script</label>
            <select id="rnn-py-preset" onchange="rnn_loadPyPreset()">
              <option value="vanilla_rnn">Vanilla RNN (NumPy)</option>
              <option value="lstm_numpy">LSTM forward pass (NumPy)</option>
              <option value="train_sine">Train on sine wave</option>
              <option value="custom">Custom script</option>
            </select>
          </div>

          <div style="position:relative">
            <textarea id="rnn-py-code" rows="12"
              style="width:100%;background:#0d1117;border:1px solid var(--border);color:#e4e9f5;font-family:var(--font-mono);font-size:.75rem;padding:10px;border-radius:8px;resize:vertical;line-height:1.6"
              spellcheck="false"></textarea>
          </div>

          <div class="btn-row" style="margin-top:8px">
            <button class="btn btn-primary"   id="rnn-py-load-btn"  onclick="rnn_initPyodide()">Load Pyodide</button>
            <button class="btn btn-accent"    id="rnn-py-run-btn"   onclick="rnn_runPython()" disabled>▶ Run Python</button>
            <button class="btn btn-secondary" id="rnn-py-clear-btn" onclick="rnn_clearPyOutput()">Clear Output</button>
          </div>

          <div style="font-family:var(--font-mono);font-size:.72rem;color:var(--text3);margin-top:4px" id="rnn-py-status">
            Click "Load Pyodide" to start Python runtime
          </div>

          <div class="form-group" style="margin-top:8px">
            <label>Custom CSV Data for Python</label>
            <div class="dip-upload-zone" onclick="document.getElementById('rnn-py-csv').click()"
                 style="padding:8px;font-size:.78rem">
              <input type="file" id="rnn-py-csv" accept=".csv" style="display:none">
              <span>Upload CSV → available as <code>data</code> variable</span>
            </div>
          </div>
        </div>

        <!-- Shared log -->
        <div class="calc-log" id="rnn-log" style="margin-top:12px">
          <div class="log-hint">Initialise a network to begin…</div>
        </div>
      </div>

      <!-- RIGHT: Visualisations -->
      <div class="viz-area">

        <!-- Unrolled RNN diagram -->
        <div class="canvas-card">
          <h4>Unrolled RNN / LSTM
            <span style="color:var(--text3);font-size:.68rem"> — each box = one time step</span>
          </h4>
          <canvas id="rnn-unroll-canvas" width="680" height="200"></canvas>
        </div>

        <!-- LSTM Gate Heatmap -->
        <div class="canvas-card" id="rnn-gate-card" style="display:none">
          <h4>LSTM Gate Values
            <span style="color:var(--text3);font-size:.68rem"> — per hidden unit per time step</span>
          </h4>
          <canvas id="rnn-gate-canvas" width="680" height="140"></canvas>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-family:var(--font-mono);font-size:.72rem;color:var(--text2)">
            <span>🔵 Forget gate (f): what to erase from cell</span>
            <span>🟢 Input gate (i): what new info to store</span>
            <span>🟡 Output gate (o): what to expose to output</span>
          </div>
        </div>

        <!-- Hidden state bar chart -->
        <div class="canvas-card">
          <h4>Hidden State (h_t)
            <span style="color:var(--text3);font-size:.68rem"> — each bar = one hidden unit activation</span>
          </h4>
          <canvas id="rnn-hidden-canvas" width="680" height="100"></canvas>
        </div>

        <!-- Prediction + Loss chart -->
        <div class="canvas-card">
          <h4>Prediction vs Target &amp; Loss</h4>
          <canvas id="rnn-pred-canvas" width="680" height="130"></canvas>
        </div>

        <!-- Python output -->
        <div class="canvas-card" id="rnn-py-output-card" style="display:none">
          <h4>Python Output</h4>
          <pre id="rnn-py-output"
            style="font-family:var(--font-mono);font-size:.75rem;color:var(--green);background:var(--bg0);padding:12px;border-radius:6px;overflow-x:auto;max-height:320px;overflow-y:auto;white-space:pre-wrap"></pre>
          <canvas id="rnn-py-plot" width="680" height="200" style="display:none;margin-top:10px"></canvas>
        </div>

        <!-- Char-RNN output -->
        <div class="canvas-card" id="rnn-text-card" style="display:none">
          <h4>Generated Text</h4>
          <div id="rnn-text-output"
            style="font-family:var(--font-mono);font-size:.82rem;color:var(--green);background:var(--bg0);padding:12px;border-radius:6px;min-height:60px;line-height:1.8;letter-spacing:.05em"></div>
        </div>

      </div>
    </div>
  `;

  rnn_attachEvents();
  rnn_loadPyPreset();
  rnn_drawUnrolled(null);
}


// ════════════════════════════════════════════════════════════
//  SUB-TAB SWITCHING
// ════════════════════════════════════════════════════════════

function rnn_switchTab(name, btn) {
  ['ts','text','py'].forEach(t => {
    document.getElementById('rnn-panel-'+t).style.display = t===name ? '' : 'none';
  });
  document.getElementById('rnn-py-output-card').style.display = name==='py' ? '' : 'none';
  document.getElementById('rnn-text-card').style.display      = name==='text' ? '' : 'none';
  document.querySelectorAll('#tab-rnn .nav-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}


// ════════════════════════════════════════════════════════════
//  EVENT WIRING
// ════════════════════════════════════════════════════════════

function rnn_attachEvents() {

  ['rnn-hidden','rnn-lr','rnn-seqlen','rnn-lookback','rnn-speed',
   'rnn-text-hidden'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', e => {
      const val = e.target.id === 'rnn-lr' ? e.target.value
                : e.target.id === 'rnn-speed' ? e.target.value+'ms'
                : e.target.value;
      document.getElementById(id+'-val').textContent = val;
    });
  });

  document.getElementById('rnn-seq-type').addEventListener('change', e => {
    document.getElementById('rnn-csv-upload').style.display =
      e.target.value === 'custom' ? '' : 'none';
  });

  document.getElementById('rnn-text-preset').addEventListener('change', e => {
    document.getElementById('rnn-custom-text-wrap').style.display =
      e.target.value === 'custom' ? '' : 'none';
  });

  document.getElementById('rnn-init-btn').addEventListener('click', rnn_initNetwork);
  document.getElementById('rnn-step-btn').addEventListener('click', rnn_oneStep);
  document.getElementById('rnn-train-btn').addEventListener('click', rnn_trainToggle);
  document.getElementById('rnn-reset-btn').addEventListener('click', rnn_reset);

  document.getElementById('rnn-text-init-btn').addEventListener('click',  rnn_initCharRNN);
  document.getElementById('rnn-text-train-btn').addEventListener('click', rnn_trainCharRNN);
  document.getElementById('rnn-text-gen-btn').addEventListener('click',   rnn_generateText);

  document.getElementById('rnn-csv-inp').addEventListener('change',    rnn_loadCSV);
  document.getElementById('rnn-py-csv').addEventListener('change',     rnn_loadPyCSV);
}


// ════════════════════════════════════════════════════════════
//  TIME SERIES — INIT & TRAINING
// ════════════════════════════════════════════════════════════

function rnn_getDataset() {
  const type   = document.getElementById('rnn-seq-type').value;
  const seqLen = parseInt(document.getElementById('rnn-seqlen').value);

  if (type === 'custom' && rnn_customData) return rnn_customData;

  return TimeSeriesDatasets[type]
    ? TimeSeriesDatasets[type](seqLen)
    : TimeSeriesDatasets.sine(seqLen);
}

function rnn_initNetwork() {
  clearLog('rnn-log', '═══ Network Initialised ═══');

  rnn_dataset = rnn_getDataset();
  const cellType  = document.getElementById('rnn-cell-type').value;
  const hidden    = parseInt(document.getElementById('rnn-hidden').value);
  const lr        = parseFloat(document.getElementById('rnn-lr').value);

  rnn_model = new RNNNetwork({
    inputSize:  1,
    hiddenSize: hidden,
    outputSize: 1,
    cellType,
    lr,
    taskType: 'regression'
  });
  rnn_epoch = 0;

  logLine('rnn-log', `Cell: ${cellType.toUpperCase()} | Hidden: ${hidden} | LR: ${lr}`, 'log-concept');
  logLine('rnn-log', `Dataset: ${document.getElementById('rnn-seq-type').value} | Length: ${rnn_dataset.length}`, 'log-math');

  if (cellType === 'lstm') {
    logLine('rnn-log', 'LSTM gates: Forget (f) + Input (i) + Cell (g) + Output (o)', 'log-concept');
    logLine('rnn-log', 'h_t = o ⊙ tanh(c_t) where c_t = f⊙c_{t-1} + i⊙g', 'log-math');
  } else {
    logLine('rnn-log', 'Vanilla RNN: h_t = tanh(W_xh·x + W_hh·h_{t-1} + b)', 'log-math');
  }

  document.getElementById('rnn-step-btn').disabled  = false;
  document.getElementById('rnn-train-btn').disabled = false;
  document.getElementById('rnn-gate-card').style.display = cellType === 'lstm' ? '' : 'none';

  rnn_drawUnrolled(null);
  rnn_drawHiddenState([]);
  rnn_drawPrediction([], []);
}

function rnn_oneStep() {
  if (!rnn_model || !rnn_dataset) return;

  const lookback = parseInt(document.getElementById('rnn-lookback').value);
  const start    = rnn_epoch % Math.max(1, rnn_dataset.length - lookback - 1);
  const seq      = rnn_dataset.slice(start, start + lookback);
  const target   = rnn_dataset.slice(start + 1, start + lookback + 1);

  const { steps, preds, totalMSE } = rnn_model.trainStep(seq, target);
  rnn_epoch++;

  clearLog('rnn-log', `═══ Step ${rnn_epoch} ═══`);
  logLine('rnn-log', `Time window: [${start} … ${start+lookback-1}]`, 'log-concept');

  // Log first 3 steps
  steps.slice(0, 3).forEach((s, t) => {
    logLine('rnn-log', `t=${t}: x=${seq[t]?.toFixed(3)} → ŷ=${s.y_out[0]?.toFixed(4)}`, 'log-math');
    if (s.gates) {
      const g = s.gates;
      logLine('rnn-log',
        `  f̄=${round(mean(g.f),3)} ī=${round(mean(g.i),3)} ō=${round(mean(g.o),3)}`,
        'log-math'
      );
    }
  });
  if (steps.length > 3) logLine('rnn-log', `  … +${steps.length-3} more steps`, 'log-note');
  logLine('rnn-log', `MSE loss: ${totalMSE.toFixed(6)}`, 'log-result');

  rnn_drawUnrolled(steps.slice(0, 8));
  rnn_drawHiddenState(steps[steps.length-1].h);
  rnn_drawPrediction(preds, target);
  if (steps[0].gates) rnn_drawGateHeatmap(steps.slice(0, 8));
}

function rnn_trainToggle() {
  if (rnn_trainTimer) {
    clearInterval(rnn_trainTimer);
    rnn_trainTimer = null;
    document.getElementById('rnn-train-btn').textContent = '⟳ Train 50';
    document.getElementById('rnn-train-btn').className   = 'btn btn-accent';
    return;
  }
  const speed = parseInt(document.getElementById('rnn-speed').value);
  document.getElementById('rnn-train-btn').textContent = '⏹ Stop';
  document.getElementById('rnn-train-btn').className   = 'btn btn-ghost';
  let steps = 50;
  rnn_trainTimer = setInterval(() => {
    rnn_oneStep();
    steps--;
    if (steps <= 0) rnn_trainToggle();
  }, speed);
}

function rnn_reset() {
  clearInterval(rnn_trainTimer);
  rnn_trainTimer = null;
  rnn_model = null;
  rnn_dataset = null;
  rnn_epoch = 0;
  document.getElementById('rnn-step-btn').disabled  = true;
  document.getElementById('rnn-train-btn').disabled = true;
  document.getElementById('rnn-train-btn').textContent = '⟳ Train 50';
  document.getElementById('rnn-train-btn').className   = 'btn btn-accent';
  document.getElementById('rnn-gate-card').style.display = 'none';
  clearLog('rnn-log', 'Reset — initialise a new network');
  rnn_drawUnrolled(null);
  rnn_drawHiddenState([]);
  rnn_drawPrediction([], []);
}

function rnn_loadCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.trim().split('\n');
    rnn_customData = lines.map(l => parseFloat(l.split(',')[0])).filter(v => !isNaN(v));
    const maxV = Math.max(...rnn_customData.map(Math.abs)) || 1;
    rnn_customData = rnn_customData.map(v => v/maxV); // normalise
    logLine('rnn-log', `CSV loaded: ${rnn_customData.length} values (normalised)`, 'log-result');
  };
  reader.readAsText(file);
}


// ════════════════════════════════════════════════════════════
//  CHAR-RNN
// ════════════════════════════════════════════════════════════

const RNN_TEXT_PRESETS = {
  abc:    'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz',
  hello:  'hello world hello world hello world hello world',
  math:   '1+1=2 2+2=4 3+3=6 4+4=8 5+5=10 1+2=3 2+3=5 3+4=7 4+5=9'
};

let rnn_textModel = null;
let rnn_textDS    = null;

function rnn_initCharRNN() {
  const preset = document.getElementById('rnn-text-preset').value;
  const text   = preset === 'custom'
    ? document.getElementById('rnn-custom-text').value
    : RNN_TEXT_PRESETS[preset] || RNN_TEXT_PRESETS.abc;

  if (text.length < 10) {
    logLine('rnn-log', '⚠ Text too short (min 10 chars)', 'log-error');
    return;
  }

  rnn_textDS = new TextDataset(text);
  const hidden = parseInt(document.getElementById('rnn-text-hidden').value);

  rnn_textModel = new RNNNetwork({
    inputSize:  rnn_textDS.size,
    hiddenSize: hidden,
    outputSize: rnn_textDS.size,
    cellType:   'lstm',
    taskType:   'classification'
  });

  clearLog('rnn-log', '═══ Char-RNN Initialised ═══');
  logLine('rnn-log', `Vocabulary: ${rnn_textDS.size} unique chars`, 'log-concept');
  logLine('rnn-log', `Chars: [${rnn_textDS.chars.slice(0,10).join(' ')}${rnn_textDS.size>10?'…':''}]`, 'log-math');
  logLine('rnn-log', `Architecture: ${rnn_textDS.size} → LSTM(${hidden}) → ${rnn_textDS.size}`, 'log-math');
  logLine('rnn-log', 'Task: predict next character given current', 'log-note');

  document.getElementById('rnn-text-train-btn').disabled = false;
  document.getElementById('rnn-text-gen-btn').disabled   = false;
}

function rnn_trainCharRNN() {
  if (!rnn_textModel || !rnn_textDS) return;
  const lr = 0.05;
  let totalLoss = 0;

  for (let step = 0; step < 100; step++) {
    const start = randInt(0, rnn_textDS.text.length - 10);
    const { seq, targets } = rnn_textDS.getSequence(start, 8);
    const lr_use = lr * (1 / (1 + step * 0.001));
    const res = rnn_textModel.trainStep(seq, targets, lr_use);
    totalLoss += res.totalMSE;
  }

  rnn_epoch += 100;
  logLine('rnn-log', `Trained 100 steps | epoch=${rnn_epoch} | avg loss=${round(totalLoss/100,4)}`, 'log-result');
}

function rnn_generateText() {
  if (!rnn_textModel || !rnn_textDS) return;
  const len  = 40;
  let   seed = rnn_textDS.text[0];
  let   out  = seed;

  rnn_textModel.cell.reset();

  for (let i = 0; i < len; i++) {
    const x   = rnn_textDS.encode(seed);
    const res = rnn_textModel.forwardSequence([x]);
    const probs = res[0].y_out;

    // Temperature sampling (0.8)
    const temp = 0.8;
    const scaled = probs.map(p => Math.pow(Math.max(p, 1e-9), 1/temp));
    const sum    = scaled.reduce((a,b) => a+b, 0);
    const norm   = scaled.map(v => v/sum);

    // Sample
    let r = Math.random(), cumul = 0, chosen = 0;
    for (let j = 0; j < norm.length; j++) {
      cumul += norm[j];
      if (r <= cumul) { chosen = j; break; }
    }
    seed = rnn_textDS.decode(chosen);
    out += seed;
  }

  document.getElementById('rnn-text-card').style.display = '';
  document.getElementById('rnn-text-output').textContent = out;
  logLine('rnn-log', 'Generated: "' + out + '"', 'log-result');
  logLine('rnn-log', `Note: more training → more coherent output`, 'log-note');
}



const RNN_PY_PRESETS = {
  vanilla_rnn: `import numpy as np

# ── Vanilla RNN Forward Pass ──────────────────────────────
# Equations:
#   h_t = tanh(W_xh @ x_t  +  W_hh @ h_{t-1}  +  b_h)
#   y_t = W_hy @ h_t  +  b_y

np.random.seed(42)
input_size  = 3   # e.g. 3 features
hidden_size = 4   # hidden units
output_size = 2   # output classes

# Xavier initialisation
W_xh = np.random.randn(hidden_size, input_size)  * np.sqrt(2/input_size)
W_hh = np.random.randn(hidden_size, hidden_size) * np.sqrt(2/hidden_size)
W_hy = np.random.randn(output_size, hidden_size) * np.sqrt(2/hidden_size)
b_h  = np.zeros(hidden_size)
b_y  = np.zeros(output_size)

# Example sequence: 5 time steps
T  = 5
xs = np.random.randn(T, input_size)
h  = np.zeros(hidden_size)   # initial hidden state

print("=== Vanilla RNN Forward Pass ===")
print(f"Input size: {input_size}, Hidden: {hidden_size}, Output: {output_size}")
print()

hs, ys = [], []
for t, x in enumerate(xs):
    z = W_xh @ x + W_hh @ h + b_h
    h = np.tanh(z)
    y = W_hy @ h + b_y
    hs.append(h.copy())
    ys.append(y.copy())
    print(f"t={t}: x={np.round(x,3)}")
    print(f"     z={np.round(z,4)} (pre-tanh)")
    print(f"     h={np.round(h,4)} (hidden state)")
    print(f"     y={np.round(y,4)} (output)")
    print()

print(f"All hidden states shape: ({T}, {hidden_size})")
print(f"Final hidden state: {np.round(hs[-1], 4)}")
`,

  lstm_numpy: `import numpy as np

# ── LSTM Forward Pass ─────────────────────────────────────
# Gates:
#   f = sigma(W_f @ [h,x] + b_f)   <- forget gate
#   i = sigma(W_i @ [h,x] + b_i)   <- input gate
#   g = tanh(W_g @ [h,x] + b_g)    <- cell gate
#   o = sigma(W_o @ [h,x] + b_o)   <- output gate
# State:
#   c = f * c_prev + i * g          <- cell state
#   h = o * tanh(c)                 <- hidden state

np.random.seed(0)
H, X = 8, 3   # hidden size, input size
N = H + X     # concat size

def sigmoid(x): return 1 / (1 + np.exp(-x))

# Init all gate weights (bias for forget gate = 1 for stability)
W_f = np.random.randn(H, N) * 0.1; b_f = np.ones(H)
W_i = np.random.randn(H, N) * 0.1; b_i = np.zeros(H)
W_g = np.random.randn(H, N) * 0.1; b_g = np.zeros(H)
W_o = np.random.randn(H, N) * 0.1; b_o = np.zeros(H)

h = np.zeros(H)
c = np.zeros(H)

print("=== LSTM Forward Pass ===")
T = 4
for t in range(T):
    x  = np.random.randn(X)
    hx = np.concatenate([h, x])
    f  = sigmoid(W_f @ hx + b_f)
    i  = sigmoid(W_i @ hx + b_i)
    g  = np.tanh(W_g  @ hx + b_g)
    o  = sigmoid(W_o @ hx + b_o)
    c  = f * c + i * g
    h  = o * np.tanh(c)
    print(f"t={t}:  f̄={f.mean():.3f}  ī={i.mean():.3f}  ō={o.mean():.3f}")
    print(f"      c̄={c.mean():.4f}  h̄={h.mean():.4f}")
    print()

print(f"Final h: {np.round(h, 4)}")
print(f"Final c: {np.round(c, 4)}")
print("Forget gate close to 1 = remembers; close to 0 = forgets")
`,

  train_sine: `import numpy as np

# ── Train RNN on Sine Wave ────────────────────────────────
# Task: given t, predict sin(t + 0.1)
# Simple single-layer RNN with gradient descent

np.random.seed(1)
T       = 60
t_vals  = np.linspace(0, 4*np.pi, T)
y_vals  = np.sin(t_vals)

H, lr = 8, 0.01
W_xh = np.random.randn(H, 1)  * 0.1
W_hh = np.random.randn(H, H)  * 0.1
W_hy = np.random.randn(1, H)  * 0.1
b_h  = np.zeros(H)
b_y  = 0.0

def sigmoid(x): return 1/(1+np.exp(-x))

losses = []
for epoch in range(200):
    h = np.zeros(H)
    total_loss = 0
    for t in range(T-1):
        x_t = np.array([y_vals[t]])
        z   = W_xh @ x_t + W_hh @ h + b_h
        h   = np.tanh(z)
        y_  = (W_hy @ h + b_y)[0]
        err = y_ - y_vals[t+1]
        total_loss += err**2
        # Simple output-layer gradient
        dW_hy = err * h
        W_hy -= lr * dW_hy
        b_y  -= lr * err
    mse = total_loss / (T-1)
    losses.append(mse)
    if epoch % 40 == 0:
        print(f"Epoch {epoch:3d}: MSE = {mse:.6f}")

print()
print(f"Final MSE: {losses[-1]:.6f}")
print(f"Improvement: {losses[0]/losses[-1]:.1f}x reduction in loss")
print("Note: Full BPTT would improve this further!")
print(f"Loss values (every 40 epochs): {[round(losses[i],5) for i in range(0,200,40)]}")
`
};

function rnn_loadPyPreset() {
  const preset = document.getElementById('rnn-py-preset').value;
  const code   = RNN_PY_PRESETS[preset] || '# Write your Python RNN code here\nimport numpy as np\n\nprint("Hello from Pyodide!")\n';
  document.getElementById('rnn-py-code').value = code;
}

async function rnn_initPyodide() {
  const statusEl = document.getElementById('rnn-py-status');
  const loadBtn  = document.getElementById('rnn-py-load-btn');
  const runBtn   = document.getElementById('rnn-py-run-btn');

  statusEl.textContent = 'Loading Pyodide… (this may take 5-15 seconds)';
  statusEl.style.color = 'var(--amber)';
  loadBtn.disabled = true;

  try {
    // Load Pyodide from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload  = resolve;
      script.onerror = reject;
    });

    rnn_pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
    });

    // Load numpy
    statusEl.textContent = 'Loading NumPy…';
    await rnn_pyodide.loadPackage('numpy');

    rnn_pyReady = true;
    statusEl.textContent = '✓ Python ready! NumPy loaded. Press ▶ Run Python.';
    statusEl.style.color = 'var(--green)';
    runBtn.disabled = false;
    loadBtn.textContent = '✓ Loaded';

    logLine('rnn-log', 'Pyodide + NumPy loaded ✓', 'log-result');
    logLine('rnn-log', 'CPython running in WebAssembly in your browser!', 'log-note');

  } catch (err) {
    statusEl.textContent = '✗ Failed: ' + err.message;
    statusEl.style.color = 'var(--red)';
    loadBtn.disabled = false;
    logLine('rnn-log', 'Pyodide load failed: ' + err.message, 'log-error');
    logLine('rnn-log', 'Try refreshing. Needs network access to cdn.jsdelivr.net', 'log-note');
  }
}

async function rnn_runPython() {
  if (!rnn_pyReady || !rnn_pyodide) {
    logLine('rnn-log', '⚠ Load Pyodide first!', 'log-error');
    return;
  }

  const code      = document.getElementById('rnn-py-code').value;
  const outputEl  = document.getElementById('rnn-py-output');
  const outputCard= document.getElementById('rnn-py-output-card');
  const runBtn    = document.getElementById('rnn-py-run-btn');

  outputCard.style.display = '';
  outputEl.textContent     = '⟳ Running…';
  runBtn.disabled          = true;

  try {
    // Redirect stdout to capture print() output
    rnn_pyodide.runPython(`
import sys
import io
_stdout_capture = io.StringIO()
sys.stdout = _stdout_capture
`);

    // Inject custom CSV data if uploaded
    if (rnn_customData) {
      rnn_pyodide.globals.set('data', rnn_pyodide.toPy(rnn_customData));
      rnn_pyodide.runPython(`import numpy as np; data = np.array(data)`);
    }

    // Run user code
    rnn_pyodide.runPython(code);

    // Collect output
    const output = rnn_pyodide.runPython(`_stdout_capture.getvalue()`);
    rnn_pyodide.runPython(`sys.stdout = sys.__stdout__`);

    outputEl.textContent = output || '(No output — add print() statements)';
    logLine('rnn-log', 'Python executed ✓', 'log-result');

  } catch (err) {
    rnn_pyodide.runPython(`import sys; sys.stdout = sys.__stdout__`).catch(()=>{});
    outputEl.textContent = '❌ Error:\n' + err.message;
    outputEl.style.color = 'var(--red)';
    logLine('rnn-log', 'Python error: ' + err.message.split('\n')[0], 'log-error');
  }

  outputEl.style.color = 'var(--green)';
  runBtn.disabled = false;
}

function rnn_clearPyOutput() {
  document.getElementById('rnn-py-output').textContent = '';
  document.getElementById('rnn-py-output-card').style.display = 'none';
}

function rnn_loadPyCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const vals = ev.target.result.trim().split('\n')
      .map(l => parseFloat(l.split(',')[0])).filter(v => !isNaN(v));
    rnn_customData = vals;
    logLine('rnn-log', `CSV loaded: ${vals.length} values → available as 'data' in Python`, 'log-result');
  };
  reader.readAsText(file);
}


// ════════════════════════════════════════════════════════════
//  CANVAS: Unrolled RNN Diagram
// ════════════════════════════════════════════════════════════

function rnn_drawUnrolled(steps) {
  const canvas = document.getElementById('rnn-unroll-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const maxSteps = steps ? Math.min(steps.length, 8) : 6;
  const pad  = 30;
  const step = (W - pad*2) / Math.max(maxSteps, 1);
  const midY = H / 2;
  const r    = 22;

  const cellType = rnn_model ? rnn_model.cellType : 'lstm';

  for (let t = 0; t < maxSteps; t++) {
    const x = pad + t * step + step/2;
    const s = steps ? steps[t] : null;

    // Arrow from previous cell
    if (t > 0) {
      const px = pad + (t-1)*step + step/2;
      ctx.beginPath();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth   = 2;
      ctx.moveTo(px + r, midY);
      ctx.lineTo(x - r, midY);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.moveTo(x-r, midY-5);
      ctx.lineTo(x-r+8, midY);
      ctx.lineTo(x-r, midY+5);
      ctx.fill();
      // h_{t-1} label
      ctx.fillStyle = '#8b96b4';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`h_${t-1}`, (px+r+x-r)/2, midY - 8);
    }

    // Cell box
    const active = s ? clamp(Math.abs(mean(s.h || [0])), 0, 1) : 0;
    const alpha  = s ? (0.3 + active*0.6).toFixed(2) : '0.15';
    ctx.fillStyle   = cellType === 'lstm'
      ? `rgba(96,165,250,${alpha})`
      : `rgba(167,139,250,${alpha})`;
    ctx.strokeStyle = cellType === 'lstm' ? '#60a5fa' : '#a78bfa';
    ctx.lineWidth   = s ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x - r*1.5, midY - r, r*3, r*2, 6);
    ctx.fill();
    ctx.stroke();

    // Cell label
    ctx.fillStyle = '#e4e9f5';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cellType.toUpperCase(), x, midY + 4);

    // Input arrow (from below)
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3,3]);
    ctx.moveTo(x, midY + r);
    ctx.lineTo(x, H - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Input label
    ctx.fillStyle = '#fbbf24';
    ctx.font = '9px monospace';
    if (s) {
      ctx.fillText(`x=${s.input[0]?.toFixed(2)}`, x, H - 6);
    } else {
      ctx.fillText(`x_${t}`, x, H - 6);
    }

    // Output arrow (to above)
    ctx.beginPath();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3,3]);
    ctx.moveTo(x, midY - r);
    ctx.lineTo(x, 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Output label
    ctx.fillStyle = '#34d399';
    ctx.font = '9px monospace';
    if (s) {
      ctx.fillText(`ŷ=${s.y_out[0]?.toFixed(2)}`, x, 12);
    } else {
      ctx.fillText(`y_${t}`, x, 12);
    }
  }

  // "…" if more steps
  if (steps && steps.length > maxSteps) {
    ctx.fillStyle = '#4a5578';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('…', W - 16, midY + 5);
  }
}


// ════════════════════════════════════════════════════════════
//  CANVAS: LSTM Gate Heatmap
// ════════════════════════════════════════════════════════════

function rnn_drawGateHeatmap(steps) {
  const canvas = document.getElementById('rnn-gate-canvas');
  if (!canvas || !steps?.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const gates   = ['f', 'i', 'o'];
  const colors  = ['#60a5fa', '#34d399', '#fbbf24'];
  const rowH    = Math.floor((H - 8) / 3);
  const nSteps  = Math.min(steps.length, 8);

  steps.slice(0, nSteps).forEach((s, t) => {
    if (!s.gates) return;
    gates.forEach((g, gi) => {
      const vals = s.gates[g];
      if (!vals) return;
      const nH  = Math.min(vals.length, 16);
      const cW  = Math.floor((W - 50) / nSteps / nH);
      vals.slice(0, nH).forEach((v, hi) => {
        const x = 45 + (t * nH + hi) * cW;
        const y = 4 + gi * rowH;
        ctx.fillStyle = hexToRgba(colors[gi], v.toFixed(2));
        ctx.fillRect(x, y, cW-1, rowH-4);
      });
    });
  });

  // Labels
  gates.forEach((g, gi) => {
    ctx.fillStyle = colors[gi];
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(g + ' gate', 42, 4 + gi*rowH + rowH/2 + 3);
  });

  // Time step labels
  ctx.fillStyle = '#4a5578';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  for (let t = 0; t < nSteps; t++) {
    const nH = Math.min(steps[0]?.gates?.f?.length || 4, 16);
    const cW = Math.floor((W - 50) / nSteps / nH);
    ctx.fillText(`t${t}`, 45 + t*nH*cW + nH*cW/2, H - 1);
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}


// ════════════════════════════════════════════════════════════
//  CANVAS: Hidden State Bar Chart
// ════════════════════════════════════════════════════════════

function rnn_drawHiddenState(h) {
  const canvas = document.getElementById('rnn-hidden-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  if (!h.length) {
    ctx.fillStyle = '#4a5578';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Run a step to see hidden state activations', W/2, H/2+4);
    return;
  }

  const bW  = (W - 20) / h.length;
  const midY = H / 2;

  h.forEach((v, i) => {
    const barH  = Math.abs(v) * (H/2 - 8);
    const isPos = v >= 0;
    ctx.fillStyle = isPos ? '#34d399' : '#f87171';
    ctx.fillRect(10 + i*bW, isPos ? midY - barH : midY, bW-1, barH);
  });

  // Zero line
  ctx.strokeStyle = '#2e3a52';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY); ctx.lineTo(W, midY);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#4a5578';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`h_t (${h.length} units)`, 4, 10);
  ctx.textAlign = 'right';
  ctx.fillText(`range [${round(Math.min(...h),2)}, ${round(Math.max(...h),2)}]`, W-4, 10);
}




function rnn_drawPrediction(preds, targets) {
  const canvas = document.getElementById('rnn-pred-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const lossData = rnn_model ? rnn_model.lossHistory : [];
  const pad = { t:12, b:24, l:8, r:8 };


  const lW = W/2 - 8;
  if (preds.length >= 2) {
    const allV = [...preds, ...targets];
    const minV = Math.min(...allV);
    const maxV = Math.max(...allV) || 1;
    const range = maxV - minV || 0.001;
    const toX = i => pad.l + (i/(preds.length-1)) * (lW - pad.l - pad.r);
    const toY = v => H - pad.b - ((v-minV)/range) * (H - pad.t - pad.b);

    // Target line (green)
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    targets.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
    ctx.stroke();

    // Prediction line (amber dashed)
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
    ctx.beginPath();
    preds.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
    ctx.stroke(); ctx.setLineDash([]);

    ctx.fillStyle='#34d399'; ctx.font='8px monospace'; ctx.textAlign='left';
    ctx.fillText('target', pad.l, pad.t);
    ctx.fillStyle='#fbbf24';
    ctx.fillText('pred', pad.l+40, pad.t);
  } else {
    ctx.fillStyle = '#4a5578'; ctx.font='10px monospace'; ctx.textAlign='center';
    ctx.fillText('Prediction vs Target', lW/2, H/2+4);
  }

  // Right half: loss curve
  const rX = W/2 + 8;
  if (lossData.length >= 2) {
    const maxL = Math.max(...lossData);
    const minL = Math.min(...lossData);
    const rng  = maxL - minL || 0.001;
    const toX  = i => rX + (i/(lossData.length-1)) * (W - rX - pad.r);
    const toY  = v => H - pad.b - ((v-minL)/rng) * (H-pad.t-pad.b);

    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    lossData.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
    ctx.stroke();

    ctx.fillStyle = '#f87171'; ctx.font='8px monospace'; ctx.textAlign='left';
    ctx.fillText(`Loss: ${lossData.at(-1)?.toFixed(5)}`, rX+2, pad.t);
    ctx.fillStyle = '#4a5578';
    ctx.fillText(`Steps: ${lossData.length}`, rX+2, pad.t+12);
  } else {
    ctx.fillStyle = '#4a5578'; ctx.font='10px monospace'; ctx.textAlign='center';
    ctx.fillText('Loss Curve', rX + (W-rX)/2, H/2+4);
  }

  // Divider
  ctx.strokeStyle = '#2e3a52'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(W/2, pad.t); ctx.lineTo(W/2, H-pad.b); ctx.stroke();
}


window.buildRnnTab = buildRnnTab;