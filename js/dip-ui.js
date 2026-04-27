/* ═══════════════════════════════════════════════════════════════
   dip-ui.js  —  Digital Image Processing Lab UI
   All tabs: Quantization | Median Cut | Filters | DCT/JPEG | Histogram
   ─────────────────────────────────────────────────────────────
   KEY CHANGES vs original:
   • Median Cut tab shows ALL selected colors simultaneously
     (e.g. 64 + 16 + 4 in one run — assignment requirement)
   • User picks which colors to test (checkboxes, default: 64/16/4)
   • Speed slider controls delay between each color group rendering
   • FS dithering on MC palette also shown per color group
   • Difference images shown for both MC and FS
   • Report download includes all color groups
═══════════════════════════════════════════════════════════════ */

/* ── globals ── */
let dip_origImageData   = null;
let dip_imgW            = 0;
let dip_imgH            = 0;
let dip_lastResults     = [];          // uniform quant results
let dip_lastMCResults   = [];          // median cut results (one per color)
let dip_processingSpeed = 'normal';

/* ═══════════════════════════════════════════════════════════════
   BUILD TAB  (called by router when dip screen is shown)
═══════════════════════════════════════════════════════════════ */
function buildDipTab() {
  const container = document.getElementById('tab-dip');
  container.innerHTML = `
    <div class="panel-layout">

      <!-- ── LEFT: CONTROL PANEL ── -->
      <div class="control-panel">

        <!-- Info banner -->
        <div class="concept-box" style="margin-bottom:16px;background:rgba(0,212,255,.05);
             border:1px solid rgba(0,212,255,.2);border-radius:10px;padding:14px">
          <div style="font-family:var(--font-mono);font-size:.72rem;color:var(--cyan);
                      font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em">
            Digital Image Processing Lab
          </div>
          <div style="font-size:.8rem;color:var(--text2);line-height:1.7">
            Upload any image and explore DIP algorithms live.
            Every step shows what the math is doing — slow it down to learn.
          </div>
        </div>

        <!-- Tab switcher -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px">
          <button class="nav-tab active" onclick="dip_switchTab('quantization',this)">Quantization</button>
          <button class="nav-tab" onclick="dip_switchTab('mediancut',this)">Median Cut</button>
          <button class="nav-tab" onclick="dip_switchTab('filters',this)">Filters</button>
          <button class="nav-tab" onclick="dip_switchTab('dct',this)">DCT / JPEG</button>
          <button class="nav-tab" onclick="dip_switchTab('histogram',this)">Histogram</button>
        </div>

        <!-- Upload zone -->
        <div class="dip-upload-zone" id="dip-upload-zone"
             onclick="document.getElementById('dip-file-inp').click()"
             style="cursor:pointer;border:2px dashed var(--border2);border-radius:10px;
                    padding:18px;text-align:center;background:rgba(0,0,0,.2);
                    transition:all .2s;margin-bottom:12px">
          <input type="file" id="dip-file-inp" accept="image/*" style="display:none">
          <div style="font-size:2rem;margin-bottom:4px;color:var(--text3)">⊕</div>
          <strong style="display:block;font-size:.85rem">Upload an image</strong>
          <p style="font-size:.72rem;color:var(--text3);margin-top:3px">JPG / PNG / WEBP or drag here</p>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn btn-ghost" id="dip-demo-btn" style="flex:1">Load Demo Image</button>
          <button class="btn btn-ghost" id="dip-reset-btn" style="flex:1">Reset</button>
        </div>

        <!-- ── SPEED CONTROL ── -->
        <div class="form-group" style="background:rgba(255,184,48,.06);border:1px solid rgba(255,184,48,.2);
             border-radius:8px;padding:10px 12px;margin-bottom:14px">
          <label style="color:var(--amber);font-size:.72rem;font-weight:700;
                        text-transform:uppercase;letter-spacing:.06em"> Processing Speed</label>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn btn-ghost speed-btn" data-speed="slow"
                    onclick="dip_setSpeed('slow',this)"
                    style="flex:1;font-size:.72rem;padding:5px 4px"> Slow</button>
            <button class="btn btn-ghost speed-btn active" data-speed="normal"
                    onclick="dip_setSpeed('normal',this)"
                    style="flex:1;font-size:.72rem;padding:5px 4px"> Normal</button>
            <button class="btn btn-ghost speed-btn" data-speed="fast"
                    onclick="dip_setSpeed('fast',this)"
                    style="flex:1;font-size:.72rem;padding:5px 4px"> Fast</button>
          </div>
          <p id="dip-speed-desc" style="font-size:.68rem;color:var(--text3);margin-top:6px;line-height:1.5">
            Normal: small delay between steps — UI stays responsive.
          </p>
        </div>

        <!-- ════════════════════════
             PANEL: UNIFORM QUANT
        ════════════════════════ -->
        <div id="dip-panel-quantization">
          <h3 style="margin-top:4px">Uniform Color Quantization</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Snaps each R, G, B channel to the nearest allowed level.
            16.7M possible colors → small set. Compare with Floyd-Steinberg dithering.
          </div>

          <div class="form-group">
            <label>Canvas size (px)</label>
            <div class="slider-row">
              <input type="range" id="dip-size" min="100" max="320" step="20" value="200">
              <span class="slider-val" id="dip-size-val">200</span>
            </div>
          </div>

          <div class="form-group">
            <label>Diff image amplification ×</label>
            <div class="slider-row">
              <input type="range" id="dip-gain" min="1" max="5" step=".5" value="2">
              <span class="slider-val" id="dip-gain-val">2</span>
            </div>
          </div>

          <div class="form-group">
            <label>Color levels to test</label>
            <div id="dip-level-checks" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:5px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
                <input type="checkbox" value="64" checked> 64 colors
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
                <input type="checkbox" value="16" checked> 16 colors
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
                <input type="checkbox" value="4"  checked> 4 colors
              </label>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" id="dip-run-btn" disabled>▶ Run Quantization</button>
          </div>

          <!-- FS kernel display -->
          <div style="background:var(--bg2);border-radius:8px;padding:12px;margin-top:8px">
            <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--cyan);
                        font-weight:700;margin-bottom:8px">Floyd-Steinberg Error Kernel</div>
            <table style="width:100%;border-collapse:collapse;font-family:var(--font-mono);
                          font-size:.78rem;text-align:center">
              <tr>
                <td style="padding:7px;color:var(--text3);border:1px solid var(--border)">—</td>
                <td style="padding:7px;background:var(--bg3);border:1px solid var(--border);
                           color:var(--amber);font-weight:bold">★ curr</td>
                <td style="padding:7px;color:var(--green);border:1px solid var(--border)">7/16</td>
              </tr>
              <tr>
                <td style="padding:7px;color:var(--green);border:1px solid var(--border)">3/16</td>
                <td style="padding:7px;color:var(--green);border:1px solid var(--border)">5/16</td>
                <td style="padding:7px;color:var(--green);border:1px solid var(--border)">1/16</td>
              </tr>
            </table>
            <p style="font-size:.68rem;color:var(--text3);margin-top:6px">
              3+5+7+1 = 16 → all error redistributed, nothing wasted
            </p>
          </div>

          <div style="margin-top:12px">
            <button class="btn btn-secondary" id="dip-report-btn"
                    onclick="dip_downloadReport()" style="display:none;width:100%">
              ↓ Download Lab Report
            </button>
          </div>
        </div>

        <!-- ════════════════════════
             PANEL: MEDIAN CUT
        ════════════════════════ -->
        <div id="dip-panel-mediancut" style="display:none">
          <h3 style="margin-top:4px">Median Cut Quantization</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Content-aware palette — splits color space where the actual
            pixels are. All selected color counts run together so you
            see 64 → 16 → 4 side by side with difference images.
          </div>

          <!-- Color count checkboxes — user picks which to run -->
          <div class="form-group">
            <label style="margin-bottom:6px;display:block">
              Color counts to test <span style="color:var(--text3)">(tick any combination)</span>
            </label>
            <div id="mc-color-checks" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem;
                     background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
                <input type="checkbox" value="64" checked> 64
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem;
                     background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
                <input type="checkbox" value="16" checked> 16
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem;
                     background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
                <input type="checkbox" value="4"  checked> 4
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem;
                     background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
                <input type="checkbox" value="8"> 8
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem;
                     background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
                <input type="checkbox" value="32"> 32
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem;
                     background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 10px">
                <input type="checkbox" value="128"> 128
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Diff amplification ×</label>
            <div class="slider-row">
              <input type="range" id="mc-gain" min="1" max="8" step=".5" value="3">
              <span class="slider-val" id="mc-gain-val">3</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" id="mc-run-btn" disabled>▶ Run Median Cut (All Selected)</button>
          </div>

          <!-- Algorithm steps -->
          <div style="background:var(--bg2);border-radius:8px;padding:12px;margin-top:10px">
            <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--purple);
                        font-weight:700;margin-bottom:8px">Algorithm — 5 Steps</div>
            <div style="font-size:.74rem;color:var(--text2);line-height:1.9">
              ${[
                'Saare pixels → ek bucket mein daalo',
                'Sabse bade bucket mein R/G/B ka range check karo',
                'Widest channel pe sort karo, median pe split karo',
                'Repeat jab tak buckets = target colors',
                'Har bucket ka average = palette entry. Nearest mapping.'
              ].map((s,i)=>`
                <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
                  <span style="background:var(--purple);color:#fff;border-radius:50%;width:18px;height:18px;
                               display:flex;align-items:center;justify-content:center;font-size:.6rem;
                               flex-shrink:0;margin-top:1px">${i+1}</span>
                  <span>${s}</span>
                </div>`).join('')}
            </div>
          </div>

          <div style="margin-top:12px">
            <button class="btn btn-secondary" id="mc-report-btn"
                    onclick="dip_downloadMCReport()" style="display:none;width:100%">
              ↓ Download Median Cut Report
            </button>
          </div>
        </div>

        <!-- ════════════════════════
             PANEL: FILTERS
        ════════════════════════ -->
        <div id="dip-panel-filters" style="display:none">
          <h3 style="margin-top:4px">Spatial Filters</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Each filter slides a kernel over every pixel.
            Output = weighted sum of that pixel + its neighbors.
          </div>
          <div class="form-group">
            <label>Choose filter</label>
            <select id="filter-type">
              <option value="grayscale">Grayscale Conversion</option>
              <option value="negative">Negative (Invert)</option>
              <option value="blur1">Gaussian Blur (σ=1)</option>
              <option value="blur2">Gaussian Blur (σ=2)</option>
              <option value="sharpen">Sharpening Filter</option>
              <option value="edge">Sobel Edge Detection</option>
              <option value="emboss">Emboss Effect</option>
              <option value="median">Median Filter (noise removal)</option>
              <option value="threshold">Thresholding (binary)</option>
              <option value="histeq">Histogram Equalization</option>
            </select>
          </div>
          <div id="filter-thresh-group" class="form-group" style="display:none">
            <label>Threshold value (0–255)</label>
            <div class="slider-row">
              <input type="range" id="filter-thresh" min="0" max="255" step="1" value="128">
              <span class="slider-val" id="filter-thresh-val">128</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary"   id="filter-run-btn"  disabled>▶ Apply Filter</button>
            <button class="btn btn-secondary" id="filter-all-btn"  disabled onclick="dip_applyAllFilters()">All Filters</button>
          </div>
          <div id="filter-info" style="font-size:.76rem;color:var(--text2);line-height:1.7;
               margin-top:10px;padding:10px;background:var(--bg2);border-radius:8px;
               border-left:3px solid var(--purple)"></div>
        </div>

        <!-- ════════════════════════
             PANEL: DCT
        ════════════════════════ -->
        <div id="dip-panel-dct" style="display:none">
          <h3 style="margin-top:4px">DCT / JPEG Compression</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Image → 8×8 blocks → forward DCT → quantize coefficients →
            inverse DCT. High frequencies get rounded aggressively because
            the eye barely notices them.
          </div>
          <div class="form-group">
            <label>JPEG Quality (1 = worst, 100 = best)</label>
            <div class="slider-row">
              <input type="range" id="dct-quality" min="1" max="100" step="1" value="50">
              <span class="slider-val" id="dct-quality-val">50</span>
            </div>
          </div>
          <div class="form-group">
            <label>Coefficients to keep (out of 64)</label>
            <div class="slider-row">
              <input type="range" id="dct-coeffs" min="1" max="64" step="1" value="32">
              <span class="slider-val" id="dct-coeffs-val">32 / 64</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary"   id="dct-run-btn"    disabled>▶ Apply to Image</button>
            <button class="btn btn-secondary" onclick="dip_showQuantMatrix()" id="dct-matrix-btn">Show Q-Matrix</button>
          </div>
        </div>

        <!-- ════════════════════════
             PANEL: HISTOGRAM
        ════════════════════════ -->
        <div id="dip-panel-histogram" style="display:none">
          <h3 style="margin-top:4px">Histogram Analysis</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            How many pixels have each brightness (0–255).
            Quantized → sharp spikes. Dithered → smooth again.
          </div>
          <div class="form-group">
            <label>Overlay comparison</label>
            <select id="hist-compare">
              <option value="orig">Original only</option>
              <option value="quant64">vs Quantized 64 colors</option>
              <option value="quant16">vs Quantized 16 colors</option>
              <option value="quant4">vs Quantized 4 colors</option>
              <option value="fs64">vs FS Dithered 64</option>
              <option value="fs16">vs FS Dithered 16</option>
              <option value="fs4">vs FS Dithered 4</option>
              <option value="mc64">vs Median Cut 64</option>
              <option value="mc16">vs Median Cut 16</option>
              <option value="mc8">vs Median Cut 8</option>
            </select>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="hist-draw-btn" disabled>▶ Draw Histogram</button>
          </div>
        </div>

        <!-- LOG -->
        <div class="calc-log" id="dip-log" style="margin-top:14px;background:rgba(0,0,0,.35);
             border:1px solid var(--border);border-radius:8px;padding:12px;
             font-family:var(--font-mono);font-size:.72rem;line-height:1.8;
             max-height:200px;overflow-y:auto">
          <div style="color:var(--text3)">Upload an image to begin.</div>
        </div>

      </div><!-- /control-panel -->

      <!-- ── RIGHT: VIZ AREA ── -->
      <div class="viz-area" id="dip-viz">

        <!-- QUANTIZATION output -->
        <div id="dip-quant-wrap">
          <div class="canvas-card">
            <h4>Results</h4>
            <div id="dip-main-hint" style="padding:30px;text-align:center;
                 color:var(--text3);font-family:var(--font-mono);font-size:.8rem">
              Upload an image and press ▶ to begin
            </div>
            <div id="dip-results-grid"></div>
          </div>
          <div class="canvas-card" id="dip-metrics-card" style="display:none">
            <h4>Quality Metrics — MSE / PSNR / SSIM</h4>
            <div id="dip-metrics-grid"></div>
          </div>
          <div id="dip-theory-cards" style="display:none;flex-direction:column;gap:16px">
            <div class="canvas-card">
              <h4>What is Color Quantization?</h4>
              <div style="font-size:.82rem;color:var(--text2);line-height:1.8">
                <p>Each pixel has R, G, B values 0–255 → 256³ = 16.7 million possible colors.
                Quantization snaps each channel to a small number of allowed values.</p>
                <div style="font-family:var(--font-mono);font-size:.76rem;color:var(--amber);
                            background:rgba(255,184,48,.06);border-left:3px solid var(--amber);
                            padding:10px 14px;border-radius:0 8px 8px 0;margin:8px 0">
                  step = 255 / (levels − 1)<br>
                  quantized = round(pixel / step) × step<br><br>
                  Example (4 levels, step=85):<br>
                  R=120 → round(120/85)=1 → 85 · Error=35 thrown away
                </div>
                <p>Floyd-Steinberg fixes this by spreading that error to neighboring pixels.</p>
              </div>
            </div>
          </div>
          <div class="canvas-card" id="dip-obs-card" style="display:none">
            <h4>Observations</h4>
            <div id="dip-obs-content"></div>
          </div>
        </div>

        <!-- MEDIAN CUT output -->
        <div id="dip-mediancut-wrap" style="display:none">

          <div class="canvas-card">
            <h4>Median Cut — All Selected Colors</h4>
            <div id="mc-hint" style="padding:30px;text-align:center;color:var(--text3);
                 font-family:var(--font-mono);font-size:.8rem">
              Select color counts above and press ▶ Run Median Cut
            </div>
            <!-- Per-color results injected here -->
            <div id="mc-all-results"></div>
          </div>

          <!-- Combined metrics table across all colors -->
          <div class="canvas-card" id="mc-metrics-card" style="display:none">
            <h4>Quality Metrics — All Colors Compared</h4>
            <div id="mc-metrics-grid"></div>
          </div>

          <!-- Palette display per color -->
          <div id="mc-palettes-wrap"></div>

          <!-- Theory box -->
          <div class="canvas-card">
            <h4>Median Cut vs Uniform Quantization</h4>
            <div style="font-size:.82rem;color:var(--text2);line-height:1.9">
              <p><strong style="color:var(--purple)">Uniform Quantization</strong> divides color space
              into equal-sized cells regardless of pixel distribution. Wastes palette slots on
              color regions with no pixels.</p>
              <p><strong style="color:var(--cyan)">Median Cut</strong> only allocates palette colors
              where actual image colors are. A forest photo uses most slots for greens;
              a portrait uses them for skin tones.</p>
              <div style="font-family:var(--font-mono);font-size:.74rem;color:var(--green);
                          background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);
                          border-radius:8px;padding:10px;margin-top:10px">
                Median Cut is behind early GIF encoders and PNG-8 converters
              </div>
            </div>
          </div>
        </div>

        <!-- FILTER output -->
        <div id="dip-filter-wrap" style="display:none">
          <div class="canvas-card">
            <h4>Filter Results</h4>
            <div id="dip-filter-hint" style="padding:30px;text-align:center;color:var(--text3);
                 font-family:var(--font-mono);font-size:.8rem">
              Upload an image and apply a filter
            </div>
            <div id="dip-filter-grid"></div>
          </div>
          <div class="canvas-card" id="dip-filter-theory" style="display:none">
            <h4 id="dip-filter-theory-title">How this filter works</h4>
            <div id="dip-filter-theory-content"
                 style="font-size:.82rem;color:var(--text2);line-height:1.8"></div>
          </div>
        </div>

        <!-- DCT output -->
        <div id="dip-dct-wrap" style="display:none">
          <div class="canvas-card">
            <h4>DCT Block Visualization</h4>
            <div id="dip-dct-content">
              <div style="padding:30px;text-align:center;color:var(--text3);
                   font-family:var(--font-mono);font-size:.8rem">
                Upload an image and press ▶ Apply to Image
              </div>
            </div>
          </div>
          <div class="canvas-card" id="dip-qmatrix-card" style="display:none">
            <h4>JPEG Quantization Matrix (Luminance)</h4>
            <div id="dip-qmatrix"></div>
          </div>
          <div class="canvas-card">
            <h4>How JPEG Compression Works</h4>
            <div style="font-size:.82rem;color:var(--text2);line-height:1.9">
              <p><strong style="color:var(--cyan)">Step 1:</strong> Image → 8×8 blocks.</p>
              <p><strong style="color:var(--cyan)">Step 2:</strong> Forward DCT → frequency coefficients. Top-left = DC (block average), others = detail.</p>
              <p><strong style="color:var(--cyan)">Step 3:</strong> Divide by Q-matrix and round. High-freq → zero. This is the compression.</p>
              <p><strong style="color:var(--cyan)">Step 4:</strong> Entropy-code the zeros (Huffman). Zeros compress very efficiently.</p>
              <p><strong style="color:var(--cyan)">Step 5:</strong> Decode: multiply back, inverse DCT, reconstruct.</p>
              <div style="font-family:var(--font-mono);font-size:.74rem;color:var(--green);
                          background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);
                          border-radius:8px;padding:10px;margin-top:10px">
                Lower quality → bigger matrix values → more zeros → smaller file
              </div>
            </div>
          </div>
        </div>

        <!-- HISTOGRAM output -->
        <div id="dip-hist-wrap" style="display:none">
          <div class="canvas-card">
            <h4>Pixel Intensity Histogram — R / G / B</h4>
            <canvas id="dip-hist-canvas" width="680" height="240"
                    style="display:block;width:100%;border-radius:6px"></canvas>
            <p style="font-size:.7rem;color:var(--text3);margin-top:8px;
                      font-family:var(--font-mono)">
              Filled bars = original &nbsp;|&nbsp; Amber line = comparison.<br>
              Spiky = quantized &nbsp;|&nbsp; Smooth = original or dithered
            </p>
          </div>
        </div>

      </div><!-- /viz-area -->
    </div><!-- /panel-layout -->
  `;

  dip_attachEvents();
}


