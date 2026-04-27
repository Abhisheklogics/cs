let dip_origImageData = null;
let dip_imgW = 0;
let dip_imgH = 0;
let dip_lastResults = [];
let dip_processingSpeed = 'normal'; // 'slow' | 'normal' | 'fast'

function buildDipTab() {
  const container = document.getElementById('tab-dip');
  container.innerHTML = `
    <div class="panel-layout">

      <div class="control-panel">

        <div class="concept-box" style="margin-bottom:16px;background:rgba(0,212,255,0.05);
             border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:14px">
          <div style="font-family:var(--font-mono);font-size:.72rem;color:var(--cyan);
                      font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em">
            Digital Image Processing Lab
          </div>
          <div style="font-size:.8rem;color:var(--text2);line-height:1.7">
            Upload any image and explore how different DIP algorithms transform it.
            Every step shows you exactly what the math is doing.
          </div>
        </div>

        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px">
          <button class="nav-tab active" onclick="dip_switchTab('quantization',this)">Quantization</button>
          <button class="nav-tab" onclick="dip_switchTab('mediancut',this)">Median Cut</button>
          <button class="nav-tab" onclick="dip_switchTab('filters',this)">Filters</button>
          <button class="nav-tab" onclick="dip_switchTab('dct',this)">DCT / JPEG</button>
          <button class="nav-tab" onclick="dip_switchTab('histogram',this)">Histogram</button>
        </div>

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
        <div class="form-group" style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.2);
             border-radius:8px;padding:10px 12px;margin-bottom:14px">
          <label style="color:var(--amber);font-size:.72rem;font-weight:700;
                        text-transform:uppercase;letter-spacing:.06em"> Processing Speed</label>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn btn-ghost speed-btn active" data-speed="slow"
                    onclick="dip_setSpeed('slow',this)"
                    style="flex:1;font-size:.72rem;padding:5px 4px"> Slow</button>
            <button class="btn btn-ghost speed-btn" data-speed="normal"
                    onclick="dip_setSpeed('normal',this)"
                    style="flex:1;font-size:.72rem;padding:5px 4px"> Normal</button>
            <button class="btn btn-ghost speed-btn" data-speed="fast"
                    onclick="dip_setSpeed('fast',this)"
                    style="flex:1;font-size:.72rem;padding:5px 4px"> Fast</button>
          </div>
          <p id="dip-speed-desc" style="font-size:.68rem;color:var(--text3);margin-top:6px;line-height:1.5">
            Slow: step-by-step with delay — good for learning. Each color level processes one at a time.
          </p>
        </div>

        <!-- ── QUANTIZATION PANEL ── -->
        <div id="dip-panel-quantization">
          <h3 style="margin-top:4px">Color Quantization</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Reduces 16.7 million possible colors down to a small set.
            Each channel (R, G, B) is snapped to the nearest allowed level.
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
                <input type="checkbox" value="4" checked> 4 colors
              </label>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" id="dip-run-btn" disabled>▶ Run Quantization</button>
          </div>

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
              3+5+7+1 = 16 → all error is redistributed, nothing wasted
            </p>
          </div>

          <div style="margin-top:12px">
            <button class="btn btn-secondary" id="dip-report-btn"
                    onclick="dip_downloadReport()" style="display:none;width:100%">
              ↓ Download Lab Report
            </button>
          </div>
        </div>

        <!-- ── MEDIAN CUT PANEL ── -->
        <div id="dip-panel-mediancut" style="display:none">
          <h3 style="margin-top:4px">Median Cut Quantization</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Smarter than uniform quantization — splits the color space along the widest color
            range repeatedly until the desired palette size is reached. Each bucket's average
            becomes a palette color. Pixels are then mapped to the nearest palette entry.
          </div>

          <div class="form-group">
            <label>Number of palette colors</label>
            <div class="slider-row">
              <input type="range" id="mc-colors" min="2" max="64" step="2" value="16">
              <span class="slider-val" id="mc-colors-val">16</span>
            </div>
          </div>

          <div class="form-group">
            <label>Diff amplification ×</label>
            <div class="slider-row">
              <input type="range" id="mc-gain" min="1" max="5" step=".5" value="2">
              <span class="slider-val" id="mc-gain-val">2</span>
            </div>
          </div>

          <div class="form-group">
            <label>Compare with (shown side-by-side)</label>
            <select id="mc-compare">
              <option value="none">No comparison</option>
              <option value="uniform">Uniform Quantization (same count)</option>
              <option value="fs">Floyd-Steinberg Dithered (same count)</option>
            </select>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" id="mc-run-btn" disabled>▶ Run Median Cut</button>
          </div>

          <!-- Median Cut Algorithm Steps Visualizer -->
          <div style="background:var(--bg2);border-radius:8px;padding:12px;margin-top:10px">
            <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--purple);
                        font-weight:700;margin-bottom:8px">Algorithm Steps</div>
            <div style="font-size:.74rem;color:var(--text2);line-height:1.9">
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
                <span style="background:var(--purple);color:#fff;border-radius:50%;width:18px;height:18px;
                             display:flex;align-items:center;justify-content:center;font-size:.6rem;
                             flex-shrink:0;margin-top:1px">1</span>
                <span>Put all pixels into one bucket</span>
              </div>
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
                <span style="background:var(--purple);color:#fff;border-radius:50%;width:18px;height:18px;
                             display:flex;align-items:center;justify-content:center;font-size:.6rem;
                             flex-shrink:0;margin-top:1px">2</span>
                <span>Find which channel (R/G/B) has the widest range in the largest bucket</span>
              </div>
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
                <span style="background:var(--purple);color:#fff;border-radius:50%;width:18px;height:18px;
                             display:flex;align-items:center;justify-content:center;font-size:.6rem;
                             flex-shrink:0;margin-top:1px">3</span>
                <span>Sort by that channel and split at the median</span>
              </div>
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
                <span style="background:var(--purple);color:#fff;border-radius:50%;width:18px;height:18px;
                             display:flex;align-items:center;justify-content:center;font-size:.6rem;
                             flex-shrink:0;margin-top:1px">4</span>
                <span>Repeat until bucket count = desired palette size</span>
              </div>
              <div style="display:flex;align-items:flex-start;gap:8px">
                <span style="background:var(--purple);color:#fff;border-radius:50%;width:18px;height:18px;
                             display:flex;align-items:center;justify-content:center;font-size:.6rem;
                             flex-shrink:0;margin-top:1px">5</span>
                <span>Each bucket's average RGB → palette entry. Map every pixel to nearest entry</span>
              </div>
            </div>
          </div>

          <div style="margin-top:12px">
            <button class="btn btn-secondary" id="mc-report-btn"
                    onclick="dip_downloadMCReport()" style="display:none;width:100%">
              ↓ Download Median Cut Report
            </button>
          </div>
        </div>

        <!-- ── FILTERS PANEL ── -->
        <div id="dip-panel-filters" style="display:none">
          <h3 style="margin-top:4px">Spatial Filters</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            Filters work by sliding a small kernel (matrix) over every pixel.
            Each output pixel is a weighted sum of its neighbors.
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
            <label>Threshold value (0-255)</label>
            <div class="slider-row">
              <input type="range" id="filter-thresh" min="0" max="255" step="1" value="128">
              <span class="slider-val" id="filter-thresh-val">128</span>
            </div>
          </div>
          <div id="filter-bright-group" class="form-group" style="display:none">
            <label>Brightness adjustment</label>
            <div class="slider-row">
              <input type="range" id="filter-bright" min="-100" max="100" step="5" value="0">
              <span class="slider-val" id="filter-bright-val">0</span>
            </div>
            <label style="margin-top:8px">Contrast multiplier</label>
            <div class="slider-row">
              <input type="range" id="filter-contrast" min="0.1" max="3" step="0.1" value="1">
              <span class="slider-val" id="filter-contrast-val">1.0</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="filter-run-btn" disabled>▶ Apply Filter</button>
            <button class="btn btn-secondary" onclick="dip_applyAllFilters()" id="filter-all-btn" disabled>All Filters</button>
          </div>
          <div id="filter-info" style="font-size:.76rem;color:var(--text2);line-height:1.7;
               margin-top:10px;padding:10px;background:var(--bg2);border-radius:8px;
               border-left:3px solid var(--purple)"></div>
        </div>

        <!-- ── DCT PANEL ── -->
        <div id="dip-panel-dct" style="display:none">
          <h3 style="margin-top:4px">DCT / JPEG Compression</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            JPEG splits the image into 8×8 blocks, applies DCT to each block,
            then quantizes the frequency coefficients — high frequencies get rounded
            heavily because the eye barely notices them.
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
            <button class="btn btn-primary" id="dct-run-btn" disabled>▶ Apply to Image</button>
            <button class="btn btn-secondary" onclick="dip_showQuantMatrix()" id="dct-matrix-btn">Show Q-Matrix</button>
          </div>
        </div>

        <!-- ── HISTOGRAM PANEL ── -->
        <div id="dip-panel-histogram" style="display:none">
          <h3 style="margin-top:4px">Histogram Analysis</h3>
          <div style="font-size:.78rem;color:var(--text2);line-height:1.7;margin-bottom:10px">
            A histogram shows how many pixels have each brightness value (0–255).
            Quantized images have sharp spikes. Dithered images look smooth again.
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
              <option value="mc16">vs Median Cut 16 colors</option>
              <option value="mc8">vs Median Cut 8 colors</option>
            </select>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="hist-draw-btn" disabled>▶ Draw Histogram</button>
          </div>
        </div>

        <div class="calc-log" id="dip-log" style="margin-top:14px;background:rgba(0,0,0,.35);
             border:1px solid var(--border);border-radius:8px;padding:12px;
             font-family:var(--font-mono);font-size:.72rem;line-height:1.8;
             max-height:200px;overflow-y:auto">
          <div style="color:var(--text3)">Upload an image to begin.</div>
        </div>

      </div>

      <!-- ── VIZ AREA ── -->
      <div class="viz-area" id="dip-viz">

        <div id="dip-quant-wrap">
          <div class="canvas-card">
            <h4>Results</h4>
            <div id="dip-main-hint" style="padding:30px;text-align:center;color:var(--text3);
                 font-family:var(--font-mono);font-size:.8rem">
              Upload an image and press ▶ to begin
            </div>
            <div id="dip-results-grid"></div>
          </div>
          <div class="canvas-card" id="dip-metrics-card" style="display:none">
            <h4>Quality Metrics — MSE / PSNR / SSIM</h4>
            <div id="dip-metrics-grid"></div>
          </div>
          <div id="dip-theory-cards" style="display:none;display:flex;flex-direction:column;gap:16px">
            <div class="canvas-card">
              <h4>What is Color Quantization?</h4>
              <div style="font-size:.82rem;color:var(--text2);line-height:1.8">
                <p>Each pixel has R, G, B values from 0 to 255 — that gives 256³ = 16.7 million possible colors.
                Quantization reduces this by snapping each channel to a small number of allowed values.</p>
                <br>
                <div style="font-family:var(--font-mono);font-size:.76rem;color:var(--amber);
                            background:rgba(255,184,48,.06);border-left:3px solid var(--amber);
                            padding:10px 14px;border-radius:0 8px 8px 0;margin:8px 0">
                  step = 255 / (levels − 1)<br>
                  quantized = round(pixel / step) × step<br><br>
                  Example with 4 levels: step = 85<br>
                  Pixel R=120 → round(120/85) = 1 → 1 × 85 = 85<br>
                  Error thrown away = 120 − 85 = 35
                </div>
                <p>Floyd-Steinberg dithering fixes this by spreading that error to neighboring pixels
                instead of discarding it. The average color stays the same, so the image looks smoother.</p>
              </div>
            </div>
            <div class="canvas-card">
              <h4>How to Read the Difference Image</h4>
              <div style="font-size:.82rem;color:var(--text2);line-height:1.8">
                <p>For each pixel: <code style="background:var(--bg2);padding:2px 6px;border-radius:4px;
                   font-family:var(--font-mono)">diff = |original − quantized| × gain</code></p>
                <br>
                <p>Brighter orange = more information was lost at that pixel.
                Errors are highest at edges and smooth gradient areas like skin or sky.</p>
              </div>
            </div>
          </div>
          <div class="canvas-card" id="dip-obs-card" style="display:none">
            <h4>Observations</h4>
            <div id="dip-obs-content"></div>
          </div>
        </div>

        <!-- ── MEDIAN CUT VIZ ── -->
        <div id="dip-mediancut-wrap" style="display:none">
          <div class="canvas-card">
            <h4>Median Cut Results</h4>
            <div id="mc-hint" style="padding:30px;text-align:center;color:var(--text3);
                 font-family:var(--font-mono);font-size:.8rem">
              Upload an image and press ▶ Run Median Cut
            </div>
            <div id="mc-results-grid"></div>
          </div>
          <div class="canvas-card" id="mc-palette-card" style="display:none">
            <h4>Extracted Palette</h4>
            <div id="mc-palette-swatches" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
            <p style="font-size:.7rem;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">
              Each swatch = one bucket's average color from the median-cut tree
            </p>
          </div>
          <div class="canvas-card" id="mc-metrics-card" style="display:none">
            <h4>Quality Metrics Comparison</h4>
            <div id="mc-metrics-grid"></div>
          </div>
          <div class="canvas-card">
            <h4>Median Cut vs Uniform Quantization</h4>
            <div style="font-size:.82rem;color:var(--text2);line-height:1.9">
              <p><strong style="color:var(--purple)">Uniform Quantization</strong> divides the color space into
              equal-sized cells, regardless of where the actual colors are. Works well for evenly distributed
              images, but wastes palette slots on color regions that have no pixels.</p>
              <p><strong style="color:var(--cyan)">Median Cut</strong> only allocates palette colors where the
              actual image colors are. A photo of a forest uses most slots for greens; a portrait uses them
              for skin tones. Result: better perceptual quality at the same palette size.</p>
              <div style="font-family:var(--font-mono);font-size:.74rem;color:var(--green);
                          background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);
                          border-radius:8px;padding:10px;margin-top:10px">
                Median Cut is the algorithm behind early GIF encoders and many PNG-8 converters
              </div>
            </div>
          </div>
        </div>

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
            <div id="dip-filter-theory-content" style="font-size:.82rem;color:var(--text2);line-height:1.8"></div>
          </div>
        </div>

        <div id="dip-dct-wrap" style="display:none">
          <div class="canvas-card">
            <h4>DCT Block Visualization</h4>
            <div id="dip-dct-content">
              <div style="padding:30px;text-align:center;color:var(--text3);font-family:var(--font-mono);font-size:.8rem">
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
              <p><strong style="color:var(--cyan)">Step 1:</strong> Image is split into 8×8 pixel blocks.</p>
              <p><strong style="color:var(--cyan)">Step 2:</strong> Each block goes through the forward DCT — pixel values become frequency coefficients. The top-left (DC) coefficient is the block average; others represent increasingly fine detail.</p>
              <p><strong style="color:var(--cyan)">Step 3:</strong> Each coefficient is divided by a number from the quantization matrix and rounded. High-frequency coefficients (fine detail) get divided by large numbers — most round to zero. This is the actual compression step.</p>
              <p><strong style="color:var(--cyan)">Step 4:</strong> The mostly-zero array is entropy-coded (Huffman). Zeros compress very efficiently.</p>
              <p><strong style="color:var(--cyan)">Step 5:</strong> To decode — multiply back by the matrix, run inverse DCT, reconstruct the block.</p>
              <div style="font-family:var(--font-mono);font-size:.74rem;color:var(--green);
                          background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);
                          border-radius:8px;padding:10px;margin-top:10px">
                Lower quality → larger matrix values → more coefficients become zero → smaller file
              </div>
            </div>
          </div>
        </div>

        <div id="dip-hist-wrap" style="display:none">
          <div class="canvas-card">
            <h4>Pixel Intensity Histogram — R / G / B</h4>
            <canvas id="dip-hist-canvas" width="680" height="240"
                    style="display:block;width:100%;border-radius:6px"></canvas>
            <p style="font-size:.7rem;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">
              Filled bars = original &nbsp;|&nbsp; Amber line = comparison.<br>
              Spiky pattern = quantized &nbsp;|&nbsp; Smooth curve = original or dithered
            </p>
          </div>
          <div class="canvas-card">
            <h4>What the Histogram Tells You</h4>
            <div style="font-size:.82rem;color:var(--text2);line-height:1.9">
              <p>The histogram shows how many pixels have each brightness value (0 = black, 255 = white).</p>
              <p><strong style="color:var(--text)">Original image:</strong> spread smoothly across many values.</p>
              <p><strong style="color:var(--amber)">Quantized image:</strong> sharp vertical spikes at only a few allowed values — everything else is zero.</p>
              <p><strong style="color:var(--purple)">FS Dithered image:</strong> looks smooth again — error diffusion redistributes pixels across many values, even though the palette is still small.</p>
              <p><strong style="color:var(--cyan)">Median Cut image:</strong> spikes appear at palette colors chosen based on actual image content — different from uniform quantization.</p>
              <p style="margin-top:8px"><strong style="color:var(--cyan)">Histogram Equalization</strong> spreads the histogram evenly across 0–255, improving contrast in dark or washed-out images.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  dip_attachEvents();
}


/* ─────────────────────────────────────────────
   SPEED CONTROL
───────────────────────────────────────────── */
function dip_setSpeed(speed, btn) {
  dip_processingSpeed = speed;
  document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const descs = {
    slow:   'Slow: step-by-step with delay — good for learning. Each color level processes one at a time.',
    normal: 'Normal: balanced speed. Small delay between steps keeps UI responsive.',
    fast:   'Fast: no delay — processes all levels immediately. Best for large images.'
  };
  document.getElementById('dip-speed-desc').textContent = descs[speed];
}

function dip_delay() {
  const ms = { slow: 400, normal: 20, fast: 0 };
  const d = ms[dip_processingSpeed] || 20;
  if (d === 0) return Promise.resolve();
  return new Promise(r => setTimeout(r, d));
}


/* ─────────────────────────────────────────────
   TAB SWITCHING
───────────────────────────────────────────── */
function dip_switchTab(name, btn) {
  ['quantization', 'mediancut', 'filters', 'dct', 'histogram'].forEach(t => {
    document.getElementById('dip-panel-' + t).style.display = (t === name) ? '' : 'none';
  });
  document.getElementById('dip-quant-wrap').style.display      = name === 'quantization' ? '' : 'none';
  document.getElementById('dip-mediancut-wrap').style.display  = name === 'mediancut'    ? '' : 'none';
  document.getElementById('dip-filter-wrap').style.display     = name === 'filters'      ? '' : 'none';
  document.getElementById('dip-dct-wrap').style.display        = name === 'dct'          ? '' : 'none';
  document.getElementById('dip-hist-wrap').style.display       = name === 'histogram'    ? '' : 'none';
  document.querySelectorAll('#tab-dip .nav-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}


/* ─────────────────────────────────────────────
   EVENT WIRING
───────────────────────────────────────────── */
function dip_attachEvents() {
  document.getElementById('dip-size').addEventListener('input', e => {
    document.getElementById('dip-size-val').textContent = e.target.value;
  });
  document.getElementById('dip-gain').addEventListener('input', e => {
    document.getElementById('dip-gain-val').textContent = e.target.value;
  });
  document.getElementById('mc-colors').addEventListener('input', e => {
    document.getElementById('mc-colors-val').textContent = e.target.value;
  });
  document.getElementById('mc-gain').addEventListener('input', e => {
    document.getElementById('mc-gain-val').textContent = e.target.value;
  });
  document.getElementById('dct-quality').addEventListener('input', e => {
    document.getElementById('dct-quality-val').textContent = e.target.value;
  });
  document.getElementById('dct-coeffs').addEventListener('input', e => {
    document.getElementById('dct-coeffs-val').textContent = e.target.value + ' / 64';
  });
  document.getElementById('filter-thresh').addEventListener('input', e => {
    document.getElementById('filter-thresh-val').textContent = e.target.value;
  });
  document.getElementById('filter-bright').addEventListener('input', e => {
    document.getElementById('filter-bright-val').textContent = e.target.value;
  });
  document.getElementById('filter-contrast').addEventListener('input', e => {
    document.getElementById('filter-contrast-val').textContent = parseFloat(e.target.value).toFixed(1);
  });

  document.getElementById('filter-type').addEventListener('change', e => {
    const t = e.target.value;
    document.getElementById('filter-thresh-group').style.display = t === 'threshold' ? '' : 'none';
    document.getElementById('filter-bright-group').style.display = t === 'brightness' ? '' : 'none';
    document.getElementById('filter-info').innerHTML = dip_filterInfo(t);
  });

  document.getElementById('dip-file-inp').addEventListener('change', dip_loadImageFile);
  document.getElementById('dip-demo-btn').addEventListener('click',  dip_loadDemoImage);
  document.getElementById('dip-run-btn').addEventListener('click',   dip_runQuantization);
  document.getElementById('mc-run-btn').addEventListener('click',    dip_runMedianCut);
  document.getElementById('dip-reset-btn').addEventListener('click', dip_reset);
  document.getElementById('filter-run-btn').addEventListener('click', dip_applyFilter);
  document.getElementById('filter-all-btn').addEventListener('click', dip_applyAllFilters);
  document.getElementById('hist-draw-btn').addEventListener('click', dip_drawHistogram);
  document.getElementById('dct-run-btn').addEventListener('click', dip_runDCT);

  const zone = document.getElementById('dip-upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--green)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = 'var(--border2)'; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = 'var(--border2)';
    const file = e.dataTransfer.files[0];
    if (file) dip_loadFile(file);
  });

  document.getElementById('filter-info').innerHTML = dip_filterInfo('grayscale');
}


/* ─────────────────────────────────────────────
   IMAGE LOADING
───────────────────────────────────────────── */
function dip_filterInfo(type) {
  const infos = {
    grayscale: 'Converts color to luminance using ITU-R weights: Y = 0.299R + 0.587G + 0.114B. Green contributes most because the human eye is most sensitive to it.',
    negative: 'Each pixel becomes 255 − original. Swaps dark and light. Useful for X-ray style views and finding faint details.',
    blur1: 'Gaussian blur with σ=1. Each pixel becomes a weighted average of its neighbors. Weights follow the Gaussian (bell curve) distribution. Removes high-frequency noise.',
    blur2: 'Gaussian blur with σ=2. Wider kernel = more blurring. Completely removes fine detail, leaves only large color regions.',
    sharpen: 'Uses a Laplacian kernel. Amplifies differences between a pixel and its neighbors. Makes edges look crisper. Unsharp mask principle.',
    edge: 'Sobel operator computes gradient magnitude in X and Y directions. Gx uses [-1,0,1] weights, Gy uses [-1,-2,-1] weights. Bright output = strong edge.',
    emboss: 'Shifts pixel values based on neighbor differences in one diagonal direction. Creates a 3D raised-surface effect.',
    median: 'Each pixel becomes the median of its 3×3 neighborhood. Removes salt-and-pepper noise better than blur because it does not average outlier values.',
    threshold: 'If pixel brightness ≥ T → white (255), else → black (0). Simplest segmentation technique. Separates foreground from background.',
    histeq: 'Redistributes pixel values so the histogram is approximately flat (uniform). Automatically improves contrast in dark or low-contrast images using the CDF of the histogram.'
  };
  return infos[type] || '';
}

function dip_loadImageFile(e) {
  const file = e.target.files[0];
  if (file) dip_loadFile(file);
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
      dip_log('Loaded: ' + c.width + ' × ' + c.height + ' px', 'log-result');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function dip_loadDemoImage() {
  dip_log('Generating demo image...', 'log-concept');
  const sz = parseInt(document.getElementById('dip-size').value);
  const W = sz, H = Math.round(sz * 1.35);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H * .4);
  bg.addColorStop(0, '#2a5fa8'); bg.addColorStop(1, '#1a3a72');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const body = ctx.createLinearGradient(0, H * .3, 0, H);
  body.addColorStop(0, '#e8b48a'); body.addColorStop(1, '#c47d3a');
  ctx.fillStyle = body; ctx.fillRect(0, H * .45, W, H);

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

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(W*.38, H*.47); ctx.lineTo(W/2, H*.52); ctx.lineTo(W*.62, H*.47);
  ctx.closePath(); ctx.fill();

  dip_setImage(c);
  dip_log('Demo ' + W + '×' + H + 'px generated', 'log-result');
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


/* ─────────────────────────────────────────────
   UNIFORM QUANTIZATION + FLOYD-STEINBERG
───────────────────────────────────────────── */
async function dip_runQuantization() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }

  const gain = parseFloat(document.getElementById('dip-gain').value);
  const checked = [...document.querySelectorAll('#dip-level-checks input:checked')]
    .map(cb => parseInt(cb.value)).sort((a, b) => b - a);

  if (!checked.length) { dip_log('Select at least one color level.', 'log-error'); return; }

  dip_clearLog('Running quantization [speed: ' + dip_processingSpeed + ']...');
  dip_log('Image: ' + dip_imgW + '×' + dip_imgH + ' | Testing: ' + checked.join(', ') + ' colors', 'log-concept');

  document.getElementById('dip-main-hint').style.display = 'none';
  document.getElementById('dip-results-grid').innerHTML = '';
  document.getElementById('dip-metrics-card').style.display = 'none';
  document.getElementById('dip-obs-card').style.display = 'none';
  document.getElementById('dip-theory-cards').style.display = 'none';

  const origSec = dip_makeSection('Original Image', 'No processing applied');
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
    dip_log('Plain  MSE=' + mse.toFixed(2) + ' PSNR=' + psnr.toFixed(1) + 'dB SSIM=' + ssim.toFixed(4), 'log-result');

    await dip_delay();
    const fs     = new FloydSteinberg(q);
    const fsData = fs.dither(dip_origImageData);
    const fsDiff = DiffImage.compute(dip_origImageData, fsData, gain);
    const mseFS  = ImageMetrics.mse(dip_origImageData, fsData);
    const psnrFS = ImageMetrics.psnr(mseFS);
    const ssimFS = ImageMetrics.ssim(dip_origImageData, fsData);
    dip_log('FS     MSE=' + mseFS.toFixed(2) + ' PSNR=' + psnrFS.toFixed(1) + 'dB SSIM=' + ssimFS.toFixed(4), 'log-result');

    dip_lastResults.push({ nc, q, mse, psnr, ssim, mseFS, psnrFS, ssimFS, qData, qDiff, fsData, fsDiff });

    const sec = dip_makeSection(
      nc + ' Colors  (' + q.levelsPerCh + ' levels/channel, step=' + q.step.toFixed(1) + ')',
      'Plain quantized + diff  |  FS dithered + diff'
    );
    const row = dip_makeRow();
    row.appendChild(dip_makeCell('Quantized (' + nc + ')', qData,
      'MSE ' + mse.toFixed(1) + ' | PSNR ' + psnr.toFixed(1) + 'dB | ' + ImageMetrics.grade(psnr)));
    row.appendChild(dip_makeCell('Diff — Plain', qDiff, 'Bright = high error'));
    row.appendChild(dip_makeCell('FS Dithered (' + nc + ')', fsData,
      'MSE ' + mseFS.toFixed(1) + ' | PSNR ' + psnrFS.toFixed(1) + 'dB | ' + ImageMetrics.grade(psnrFS)));
    row.appendChild(dip_makeCell('Diff — FS', fsDiff, 'Error spread to neighbors'));
    sec.appendChild(row);
    document.getElementById('dip-results-grid').appendChild(sec);
  }

  document.getElementById('dip-theory-cards').style.display = 'flex';
  dip_renderMetrics(dip_lastResults);
  dip_renderObservations(dip_lastResults);
  document.getElementById('dip-report-btn').style.display = '';
  dip_log('Done. ' + checked.length + ' levels × 2 methods = ' + (checked.length * 2) + ' output images.', 'log-note');
}


/* ─────────────────────────────────────────────
   MEDIAN CUT
───────────────────────────────────────────── */
let dip_lastMCResult = null;

async function dip_runMedianCut() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }

  const nc       = parseInt(document.getElementById('mc-colors').value);
  const gain     = parseFloat(document.getElementById('mc-gain').value);
  const compare  = document.getElementById('mc-compare').value;

  dip_clearLog('Running Median Cut [' + nc + ' colors, speed: ' + dip_processingSpeed + ']...');
  dip_log('Extracting pixels and building color buckets...', 'log-concept');

  document.getElementById('mc-hint').style.display = 'none';
  document.getElementById('mc-results-grid').innerHTML = '';
  document.getElementById('mc-palette-card').style.display = 'none';
  document.getElementById('mc-metrics-card').style.display = 'none';

  await dip_delay();

  const mcQ     = new MedianCutQuantizer(nc);
  const mcData  = mcQ.quantize(dip_origImageData);
  const mcDiff  = DiffImage.compute(dip_origImageData, mcData, gain);
  const mseMC   = ImageMetrics.mse(dip_origImageData, mcData);
  const psnrMC  = ImageMetrics.psnr(mseMC);
  const ssimMC  = ImageMetrics.ssim(dip_origImageData, mcData);

  dip_log('Median Cut  MSE=' + mseMC.toFixed(2) + ' PSNR=' + psnrMC.toFixed(1) + 'dB SSIM=' + ssimMC.toFixed(4), 'log-result');

  dip_lastMCResult = { nc, mcData, mcDiff, mseMC, psnrMC, ssimMC };

  const grid = document.getElementById('mc-results-grid');

  // Row 1: original + median cut + diff
  const sec1 = dip_makeSection('Median Cut — ' + nc + ' colors', 'Content-aware palette selection');
  const row1 = dip_makeRow();
  row1.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  row1.appendChild(dip_makeCell('Median Cut (' + nc + ')', mcData,
    'MSE ' + mseMC.toFixed(1) + ' | PSNR ' + psnrMC.toFixed(1) + 'dB | ' + ImageMetrics.grade(psnrMC)));
  row1.appendChild(dip_makeCell('Diff — MC', mcDiff, 'Bright = error region'));
  sec1.appendChild(row1);
  grid.appendChild(sec1);

  // Optional comparison
  if (compare !== 'none') {
    await dip_delay();

    let compData, compDiff, compMSE, compPSNR, compSSIM, compLabel;

    if (compare === 'uniform') {
      const uQ    = new ColorQuantizer(nc);
      compData    = uQ.quantize(dip_origImageData);
      compLabel   = 'Uniform (' + nc + ')';
      dip_log('Comparing with Uniform Quantization...', 'log-concept');
    } else {
      const uQ    = new ColorQuantizer(nc);
      const fs    = new FloydSteinberg(uQ);
      compData    = fs.dither(dip_origImageData);
      compLabel   = 'FS Dithered (' + nc + ')';
      dip_log('Comparing with Floyd-Steinberg...', 'log-concept');
    }

    compDiff  = DiffImage.compute(dip_origImageData, compData, gain);
    compMSE   = ImageMetrics.mse(dip_origImageData, compData);
    compPSNR  = ImageMetrics.psnr(compMSE);
    compSSIM  = ImageMetrics.ssim(dip_origImageData, compData);

    dip_log('Compare    MSE=' + compMSE.toFixed(2) + ' PSNR=' + compPSNR.toFixed(1) + 'dB', 'log-result');

    const sec2 = dip_makeSection('Comparison — ' + compLabel, 'Same palette size, different algorithm');
    const row2 = dip_makeRow();
    row2.appendChild(dip_makeCell(compLabel, compData,
      'MSE ' + compMSE.toFixed(1) + ' | PSNR ' + compPSNR.toFixed(1) + 'dB | ' + ImageMetrics.grade(compPSNR)));
    row2.appendChild(dip_makeCell('Diff — Comp', compDiff, 'Bright = error region'));
    sec2.appendChild(row2);
    grid.appendChild(sec2);

    // Metrics side-by-side
    document.getElementById('mc-metrics-card').style.display = '';
    document.getElementById('mc-metrics-grid').innerHTML = `
      <table class="data-table" style="font-size:.76rem">
        <thead>
          <tr><th>Method</th><th>Colors</th><th>MSE ↓</th><th>PSNR ↑</th><th>SSIM ↑</th><th>Grade</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style="color:var(--purple);font-weight:700">Median Cut</td>
            <td style="font-family:var(--font-mono)">${nc}</td>
            <td style="font-family:var(--font-mono)">${mseMC.toFixed(2)}</td>
            <td style="font-family:var(--font-mono)">${psnrMC.toFixed(2)}</td>
            <td style="font-family:var(--font-mono)">${ssimMC.toFixed(4)}</td>
            <td>${ImageMetrics.grade(psnrMC)}</td>
          </tr>
          <tr>
            <td style="color:var(--amber)">${compLabel}</td>
            <td style="font-family:var(--font-mono)">${nc}</td>
            <td style="font-family:var(--font-mono)">${compMSE.toFixed(2)}</td>
            <td style="font-family:var(--font-mono)">${compPSNR.toFixed(2)}</td>
            <td style="font-family:var(--font-mono)">${compSSIM.toFixed(4)}</td>
            <td>${ImageMetrics.grade(compPSNR)}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:.7rem;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">
        ${psnrMC > compPSNR
          ? ' Median Cut gives better PSNR — content-aware palette beats uniform splitting'
          : ' ' + compLabel + ' has higher PSNR — dithering redistributes error perceptually'}
      </p>
    `;
  }

  // Palette swatches — extract from median cut result
  dip_renderMCPalette(mcData, nc);

  document.getElementById('mc-report-btn').style.display = '';
  dip_log('Done.', 'log-note');
}

function dip_renderMCPalette(imageData, nc) {
  // Sample unique colors from result to approximate palette
  const seen = new Map();
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const key = (d[i] << 16) | (d[i+1] << 8) | d[i+2];
    if (!seen.has(key)) seen.set(key, { r: d[i], g: d[i+1], b: d[i+2], count: 0 });
    seen.get(key).count++;
  }
  const sorted = [...seen.values()].sort((a, b) => b.count - a.count).slice(0, nc);

  document.getElementById('mc-palette-card').style.display = '';
  const wrap = document.getElementById('mc-palette-swatches');
  wrap.innerHTML = '';
  sorted.forEach(({ r, g, b, count }) => {
    const swatch = document.createElement('div');
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
    const luma = 0.299*r + 0.587*g + 0.114*b;
    swatch.title = hex + ' (' + count + ' px)';
    swatch.style.cssText = `width:36px;height:36px;border-radius:6px;background:${hex};
      border:1px solid var(--border);cursor:default;position:relative;
      display:flex;align-items:flex-end;justify-content:center`;
    swatch.innerHTML = `<span style="font-size:.52rem;font-family:var(--font-mono);
      color:${luma>128?'#000':'#fff'};padding:2px;line-height:1">${hex}</span>`;
    wrap.appendChild(swatch);
  });
}


