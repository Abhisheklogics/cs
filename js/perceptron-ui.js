// ============================================================
//  perceptron-ui.js  —  Perceptron Tab: Full UI + Visualization
// ============================================================

let p_model  = null;
let p_inputs = [];

function buildPerceptronTab() {
  const container = document.getElementById('tab-perceptron');
  container.innerHTML = `
    <div class="panel-layout">

      <!-- ── LEFT: Controls ── -->
      <div class="control-panel">

        <div class="theory-box">
          <strong>What is a Perceptron?</strong><br>
          The most basic neural unit — one neuron. It multiplies each input by a
          weight (its "importance"), sums everything up, adds a bias (threshold),
          and passes the result through an <em>activation function</em>.
          <span class="formula-block">output = activation( Σ(xᵢ × wᵢ) + bias )</span>
          <span style="font-size:.78rem;color:#7b8faa;display:block;margin-top:8px">
            🔑 <strong style="color:#e8eef8">Weights</strong> control importance.
            <strong style="color:#e8eef8">Bias</strong> shifts the decision boundary.
            <strong style="color:#e8eef8">Activation</strong> adds non-linearity.
          </span>
        </div>

        <h3>Configuration</h3>

        <div class="form-group">
          <label>Number of Inputs <span class="hint">— neurons in this layer</span></label>
          <input type="number" id="p-num-inputs" value="2" min="1" max="5" />
        </div>

        <div id="p-inputs-container"></div>

        <div class="form-group">
          <label>Activation Function</label>
          <select id="p-activation">
            <option value="step">Step — binary on/off</option>
            <option value="sigmoid">Sigmoid — smooth probability</option>
            <option value="relu">ReLU — most popular today</option>
            <option value="tanh">Tanh — zero-centered</option>
          </select>
        </div>

        <div id="p-act-desc" class="insight-card" style="margin-bottom:12px;font-size:.78rem">
          <div class="ic-title">About Step</div>
          Binary output: fires (1) or doesn't fire (0). Like a light switch. Used in early perceptrons by Rosenblatt (1958).
        </div>

        <div class="form-group">
          <label>Learning Rate <span class="hint">— size of weight updates</span></label>
          <div class="slider-row">
            <input type="range" id="p-lr" min="0.01" max="1" step="0.01" value="0.1">
            <span class="slider-val" id="p-lr-val">0.10</span>
          </div>
        </div>

        <div class="form-group">
          <label>Target Output <span class="hint">— what we want the neuron to output</span></label>
          <input type="number" id="p-target" value="1" min="0" max="1" step="0.1">
        </div>

        <div class="btn-row">
          <button class="btn btn-primary"   id="p-compute-btn">▶ Forward Pass</button>
          <button class="btn btn-accent"    id="p-train-btn">⟳ Train Step</button>
          <button class="btn btn-ghost"     id="p-reset-btn">↺ Reset</button>
        </div>

        <div class="step-log" id="p-log">
          <div class="log-hint">Configure inputs → click ▶ Forward Pass to begin</div>
        </div>
      </div>

      <!-- ── RIGHT: Visualization ── -->
      <div class="viz-area">

        <!-- Main diagram -->
        <div class="canvas-card">
          <div class="canvas-card-header">
            <h4>Perceptron Diagram</h4>
            <span class="sub">Width of lines = weight magnitude | Color = sign</span>
          </div>
          <canvas id="p-canvas" width="620" height="320"></canvas>
        </div>

        <!-- Activation function plot -->
        <div class="canvas-card">
          <div class="canvas-card-header">
            <h4>Activation Function</h4>
            <span class="sub" id="p-act-formula-sub">f(x) = 1 if x ≥ 0 else 0</span>
          </div>
          <canvas id="p-act-canvas" width="620" height="130"></canvas>
          <div id="p-act-marker" style="margin-top:8px;font-family:var(--font-mono);font-size:.75rem;color:#ffb830;min-height:18px"></div>
        </div>

        <!-- Step walkthrough -->
        <div class="step-walkthrough" id="p-steps-card" style="display:none">
          <div class="step-walk-header">
            <h4>📚 Step-by-Step Computation</h4>
          </div>
          <div class="step-items" id="p-steps-items"></div>
        </div>

        <!-- Weight table -->
        <div class="canvas-card" id="p-weight-card" style="display:none">
          <div class="canvas-card-header">
            <h4>Computation Breakdown</h4>
          </div>
          <table class="data-table" id="p-weight-table">
            <thead>
              <tr>
                <th>Input</th>
                <th>Value (x)</th>
                <th>Weight (w)</th>
                <th>x × w</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
          <div style="margin-top:12px;padding:12px;background:var(--bg2);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:.8rem">
            <span style="color:var(--text2)">Weighted sum + bias:</span>
            <strong id="p-wsum" style="color:var(--amber);margin:0 8px">—</strong>
            <span style="color:var(--text3)">→ activation →</span>
            <strong id="p-output" style="color:var(--green);font-size:1.1rem;margin-left:8px">—</strong>
          </div>
        </div>

        <!-- Training history -->
        <div class="canvas-card" id="p-train-card" style="display:none">
          <div class="canvas-card-header">
            <h4>Training History</h4>
            <span class="sub" id="p-train-count">0 steps</span>
          </div>
          <canvas id="p-train-canvas" width="620" height="100"></canvas>
        </div>

      </div>
    </div>
  `;

  p_refreshInputFields();
  p_initModel();
  p_attachEvents();
  drawActivationCurve(document.getElementById('p-act-canvas'), 'step');
}