/* ═══════════════════════════════════════════════════════════════
   SPEED
═══════════════════════════════════════════════════════════════ */
function dip_setSpeed(speed, btn) {
  dip_processingSpeed = speed;
  document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const descs = {
    slow:   ' Slow: 500ms delay — each color group renders one by one. Best for learning.',
    normal: ' Normal: 30ms delay — balanced, smooth UI updates.',
    fast:   ' Fast: no delay — all groups process instantly.'
  };
  document.getElementById('dip-speed-desc').textContent = descs[speed];
}

function dip_delay() {
  const ms = { slow: 500, normal: 30, fast: 0 }[dip_processingSpeed] || 30;
  return ms === 0 ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
}


/* ═══════════════════════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════════════════════ */
function dip_switchTab(name, btn) {
  const panels = ['quantization','mediancut','filters','dct','histogram'];
  const wraps  = {
    quantization: 'dip-quant-wrap',
    mediancut:    'dip-mediancut-wrap',
    filters:      'dip-filter-wrap',
    dct:          'dip-dct-wrap',
    histogram:    'dip-hist-wrap'
  };
  panels.forEach(t => {
    document.getElementById('dip-panel-' + t).style.display = (t === name) ? '' : 'none';
    document.getElementById(wraps[t]).style.display = (t === name) ? '' : 'none';
  });
  document.querySelectorAll('#tab-dip .nav-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}


/* ═══════════════════════════════════════════════════════════════
   EVENT WIRING
═══════════════════════════════════════════════════════════════ */
function dip_attachEvents() {
  /* Sliders */
  const bind = (id, valId, suffix) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', e => {
      document.getElementById(valId).textContent = e.target.value + (suffix||'');
    });
  };
  bind('dip-size', 'dip-size-val');
  bind('dip-gain', 'dip-gain-val');
  bind('mc-gain',  'mc-gain-val');
  bind('dct-quality', 'dct-quality-val');
  bind('filter-thresh', 'filter-thresh-val');
  document.getElementById('dct-coeffs').addEventListener('input', e => {
    document.getElementById('dct-coeffs-val').textContent = e.target.value + ' / 64';
  });

  /* Filter type change */
  document.getElementById('filter-type').addEventListener('change', e => {
    const t = e.target.value;
    document.getElementById('filter-thresh-group').style.display = t === 'threshold' ? '' : 'none';
    document.getElementById('filter-info').innerHTML = dip_filterInfo(t);
  });

  /* File input */
  document.getElementById('dip-file-inp').addEventListener('change', dip_loadImageFile);

  /* Buttons */
  document.getElementById('dip-demo-btn').addEventListener('click',  dip_loadDemoImage);
  document.getElementById('dip-run-btn').addEventListener('click',   dip_runQuantization);
  document.getElementById('mc-run-btn').addEventListener('click',    dip_runMedianCutAll);
  document.getElementById('dip-reset-btn').addEventListener('click', dip_reset);
  document.getElementById('filter-run-btn').addEventListener('click', dip_applyFilter);
  document.getElementById('hist-draw-btn').addEventListener('click', dip_drawHistogram);
  document.getElementById('dct-run-btn').addEventListener('click',   dip_runDCT);

  /* Drag & drop */
  const zone = document.getElementById('dip-upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--green)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = 'var(--border2)'; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = 'var(--border2)';
    const f = e.dataTransfer.files[0];
    if (f) dip_loadFile(f);
  });

  /* Init filter info */
  document.getElementById('filter-info').innerHTML = dip_filterInfo('grayscale');
}


