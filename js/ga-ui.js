// ============================================================
//  ga-ui.js  —  Genetic Algorithm Tab: UI + Visualization
//
//  Features:
//    - Population grid with colored bit cells
//    - Fitness chart over generations
//    - Deep educational log explaining each step
//    - Real-world context for every concept
// ============================================================

// ── Module state ─────────────────────────────────────────
let ga          = null;
let gaTimer     = null;
let lastMutated = new Set();


// ════════════════════════════════════════════════════════════
//  BUILD HTML
// ════════════════════════════════════════════════════════════

function buildGaTab() {
  const container = document.getElementById('tab-ga');
  container.innerHTML = `
    <div class="panel-layout">

      <!-- LEFT: Controls -->
      <div class="control-panel">

        <div class="concept-box">
          <strong>What is a Genetic Algorithm?</strong><br>
          Nature-inspired optimisation. Start with random solutions,
          select the fittest, combine and mutate them. Over generations,
          the population evolves toward better solutions — just like
          Darwin's natural selection!
          <code class="formula">fitter parents → better children → improved population</code>
        </div>

        <h3>Configuration</h3>

        <div class="form-group">
          <label>Problem to Solve</label>
          <select id="ga-problem">
            <option value="maxones">Max Ones — maximise 1-bits</option>
            <option value="func">Function Maximise f(x) = -(x-5)²+25</option>
            <option value="tsp">TSP — shortest city tour</option>
          </select>
        </div>

        <div class="form-group">
          <label>Chromosome Length  (number of genes)</label>
          <input type="number" id="ga-chrom-len" value="10" min="4" max="20" />
        </div>

        <div class="form-group">
          <label>Population Size</label>
          <input type="number" id="ga-pop-size" value="12" min="4" max="30" />
        </div>

        <div class="form-group">
          <label>Mutation Rate
            <span style="color:var(--text3);font-size:0.69rem;"> — per-bit flip probability</span>
          </label>
          <div class="slider-row">
            <input type="range" id="ga-mutation" min="0.01" max="0.5" step="0.01" value="0.05" />
            <span class="slider-val" id="ga-mutation-val">0.05</span>
          </div>
        </div>

        <div class="form-group">
          <label>Crossover Type</label>
          <select id="ga-crossover">
            <option value="single">Single-point</option>
            <option value="two">Two-point</option>
            <option value="uniform">Uniform (50/50 per bit)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Selection Method</label>
          <select id="ga-selection">
            <option value="roulette">Roulette Wheel</option>
            <option value="tournament">Tournament (k=3)</option>
            <option value="rank">Rank Selection</option>
          </select>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary"   id="ga-init-btn">Init Population</button>
          <button class="btn btn-secondary" id="ga-step-btn">▶ One Generation</button>
          <button class="btn btn-accent"    id="ga-run-btn">⟳ Run 50 Gens</button>
          <button class="btn btn-ghost"     id="ga-reset-btn">Reset</button>
        </div>

        <div class="form-group">
          <label>Auto-Run Speed</label>
          <div class="slider-row">
            <input type="range" id="ga-speed" min="100" max="2000" step="100" value="400" />
            <span class="slider-val" id="ga-speed-val">400ms</span>
          </div>
        </div>

        <div class="calc-log" id="ga-log">
          <div class="log-hint">Press Init Population to begin…</div>
        </div>
      </div>

      <!-- RIGHT: Grid + Charts + Stats -->
      <div class="viz-area">

        <!-- Population grid -->
        <div class="ga-grid-wrap">
          <h4>Population  <span style="color:var(--amber);font-size:0.68rem;">★ = elite (kept unchanged)</span></h4>
          <div id="ga-pop-grid"></div>
        </div>

        <!-- Stats row -->
        <div class="stats-row" id="ga-stats">
          <div class="stat-card"><span>Generation</span><strong id="ga-gen">0</strong></div>
          <div class="stat-card"><span>Best Fitness</span><strong id="ga-best">—</strong></div>
          <div class="stat-card"><span>Avg Fitness</span><strong id="ga-avg">—</strong></div>
          <div class="stat-card"><span>Diversity</span><strong id="ga-div">—</strong></div>
        </div>

        <!-- Fitness chart -->
        <div class="canvas-card">
          <h4>Fitness over Generations</h4>
          <canvas id="ga-fitness-canvas" width="540" height="110"></canvas>
        </div>

        <!-- Best chromosome -->
        <div class="canvas-card" id="ga-best-card" style="display:none">
          <h4>Best Chromosome</h4>
          <div id="ga-best-bits" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>
          <div id="ga-best-label" style="font-family:var(--font-mono);font-size:0.75rem;color:var(--amber);"></div>
        </div>

      </div>
    </div>
  `;

  ga_attachEvents();
}