/* ─────────────────────────────────────────────
   FILTERS
───────────────────────────────────────────── */
function dip_applyFilter() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }

  const type = document.getElementById('filter-type').value;
  const thresh = parseInt(document.getElementById('filter-thresh').value);
  const bright = parseInt(document.getElementById('filter-bright').value);
  const contrast = parseFloat(document.getElementById('filter-contrast').value);

  dip_clearLog('Applying ' + type + '...');

  let result;
  if (type === 'grayscale') result = Filters.grayscale(dip_origImageData);
  else if (type === 'negative') result = Filters.negative(dip_origImageData);
  else if (type === 'blur1') result = Filters.gaussianBlur(dip_origImageData, 1);
  else if (type === 'blur2') result = Filters.gaussianBlur(dip_origImageData, 2);
  else if (type === 'sharpen') result = Filters.sharpen(dip_origImageData);
  else if (type === 'edge') result = Filters.sobelEdge(dip_origImageData);
  else if (type === 'emboss') result = Filters.emboss(dip_origImageData);
  else if (type === 'median') result = Filters.medianFilter(dip_origImageData);
  else if (type === 'threshold') result = Filters.threshold(dip_origImageData, thresh);
  else if (type === 'histeq') result = Filters.histogramEqualize(dip_origImageData);
  else if (type === 'brightness') result = Filters.brightnessContrast(dip_origImageData, bright, contrast);
  else result = dip_origImageData;

  const mse  = ImageMetrics.mse(dip_origImageData, result);
  const psnr = ImageMetrics.psnr(mse);
  dip_log('Done. MSE=' + mse.toFixed(2) + ' PSNR=' + psnr.toFixed(1) + 'dB', 'log-result');

  document.getElementById('dip-filter-hint').style.display = 'none';
  const grid = document.getElementById('dip-filter-grid');
  grid.innerHTML = '';
  const row = dip_makeRow();
  row.appendChild(dip_makeCell('Original', dip_origImageData, 'Baseline'));
  row.appendChild(dip_makeCell(type, result, 'MSE ' + mse.toFixed(1) + ' | PSNR ' + psnr.toFixed(1) + 'dB'));
  const diff = DiffImage.compute(dip_origImageData, result, 2);
  row.appendChild(dip_makeCell('Difference', diff, 'Bright = changed area'));
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
    { name: 'Grayscale',          fn: () => Filters.grayscale(dip_origImageData) },
    { name: 'Negative',           fn: () => Filters.negative(dip_origImageData) },
    { name: 'Gaussian Blur σ=1',  fn: () => Filters.gaussianBlur(dip_origImageData, 1) },
    { name: 'Gaussian Blur σ=2',  fn: () => Filters.gaussianBlur(dip_origImageData, 2) },
    { name: 'Sharpen',            fn: () => Filters.sharpen(dip_origImageData) },
    { name: 'Sobel Edge',         fn: () => Filters.sobelEdge(dip_origImageData) },
    { name: 'Emboss',             fn: () => Filters.emboss(dip_origImageData) },
    { name: 'Median Filter',      fn: () => Filters.medianFilter(dip_origImageData) },
    { name: 'Threshold (T=128)',  fn: () => Filters.threshold(dip_origImageData, 128) },
    { name: 'Histogram EQ',       fn: () => Filters.histogramEqualize(dip_origImageData) },
  ];

  document.getElementById('dip-filter-hint').style.display = 'none';
  const grid = document.getElementById('dip-filter-grid');
  grid.innerHTML = '';

  const origCell = dip_makeCell('Original', dip_origImageData, 'Baseline');
  const introRow = dip_makeRow();
  introRow.appendChild(origCell);
  grid.appendChild(introRow);

  filters.forEach(f => {
    const result = f.fn();
    const mse = ImageMetrics.mse(dip_origImageData, result);
    const psnr = ImageMetrics.psnr(mse);
    const row = dip_makeRow();
    row.appendChild(dip_makeCell(f.name, result,
      'MSE ' + mse.toFixed(1) + ' | PSNR ' + psnr.toFixed(1) + 'dB'));
    grid.appendChild(row);
    dip_log(f.name + ' done', 'log-result');
  });
}