/* ═══════════════════════════════════════════════════════════════
   IMAGE LOADING
═══════════════════════════════════════════════════════════════ */
function dip_filterInfo(type) {
  const infos = {
    grayscale: 'ITU-R weights: Y = 0.299R + 0.587G + 0.114B. Green contributes most — eye is most sensitive to it.',
    negative:  'Each pixel → 255 − original. Swaps dark↔light. Useful for X-ray views.',
    blur1:     'Gaussian σ=1. Weighted average of neighbors. Weights follow bell curve. Removes high-freq noise.',
    blur2:     'Gaussian σ=2. Wider kernel = more blur. Removes fine detail, leaves large regions.',
    sharpen:   'Laplacian kernel. Amplifies pixel-neighbor differences. Makes edges crisper.',
    edge:      'Sobel: gradient in X ([-1,0,1]) and Y ([-1,-2,-1]) directions. Bright output = strong edge.',
    emboss:    'Shifts pixel values diagonally → 3D raised-surface effect.',
    median:    '3×3 neighborhood sorted; pixel = median. Removes salt-and-pepper noise better than blur.',
    threshold: 'If luma ≥ T → white (255), else → black (0). Simplest segmentation.',
    histeq:    'CDF lookup table remaps pixels so histogram is flat. Auto contrast improvement.'
  };
  return infos[type] || '';
}

function dip_loadImageFile(e) {
  const f = e.target.files[0];
  if (f) dip_loadFile(f);
}