// ════════════════════════════════════════════════════════════
//  EVENTS
// ════════════════════════════════════════════════════════════

function ga_attachEvents() {

  document.getElementById('ga-mutation').addEventListener('input', e => {
    document.getElementById('ga-mutation-val').textContent = e.target.value;
  });

  document.getElementById('ga-speed').addEventListener('input', e => {
    document.getElementById('ga-speed-val').textContent = e.target.value + 'ms';
  });

  document.getElementById('ga-init-btn').addEventListener('click', () => {
    ga_stopRun();
    ga = ga_buildGA();
    ga.initPopulation();
    ga_renderAll();

    // Educational init log
    clearLog('ga-log', '═══ Population Initialised ═══');
    logLine('ga-log', `${ga.popSize} random chromosomes created`, 'log-concept');
    logLine('ga-log', `Each chromosome = ${ga.chromLen} genes (0 or 1)`, 'log-math');
    logLine('ga-log', `Problem: ${ga.problemType}`, 'log-math');
    logLine('ga-log', `Selection: ${ga.selectionType}`, 'log-math');
    logLine('ga-log', `Crossover: ${ga.crossoverType}`, 'log-math');
    logLine('ga-log', `Mutation rate: ${ga.mutationRate}`, 'log-math');
    logLine('ga-log', `Best fitness: ${round(ga.getBest().fitness, 3)}`, 'log-result');
    logLine('ga-log', `Worst fitness: ${round(ga.getWorst().fitness, 3)}`, 'log-note');
  });

  document.getElementById('ga-step-btn').addEventListener('click', () => {
    if (!ga?.population.length) {
      logLine('ga-log', '⚠ Press Init Population first!', 'log-error');
      return;
    }
    ga_step(true);   // verbose = true
  });

  document.getElementById('ga-run-btn').addEventListener('click', () => {
    if (!ga?.population.length) {
      logLine('ga-log', '⚠ Press Init Population first!', 'log-error');
      return;
    }
    if (gaTimer) {
      ga_stopRun();
    } else {
      ga_startRun();
    }
  });

  document.getElementById('ga-reset-btn').addEventListener('click', () => {
    ga_stopRun();
    ga = null;
    lastMutated = new Set();
    document.getElementById('ga-pop-grid').innerHTML = '';
    document.getElementById('ga-best-card').style.display = 'none';
    clearLog('ga-log', 'Reset — press Init Population');
    ga_clearFitnessChart();
    ['ga-gen','ga-best','ga-avg','ga-div'].forEach(id => {
      document.getElementById(id).textContent = id === 'ga-gen' ? '0' : '—';
    });
  });
}


// ════════════════════════════════════════════════════════════
//  STEP LOGIC
// ════════════════════════════════════════════════════════════

function ga_step(verbose = false) {
  const log = ga.evolveOneGeneration();
  if (!log) return;

  lastMutated = new Set(log.mutations);
  ga_renderAll();

  if (verbose) {
    ga_logGeneration(log);
  } else {
    // Quiet mode for auto-run
    logLine('ga-log',
      `Gen ${log.stat.generation}: best=${log.stat.best}  avg=${log.stat.avg}  div=${log.stat.diversity}`,
      'log-result'
    );
  }
}