/* ─────────────────────────────────────────────
   DCT
───────────────────────────────────────────── */
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

  const bx = Math.max(0, Math.floor(dip_imgW / 2) - 4);
  const by = Math.max(0, Math.floor(dip_imgH / 2) - 4);
  const block8 = c.getContext('2d').getImageData(bx, by, 8, 8);

  const luma = [];
  for (let i = 0; i < block8.data.length; i += 4) {
    luma.push(0.299 * block8.data[i] + 0.587 * block8.data[i + 1] + 0.114 * block8.data[i + 2] - 128);
  }

  const dctCoeffs   = DCT8x8.forward(luma);
  const qMat        = DCT8x8.lumaQuantMatrix(quality);
  const quantCoeffs = dctCoeffs.map((v, i) => Math.round(v / qMat[i]) * qMat[i]);
  for (let i = keepN; i < 64; i++) quantCoeffs[i] = 0;

  const nonZero = quantCoeffs.filter(v => v !== 0).length;
  dip_log('DC coeff F(0,0) = ' + dctCoeffs[0].toFixed(2) + ' (block average luma)', 'log-math');
  dip_log('Non-zero after quantize: ' + nonZero + ' / 64 (' + (64 - nonZero) + ' zeroed)', 'log-result');

  const recon = DCT8x8.inverse(quantCoeffs);
  dip_renderDCTViz(luma, dctCoeffs, quantCoeffs, recon);
  dip_showQuantMatrix(quality);
}

