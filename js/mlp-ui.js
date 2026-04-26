// ============================================================
//  mlp-ui.js  —  MLP + Backpropagation Tab
// ============================================================

let mlp_model = null;
let mlp_animTimer = null;
let mlp_neuronPositions = [];

function buildMlpTab() {
  const container = document.getElementById('tab-mlp');
  container.innerHTML = `
    <div class="panel-layout">
      <div class="control-panel">

        <div class="theory-box">
          <strong>Multi-Layer Perceptron (MLP)</strong><br>
          Stack multiple perceptrons in layers. Data flows forward through each layer
          (forward pass), then errors flow backward to update all weights
          (backpropagation using the chain rule of calculus).
          <span class="formula-block">
            Forward:  a = activation(W·x + b)<br>
            Loss:     L = Σ(ŷ − y)² / n  (MSE)<br>
            Backward: ∂L/∂w = δ · a_prev  (chain rule)
          </span>
          <span style="font-size:.76rem;color:#7b8faa;display:block;margin-top:8px">
            🔑 XOR cannot be solved with a single neuron — it needs a hidden layer.
            That's why MLPs matter.
          </span>
        </div>

        <h3>Network Architecture</h3>

        <div class="form-group">
          <label>Layer sizes <span class="hint">comma-separated — e.g. 2,4,1</span></label>
          <input type="text" id="mlp-layers" value="2,3,1">
        </div>

        <div class="form-group">
          <label>Activation Function</label>
          <select id="mlp-activation">
            <option value="sigmoid">Sigmoid</option>
            <option value="relu">ReLU</option>
            <option value="tanh">Tanh</option>
          </select>
        </div>

        <div class="form-group">
          <label>Learning Rate</label>
          <div class="slider-row">
            <input type="range" id="mlp-lr" min="0.001" max="1" step="0.001" value="0.1">
            <span class="slider-val" id="mlp-lr-val">0.100</span>
          </div>
        </div>

        <h3>Training Data</h3>

        <div class="form-group">
          <label>Preset Dataset</label>
          <select id="mlp-dataset">
            <option value="xor">XOR — needs hidden layer!</option>
            <option value="and">AND Gate</option>
            <option value="or">OR Gate</option>
          </select>
        </div>

        <div class="form-group">
          <label>Inputs <span class="hint">comma-separated</span></label>
          <input type="text" id="mlp-inputs" value="0,1">
        </div>

        <div class="form-group">
          <label>Target Output</label>
          <input type="text" id="mlp-target" value="1">
        </div>

        <div class="form-group">
          <label>Train Steps</label>
          <div class="slider-row">
            <input type="range" id="mlp-train-steps" min="50" max="1000" step="50" value="200">
            <span class="slider-val" id="mlp-train-steps-val">200</span>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary"   id="mlp-forward-btn">▶ Forward</button>
          <button class="btn btn-secondary" id="mlp-backward-btn">◀ Backward</button>
          <button class="btn btn-accent"    id="mlp-train-btn">⟳ Train</button>
          <button class="btn btn-ghost"     id="mlp-reset-btn">↺ Reset</button>
        </div>

        <div class="step-log" id="mlp-log">
          <div class="log-hint">Set architecture → ▶ Forward to begin</div>
        </div>
      </div>

      <div class="viz-area">

        <div class="canvas-card">
          <div class="canvas-card-header">
            <h4>Network Diagram</h4>
            <span class="sub">Click any neuron for details</span>
          </div>
          <canvas id="mlp-canvas" width="640" height="360" style="cursor:pointer"></canvas>
        </div>

        <!-- Backprop walkthrough -->
        <div class="step-walkthrough" id="mlp-backprop-card" style="display:none">
          <div class="step-walk-header"><h4>📚 Backpropagation Steps</h4></div>
          <div class="step-items" id="mlp-backprop-items"></div>
        </div>

        <!-- Loss chart -->
        <div class="canvas-card">
          <div class="canvas-card-header">
            <h4>Loss Curve (MSE)</h4>
            <span class="sub" id="mlp-loss-label">Train to see loss decrease</span>
          </div>
          <canvas id="mlp-loss-canvas" width="640" height="110"></canvas>
        </div>

        <!-- Predictions table -->
        <div class="canvas-card" id="mlp-pred-card" style="display:none">
          <div class="canvas-card-header"><h4>Dataset Predictions</h4></div>
          <table class="data-table" id="mlp-pred-table">
            <thead><tr><th>Inputs</th><th>Target</th><th>Predicted</th><th>Error</th><th>Correct?</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>

      </div>
    </div>
  `;

  mlp_buildModel();
  mlp_attachEvents();
  mlp_drawNetwork(null);
  mlp_drawLossChart();
}