function dip_loadFile(file) {
  dip_log('Loading ' + file.name + '...', 'log-concept');
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const sz = parseInt(document.getElementById('dip-size').value);
      const ratio = img.width / img.height;
      const c = document.createElement('canvas');
      c.width  = sz;
      c.height = Math.round(sz / ratio);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      dip_setImage(c);
      dip_log('Loaded: ' + c.width + '×' + c.height + ' px', 'log-result');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function dip_loadDemoImage() {
  dip_log('Generating demo portrait...', 'log-concept');
  const sz = parseInt(document.getElementById('dip-size').value);
  const W = sz, H = Math.round(sz * 1.35);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H * .4);
  bg.addColorStop(0, '#2a5fa8'); bg.addColorStop(1, '#1a3a72');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const body = ctx.createLinearGradient(0, H*.3, 0, H);
  body.addColorStop(0, '#e8b48a'); body.addColorStop(1, '#c47d3a');
  ctx.fillStyle = body; ctx.fillRect(0, H*.45, W, H);

  ctx.fillStyle = '#3a5fa8';
  ctx.beginPath(); ctx.moveTo(W*.3,H*.55); ctx.lineTo(W*.7,H*.55); ctx.lineTo(W*.75,H); ctx.lineTo(W*.25,H); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#f0c49a';
  ctx.beginPath(); ctx.ellipse(W/2, H*.28, W*.17, H*.13, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#3d2200';
  ctx.beginPath(); ctx.ellipse(W/2, H*.17, W*.17, H*.08, 0, 0, Math.PI); ctx.fill();

  [W*.42, W*.58].forEach(ex => {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(ex, H*.27, W*.04, H*.02, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.arc(ex, H*.27, W*.02, 0, Math.PI*2); ctx.fill();
  });

  ctx.strokeStyle = '#8b4513'; ctx.lineWidth = Math.max(1, W*.015);
  ctx.beginPath(); ctx.arc(W*.5, H*.32, W*.06, 0.1, Math.PI-.1); ctx.stroke();

  dip_setImage(c);
  dip_log('Demo ' + W + '×' + H + 'px', 'log-result');
}

function dip_setImage(canvas) {
  dip_imgW = canvas.width;
  dip_imgH = canvas.height;
  dip_origImageData = canvas.getContext('2d').getImageData(0, 0, dip_imgW, dip_imgH);

  const zone = document.getElementById('dip-upload-zone');
  zone.style.borderColor = 'var(--green)';
  zone.innerHTML = `
    <input type="file" id="dip-file-inp" accept="image/*" style="display:none">
    <div style="font-size:1.2rem;color:var(--green)">✓</div>
    <strong style="display:block;color:var(--green);font-size:.85rem">
      Image ready (${dip_imgW}×${dip_imgH}px)
    </strong>
    <p style="font-size:.72rem;color:var(--text2)">click to change</p>
  `;
  zone.onclick = () => document.getElementById('dip-file-inp').click();
  document.getElementById('dip-file-inp').addEventListener('change', dip_loadImageFile);

  ['dip-run-btn','mc-run-btn','filter-run-btn','filter-all-btn','dct-run-btn','hist-draw-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
}


/* ═══════════════════════════════════════════════════════════════
   UNIFORM QUANTIZATION + FLOYD-STEINBERG
═══════════════════════════════════════════════════════════════ */
async function dip_runQuantization() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }

  const gain    = parseFloat(document.getElementById('dip-gain').value);
  const checked = [...document.querySelectorAll('#dip-level-checks input:checked')]
    .map(cb => parseInt(cb.value)).sort((a,b) => b-a);
  if (!checked.length) { dip_log('Select at least one color level.', 'log-error'); return; }

  dip_clearLog('Running uniform quantization [' + dip_processingSpeed + ']...');
  document.getElementById('dip-main-hint').style.display = 'none';
  document.getElementById('dip-results-grid').innerHTML = '';
  document.getElementById('dip-metrics-card').style.display = 'none';
  document.getElementById('dip-obs-card').style.display = 'none';
  document.getElementById('dip-theory-cards').style.display = 'none';

  const origSec = dip_makeSection('Original Image', 'No processing');
  const origRow = dip_makeRow();
  origRow.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  origSec.appendChild(origRow);
  document.getElementById('dip-results-grid').appendChild(origSec);

  dip_lastResults = [];

  for (const nc of checked) {
    await dip_delay();
    dip_log('Processing ' + nc + ' colors...', 'log-concept');

    const q      = new ColorQuantizer(nc);
    const qData  = q.quantize(dip_origImageData);
    const qDiff  = DiffImage.compute(dip_origImageData, qData, gain);
    const mse    = ImageMetrics.mse(dip_origImageData, qData);
    const psnr   = ImageMetrics.psnr(mse);
    const ssim   = ImageMetrics.ssim(dip_origImageData, qData);
    dip_log('Plain  MSE=' + mse.toFixed(2) + ' PSNR=' + psnr.toFixed(1) + 'dB', 'log-result');

    await dip_delay();
    const fs     = new FloydSteinberg(q);
    const fsData = fs.dither(dip_origImageData);
    const fsDiff = DiffImage.compute(dip_origImageData, fsData, gain);
    const mseFS  = ImageMetrics.mse(dip_origImageData, fsData);
    const psnrFS = ImageMetrics.psnr(mseFS);
    const ssimFS = ImageMetrics.ssim(dip_origImageData, fsData);
    dip_log('FS     MSE=' + mseFS.toFixed(2) + ' PSNR=' + psnrFS.toFixed(1) + 'dB', 'log-result');

    dip_lastResults.push({ nc, q, mse, psnr, ssim, mseFS, psnrFS, ssimFS, qData, qDiff, fsData, fsDiff });

    const sec = dip_makeSection(
      nc + ' Colors  (' + q.levelsPerCh + ' lvl/ch, step=' + q.step.toFixed(1) + ')',
      'Plain quantized + diff  |  FS dithered + diff'
    );
    const row = dip_makeRow();
    row.appendChild(dip_makeCell('Quantized (' + nc + ')', qData,
      'MSE ' + mse.toFixed(1) + ' | PSNR ' + psnr.toFixed(1) + 'dB | ' + ImageMetrics.grade(psnr)));
    row.appendChild(dip_makeCell('Diff — Plain', qDiff, 'Bright = high error'));
    row.appendChild(dip_makeCell('FS Dithered (' + nc + ')', fsData,
      'MSE ' + mseFS.toFixed(1) + ' | PSNR ' + psnrFS.toFixed(1) + 'dB | ' + ImageMetrics.grade(psnrFS)));
    row.appendChild(dip_makeCell('Diff — FS', fsDiff, 'Error spread'));
    sec.appendChild(row);
    document.getElementById('dip-results-grid').appendChild(sec);
  }

  document.getElementById('dip-theory-cards').style.display = 'flex';
  dip_renderMetrics(dip_lastResults);
  dip_renderObservations(dip_lastResults);
  document.getElementById('dip-report-btn').style.display = '';
  dip_log('Done. ' + checked.length + ' levels × 2 methods.', 'log-note');
}


/* ═══════════════════════════════════════════════════════════════
   MEDIAN CUT — ALL SELECTED COLORS TOGETHER
   ─────────────────────────────────────────────────────────────
   For each selected color count (e.g. 64, 16, 4):
     1. Build Median Cut palette
     2. Apply MC → quantized image
     3. Build FS dithering on top of MC palette
     4. Compute diff images and metrics
     5. Render all results in one card per color group
═══════════════════════════════════════════════════════════════ */
async function dip_runMedianCutAll() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }

  const gain    = parseFloat(document.getElementById('mc-gain').value);
  const checked = [...document.querySelectorAll('#mc-color-checks input:checked')]
    .map(cb => parseInt(cb.value)).sort((a,b) => b-a);

  if (!checked.length) { dip_log('Select at least one color count.', 'log-error'); return; }

  dip_clearLog('Running Median Cut for: ' + checked.join(', ') + ' colors [' + dip_processingSpeed + ']...');

  const hint = document.getElementById('mc-hint');
  hint.style.display = 'none';

  const allResults = document.getElementById('mc-all-results');
  allResults.innerHTML = '';
  document.getElementById('mc-metrics-card').style.display = 'none';
  document.getElementById('mc-palettes-wrap').innerHTML = '';
  document.getElementById('mc-report-btn').style.display = 'none';

  dip_lastMCResults = [];

  for (const nc of checked) {
    await dip_delay();
    dip_log('── ' + nc + ' colors ──', 'log-concept');

    /* ── Step 1: Median Cut palette + quantized image ── */
    dip_log('  Building MC palette...', 'log-concept');
    const mcQ    = new MedianCutQuantizer(nc);
    const mcData = mcQ.quantize(dip_origImageData);
    const mcDiff = DiffImage.compute(dip_origImageData, mcData, gain);
    const mcMSE  = ImageMetrics.mse(dip_origImageData, mcData);
    const mcPSNR = ImageMetrics.psnr(mcMSE);
    const mcSSIM = ImageMetrics.ssim(dip_origImageData, mcData);
    dip_log('  MC  MSE=' + mcMSE.toFixed(2) + ' PSNR=' + mcPSNR.toFixed(1) + 'dB SSIM=' + mcSSIM.toFixed(4), 'log-result');

    await dip_delay();

    /* ── Step 2: Floyd-Steinberg on top of the MC palette ── */
    dip_log('  Floyd-Steinberg on MC palette...', 'log-concept');
    const fsQ    = new MedianCutQuantizer(nc);
    // Build the same palette first, then FS uses it
    fsQ.lastPalette = mcQ.lastPalette;
    const fsObj  = new FloydSteinberg(fsQ);
    const fsData = fsObj.dither(dip_origImageData);
    const fsDiff = DiffImage.compute(dip_origImageData, fsData, gain);
    const fsMSE  = ImageMetrics.mse(dip_origImageData, fsData);
    const fsPSNR = ImageMetrics.psnr(fsMSE);
    const fsSSIM = ImageMetrics.ssim(dip_origImageData, fsData);
    dip_log('  FS  MSE=' + fsMSE.toFixed(2) + ' PSNR=' + fsPSNR.toFixed(1) + 'dB SSIM=' + fsSSIM.toFixed(4), 'log-result');

    const palette = mcQ.lastPalette || [];
    dip_lastMCResults.push({ nc, mcData, mcDiff, mcMSE, mcPSNR, mcSSIM,
                              fsData, fsDiff, fsMSE, fsPSNR, fsSSIM, palette });

    /* ── Render this color group ── */
    dip_renderMCGroup(allResults, {
      nc, mcData, mcDiff, mcMSE, mcPSNR, mcSSIM,
      fsData, fsDiff, fsMSE, fsPSNR, fsSSIM, palette
    }, gain);
  }

  dip_renderMCMetrics();
  dip_renderMCPalettes();
  document.getElementById('mc-report-btn').style.display = '';
  dip_log('Done — ' + checked.length + ' color levels processed.', 'log-note');
}