function dip_renderDCTViz(orig, dct, quantDct, recon) {
  const wrap = document.getElementById('dip-dct-content');
  wrap.innerHTML = '';

  const sections = [
    { label: '8×8 Block (original luma)',    data: orig,     maxAbs: 128,  cmap: 'gray' },
    { label: 'After Forward DCT',             data: dct,      maxAbs: null, cmap: 'rg'   },
    { label: 'After Quantization',            data: quantDct, maxAbs: null, cmap: 'rg'   },
    { label: 'After Inverse DCT (decoded)',   data: recon,    maxAbs: 128,  cmap: 'gray' },
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
      if (sec.cmap === 'gray') { const l = Math.round((norm + 1) / 2 * 255); r = g = b = l; }
      else { r = norm > 0 ? Math.round(norm * 255) : 0; g = 0; b = norm < 0 ? Math.round(-norm * 255) : 0; }
      img.data[i*4] = r; img.data[i*4+1] = g; img.data[i*4+2] = b; img.data[i*4+3] = 255;
    });
    ctx.putImageData(img, 0, 0);
    cell.appendChild(t); cell.appendChild(cv);
    row.appendChild(cell);
  });
  wrap.appendChild(row);

  const note = document.createElement('p');
  note.style.cssText = 'font-size:.7rem;color:var(--text3);font-family:var(--font-mono)';
  note.textContent = 'Red = positive coefficient | Blue = negative | Black = zero (compressed away) | Compare block 1 vs 4 to see loss';
  wrap.appendChild(note);
}