// Verbose generation log — teaches what happened this generation
function ga_logGeneration(log) {
  clearLog('ga-log', `═══ Generation ${log.stat.generation} ═══`);

  // Elitism explanation
  logLine('ga-log', '① ELITISM — top 2 kept unchanged:', 'log-concept');
  log.elites.forEach(e => {
    logLine('ga-log', `  Rank ${e.rank}: fitness = ${e.fitness}`, 'log-math');
  });

  // Selection + crossover summary
  logLine('ga-log', `② SELECTION (${ga.selectionType}) + CROSSOVER (${ga.crossoverType}):`, 'log-concept');
  log.crossovers.slice(0, 4).forEach((co, i) => {
    const pts = co.points.length > 0 ? `cut @ [${co.points.join(',')}]` : 'uniform swap';
    logLine('ga-log',
      `  Pair ${i+1}: parents f=[${co.p1fit}, ${co.p2fit}]  ${pts}`,
      'log-math'
    );
  });
  if (log.crossovers.length > 4) {
    logLine('ga-log', `  … +${log.crossovers.length - 4} more pairs`, 'log-note');
  }

  // Mutation
  logLine('ga-log', `③ MUTATION: ${log.mutations.length} bits flipped`, 'log-concept');
  if (log.mutations.length > 0) {
    const unique = [...new Set(log.mutations)].sort((a,b)=>a-b);
    logLine('ga-log', `  Positions: [${unique.join(', ')}]`, 'log-math');
  }

  // Results
  logLine('ga-log', '─────────────────────────', 'log-note');
  logLine('ga-log', `Best  fitness: ${log.stat.best}`, 'log-result');
  logLine('ga-log', `Avg   fitness: ${log.stat.avg}`, 'log-math');
  logLine('ga-log', `Diversity:     ${log.stat.diversity}`, 'log-math');
  logLine('ga-log', '(diversity → 0 means population converged)', 'log-note');
}

// ── Auto-run ──────────────────────────────────────────────

function ga_startRun() {
  const speed = parseInt(document.getElementById('ga-speed').value);
  const btn   = document.getElementById('ga-run-btn');
  btn.textContent = '⏹ Stop';
  btn.className   = 'btn btn-ghost';

  let steps = 50;
  gaTimer = setInterval(() => {
    ga_step(false);
    steps--;
    if (steps <= 0) ga_stopRun();
  }, speed);
}

function ga_stopRun() {
  clearInterval(gaTimer);
  gaTimer = null;
  const btn = document.getElementById('ga-run-btn');
  if (btn) {
    btn.textContent = '⟳ Run 50 Gens';
    btn.className   = 'btn btn-accent';
  }
}


// ════════════════════════════════════════════════════════════
//  BUILD GA INSTANCE from form values
// ════════════════════════════════════════════════════════════

function ga_buildGA() {
  return new GeneticAlgorithm({
    chromLen:      parseInt(document.getElementById('ga-chrom-len').value),
    popSize:       parseInt(document.getElementById('ga-pop-size').value),
    mutationRate:  parseFloat(document.getElementById('ga-mutation').value),
    crossoverType: document.getElementById('ga-crossover').value,
    selectionType: document.getElementById('ga-selection').value,
    problemType:   document.getElementById('ga-problem').value
  });
}


// ════════════════════════════════════════════════════════════
//  RENDER ALL UI PIECES
// ════════════════════════════════════════════════════════════

function ga_renderAll() {
  ga_renderGrid();
  ga_renderFitnessChart();
  ga_updateStats();
  ga_renderBestChrom();
}


// ── Population Grid ───────────────────────────────────────

function ga_renderGrid() {
  if (!ga) return;
  const container = document.getElementById('ga-pop-grid');
  const maxFit    = ga.population[0].fitness;
  container.innerHTML = '';

  ga.population.forEach((chrom, idx) => {
    const isElite = idx < ga.elitismCount;
    const row     = document.createElement('div');
    row.className = 'chrom-row' + (isElite ? ' elite' : '');
    row.title     = `Rank ${idx+1} — Fitness: ${round(chrom.fitness, 3)}`;

    // Rank + fitness label
    const label = document.createElement('div');
    label.className   = 'chrom-label';
    label.textContent = (isElite ? '★' : ' ') + ` #${idx+1} f=${round(chrom.fitness,2)}`;
    row.appendChild(label);

    // Bit cells
    chrom.genes.forEach((bit, pos) => {
      const cell = document.createElement('div');
      cell.className = `bit-cell bit-${bit}` +
        (lastMutated.has(pos) && !isElite ? ' bit-mutated' : '');
      cell.textContent = bit;
      cell.title = `Gene at position ${pos} = ${bit}`;

      // Tooltip on hover
      cell.addEventListener('mouseenter', e => {
        showTooltip(`pos:${pos} = ${bit}<br>fitness: ${round(chrom.fitness,3)}`, e.clientX, e.clientY);
      });
      cell.addEventListener('mouseleave', hideTooltip);
      row.appendChild(cell);
    });

    // Fitness bar (visual width proportional to fitness)
    const wrap = document.createElement('div');
    wrap.className = 'fitness-bar-wrap';
    const bar  = document.createElement('div');
    bar.className  = 'fitness-bar';
    bar.style.width = maxFit > 0 ? (chrom.fitness / maxFit * 100) + '%' : '0%';
    wrap.appendChild(bar);
    row.appendChild(wrap);

    // Click chromosome → show detail
    row.addEventListener('click', () => ga_showChromDetail(chrom, idx));
    container.appendChild(row);
  });
}