function mlp_attachEvents() {
  document.getElementById('mlp-lr').addEventListener('input', e => {
    document.getElementById('mlp-lr-val').textContent = parseFloat(e.target.value).toFixed(3);
  });
  document.getElementById('mlp-train-steps').addEventListener('input', e => {
    document.getElementById('mlp-train-steps-val').textContent = e.target.value;
  });
  document.getElementById('mlp-layers').addEventListener('change', () => {
    mlp_buildModel();
    mlp_drawNetwork(null);
    mlp_drawLossChart();
  });
  document.getElementById('mlp-activation').addEventListener('change', () => {
    mlp_model.activationName = document.getElementById('mlp-activation').value;
  });
  document.getElementById('mlp-forward-btn').addEventListener('click', mlp_doForward);
  document.getElementById('mlp-backward-btn').addEventListener('click', mlp_doBackward);
  document.getElementById('mlp-train-btn').addEventListener('click', mlp_doTrain);
  document.getElementById('mlp-reset-btn').addEventListener('click', mlp_doReset);
  document.getElementById('mlp-canvas').addEventListener('click', e => {
    const rect  = e.target.getBoundingClientRect();
    const scale = e.target.width / rect.width;
    mlp_handleNeuronClick((e.clientX - rect.left)*scale, (e.clientY - rect.top)*scale);
  });
}

function mlp_buildModel() {
  const raw   = document.getElementById('mlp-layers').value;
  const sizes = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
  const act   = document.getElementById('mlp-activation')?.value || 'sigmoid';
  mlp_model   = new MLP(sizes.length >= 2 ? sizes : [2,3,1], act);
}

function mlp_getInputsTargets() {
  const inputs  = document.getElementById('mlp-inputs').value.split(',').map(Number);
  const targets = document.getElementById('mlp-target').value.split(',').map(Number);
  return [inputs, targets];
}

function mlp_doForward() {
  const [inputs, targets] = mlp_getInputsTargets();
  const output = mlp_model.forward(inputs);
  clearLog('mlp-log', '▶ Forward Pass');
  logLine('mlp-log', `Inputs: [${inputs.join(', ')}]`, 'log-concept');

  for (let l = 1; l < mlp_model.numLayers; l++) {
    const layerName = l === mlp_model.numLayers-1 ? 'Output' : `Hidden ${l}`;
    logLine('mlp-log', `Layer ${l} (${layerName}):`, 'log-concept');
    mlp_model.activations[l].forEach((a, j) => {
      const z = mlp_model.zValues[l][j];
      logLine('mlp-log', `  n${l}_${j+1}: z = ${round(z,4)} → a = ${round(a,4)}`, 'log-math');
    });
  }

  const mse = output.reduce((s,o,i) => s + (o-targets[i])**2, 0) / output.length;
  logLine('mlp-log', `Output: [${output.map(v=>round(v,4)).join(', ')}]  Target: [${targets.join(', ')}]`, 'log-result');
  logLine('mlp-log', `MSE Loss = ${round(mse,6)}`, 'log-result');

  mlp_drawNetwork(output);
}

function mlp_doBackward() {
  const [inputs, targets] = mlp_getInputsTargets();
  const lr  = parseFloat(document.getElementById('mlp-lr').value);
  const res = mlp_model.backward(inputs, targets, lr);

  clearLog('mlp-log', '◀ Backward Pass (Backprop)');
  logLine('mlp-log', 'Chain Rule: ∂L/∂w = δ × a_prev', 'log-concept');
  logLine('mlp-log', `MSE Loss = ${round(res.mse, 6)}`, 'log-result');

  const lastL = res.deltas.length - 1;
  logLine('mlp-log', 'Output layer deltas (∂L/∂z):', 'log-concept');
  res.deltas[lastL]?.forEach((d,i) => {
    logLine('mlp-log', `  δ_out_${i+1} = ${round(d,6)}`, 'log-math');
  });
  for (let l = lastL-1; l >= 1; l--) {
    logLine('mlp-log', `Hidden layer ${l} deltas (propagated back):`, 'log-concept');
    res.deltas[l]?.forEach((d,j) => {
      logLine('mlp-log', `  δ_L${l}_${j+1} = ${round(d,6)}`, 'log-math');
    });
  }
  logLine('mlp-log', '✓ All weights updated via gradient descent', 'log-result');

  // Show backprop walkthrough
  document.getElementById('mlp-backprop-card').style.display = '';
  document.getElementById('mlp-backprop-items').innerHTML = `
    <div class="step-item done">
      <div class="step-number">1</div>
      <div class="step-content">
        <div class="step-title">Compute Output Error</div>
        <div class="step-desc">How wrong is our prediction vs the target?</div>
        <div class="step-math">error = predicted − target = ${round(res.output[0] - targets[0],4)}<br>MSE Loss = ${round(res.mse,6)}</div>
      </div>
    </div>
    <div class="step-item done">
      <div class="step-number">2</div>
      <div class="step-content">
        <div class="step-title">Output Layer Deltas (δ)</div>
        <div class="step-desc">δ = error × activation'(z) — how much each neuron contributed</div>
        <div class="step-math">δ = error × f'(z_out) = ${round(res.deltas[lastL]?.[0],6)}</div>
      </div>
    </div>
    <div class="step-item done">
      <div class="step-number">3</div>
      <div class="step-content">
        <div class="step-title">Propagate Deltas Backward</div>
        <div class="step-desc">Each hidden neuron gets a share of the blame via its outgoing weights</div>
        <div class="step-math">δ_hidden = (Σ w·δ_next) × f'(z_hidden)</div>
      </div>
    </div>
    <div class="step-item active">
      <div class="step-number">4</div>
      <div class="step-content">
        <div class="step-title">Update Weights</div>
        <div class="step-desc">Nudge every weight in the direction that reduces loss</div>
        <div class="step-math">Δw = −lr × δ × a_prev<br>lr = ${lr} | Updated all ${mlp_model.numLayers-1} layer(s)</div>
      </div>
    </div>
  `;

  mlp_drawNetwork(res.output);
  mlp_drawLossChart();
}