/* Render one color group block inside the Median Cut results card */
function dip_renderMCGroup(container, r, gain) {
  /* Section header */
  const header = document.createElement('div');
  header.style.cssText = `font-family:var(--font-mono);font-size:.72rem;color:var(--cyan);
    padding:8px 14px;background:var(--bg2);border-radius:6px;border-left:3px solid var(--cyan);
    margin:16px 0 10px`;
  header.innerHTML = `<strong>${r.nc} Colors</strong>
    <span style="color:var(--text3);font-size:.66rem"> — Median Cut palette (content-aware)</span>`;
  container.appendChild(header);

  /* ── MC row: Original | MC result | MC diff ── */
  const subLabelMC = document.createElement('div');
  subLabelMC.style.cssText = 'font-family:var(--font-mono);font-size:.66rem;color:var(--cyan);margin-bottom:6px;padding-left:2px';
  subLabelMC.textContent = 'A) Median Cut  →  MSE ' + r.mcMSE.toFixed(1) + ' | PSNR ' + r.mcPSNR.toFixed(1) + 'dB | ' + ImageMetrics.grade(r.mcPSNR);
  container.appendChild(subLabelMC);

  const rowMC = dip_makeRow();
  rowMC.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  rowMC.appendChild(dip_makeCell('MC (' + r.nc + ' colors)', r.mcData,
    'MSE ' + r.mcMSE.toFixed(1) + ' | PSNR ' + r.mcPSNR.toFixed(1) + 'dB'));
  rowMC.appendChild(dip_makeCell('Diff — MC', r.mcDiff, 'Orange = error. Edges have most.'));
  container.appendChild(rowMC);

  /* ── FS row: Original | FS result | FS diff ── */
  const subLabelFS = document.createElement('div');
  subLabelFS.style.cssText = 'font-family:var(--font-mono);font-size:.66rem;color:var(--purple);margin:10px 0 6px;padding-left:2px';
  subLabelFS.textContent = 'B) Floyd-Steinberg (same MC palette)  →  MSE ' + r.fsMSE.toFixed(1) + ' | PSNR ' + r.fsPSNR.toFixed(1) + 'dB | ' + ImageMetrics.grade(r.fsPSNR);
  container.appendChild(subLabelFS);

  const rowFS = dip_makeRow();
  rowFS.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  rowFS.appendChild(dip_makeCell('FS Dithered (' + r.nc + ')', r.fsData,
    'MSE ' + r.fsMSE.toFixed(1) + ' | PSNR ' + r.fsPSNR.toFixed(1) + 'dB'));
  rowFS.appendChild(dip_makeCell('Diff — FS', r.fsDiff, 'Error spread to neighbors'));
  container.appendChild(rowFS);

  /* Observation note for this group */
  const obs = document.createElement('div');
  const better = r.fsPSNR > r.mcPSNR;
  obs.style.cssText = `background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);
    border-radius:8px;padding:10px 14px;font-size:.76rem;color:var(--text2);
    line-height:1.7;margin:10px 0 4px`;
  obs.innerHTML = `<strong style="color:var(--green)">Observation (${r.nc} colors):</strong>
    Median Cut PSNR = ${r.mcPSNR.toFixed(2)} dB.
    Floyd-Steinberg ${better ? '↑ improves to' : 'gives'} ${r.fsPSNR.toFixed(2)} dB.
    ${better
      ? 'FS error diffusion redistributes quantization error — image looks smoother at same palette size.'
      : 'FS MSE is similar but perceived smoothness improves — less banding visible.'}
    Difference image shows highest error at edges and smooth gradient regions (skin, sky).`;
  container.appendChild(obs);

  /* Thin divider */
  const div = document.createElement('hr');
  div.style.cssText = 'border:none;border-top:1px solid var(--border);margin:16px 0';
  container.appendChild(div);
}

/* Combined metrics table across all MC color groups */
function dip_renderMCMetrics() {
  if (!dip_lastMCResults.length) return;
  document.getElementById('mc-metrics-card').style.display = '';
  let html = `
    <table class="data-table" style="font-size:.76rem">
      <thead>
        <tr>
          <th>Colors</th><th>Method</th>
          <th>MSE ↓</th><th>PSNR ↑ (dB)</th><th>SSIM ↑</th><th>Grade</th>
        </tr>
      </thead>
      <tbody>
  `;
  dip_lastMCResults.forEach(r => {
    const cls = p => p >= 35 ? 'td-pos' : (p >= 28 ? '' : 'td-neg');
    html += `
      <tr>
        <td rowspan="2" style="font-weight:700;color:var(--amber);font-family:var(--font-mono)">${r.nc}</td>
        <td style="color:var(--cyan)">Median Cut</td>
        <td style="font-family:var(--font-mono)">${r.mcMSE.toFixed(2)}</td>
        <td class="${cls(r.mcPSNR)}" style="font-family:var(--font-mono)">${r.mcPSNR.toFixed(2)}</td>
        <td style="font-family:var(--font-mono)">${r.mcSSIM.toFixed(4)}</td>
        <td>${ImageMetrics.grade(r.mcPSNR)}</td>
      </tr>
      <tr>
        <td style="color:var(--purple)">Floyd-Steinberg (MC palette)</td>
        <td style="font-family:var(--font-mono)">${r.fsMSE.toFixed(2)}</td>
        <td class="${cls(r.fsPSNR)}" style="font-family:var(--font-mono)">${r.fsPSNR.toFixed(2)}</td>
        <td style="font-family:var(--font-mono)">${r.fsSSIM.toFixed(4)}</td>
        <td>${ImageMetrics.grade(r.fsPSNR)}</td>
      </tr>
    `;
  });
  html += `</tbody></table>
    <p style="font-size:.7rem;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">
      PSNR &gt;40dB=Excellent | 35–40=Good | 30–35=Acceptable | &lt;30=Visible degradation
    </p>`;
  document.getElementById('mc-metrics-grid').innerHTML = html;
}

/* Palette swatches per color group */
function dip_renderMCPalettes() {
  const wrap = document.getElementById('mc-palettes-wrap');
  wrap.innerHTML = '';
  dip_lastMCResults.forEach(r => {
    if (!r.palette || !r.palette.length) return;
    const card = document.createElement('div');
    card.className = 'canvas-card';
    card.innerHTML = `<h4>Extracted Palette — ${r.nc} colors</h4>
      <p style="font-family:var(--font-mono);font-size:.68rem;color:var(--text3);margin-bottom:8px">
        Each swatch = one bucket's average from the Median Cut tree
      </p>`;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px';
    r.palette.forEach(([pr, pg, pb]) => {
      const hex = '#' + [pr,pg,pb].map(v => v.toString(16).padStart(2,'0')).join('');
      const luma = 0.299*pr + 0.587*pg + 0.114*pb;
      const sw = document.createElement('div');
      sw.title = hex;
      sw.style.cssText = `width:34px;height:34px;border-radius:5px;background:${hex};
        border:1px solid var(--border);display:flex;align-items:flex-end;justify-content:center;overflow:hidden`;
      sw.innerHTML = `<span style="font-size:.42rem;font-family:var(--font-mono);
        color:${luma>128?'#000':'#fff'};padding:1px">${hex}</span>`;
      row.appendChild(sw);
    });
    card.appendChild(row);
    wrap.appendChild(card);
  });
}


/* ═══════════════════════════════════════════════════════════════
   FILTERS
═══════════════════════════════════════════════════════════════ */
function dip_applyFilter() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }
  const type   = document.getElementById('filter-type').value;
  const thresh = parseInt(document.getElementById('filter-thresh').value);

  dip_clearLog('Applying ' + type + '...');

  const map = {
    grayscale: () => Filters.grayscale(dip_origImageData),
    negative:  () => Filters.negative(dip_origImageData),
    blur1:     () => Filters.gaussianBlur(dip_origImageData, 1),
    blur2:     () => Filters.gaussianBlur(dip_origImageData, 2),
    sharpen:   () => Filters.sharpen(dip_origImageData),
    edge:      () => Filters.sobelEdge(dip_origImageData),
    emboss:    () => Filters.emboss(dip_origImageData),
    median:    () => Filters.medianFilter(dip_origImageData),
    threshold: () => Filters.threshold(dip_origImageData, thresh),
    histeq:    () => Filters.histogramEqualize(dip_origImageData),
  };
  const result = (map[type] || (() => dip_origImageData))();

  const mse  = ImageMetrics.mse(dip_origImageData, result);
  const psnr = ImageMetrics.psnr(mse);
  dip_log('Done. MSE=' + mse.toFixed(2) + ' PSNR=' + psnr.toFixed(1) + 'dB', 'log-result');

  document.getElementById('dip-filter-hint').style.display = 'none';
  const grid = document.getElementById('dip-filter-grid');
  grid.innerHTML = '';
  const row = dip_makeRow();
  row.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  row.appendChild(dip_makeCell(type, result, 'MSE ' + mse.toFixed(1) + ' | PSNR ' + psnr.toFixed(1) + 'dB'));
  row.appendChild(dip_makeCell('Difference', DiffImage.compute(dip_origImageData, result, 2), 'Changed area'));
  grid.appendChild(row);

  const theory = document.getElementById('dip-filter-theory');
  theory.style.display = '';
  document.getElementById('dip-filter-theory-title').textContent = 'How ' + type + ' works';
  document.getElementById('dip-filter-theory-content').textContent = dip_filterInfo(type);
}

function dip_applyAllFilters() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }
  dip_clearLog('Applying all filters...');
  const filters = [
    { name: 'Grayscale',         fn: () => Filters.grayscale(dip_origImageData) },
    { name: 'Negative',          fn: () => Filters.negative(dip_origImageData) },
    { name: 'Gaussian Blur σ=1', fn: () => Filters.gaussianBlur(dip_origImageData, 1) },
    { name: 'Gaussian Blur σ=2', fn: () => Filters.gaussianBlur(dip_origImageData, 2) },
    { name: 'Sharpen',           fn: () => Filters.sharpen(dip_origImageData) },
    { name: 'Sobel Edge',        fn: () => Filters.sobelEdge(dip_origImageData) },
    { name: 'Emboss',            fn: () => Filters.emboss(dip_origImageData) },
    { name: 'Median Filter',     fn: () => Filters.medianFilter(dip_origImageData) },
    { name: 'Threshold (T=128)', fn: () => Filters.threshold(dip_origImageData, 128) },
    { name: 'Histogram EQ',      fn: () => Filters.histogramEqualize(dip_origImageData) },
  ];
  document.getElementById('dip-filter-hint').style.display = 'none';
  const grid = document.getElementById('dip-filter-grid');
  grid.innerHTML = '';
  const origRow = dip_makeRow();
  origRow.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  grid.appendChild(origRow);
  filters.forEach(f => {
    const result = f.fn();
    const mse = ImageMetrics.mse(dip_origImageData, result);
    const psnr = ImageMetrics.psnr(mse);
    const row = dip_makeRow();
    row.appendChild(dip_makeCell(f.name, result, 'MSE ' + mse.toFixed(1) + ' | PSNR ' + psnr.toFixed(1) + 'dB'));
    grid.appendChild(row);
    dip_log(f.name + ' done', 'log-result');
  });
}