function p_attachEvents() {
  document.getElementById('p-num-inputs').addEventListener('input', () => {
    p_refreshInputFields();
    p_initModel();
  });

  document.getElementById('p-lr').addEventListener('input', e => {
    document.getElementById('p-lr-val').textContent = parseFloat(e.target.value).toFixed(2);
  });

  document.getElementById('p-activation').addEventListener('change', e => {
    const name = e.target.value;
    p_model.activationName = name;
    const info = Activations[name];
    document.getElementById('p-act-formula-sub').textContent = info.formula;
    document.getElementById('p-act-desc').innerHTML = `
      <div class="ic-title">About ${info.label}</div>
      ${info.desc}
    `;
    drawActivationCurve(document.getElementById('p-act-canvas'), name);
  });

  document.getElementById('p-compute-btn').addEventListener('click', () => {
    p_collectInputs();
    const result = p_model.forward(p_inputs);
    p_showResult(result);
    p_drawDiagram(result);
    p_markActivation(result.weightedSum);
  });

  document.getElementById('p-train-btn').addEventListener('click', () => {
    p_collectInputs();
    const lr     = parseFloat(document.getElementById('p-lr').value);
    const target = parseFloat(document.getElementById('p-target').value);
    const update = p_model.train(p_inputs, target, lr);
    p_showTrainingStep(update, target);
    const result = p_model.forward(p_inputs);
    p_drawDiagram(result);
    p_markActivation(result.weightedSum);
    p_drawTrainingHistory();
  });

  document.getElementById('p-reset-btn').addEventListener('click', () => {
    p_initModel();
    p_trainingErrors = [];
    clearLog('p-log', 'Reset — new random weights');
    document.getElementById('p-weight-card').style.display = 'none';
    document.getElementById('p-steps-card').style.display = 'none';
    document.getElementById('p-train-card').style.display = 'none';
  });
}

let p_trainingErrors = [];

function p_initModel() {
  const n   = parseInt(document.getElementById('p-num-inputs').value);
  const act = document.getElementById('p-activation')?.value || 'step';
  p_model = new Perceptron(n, act);
  p_drawDiagram(null);
}

function p_refreshInputFields() {
  const n         = parseInt(document.getElementById('p-num-inputs').value);
  const container = document.getElementById('p-inputs-container');
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const g = document.createElement('div');
    g.className = 'form-group';
    g.innerHTML = `
      <label>Input x<sub>${i+1}</sub></label>
      <input type="number" class="p-input-val" id="p-x${i}" value="${i === 0 ? 0.5 : 0.8}" step="0.1">
    `;
    container.appendChild(g);
  }
}

function p_collectInputs() {
  p_inputs = [];
  document.querySelectorAll('.p-input-val').forEach(el => p_inputs.push(parseFloat(el.value) || 0));
}