function mlp_doTrain() {
  const dataset = Datasets[document.getElementById('mlp-dataset').value];
  const lr      = parseFloat(document.getElementById('mlp-lr').value);
  const steps   = parseInt(document.getElementById('mlp-train-steps').value);
  mlp_model.trainEpochs(dataset, lr, steps);

  clearLog('mlp-log', `⟳ Trained ${steps} epochs`);
  logLine('mlp-log', `Dataset: ${document.getElementById('mlp-dataset').value.toUpperCase()}`, 'log-concept');
  logLine('mlp-log', `Final loss: ${round(mlp_model.lossHistory.at(-1), 6)}`, 'log-result');
  const improvement = round(mlp_model.lossHistory[0] / (mlp_model.lossHistory.at(-1)||0.0001), 1);
  logLine('mlp-log', `Loss reduced by ${improvement}× from start`, 'log-note');

  // Show predictions
  document.getElementById('mlp-pred-card').style.display = '';
  const tbody = document.querySelector('#mlp-pred-table tbody');
  tbody.innerHTML = '';
  dataset.forEach(({ inputs, targets }) => {
    const out = mlp_model.forward(inputs);
    const pred = round(out[0], 3);
    const correct = (pred >= 0.5) === (targets[0] >= 0.5);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>[${inputs.join(', ')}]</td>
      <td>${targets[0]}</td>
      <td class="${correct ? 'td-pos' : 'td-neg'}">${pred}</td>
      <td style="color:var(--text2)">${round(Math.abs(pred - targets[0]),3)}</td>
      <td>${correct ? '✓' : '✗'}</td>
    `;
    tbody.appendChild(tr);
    logLine('mlp-log', `  [${inputs.join(',')}] → ${pred}  (target ${targets[0]}) ${correct?'✓':'✗'}`, correct ? 'log-result' : 'log-warn');
  });

  mlp_drawLossChart();
  const lastInputs = dataset[dataset.length-1].inputs;
  mlp_model.forward(lastInputs);
  mlp_drawNetwork(mlp_model.activations[mlp_model.numLayers-1]);
}

function mlp_doReset() {
  clearInterval(mlp_animTimer);
  mlp_buildModel();
  clearLog('mlp-log', '↺ Reset — new random weights');
  document.getElementById('mlp-backprop-card').style.display = 'none';
  document.getElementById('mlp-pred-card').style.display = 'none';
  mlp_drawNetwork(null);
  mlp_drawLossChart();
}

function mlp_handleNeuronClick(cx, cy) {
  if (!mlp_neuronPositions.length) return;
  for (let l = 0; l < mlp_neuronPositions.length; l++) {
    for (let j = 0; j < mlp_neuronPositions[l].length; j++) {
      const { x, y } = mlp_neuronPositions[l][j];
      if (Math.hypot(cx-x, cy-y) < 30) {
        clearLog('mlp-log', `Neuron L${l}_${j+1}`);
        const a = mlp_model.activations?.[l]?.[j];
        if (a != null) logLine('mlp-log', `Activation = ${round(a,4)}`, 'log-result');
        if (l > 0) {
          const z = mlp_model.zValues?.[l]?.[j];
          if (z != null) logLine('mlp-log', `Pre-activation z = ${round(z,4)}`, 'log-math');
          logLine('mlp-log', 'Incoming weights:', 'log-concept');
          mlp_model.weights[l-1][j].forEach((w,i) => {
            logLine('mlp-log', `  from L${l-1}_${i+1}: w = ${round(w,4)}`, 'log-math');
          });
          logLine('mlp-log', `bias = ${round(mlp_model.biases[l-1][j],4)}`, 'log-math');
        }
        return;
      }
    }
  }
}

function mlp_drawNetwork(outputVals = null, highlightL = null) {
  const canvas = document.getElementById('mlp-canvas');
  if (!canvas || !mlp_model) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx);
  mlp_neuronPositions = [];

  const layers = mlp_model.layerSizes;
  const numL   = layers.length;
  const xPad   = 70;
  const xStep  = (W - xPad*2) / Math.max(numL-1, 1);
  const maxN   = Math.max(...layers);

  const positions = layers.map((count, l) => {
    const x = xPad + l * xStep;
    const spread = Math.min((H - 80) / maxN, 64) * count;
    return makeArray(count, j => ({
      x, y: H/2 - spread/2 + (spread/(count+1)) * (j+1)
    }));
  });
  mlp_neuronPositions = positions;

  // ── Draw connections ──
  for (let l = 0; l < numL-1; l++) {
    const dimmed = highlightL !== null && l >= highlightL;
    for (let j = 0; j < layers[l+1]; j++) {
      for (let i = 0; i < layers[l]; i++) {
        const w     = mlp_model.weights[l][j][i];
        const color = dimmed ? '#141d2b' : weightColor(w);
        const thick = dimmed ? 0.5 : clamp(Math.abs(w)*2, 0.3, 4);
        drawLine(ctx,
          positions[l][i].x, positions[l][i].y,
          positions[l+1][j].x, positions[l+1][j].y,
          color, thick, dimmed ? 0.2 : 0.7
        );
      }
    }
  }

  // ── Draw neurons ──
  positions.forEach((layer, l) => {
    const isInput  = l === 0;
    const isOutput = l === numL-1;
    const r = maxN <= 4 ? 22 : 16;

    layer.forEach(({ x, y }, j) => {
      const actVal = mlp_model.activations?.[l]?.[j] ?? null;
      let fill = '#141d2b', stroke = '#2a3d58';

      if (actVal !== null) {
        const a = clamp(Math.abs(actVal), 0, 1);
        if (isInput)  { fill = `rgba(61,158,255,${0.15+a*0.5})`; stroke = '#3d9eff'; }
        else if (isOutput) { fill = `rgba(0,229,160,${0.15+a*0.7})`; stroke = '#00e5a0'; }
        else               { fill = `rgba(176,106,255,${0.12+a*0.6})`; stroke = '#b06aff'; }
      }

      const label = isInput ? `x${j+1}` : (isOutput ? `y${j+1}` : `h${l}${j+1}`);
      drawNode(ctx, x, y, r, fill, stroke, label, actVal !== null ? round(actVal,2) : null);
    });

    // Layer label
    const lname = l===0 ? 'Input' : (l===numL-1 ? 'Output' : `Hidden ${l}`);
    const lsize = `[${layers[l]}]`;
    drawLabel(ctx, lname, positions[l][0].x, H-18, '#3d5068', 8);
    drawLabel(ctx, lsize, positions[l][0].x, H-8, '#1e2d42', 8);
  });
}

function mlp_drawLossChart() {
  const canvas = document.getElementById('mlp-loss-canvas');
  if (!canvas || !mlp_model) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx);

  const data = mlp_model.lossHistory;
  if (data.length < 2) {
    drawLabel(ctx, 'Train the network to see loss curve', W/2, H/2, '#3d5068', 11);
    return;
  }

  const maxL = Math.max(...data);
  const minL = Math.min(...data);
  const range = maxL - minL || 0.001;
  const pad = 18;
  const toX = i => pad + (i/(data.length-1)) * (W - pad*2);
  const toY = v => H - pad - ((v-minL)/range) * (H-pad*2);

  // Fill
  ctx.save();
  ctx.fillStyle = 'rgba(255,92,92,0.06)';
  ctx.beginPath();
  data.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
  ctx.lineTo(toX(data.length-1), H-pad);
  ctx.lineTo(toX(0), H-pad);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Line
  ctx.save();
  ctx.strokeStyle = '#ff5c5c';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff5c5c';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  data.forEach((v,i) => i===0 ? ctx.moveTo(toX(i),toY(v)) : ctx.lineTo(toX(i),toY(v)));
  ctx.stroke();
  ctx.restore();

  const final = round(data.at(-1), 6);
  document.getElementById('mlp-loss-label').textContent = `${data.length} steps | final MSE: ${final}`;

  drawLabel(ctx, `Start: ${round(data[0],4)}`, pad+30, 12, '#3d5068', 8);
  drawLabel(ctx, `End: ${final}`, W-60, 12, data.at(-1) < 0.01 ? '#00e5a0' : '#ff5c5c', 8);
}

window.buildMlpTab = buildMlpTab;