// Show clicked chromosome's full detail in log
function ga_showChromDetail(chrom, idx) {
  clearLog('ga-log', `═══ Chromosome #${idx+1} ═══`);
  logLine('ga-log', `Genes: [${chrom.genes.join(' ')}]`, 'log-math');
  logLine('ga-log', `Fitness: ${round(chrom.fitness, 4)}`, 'log-result');

  // Explain fitness computation for this problem
  if (ga.problemType === 'maxones') {
    const ones = chrom.genes.reduce((s,g) => s+g, 0);
    logLine('ga-log', `Count of 1s = ${ones} / ${chrom.genes.length}`, 'log-math');
    logLine('ga-log', `Fitness = ${ones} (more 1s = better)`, 'log-result');
  } else if (ga.problemType === 'func') {
    const maxV = (1 << chrom.genes.length) - 1;
    const x    = (parseInt(chrom.genes.join(''), 2) / maxV) * 10;
    logLine('ga-log', `Binary → decimal → x = ${round(x, 3)}`, 'log-math');
    logLine('ga-log', `f(x) = -(${round(x,2)}-5)² + 25 = ${round(chrom.fitness,4)}`, 'log-result');
    logLine('ga-log', `Optimal x = 5 → max fitness = 25`, 'log-note');
  }

  // Highlight selected row
  document.querySelectorAll('.chrom-row').forEach((r, i) => {
    r.classList.toggle('selected', i === idx);
  });
}


// ── Stats row ─────────────────────────────────────────────

function ga_updateStats(stat = null) {
  if (!ga) return;
  const s = stat || {
    generation: ga.generation,
    best:       round(ga.getBest().fitness, 3),
    avg:        round(mean(ga.population.map(c => c.fitness)), 3),
    diversity:  ga._diversity()
  };
  document.getElementById('ga-gen').textContent  = s.generation;
  document.getElementById('ga-best').textContent = s.best;
  document.getElementById('ga-avg').textContent  = s.avg;
  document.getElementById('ga-div').textContent  = s.diversity;
}


// ── Best Chromosome display ───────────────────────────────

function ga_renderBestChrom() {
  if (!ga?.population.length) return;
  const best = ga.getBest();
  const card = document.getElementById('ga-best-card');
  const bits = document.getElementById('ga-best-bits');
  card.style.display = '';
  bits.innerHTML = '';

  best.genes.forEach(bit => {
    const cell = document.createElement('div');
    cell.className   = `bit-cell bit-${bit}`;
    cell.textContent = bit;
    bits.appendChild(cell);
  });

  document.getElementById('ga-best-label').textContent =
    `Fitness: ${round(best.fitness, 4)}  |  Generation: ${ga.generation}`;
}


// ── Fitness Chart ─────────────────────────────────────────

function ga_renderFitnessChart() {
  if (!ga) return;
  const canvas = document.getElementById('ga-fitness-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx);

  const data = ga.fitnessHistory;
  if (data.length < 2) {
    drawLabel(ctx, 'Run at least 2 generations to see chart', W/2, H/2, '#4a5578', 11);
    return;
  }

  const maxF = Math.max(...data.map(d => d.best));
  const minF = Math.min(...data.map(d => d.avg));
  const range = maxF - minF || 1;
  const pad   = 12;

  const toX = i   => pad + (i / (data.length - 1)) * (W - pad * 2);
  const toY = val => H - pad - ((val - minF) / range) * (H - pad * 2);

  // Average line (dashed purple)
  ctx.save();
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth   = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = toX(i), y = toY(d.avg);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Best line (solid green)
  ctx.save();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = toX(i), y = toY(d.best);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  // Legend
  drawLabel(ctx, `Best: ${data.at(-1).best}`, W-80, 11, '#34d399', 9);
  drawLabel(ctx, `Avg: ${data.at(-1).avg}`,   W-80, 22, '#a78bfa', 9);
  drawLabel(ctx, `Gen ${data.length}`,         50,   11, '#8b96b4', 9);
}

function ga_clearFitnessChart() {
  const canvas = document.getElementById('ga-fitness-canvas');
  if (canvas) clearCanvas(canvas.getContext('2d'));
}


window.buildGaTab = buildGaTab;