function p_showResult(result) {
  clearLog('p-log', '▶ Forward Pass');

  logLine('p-log', 'Step 1 — Weight × Input products:', 'log-concept');
  result.products.forEach((p, i) => {
    logLine('p-log', `  x${i+1}(${p.x}) × w${i+1}(${round(p.w,3)}) = ${p.product}`, 'log-math');
  });

  logLine('p-log', 'Step 2 — Sum + Bias:', 'log-concept');
  const terms = result.products.map(p => p.product).join(' + ');
  logLine('p-log', `  ${terms} + bias(${round(p_model.bias,3)}) = ${result.weightedSum}`, 'log-math');

  logLine('p-log', `Step 3 — Activation [ ${Activations[p_model.activationName].label} ]:`, 'log-concept');
  logLine('p-log', `  f(${result.weightedSum}) = ${result.output}`, 'log-result');

  // Show step walkthrough card
  document.getElementById('p-steps-card').style.display = '';
  const stepsEl = document.getElementById('p-steps-items');
  const totalW = result.products.reduce((s,p) => s + p.product, 0);
  stepsEl.innerHTML = `
    <div class="step-item done">
      <div class="step-number">1</div>
      <div class="step-content">
        <div class="step-title">Weighted Sum</div>
        <div class="step-desc">Multiply each input by its weight, sum all results</div>
        <div class="step-math">${result.products.map((p,i) => `x${i+1}·w${i+1} = ${p.x}×${round(p.w,3)} = ${p.product}`).join('<br>')}
<strong>Σ = ${round(totalW,4)}</strong></div>
      </div>
    </div>
    <div class="step-item done">
      <div class="step-number">2</div>
      <div class="step-content">
        <div class="step-title">Add Bias</div>
        <div class="step-desc">Bias shifts the activation threshold — the neuron's sensitivity</div>
        <div class="step-math">${round(totalW,4)} + bias(${round(p_model.bias,3)}) = <strong>${result.weightedSum}</strong></div>
      </div>
    </div>
    <div class="step-item active">
      <div class="step-number">3</div>
      <div class="step-content">
        <div class="step-title">Activation Function [ ${Activations[p_model.activationName].label} ]</div>
        <div class="step-desc">${Activations[p_model.activationName].desc}</div>
        <div class="step-math">f(${result.weightedSum}) = <strong style="color:#00e5a0;font-size:1.1em">${result.output}</strong></div>
      </div>
    </div>
  `;

  // Update weight table
  document.getElementById('p-weight-card').style.display = '';
  const tbody = document.querySelector('#p-weight-table tbody');
  tbody.innerHTML = '';
  const maxProd = Math.max(...result.products.map(p => Math.abs(p.product))) || 1;
  result.products.forEach((p, i) => {
    const barW = Math.round(Math.abs(p.product) / maxProd * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text3)">x${i+1}</td>
      <td>${p.x}</td>
      <td class="${p.w >= 0 ? 'td-pos' : 'td-neg'}">${round(p.w,4)}</td>
      <td>${p.product}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:${barW}%;height:6px;background:${p.w >= 0 ? 'var(--green)' : 'var(--red)'};border-radius:3px;transition:width 0.3s"></div>
          <span style="font-size:.68rem;color:var(--text3)">${round(Math.abs(p.product) / maxProd * 100)}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('p-wsum').textContent   = result.weightedSum;
  document.getElementById('p-output').textContent = result.output;
}

function p_showTrainingStep(update, target) {
  clearLog('p-log', '⟳ Training Step');
  logLine('p-log', 'Perceptron Learning Rule:', 'log-concept');
  logLine('p-log', `  error = target(${target}) − output = ${update.error}`, 'log-math');
  if (update.error === 0) {
    logLine('p-log', '✓ Correct prediction — no weight update needed', 'log-result');
    logLine('p-log', '  Δw = 0 for all weights (error = 0)', 'log-note');
  } else {
    logLine('p-log', `  Δwᵢ = lr(${document.getElementById('p-lr').value}) × error(${update.error}) × xᵢ`, 'log-concept');
    update.deltas.forEach((d, i) => {
      logLine('p-log', `  Δw${i+1} = ${d}  →  new w${i+1} = ${round(p_model.weights[i],4)}`, 'log-math');
    });
    logLine('p-log', `  Δbias = ${update.biasDelta}  →  new bias = ${round(p_model.bias,4)}`, 'log-math');
  }
  p_trainingErrors.push(Math.abs(update.error));
  logLine('p-log', `Weights updated ✓`, 'log-result');
}

function p_markActivation(weightedSum) {
  const canvas = document.getElementById('p-act-canvas');
  if (!canvas) return;
  drawActivationCurve(canvas, p_model.activationName);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = 24, midX = W/2, midY = H/2;
  const xNorm = clamp(weightedSum / 4, -1, 1);
  const px = midX + xNorm * (W/2 - pad);
  const fn = Activations[p_model.activationName].fn;
  const yVal = fn(weightedSum);
  const py = midY - yVal * (H/2 - pad);

  // Vertical dashed line
  ctx.save();
  ctx.strokeStyle = '#ffb830';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(px, H-pad); ctx.lineTo(px, py); ctx.stroke();
  ctx.setLineDash([]);
  // Dot
  ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
  ctx.fillStyle = '#ffb830';
  ctx.shadowColor = '#ffb830';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();

  document.getElementById('p-act-marker').textContent =
    `Weighted sum = ${round(weightedSum,3)}  →  activation output = ${round(yVal,4)}`;
}

function p_drawTrainingHistory() {
  document.getElementById('p-train-card').style.display = '';
  document.getElementById('p-train-count').textContent = `${p_trainingErrors.length} steps`;
  const canvas = document.getElementById('p-train-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx);
  const data = p_trainingErrors;
  if (data.length < 2) return;
  const maxE = Math.max(...data, 0.01);
  const pad = 16;
  const toX = i => pad + (i/(data.length-1)) * (W - pad*2);
  const toY = v => H - pad - (v/maxE) * (H - pad*2);

  ctx.save();
  ctx.strokeStyle = '#ff5c5c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
  ctx.stroke();
  ctx.restore();

  // Area fill
  ctx.save();
  ctx.fillStyle = 'rgba(255,92,92,0.06)';
  ctx.beginPath();
  data.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
  ctx.lineTo(toX(data.length-1), H-pad);
  ctx.lineTo(toX(0), H-pad);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Labels
  ctx.fillStyle = '#3d5068';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'left';
  ctx.fillText('Error over training steps', pad, 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = p_trainingErrors.at(-1) === 0 ? '#00e5a0' : '#ff5c5c';
  ctx.fillText(`Latest error: ${p_trainingErrors.at(-1)}`, W-pad, 12);
}

function p_drawDiagram(result) {
  const canvas = document.getElementById('p-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx);

  const n       = p_model ? p_model.numInputs : 2;
  const inputX  = 90;
  const neuronX = W / 2 + 30;
  const outputX = W - 70;
  const inputYs = makeArray(n, i => (H / (n+1)) * (i+1));
  const neuronY = H / 2;

  const weights = p_model ? p_model.weights : makeArray(n, () => 0);

  // ── Connection lines ──
  inputYs.forEach((iy, i) => {
    const w     = weights[i];
    const color = weightColor(w);
    const thick = clamp(Math.abs(w) * 4, 0.5, 5);
    drawLine(ctx, inputX, iy, neuronX, neuronY, color, thick, 0.8);

    // Weight label
    const mx = (inputX + neuronX) * 0.45;
    const my = (iy + neuronY) * 0.5 - 8;
    ctx.save();
    ctx.fillStyle = Math.abs(w) > 0.05
      ? (w > 0 ? 'rgba(0,229,160,0.9)' : 'rgba(255,92,92,0.9)')
      : '#3d5068';
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`w${i+1}=${round(w,2)}`, mx, my);
    ctx.restore();
  });

  // ── Output arrow ──
  drawLine(ctx, neuronX + 34, neuronY, outputX - 22, neuronY, '#2a3d58', 2, 0.6);
  // Arrowhead
  ctx.save();
  ctx.fillStyle = '#2a3d58';
  ctx.beginPath();
  ctx.moveTo(outputX-22, neuronY-5);
  ctx.lineTo(outputX-14, neuronY);
  ctx.lineTo(outputX-22, neuronY+5);
  ctx.fill();
  ctx.restore();

  // ── Input nodes ──
  inputYs.forEach((iy, i) => {
    const val = result && p_inputs[i] !== undefined ? p_inputs[i] : null;
    drawNode(ctx, inputX, iy, 24,
      'rgba(61,158,255,0.15)', '#3d9eff',
      `x${i+1}`, val
    );
  });

  // ── Neuron ──
  const active = result ? clamp(Math.abs(result.output), 0, 1) : 0;
  const neuronFill = result
    ? `rgba(0,229,160,${0.1 + active * 0.6})`
    : '#141d2b';
  drawNode(ctx, neuronX, neuronY, 36, neuronFill, '#00e5a0', 'Σ + b', result?.output ?? null);

  // Bias label below neuron
  ctx.save();
  ctx.fillStyle = '#ffb830';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`bias = ${round(p_model?.bias ?? 0, 3)}`, neuronX, neuronY + 50);
  ctx.restore();

  // ── Output node ──
  const outFill = result
    ? (result.output >= 0.5 ? 'rgba(0,229,160,0.3)' : 'rgba(255,92,92,0.2)')
    : '#141d2b';
  const outStroke = result
    ? (result.output >= 0.5 ? '#00e5a0' : '#ff5c5c')
    : '#2a3d58';
  drawNode(ctx, outputX, neuronY, 26, outFill, outStroke, 'output', result?.output ?? null);

  // Activation label
  ctx.save();
  ctx.fillStyle = '#7b8faa';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText(p_model ? Activations[p_model.activationName].label : 'activation', outputX, neuronY + 42);
  ctx.restore();
}

window.buildPerceptronTab = buildPerceptronTab;