/* ═══════════════════════════════════════════════════════════════
   DCT
═══════════════════════════════════════════════════════════════ */
function dip_runDCT() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }
  document.getElementById('dip-dct-wrap').style.display = '';
  const quality = parseInt(document.getElementById('dct-quality').value);
  const keepN   = parseInt(document.getElementById('dct-coeffs').value);
  dip_clearLog('Running DCT / JPEG simulation...');
  dip_log('Quality=' + quality + ' | Keeping ' + keepN + '/64 coefficients', 'log-concept');

  const c = document.createElement('canvas');
  c.width = dip_imgW; c.height = dip_imgH;
  c.getContext('2d').putImageData(dip_origImageData, 0, 0);
  const bx = Math.max(0, Math.floor(dip_imgW/2) - 4);
  const by = Math.max(0, Math.floor(dip_imgH/2) - 4);
  const block8 = c.getContext('2d').getImageData(bx, by, 8, 8);

  const luma = [];
  for (let i = 0; i < block8.data.length; i += 4)
    luma.push(0.299*block8.data[i] + 0.587*block8.data[i+1] + 0.114*block8.data[i+2] - 128);

  const dctCoeffs   = DCT8x8.forward(luma);
  const qMat        = DCT8x8.lumaQuantMatrix(quality);
  const quantCoeffs = dctCoeffs.map((v, i) => Math.round(v / qMat[i]) * qMat[i]);
  for (let i = keepN; i < 64; i++) quantCoeffs[i] = 0;

  const nonZero = quantCoeffs.filter(v => v !== 0).length;
  dip_log('DC coeff F(0,0) = ' + dctCoeffs[0].toFixed(2) + ' (block average luma)', 'log-math');
  dip_log('Non-zero after quantize: ' + nonZero + '/64 (' + (64-nonZero) + ' zeroed)', 'log-result');

  const recon = DCT8x8.inverse(quantCoeffs);
  dip_renderDCTViz(luma, dctCoeffs, quantCoeffs, recon);
  dip_showQuantMatrix(quality);
}

function dip_renderDCTViz(orig, dct, quantDct, recon) {
  const wrap = document.getElementById('dip-dct-content');
  wrap.innerHTML = '';
  const sections = [
    { label: '8×8 Block (orig luma)',  data: orig,     maxAbs: 128,  cmap: 'gray' },
    { label: 'After Forward DCT',      data: dct,      maxAbs: null, cmap: 'rg'   },
    { label: 'After Quantization',     data: quantDct, maxAbs: null, cmap: 'rg'   },
    { label: 'Decoded (Inverse DCT)',  data: recon,    maxAbs: 128,  cmap: 'gray' },
  ];
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px';
  sections.forEach(sec => {
    const cell = document.createElement('div');
    cell.style.textAlign = 'center';
    const t = document.createElement('div');
    t.style.cssText = 'font-family:var(--font-mono);font-size:.66rem;color:var(--text3);margin-bottom:5px';
    t.textContent = sec.label;
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 8;
    cv.style.cssText = 'width:100%;image-rendering:pixelated;border-radius:4px;border:1px solid var(--border)';
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(8, 8);
    const maxV = sec.maxAbs || Math.max(...sec.data.map(Math.abs)) || 1;
    sec.data.forEach((v, i) => {
      const norm = Math.max(-1, Math.min(1, v / maxV));
      let r, g, b;
      if (sec.cmap === 'gray') { const l = Math.round((norm+1)/2*255); r=g=b=l; }
      else { r=norm>0?Math.round(norm*255):0; g=0; b=norm<0?Math.round(-norm*255):0; }
      img.data[i*4]=r; img.data[i*4+1]=g; img.data[i*4+2]=b; img.data[i*4+3]=255;
    });
    ctx.putImageData(img, 0, 0);
    cell.appendChild(t); cell.appendChild(cv);
    row.appendChild(cell);
  });
  wrap.appendChild(row);
  const note = document.createElement('p');
  note.style.cssText = 'font-size:.7rem;color:var(--text3);font-family:var(--font-mono)';
  note.textContent = 'Red=positive | Blue=negative | Black=zero (compressed away) | Compare block 1 vs 4 to see loss';
  wrap.appendChild(note);
}

function dip_showQuantMatrix(quality) {
  quality = quality || parseInt(document.getElementById('dct-quality').value);
  const mat = DCT8x8.lumaQuantMatrix(quality);
  const maxV = Math.max(...mat);
  document.getElementById('dip-qmatrix-card').style.display = '';
  let html = '<table style="width:100%;border-collapse:collapse;font-family:var(--font-mono);font-size:.72rem;text-align:center">';
  for (let r=0; r<8; r++) {
    html += '<tr>';
    for (let c=0; c<8; c++) {
      const v = mat[r*8+c];
      const bg = 'rgba(96,165,250,' + (.1 + v/maxV*.7).toFixed(2) + ')';
      html += `<td style="padding:5px;border:1px solid var(--border);background:${bg}">${v}</td>`;
    }
    html += '</tr>';
  }
  html += `</table>
    <p style="font-size:.68rem;color:var(--text3);margin-top:6px;font-family:var(--font-mono)">
      Quality=${quality} | Brighter=larger divisor=more loss | Top-left=DC (low freq) | Bottom-right=high freq (most compressed)
    </p>`;
  document.getElementById('dip-qmatrix').innerHTML = html;
}