function dip_showQuantMatrix(quality) {
  quality = quality || parseInt(document.getElementById('dct-quality').value);
  const mat = DCT8x8.lumaQuantMatrix(quality);
  const maxV = Math.max(...mat);

  document.getElementById('dip-qmatrix-card').style.display = '';
  let html = '<table style="width:100%;border-collapse:collapse;font-family:var(--font-mono);font-size:.72rem;text-align:center">';
  for (let r = 0; r < 8; r++) {
    html += '<tr>';
    for (let c = 0; c < 8; c++) {
      const v = mat[r * 8 + c];
      const bg = 'rgba(96,165,250,' + (.1 + v / maxV * .7).toFixed(2) + ')';
      html += '<td style="padding:5px;border:1px solid var(--border);background:' + bg + '">' + v + '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  html += '<p style="font-size:.68rem;color:var(--text3);margin-top:6px;font-family:var(--font-mono)">Quality=' + quality + ' | Brighter cell = larger divisor = more loss. Top-left is DC (low freq). Bottom-right is high freq (most compressed).</p>';
  document.getElementById('dip-qmatrix').innerHTML = html;
}


/* ─────────────────────────────────────────────
   HISTOGRAM
───────────────────────────────────────────── */
function dip_drawHistogram() {
  if (!dip_origImageData) { dip_log('Load an image first.', 'log-error'); return; }
  document.getElementById('dip-hist-wrap').style.display = '';

  const mode = document.getElementById('hist-compare').value;
  let compData = dip_origImageData;

  if (mode !== 'orig') {
    if (mode === 'mc16' || mode === 'mc8') {
      const nc = mode === 'mc16' ? 16 : 8;
      compData = new MedianCutQuantizer(nc).quantize(dip_origImageData);
    } else {
      const parts = mode.match(/^(quant|fs)(\d+)$/);
      if (parts) {
        const nc = parseInt(parts[2]);
        const q = new ColorQuantizer(nc);
        compData = parts[1] === 'quant'
          ? q.quantize(dip_origImageData)
          : new FloydSteinberg(q).dither(dip_origImageData);
      }
    }
  }

  const histA = Histogram.compute(dip_origImageData);
  const histB = mode !== 'orig' ? Histogram.compute(compData) : null;
  const canvas = document.getElementById('dip-hist-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const channels = [
    { data: histA.r, color: '#f87171', label: 'R' },
    { data: histA.g, color: '#34d399', label: 'G' },
    { data: histA.b, color: '#60a5fa', label: 'B' },
  ];
  const pad = { t: 12, b: 24, l: 28, r: 10 };
  const cH = Math.floor((H - pad.t - pad.b) / 3);

  channels.forEach((ch, ci) => {
    const top = pad.t + ci * cH;
    const maxV = Math.max(...ch.data) || 1;
    const xSc = (W - pad.l - pad.r) / 256;
    const ySc = (cH - 8) / maxV;

    ctx.fillStyle = ch.color + '50';
    ch.data.forEach((v, i) => {
      const barH = v * ySc;
      ctx.fillRect(pad.l + i * xSc, top + cH - 8 - barH, xSc + .5, barH);
    });

    if (histB) {
      const comp = [histB.r, histB.g, histB.b][ci];
      const maxB = Math.max(...comp) || 1;
      const yScB = (cH - 8) / Math.max(maxV, maxB);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      comp.forEach((v, i) => {
        const x = pad.l + i * xSc;
        const y = top + cH - 8 - v * yScB;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = ch.color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(ch.label, 22, top + cH / 2 + 4);
    ctx.strokeStyle = '#2e3a52';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, top + cH - 8);
    ctx.lineTo(W - pad.r, top + cH - 8);
    ctx.stroke();
  });

  dip_log('Histogram drawn.', 'log-result');
}


/* ─────────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────────── */
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
  r.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px';
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
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out';
  const img = document.createElement('img');
  img.src = srcCanvas.toDataURL();
  img.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:8px;image-rendering:pixelated';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'color:#fff;font-family:var(--font-mono);font-size:.85rem;margin-top:14px';
  lbl.textContent = title + ' — click to close';
  ov.appendChild(img); ov.appendChild(lbl);
  ov.addEventListener('click', () => document.body.removeChild(ov));
  document.body.appendChild(ov);
}


/* ─────────────────────────────────────────────
   METRICS & OBSERVATIONS
───────────────────────────────────────────── */
function dip_renderMetrics(results) {
  document.getElementById('dip-metrics-card').style.display = '';
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
  results.forEach(s => {
    const cls = p => p >= 35 ? 'td-pos' : (p >= 28 ? '' : 'td-neg');
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
      PSNR > 40dB: excellent &nbsp;|&nbsp; 35–40: good &nbsp;|&nbsp; 30–35: acceptable &nbsp;|&nbsp; <30: visible degradation
    </p>`;
  document.getElementById('dip-metrics-grid').innerHTML = html;
}

function dip_renderObservations(results) {
  document.getElementById('dip-obs-card').style.display = '';
  let html = '<div style="display:flex;flex-direction:column;gap:12px">';
  results.forEach(s => {
    const improves = s.psnrFS > s.psnr;
    const diff = Math.abs(s.psnrFS - s.psnr).toFixed(2);
    html += `
      <div style="background:var(--bg2);border-radius:8px;padding:14px;border-left:3px solid var(--cyan)">
        <div style="font-family:var(--font-mono);font-size:.76rem;color:var(--cyan);
                    margin-bottom:10px;font-weight:700">${s.nc} Colors</div>
        <ul style="padding-left:18px;color:var(--text2);font-size:.82rem;line-height:2">
          <li>Plain quantization → MSE = <strong style="color:var(--amber)">${s.mse.toFixed(2)}</strong>,
              PSNR = <strong style="color:var(--green)">${s.psnr.toFixed(2)} dB</strong>
              (${ImageMetrics.grade(s.psnr)})</li>
          <li>Floyd-Steinberg → MSE = <strong style="color:var(--amber)">${s.mseFS.toFixed(2)}</strong>,
              PSNR = <strong style="color:var(--green)">${s.psnrFS.toFixed(2)} dB</strong>
              (${ImageMetrics.grade(s.psnrFS)})</li>
          <li>FS ${improves ? '↑ improves' : '↓ changes'} PSNR by ${diff} dB — 
              ${improves
                ? 'error diffusion gives better objective and perceptual quality'
                : 'MSE is slightly higher but visual smoothness is better due to dithering'}</li>
          <li>Difference image shows highest error at object edges and smooth gradients</li>
        </ul>
      </div>
    `;
  });
  html += `
    <div style="background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.2);
                border-radius:8px;padding:14px">
      <div style="font-family:var(--font-mono);font-size:.76rem;color:var(--green);
                  margin-bottom:8px;font-weight:700">Key Takeaways</div>
      <ul style="padding-left:18px;color:var(--text2);font-size:.82rem;line-height:2">
        <li>More colors → lower MSE → higher PSNR → better quality</li>
        <li>Floyd-Steinberg improves perceived quality even at the same color count</li>
        <li>SSIM is closer to human perception than MSE/PSNR</li>
        <li>Diff images are brightest at edges — quantization error concentrates there</li>
        <li>This is the core principle behind JPEG, GIF, and PNG-8 compression</li>
      </ul>
    </div>
  </div>`;
  document.getElementById('dip-obs-content').innerHTML = html;
}


/* ─────────────────────────────────────────────
   REPORT DOWNLOAD — UNIFORM + FS + MEDIAN CUT
───────────────────────────────────────────── */
function dip_downloadReport() {
  if (!dip_lastResults.length) { dip_log('Run quantization first.', 'log-error'); return; }

  const buildURL = imageData => {
    const c = document.createElement('canvas');
    c.width = imageData.width; c.height = imageData.height;
    c.getContext('2d').putImageData(imageData, 0, 0);
    return c.toDataURL();
  };

  const origCanvas = document.createElement('canvas');
  origCanvas.width = dip_imgW; origCanvas.height = dip_imgH;
  origCanvas.getContext('2d').putImageData(dip_origImageData, 0, 0);

  // ── Uniform + FS results ──
  let imagesHTML = '';
  dip_lastResults.forEach(s => {
    imagesHTML += `
      <div style="margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid #ddd">
        <h3 style="font-family:monospace;font-size:15px;margin-bottom:12px;color:#333">
          ${s.nc} Colors — ${s.q.levelsPerCh} levels per channel — step = ${s.q.step.toFixed(1)}
        </h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
          <div style="text-align:center">
            <img src="${buildURL(s.qData)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
            <p style="font-size:11px;margin-top:4px;color:#555">Plain Quantized<br>MSE ${s.mse.toFixed(2)} | PSNR ${s.psnr.toFixed(2)} dB</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(s.qDiff)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
            <p style="font-size:11px;margin-top:4px;color:#555">Difference Image (Plain)<br>${ImageMetrics.grade(s.psnr)}</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(s.fsData)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
            <p style="font-size:11px;margin-top:4px;color:#555">FS Dithered<br>MSE ${s.mseFS.toFixed(2)} | PSNR ${s.psnrFS.toFixed(2)} dB</p>
          </div>
          <div style="text-align:center">
            <img src="${buildURL(s.fsDiff)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
            <p style="font-size:11px;margin-top:4px;color:#555">Difference Image (FS)<br>${ImageMetrics.grade(s.psnrFS)}</p>
          </div>
        </div>
        <div style="background:#f5f9f5;border-left:4px solid #4a8a4a;padding:10px 14px;font-size:13px;border-radius:0 4px 4px 0">
          At ${s.nc} colors, plain quantization gives PSNR = ${s.psnr.toFixed(2)} dB.
          Floyd-Steinberg dithering gives PSNR = ${s.psnrFS.toFixed(2)} dB.
          ${s.psnrFS > s.psnr ? 'Dithering improves quality.' : 'Dithering redistributes error for better perceptual smoothness.'}
          The difference image shows error concentrated at object edges and smooth gradients.
        </div>
      </div>
    `;
  });

  // ── Median Cut section in report ──
  let mcSection = '';
  if (dip_lastMCResult) {
    const mc = dip_lastMCResult;
    mcSection = `
      <h2>5. Median Cut Quantization Results</h2>
      <p>
        Median Cut was run with <strong>${mc.nc} palette colors</strong>.
        Unlike uniform quantization, Median Cut adapts the palette to the actual color distribution
        of the image — concentrating palette slots where the most pixels are.
      </p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0">
        <div style="text-align:center">
          <img src="${buildURL(dip_origImageData)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
          <p style="font-size:11px;margin-top:4px;color:#555">Original</p>
        </div>
        <div style="text-align:center">
          <img src="${buildURL(mc.mcData)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
          <p style="font-size:11px;margin-top:4px;color:#555">Median Cut (${mc.nc} colors)<br>
            MSE ${mc.mseMC.toFixed(2)} | PSNR ${mc.psnrMC.toFixed(2)} dB | ${ImageMetrics.grade(mc.psnrMC)}</p>
        </div>
        <div style="text-align:center">
          <img src="${buildURL(mc.mcDiff)}" style="width:100%;image-rendering:pixelated;border:1px solid #ddd">
          <p style="font-size:11px;margin-top:4px;color:#555">Difference Image<br>SSIM ${mc.ssimMC.toFixed(4)}</p>
        </div>
      </div>
      <div style="background:#f0f0ff;border-left:4px solid #5a4aaa;padding:10px 14px;font-size:13px;border-radius:0 4px 4px 0;margin-bottom:16px">
        Median Cut PSNR = ${mc.psnrMC.toFixed(2)} dB, SSIM = ${mc.ssimMC.toFixed(4)}.
        The palette is built by recursively halving the color space along its widest dimension,
        allocating more palette entries to dominant hues in the image.
      </div>

      <h3>5.1 Median Cut Algorithm — Code Summary</h3>
      <pre>// Step 1: extract all pixels into one bucket
buckets = [all_pixels]

// Step 2-4: split until we have numColors buckets
while buckets.length &lt; numColors:
  largest = buckets.sort_by_size().shift()
  channel = find_widest_range(largest)  // R, G, or B
  sorted  = largest.sort_by(channel)
  mid     = sorted.length / 2
  buckets.push(sorted[:mid], sorted[mid:])

// Step 5: each bucket's average = palette entry
palette = buckets.map(b => average_color(b))

// Step 6: map every pixel to nearest palette entry
for each pixel:
  output[pixel] = nearest(palette, pixel)  // min Euclidean distance</pre>
    `;
  }

  // ── Metrics table ──
  let metricsRows = '';
  dip_lastResults.forEach(s => {
    metricsRows += `
      <tr>
        <td rowspan="2" style="font-weight:bold">${s.nc}</td>
        <td>Plain Quantization</td>
        <td style="font-family:monospace">${s.mse.toFixed(2)}</td>
        <td style="font-family:monospace">${s.psnr.toFixed(2)}</td>
        <td style="font-family:monospace">${s.ssim.toFixed(4)}</td>
        <td>${ImageMetrics.grade(s.psnr)}</td>
      </tr>
      <tr>
        <td>Floyd-Steinberg</td>
        <td style="font-family:monospace">${s.mseFS.toFixed(2)}</td>
        <td style="font-family:monospace">${s.psnrFS.toFixed(2)}</td>
        <td style="font-family:monospace">${s.ssimFS.toFixed(4)}</td>
        <td>${ImageMetrics.grade(s.psnrFS)}</td>
      </tr>
    `;
  });
  if (dip_lastMCResult) {
    const mc = dip_lastMCResult;
    metricsRows += `
      <tr style="background:#f0f0ff">
        <td style="font-weight:bold">${mc.nc}</td>
        <td>Median Cut</td>
        <td style="font-family:monospace">${mc.mseMC.toFixed(2)}</td>
        <td style="font-family:monospace">${mc.psnrMC.toFixed(2)}</td>
        <td style="font-family:monospace">${mc.ssimMC.toFixed(4)}</td>
        <td>${ImageMetrics.grade(mc.psnrMC)}</td>
      </tr>
    `;
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const reportHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Digital Image Processing Lab Report</title>
  <style>
    body { font-family: Georgia, serif; max-width: 920px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 6px; }
    h2 { font-size: 17px; color: #1a3a6a; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    h3 { font-size: 14px; color: #333; margin-top: 24px; }
    .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
    .meta strong { color: #222; }
    .orig-img { text-align:center; margin: 16px 0; }
    .orig-img img { max-width: 180px; border: 1px solid #ccc; border-radius: 4px; }
    code { font-family: monospace; background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
    pre { background: #f4f4f4; padding: 14px; border-radius: 6px; font-size: 12px; overflow-x: auto; border-left: 4px solid #888; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
    th { background: #1a3a6a; color: #fff; padding: 8px 10px; text-align: left; }
    td { border: 1px solid #ddd; padding: 7px 10px; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .note { background: #eef5ee; border-left: 4px solid #4a8a4a; padding: 10px 14px;
            font-size: 13px; border-radius: 0 4px 4px 0; margin: 10px 0; }
    .findings { background: #e8f0e8; border: 1px solid #4a8a4a; border-radius: 6px;
                padding: 14px; margin-top: 20px; }
    .findings li { margin-bottom: 6px; font-size: 13px; }
    @media print { body { margin: 20px; } h2 { page-break-before: auto; } }
  </style>
</head>
<body>

  <h1>Digital Image Processing — Lab Report</h1>
  <div class="meta">
    <strong>Name:</strong> Abhishek Kumar &nbsp;|&nbsp;
    <strong>Roll No:</strong> 2505371 &nbsp;|&nbsp;
    <strong>Course:</strong> Digital Image Processing &nbsp;|&nbsp;
   
    Project URL: <a href="https://cssimulation.netlify.app/">cssimulation.netlify.app</a>
  </div>

  <h2>1. Objective</h2>
  <p>
    To study and compare three color quantization techniques — Uniform Quantization,
    Floyd-Steinberg Error Diffusion Dithering, and Median Cut Quantization — using standard
    image quality metrics: MSE, PSNR, and SSIM.
  </p>

  <h2>2. Input Image</h2>
  <div class="orig-img">
    <img src="${origCanvas.toDataURL()}" alt="Original Image">
    <p style="font-size:12px;color:#555;margin-top:4px">
      Original image — ${dip_imgW} × ${dip_imgH} pixels
    </p>
  </div>

  <h2>3. Theory</h2>

  <h3>3.1 Uniform Color Quantization</h3>
  <p>
    Color quantization reduces the number of distinct colors in an image. Each RGB channel
    (0–255) is snapped to the nearest of a small set of allowed values. For K total colors,
    the number of levels per channel is approximately ³√K.
  </p>
  <pre>levels = round(K^(1/3))
step = 255 / (levels - 1)
quantized = round(pixel / step) × step

Example — 4 colors (2 levels), step = 85:
  R = 120  →  round(120/85) = 1  →  1 × 85 = 85
  Error discarded = 120 - 85 = 35</pre>

  <h3>3.2 Floyd-Steinberg Error Diffusion Dithering</h3>
  <p>
    Floyd-Steinberg dithering does not discard the quantization error. It spreads the error
    to four neighboring pixels in the following proportions:
  </p>
  <pre>         [current]   7/16  →
  3/16    5/16    1/16      (next row)

error = original_value - quantized_value
right_pixel     += error × 7/16
bottom-left     += error × 3/16
below           += error × 5/16
bottom-right    += error × 1/16</pre>

  <h3>3.3 Median Cut Quantization</h3>
  <p>
    Median Cut builds a content-aware palette by recursively dividing the color space.
    It always splits the bucket with the most pixels along the channel with the widest range.
    After enough splits, each bucket's average becomes a palette color.
  </p>
  <pre>Algorithm:
  1. Put all pixels in one bucket
  2. Find the largest bucket
  3. Find channel with widest value range in that bucket
  4. Sort pixels by that channel; split at median
  5. Repeat until bucket count = desired palette size
  6. palette[i] = average(bucket[i])
  7. Map each pixel to its nearest palette entry (Euclidean distance)</pre>

  <h3>3.4 Quality Metrics</h3>
  <pre>MSE  = (1/N) × Σ (original - quantized)²
PSNR = 10 × log₁₀(255² / MSE)  [dB]
SSIM = structural similarity index  [0 to 1]

PSNR interpretation:
  > 40 dB  →  Excellent
  35–40 dB →  Good
  30–35 dB →  Acceptable
  < 30 dB  →  Visible degradation</pre>

  <h2>4. Uniform Quantization + Floyd-Steinberg Results</h2>
  ${imagesHTML}

  ${mcSection}

  <h2>6. Metrics Summary (All Methods)</h2>
  <table>
    <thead>
      <tr>
        <th>Colors</th><th>Method</th><th>MSE ↓</th><th>PSNR ↑ (dB)</th><th>SSIM ↑</th><th>Grade</th>
      </tr>
    </thead>
    <tbody>${metricsRows}</tbody>
  </table>

  <h2>7. Observations</h2>
  <ul>
    ${dip_lastResults.map(s => `
      <li style="margin-bottom:10px">
        <strong>${s.nc} colors (Uniform):</strong>
        Plain PSNR = ${s.psnr.toFixed(2)} dB, FS PSNR = ${s.psnrFS.toFixed(2)} dB.
        As the number of colors decreases, MSE increases and PSNR decreases.
        The difference image shows maximum error at edges and smooth gradient zones.
        Floyd-Steinberg distributes error to neighbors, producing a perceptually smoother result.
      </li>
    `).join('')}
    ${dip_lastMCResult ? `
    <li style="margin-bottom:10px">
      <strong>${dip_lastMCResult.nc} colors (Median Cut):</strong>
      PSNR = ${dip_lastMCResult.psnrMC.toFixed(2)} dB, SSIM = ${dip_lastMCResult.ssimMC.toFixed(4)}.
      Content-aware palette allocation reduces error in dominant color regions of the image.
    </li>` : ''}
  </ul>

  <h2>8. Source Code Summary</h2>
  <pre>// Median Cut — key logic
class MedianCutQuantizer {
  _medianCut(pixels, numColors) {
    let buckets = [pixels];
    while (buckets.length &lt; numColors) {
      buckets.sort((a, b) => b.length - a.length);
      const largest = buckets.shift();
      const [b1, b2] = this._splitBucket(largest);
      buckets.push(b1, b2);
    }
    return buckets.map(b => this._average(b));  // palette
  }

  _splitBucket(pixels) {
    // find channel with widest range
    const ranges = [0,1,2].map(ch => {
      const vals = pixels.map(p => p[ch]);
      return Math.max(...vals) - Math.min(...vals);
    });
    const ch = ranges.indexOf(Math.max(...ranges));
    pixels.sort((a, b) => a[ch] - b[ch]);
    const mid = Math.floor(pixels.length / 2);
    return [pixels.slice(0, mid), pixels.slice(mid)];
  }
}</pre>

  <div class="findings">
    <h2 style="margin-top:0;color:#1a5c1a">Key Findings</h2>
    <ul>
      <li>More colors consistently give lower MSE and higher PSNR</li>
      <li>Floyd-Steinberg dithering improves perceptual quality at all color levels</li>
      <li>Median Cut allocates palette colors where the image's actual colors are — more efficient than uniform splitting</li>
      <li>SSIM is a better perceptual metric than MSE/PSNR alone</li>
      <li>Difference images are brightest at object edges, confirming quantization error concentrates at boundaries</li>
      <li>Uniform + FS + Median Cut together form the foundation of GIF, PNG-8, and JPEG palette compression</li>
    </ul>
  </div>

  <script>window.onload = () => setTimeout(() => window.print(), 600);<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(reportHTML);
    win.document.close();
    dip_log('Report opened — use Ctrl+P to save as PDF', 'log-result');
  } else {
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'DIP_Lab_Report_Abhishek.html';
    a.click();
    dip_log('Report downloaded as file.', 'log-result');
  }
}

// Separate Median Cut only report
function dip_downloadMCReport() {
  if (!dip_lastMCResult) { dip_log('Run Median Cut first.', 'log-error'); return; }
  dip_downloadReport();  // Shares the combined report which includes MC section
}


/* ─────────────────────────────────────────────
   RESET
───────────────────────────────────────────── */
function dip_reset() {
  dip_origImageData = null; dip_imgW = 0; dip_imgH = 0;
  dip_lastResults = []; dip_lastMCResult = null;

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
  document.getElementById('mc-results-grid').innerHTML = '';
  document.getElementById('mc-palette-card').style.display = 'none';
  document.getElementById('mc-metrics-card').style.display = 'none';
  document.getElementById('mc-report-btn').style.display = 'none';
  document.getElementById('dip-filter-hint').style.display = '';
  document.getElementById('dip-filter-grid').innerHTML = '';
  document.getElementById('dip-filter-theory').style.display = 'none';

  dip_clearLog('Reset.');
}

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

window.buildDipTab = buildDipTab;