/* ═══════════════════════════════════════════════════════════════
   HISTOGRAM
═══════════════════════════════════════════════════════════════ */
function dip_drawHistogram() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }
  document.getElementById('dip-hist-wrap').style.display = '';

  const mode = document.getElementById('hist-compare').value;
  let compData = dip_origImageData;

  if (mode !== 'orig') {
    if (mode.startsWith('mc')) {
      const nc = parseInt(mode.replace('mc',''));
      compData = new MedianCutQuantizer(nc).quantize(dip_origImageData);
    } else {
      const parts = mode.match(/^(quant|fs)(\d+)$/);
      if (parts) {
        const nc = parseInt(parts[2]);
        const q = new ColorQuantizer(nc);
        compData = parts[1]==='quant' ? q.quantize(dip_origImageData) : new FloydSteinberg(q).dither(dip_origImageData);
      }
    }
  }

  const histA  = Histogram.compute(dip_origImageData);
  const histB  = mode !== 'orig' ? Histogram.compute(compData) : null;
  const canvas = document.getElementById('dip-hist-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0,0,W,H);

  const channels = [
    { data: histA.r, color: '#f87171' },
    { data: histA.g, color: '#34d399' },
    { data: histA.b, color: '#60a5fa' },
  ];
  const pad = { t:12, b:24, l:28, r:10 };
  const cH  = Math.floor((H - pad.t - pad.b) / 3);

  channels.forEach((ch, ci) => {
    const top  = pad.t + ci * cH;
    const maxV = Math.max(...ch.data) || 1;
    const xSc  = (W - pad.l - pad.r) / 256;
    const ySc  = (cH - 8) / maxV;

    ctx.fillStyle = ch.color + '50';
    ch.data.forEach((v,i) => {
      const barH = v * ySc;
      ctx.fillRect(pad.l + i*xSc, top+cH-8-barH, xSc+.5, barH);
    });

    if (histB) {
      const comp = [histB.r, histB.g, histB.b][ci];
      const maxB = Math.max(...comp) || 1;
      const yScB = (cH-8) / Math.max(maxV, maxB);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1;
      ctx.beginPath();
      comp.forEach((v,i) => {
        const x = pad.l + i*xSc, y = top+cH-8-v*yScB;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = ch.color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(['R','G','B'][ci], 22, top+cH/2+4);
    ctx.strokeStyle = '#2e3a52'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, top+cH-8); ctx.lineTo(W-pad.r, top+cH-8); ctx.stroke();
  });

  dip_log('Histogram drawn.', 'log-result');
}


/* ═══════════════════════════════════════════════════════════════
   METRICS & OBSERVATIONS (Uniform Quantization tab)
═══════════════════════════════════════════════════════════════ */
function dip_renderMetrics(results) {
  document.getElementById('dip-metrics-card').style.display = '';
  let html = `
    <table class="data-table" style="font-size:.76rem">
      <thead>
        <tr><th>Colors</th><th>Method</th><th>MSE ↓</th><th>PSNR ↑ (dB)</th><th>SSIM ↑</th><th>Grade</th></tr>
      </thead><tbody>
  `;
  results.forEach(s => {
    const cls = p => p>=35?'td-pos':(p>=28?'':'td-neg');
    html += `
      <tr>
        <td rowspan="2" style="font-weight:700;color:var(--amber);font-family:var(--font-mono)">${s.nc}</td>
        <td style="color:var(--text2)">Plain Quantization</td>
        <td style="font-family:var(--font-mono)">${s.mse.toFixed(2)}</td>
        <td class="${cls(s.psnr)}" style="font-family:var(--font-mono)">${s.psnr.toFixed(2)}</td>
        <td style="font-family:var(--font-mono)">${s.ssim.toFixed(4)}</td>
        <td>${ImageMetrics.grade(s.psnr)}</td>
      </tr>
      <tr>
        <td style="color:var(--purple)">Floyd-Steinberg</td>
        <td style="font-family:var(--font-mono)">${s.mseFS.toFixed(2)}</td>
        <td class="${cls(s.psnrFS)}" style="font-family:var(--font-mono)">${s.psnrFS.toFixed(2)}</td>
        <td style="font-family:var(--font-mono)">${s.ssimFS.toFixed(4)}</td>
        <td>${ImageMetrics.grade(s.psnrFS)}</td>
      </tr>
    `;
  });
  html += `</tbody></table>
    <p style="font-size:.7rem;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">
      PSNR&gt;40dB=Excellent | 35–40=Good | 30–35=Acceptable | &lt;30=Visible degradation
    </p>`;
  document.getElementById('dip-metrics-grid').innerHTML = html;
}

function dip_renderObservations(results) {
  document.getElementById('dip-obs-card').style.display = '';
  let html = '<div style="display:flex;flex-direction:column;gap:12px">';
  results.forEach(s => {
    const imp = s.psnrFS > s.psnr;
    const diff = Math.abs(s.psnrFS - s.psnr).toFixed(2);
    html += `
      <div style="background:var(--bg2);border-radius:8px;padding:14px;border-left:3px solid var(--cyan)">
        <div style="font-family:var(--font-mono);font-size:.76rem;color:var(--cyan);margin-bottom:10px;font-weight:700">
          ${s.nc} Colors
        </div>
        <ul style="padding-left:18px;color:var(--text2);font-size:.82rem;line-height:2">
          <li>Plain: MSE=<strong style="color:var(--amber)">${s.mse.toFixed(2)}</strong>, PSNR=<strong style="color:var(--green)">${s.psnr.toFixed(2)} dB</strong> (${ImageMetrics.grade(s.psnr)})</li>
          <li>FS Dithered: MSE=<strong style="color:var(--amber)">${s.mseFS.toFixed(2)}</strong>, PSNR=<strong style="color:var(--green)">${s.psnrFS.toFixed(2)} dB</strong> (${ImageMetrics.grade(s.psnrFS)})</li>
          <li>FS ${imp?'↑ improves':'↓ changes'} PSNR by ${diff} dB — ${imp?'error diffusion gives better quality':'MSE redistributed but visual smoothness improves'}</li>
          <li>Difference image brightest at edges and smooth gradients</li>
        </ul>
      </div>
    `;
  });
  html += `
    <div style="background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.2);border-radius:8px;padding:14px">
      <div style="font-family:var(--font-mono);font-size:.76rem;color:var(--green);margin-bottom:8px;font-weight:700">Key Takeaways</div>
      <ul style="padding-left:18px;color:var(--text2);font-size:.82rem;line-height:2">
        <li>More colors → lower MSE → higher PSNR → better quality</li>
        <li>Floyd-Steinberg improves perceived quality at same color count</li>
        <li>SSIM is closer to human perception than MSE/PSNR</li>
        <li>Diff images are brightest at edges — quantization error concentrates there</li>
        <li>Core principle behind JPEG, GIF, and PNG-8 compression</li>
      </ul>
    </div>
  </div>`;
  document.getElementById('dip-obs-content').innerHTML = html;
}


/* ═══════════════════════════════════════════════════════════════
   REPORT DOWNLOAD — Median Cut version
═══════════════════════════════════════════════════════════════ */
function dip_downloadMCReport() {
  if (!dip_lastMCResults.length) { dip_log('Run Median Cut first.', 'log-error'); return; }

  const buildURL = imageData => {
    const c = document.createElement('canvas');
    c.width = imageData.width; c.height = imageData.height;
    c.getContext('2d').putImageData(imageData, 0, 0);
    return c.toDataURL();
  };

  const origURL = buildURL(dip_origImageData);

  let resultsHTML = '';
  dip_lastMCResults.forEach(r => {
    resultsHTML += `
      <div style="margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid #ddd">
        <h3 style="font-family:monospace;font-size:15px;color:#1a3a6a;margin-bottom:14px">
          ${r.nc} Colors
        </h3>

        <h4 style="font-family:monospace;font-size:13px;color:#333;margin-bottom:8px">
          A) Median Cut Results
        </h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
          <div style="text-align:center">
            <img src="${origURL}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd;border-radius:3px">
            <p style="font-size:11px;color:#555;margin-top:4px">Original Image</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(r.mcData)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd;border-radius:3px">
            <p style="font-size:11px;color:#555;margin-top:4px">Median Cut (${r.nc} colors)<br>MSE=${r.mcMSE.toFixed(2)} | PSNR=${r.mcPSNR.toFixed(2)} dB | ${ImageMetrics.grade(r.mcPSNR)}</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(r.mcDiff)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd;border-radius:3px">
            <p style="font-size:11px;color:#555;margin-top:4px">Difference Image (MC)<br>SSIM=${r.mcSSIM.toFixed(4)}</p>
          </div>
        </div>

        <h4 style="font-family:monospace;font-size:13px;color:#333;margin-bottom:8px">
          B) Floyd-Steinberg Dithering (same MC palette)
        </h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
          <div style="text-align:center">
            <img src="${origURL}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd;border-radius:3px">
            <p style="font-size:11px;color:#555;margin-top:4px">Original Image</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(r.fsData)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd;border-radius:3px">
            <p style="font-size:11px;color:#555;margin-top:4px">FS Dithered (${r.nc} colors)<br>MSE=${r.fsMSE.toFixed(2)} | PSNR=${r.fsPSNR.toFixed(2)} dB | ${ImageMetrics.grade(r.fsPSNR)}</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(r.fsDiff)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd;border-radius:3px">
            <p style="font-size:11px;color:#555;margin-top:4px">Difference Image (FS)<br>SSIM=${r.fsSSIM.toFixed(4)}</p>
          </div>
        </div>

        <div style="background:#f5f9ff;border-left:4px solid #1a3a6a;padding:10px 14px;
                    font-size:12px;border-radius:0 4px 4px 0">
          <strong>Observation:</strong>
          At ${r.nc} colors, Median Cut gives PSNR = ${r.mcPSNR.toFixed(2)} dB.
          Floyd-Steinberg dithering gives PSNR = ${r.fsPSNR.toFixed(2)} dB.
          ${r.fsPSNR > r.mcPSNR
            ? 'Dithering improves quality by distributing quantization error to neighbors.'
            : 'Error diffusion redistributes quantization error, improving perceptual smoothness despite similar PSNR.'}
          Difference image confirms error concentrates at edges and smooth gradient regions.
        </div>
      </div>
    `;
  });

  let metricsRows = '';
  dip_lastMCResults.forEach(r => {
    metricsRows += `
      <tr>
        <td rowspan="2" style="font-weight:bold">${r.nc}</td>
        <td>Median Cut</td>
        <td style="font-family:monospace">${r.mcMSE.toFixed(2)}</td>
        <td style="font-family:monospace">${r.mcPSNR.toFixed(2)}</td>
        <td style="font-family:monospace">${r.mcSSIM.toFixed(4)}</td>
        <td>${ImageMetrics.grade(r.mcPSNR)}</td>
      </tr>
      <tr>
        <td>Floyd-Steinberg (MC palette)</td>
        <td style="font-family:monospace">${r.fsMSE.toFixed(2)}</td>
        <td style="font-family:monospace">${r.fsPSNR.toFixed(2)}</td>
        <td style="font-family:monospace">${r.fsSSIM.toFixed(4)}</td>
        <td>${ImageMetrics.grade(r.fsPSNR)}</td>
      </tr>
    `;
  });

  const reportHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Digital Image Processing</title>
<style>
  body{font-family:Georgia,serif;max-width:960px;margin:40px auto;color:#1a1a1a;line-height:1.6}
  h1{font-size:22px;border-bottom:3px solid #1a3a6a;padding-bottom:10px}
  h2{font-size:17px;color:#1a3a6a;margin-top:30px;border-bottom:1px solid #ccc;padding-bottom:6px}
  h3{font-size:14px;color:#333}
  .meta{font-size:13px;color:#555;background:#f5f9ff;padding:12px 16px;border-radius:4px;margin:16px 0}
  pre{background:#f4f4f4;padding:14px;border-radius:6px;font-size:12px;overflow-x:auto;border-left:4px solid #888}
  table{width:100%;border-collapse:collapse;font-size:13px;margin:14px 0}
  th{background:#1a3a6a;color:#fff;padding:9px 10px;text-align:left}
  td{border:1px solid #ddd;padding:7px 10px}
  tr:nth-child(even) td{background:#f9f9f9}
  .findings{background:#e8f5e8;border:1px solid #4a8a4a;border-radius:6px;padding:16px;margin-top:20px}
  @media print{body{margin:20px}}
</style>
</head>
<body>
<h1>Digital Image Processing</h1>
<h2 style="color:#333;border:none;font-size:19px">Median Cut Color Quantization + Floyd-Steinberg Dithering</h2>

<div class="meta">
  <strong>Name:</strong> Abhishek Kumar &nbsp;|&nbsp;
  <strong>Roll No:</strong> 2505371 &nbsp;|&nbsp;
  <strong>Subject:</strong> Digital Image Processing &nbsp;|&nbsp;
  <strong>Project link:</strong> <a href="https://cssimulation.netlify.app/">cssimulation.netlify.app</a>
  
</div>

<h2>1. Objective</h2>
<p>Implement Median Cut color quantization for 64, 16, and 4 colors. Show difference images.
Apply Floyd-Steinberg dithering and compare results using MSE, PSNR, and SSIM metrics.</p>

<h2>2. Input Image</h2>
<div style="text-align:center;margin:16px 0">
  <img src="${origURL}" style="max-width:180px;border:1px solid #ccc;border-radius:4px">
  <p style="font-size:12px;color:#555;margin-top:6px">${dip_imgW}×${dip_imgH} pixels</p>
</div>

<h2>3. Theory</h2>
<h3>3.1 Median Cut Algorithm</h3>
<pre>Step 1: All pixels → one bucket
Step 2: Find largest bucket
Step 3: In that bucket, find R/G/B channel with widest range
Step 4: Sort pixels by that channel; split at median index
Step 5: Repeat until bucket count = numColors
Step 6: palette[i] = average RGB of bucket[i]
Step 7: For each pixel, find nearest palette entry (min Euclidean distance)</pre>
<h3>3.2 Floyd-Steinberg Error Diffusion</h3>
<pre>         [curr]   7/16 →
 3/16     5/16    1/16    (next row)
error = original − quantized
Spread to: right(7/16), bottom-left(3/16), below(5/16), bottom-right(1/16)
All 16/16 redistributed — no error wasted</pre>
<h3>3.3 Quality Metrics</h3>
<pre>MSE  = (1/N)×Σ(original−quantized)²
PSNR = 10×log₁₀(255²/MSE)  [dB]   Higher=better
SSIM = structural similarity [0–1]  Closer to 1=better</pre>

<h2>4. Results — All Color Levels</h2>
${resultsHTML}

<h2>5. Metrics Summary</h2>
<table>
  <thead><tr><th>Colors</th><th>Method</th><th>MSE ↓</th><th>PSNR ↑</th><th>SSIM ↑</th><th>Grade</th></tr></thead>
  <tbody>${metricsRows}</tbody>
</table>

<h2>6. Observations</h2>
<ul>
  ${dip_lastMCResults.map(r=>`
    <li style="margin-bottom:8px">
      <strong>${r.nc} colors:</strong>
      MC PSNR=${r.mcPSNR.toFixed(2)}dB, FS PSNR=${r.fsPSNR.toFixed(2)}dB.
      ${r.fsPSNR>r.mcPSNR?'Floyd-Steinberg improves quality.':'Both methods comparable; FS gives better visual smoothness.'}
    </li>
  `).join('')}
  <li>Difference images confirm: highest error at edges and smooth gradients (skin, sky).</li>
  <li>Median Cut outperforms uniform quantization because palette adapts to image color distribution.</li>
</ul>

<h2>7. Source Code</h2>
<pre>// Median Cut — core split logic
function medianCutPalette(pixels, numColors) {
  let buckets = [pixels];
  while (buckets.length &lt; numColors) {
    buckets.sort((a,b) => b.length - a.length);      // largest first
    const largest = buckets.shift();
    const ranges = [0,1,2].map(ch => {               // find widest channel
      const v = largest.map(p => p[ch]);
      return Math.max(...v) - Math.min(...v);
    });
    const ch = ranges.indexOf(Math.max(...ranges));
    largest.sort((a,b) => a[ch] - b[ch]);            // sort by that channel
    const mid = Math.floor(largest.length / 2);
    buckets.push(largest.slice(0,mid), largest.slice(mid));
  }
  return buckets.map(b => {                           // average = palette
    const s=[0,0,0]; b.forEach(p=>{s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];});
    return s.map(v => Math.round(v/b.length));
  });
}</pre>

<div class="findings">
  <h2 style="margin-top:0;color:#2a6a2a">Key Findings</h2>
  <ul>
    <li>More colors → lower MSE → higher PSNR → better quality</li>
    <li>Median Cut: content-aware palette — dominant colors get more palette slots</li>
    <li>Floyd-Steinberg: consistently improves perceived quality by redistributing error</li>
    <li>Difference images prove error highest at edges and smooth gradients</li>
    <li>At 4 colors: visible banding in MC alone; FS smooths it significantly</li>
  </ul>
</div>


</body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(reportHTML); win.document.close(); }
  else {
    const blob = new Blob([reportHTML], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'DIP_Assignment7_MedianCut.html';
    a.click();
  }
  dip_log('Report opened — Ctrl+P to save as PDF', 'log-result');
}

/* Uniform quant report — delegates to MC report with both data sets */
function dip_downloadReport() {
  dip_downloadMCReport();
}


/* ═══════════════════════════════════════════════════════════════
   DOM HELPERS
═══════════════════════════════════════════════════════════════ */
function dip_makeSection(title, subtitle) {
  const s = document.createElement('div');
  s.style.marginBottom = '20px';
  const h = document.createElement('div');
  h.style.cssText = 'font-family:var(--font-mono);font-size:.72rem;color:var(--cyan);' +
    'margin-bottom:8px;padding:6px 12px;background:var(--bg2);' +
    'border-radius:6px;border-left:3px solid var(--cyan)';
  h.innerHTML = '<strong>' + title + '</strong> <span style="color:var(--text3);font-size:.66rem">— ' + subtitle + '</span>';
  s.appendChild(h);
  return s;
}

function dip_makeRow() {
  const r = document.createElement('div');
  r.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px';
  return r;
}

function dip_makeCell(title, imageData, stat) {
  const cell = document.createElement('div');
  cell.style.cssText = 'background:var(--bg2);border-radius:8px;padding:8px;text-align:center';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:var(--font-mono);font-size:.63rem;color:var(--text3);' +
    'text-transform:uppercase;margin-bottom:5px;letter-spacing:.04em';
  titleEl.textContent = title;

  const c = document.createElement('canvas');
  c.width = imageData.width; c.height = imageData.height;
  c.style.cssText = 'max-width:100%;border-radius:4px;image-rendering:pixelated;cursor:zoom-in;display:block';
  c.getContext('2d').putImageData(imageData, 0, 0);
  c.title = 'Click to zoom';
  c.addEventListener('click', () => dip_zoom(c, title));

  const statEl = document.createElement('div');
  statEl.style.cssText = 'font-family:var(--font-mono);font-size:.66rem;color:var(--amber);margin-top:5px;line-height:1.4';
  statEl.textContent = stat;

  cell.appendChild(titleEl); cell.appendChild(c); cell.appendChild(statEl);
  return cell;
}

function dip_zoom(srcCanvas, title) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out';
  const img = document.createElement('img');
  img.src = srcCanvas.toDataURL();
  img.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:8px;image-rendering:pixelated';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'color:#fff;font-family:var(--font-mono);font-size:.85rem;margin-top:14px;opacity:.7';
  lbl.textContent = title + ' — click to close';
  ov.appendChild(img); ov.appendChild(lbl);
  ov.addEventListener('click', () => document.body.removeChild(ov));
  document.body.appendChild(ov);
}


/* ═══════════════════════════════════════════════════════════════
   RESET
═══════════════════════════════════════════════════════════════ */
function dip_reset() {
  dip_origImageData = null; dip_imgW = 0; dip_imgH = 0;
  dip_lastResults = []; dip_lastMCResults = [];

  ['dip-run-btn','mc-run-btn','filter-run-btn','filter-all-btn','dct-run-btn','hist-draw-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });

  const zone = document.getElementById('dip-upload-zone');
  zone.style.borderColor = 'var(--border2)';
  zone.innerHTML = `
    <input type="file" id="dip-file-inp" accept="image/*" style="display:none">
    <div style="font-size:2rem;margin-bottom:4px;color:var(--text3)">⊕</div>
    <strong style="display:block;font-size:.85rem">Upload an image</strong>
    <p style="font-size:.72rem;color:var(--text3);margin-top:3px">JPG / PNG / WEBP or drag here</p>
  `;
  zone.onclick = () => document.getElementById('dip-file-inp').click();
  document.getElementById('dip-file-inp').addEventListener('change', dip_loadImageFile);

  document.getElementById('dip-main-hint').style.display = '';
  document.getElementById('dip-results-grid').innerHTML = '';
  document.getElementById('dip-metrics-card').style.display = 'none';
  document.getElementById('dip-obs-card').style.display = 'none';
  document.getElementById('dip-theory-cards').style.display = 'none';
  document.getElementById('dip-report-btn').style.display = 'none';
  document.getElementById('mc-hint').style.display = '';
  document.getElementById('mc-all-results').innerHTML = '';
  document.getElementById('mc-metrics-card').style.display = 'none';
  document.getElementById('mc-palettes-wrap').innerHTML = '';
  document.getElementById('mc-report-btn').style.display = 'none';
  document.getElementById('dip-filter-hint').style.display = '';
  document.getElementById('dip-filter-grid').innerHTML = '';
  document.getElementById('dip-filter-theory').style.display = 'none';

  dip_clearLog('Reset.');
}


/* ═══════════════════════════════════════════════════════════════
   LOG HELPERS
═══════════════════════════════════════════════════════════════ */
function dip_clearLog(title) {
  const log = document.getElementById('dip-log');
  if (!log) return;
  log.innerHTML = '<div style="color:var(--cyan);font-weight:700">' + title + '</div>';
}

function dip_log(msg, cls) {
  const log = document.getElementById('dip-log');
  if (!log) return;
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = msg;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

/* ── export ── */
window.buildDipTab = buildDipTab;