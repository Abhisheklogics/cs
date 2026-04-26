class ColorQuantizer {
  constructor(numColors) {
    this.numColors = numColors;
    this.levelsPerCh = Math.max(2, Math.round(Math.cbrt(numColors)));
    this.step = 255 / (this.levelsPerCh - 1);
  }

  quantizeCh(v) {
    return Math.min(255, Math.round(Math.round(v / this.step) * this.step));
  }

  quantize(imageData) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      out[i]     = this.quantizeCh(src[i]);
      out[i + 1] = this.quantizeCh(src[i + 1]);
      out[i + 2] = this.quantizeCh(src[i + 2]);
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  info() {
    return `${this.numColors} colors, ${this.levelsPerCh} levels/channel, step = ${this.step.toFixed(2)}`;
  }
}


class FloydSteinberg {
  constructor(quantizer) {
    this.quantizer = quantizer;
  }

  dither(imageData) {
    const W = imageData.width;
    const H = imageData.height;
    const buf = new Float32Array(imageData.data);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;

        const r = Math.max(0, Math.min(255, buf[idx]));
        const g = Math.max(0, Math.min(255, buf[idx + 1]));
        const b = Math.max(0, Math.min(255, buf[idx + 2]));

        const qr = this.quantizer.quantizeCh(r);
        const qg = this.quantizer.quantizeCh(g);
        const qb = this.quantizer.quantizeCh(b);

        buf[idx]     = qr;
        buf[idx + 1] = qg;
        buf[idx + 2] = qb;

        const er = r - qr;
        const eg = g - qg;
        const eb = b - qb;

        this._spread(buf, W, H, x + 1, y,     er, eg, eb, 7 / 16);
        this._spread(buf, W, H, x - 1, y + 1, er, eg, eb, 3 / 16);
        this._spread(buf, W, H, x,     y + 1, er, eg, eb, 5 / 16);
        this._spread(buf, W, H, x + 1, y + 1, er, eg, eb, 1 / 16);
      }
    }

    const out = new Uint8ClampedArray(imageData.data.length);
    for (let i = 0; i < out.length; i += 4) {
      out[i]     = Math.max(0, Math.min(255, buf[i]));
      out[i + 1] = Math.max(0, Math.min(255, buf[i + 1]));
      out[i + 2] = Math.max(0, Math.min(255, buf[i + 2]));
      out[i + 3] = imageData.data[i + 3];
    }
    return new ImageData(out, W, H);
  }

  _spread(buf, W, H, x, y, er, eg, eb, f) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    buf[i]     += er * f;
    buf[i + 1] += eg * f;
    buf[i + 2] += eb * f;
  }
}


class DiffImage {
  static compute(orig, quant, gain) {
    gain = gain || 2;
    const out = new Uint8ClampedArray(orig.data.length);
    for (let i = 0; i < out.length; i += 4) {
      const dr = Math.abs(orig.data[i]     - quant.data[i]);
      const dg = Math.abs(orig.data[i + 1] - quant.data[i + 1]);
      const db = Math.abs(orig.data[i + 2] - quant.data[i + 2]);
      const avg = (dr + dg + db) / 3;
      const amp = Math.min(255, Math.round(avg * gain));
      out[i]     = Math.min(255, amp);
      out[i + 1] = Math.round(amp * 0.35);
      out[i + 2] = 0;
      out[i + 3] = 255;
    }
    return new ImageData(out, orig.width, orig.height);
  }
}


class ImageMetrics {
  static mse(a, b) {
    let sum = 0, count = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      sum += (a.data[i]     - b.data[i])     ** 2;
      sum += (a.data[i + 1] - b.data[i + 1]) ** 2;
      sum += (a.data[i + 2] - b.data[i + 2]) ** 2;
      count += 3;
    }
    return sum / count;
  }

  static psnr(mse) {
    if (mse === 0) return Infinity;
    return 10 * Math.log10((255 * 255) / mse);
  }

  static ssim(a, b) {
    const n = a.data.length / 4;
    let sA = 0, sB = 0, sAB = 0, sA2 = 0, sB2 = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const la = 0.299 * a.data[i] + 0.587 * a.data[i + 1] + 0.114 * a.data[i + 2];
      const lb = 0.299 * b.data[i] + 0.587 * b.data[i + 1] + 0.114 * b.data[i + 2];
      sA += la; sB += lb;
      sA2 += la * la; sB2 += lb * lb;
      sAB += la * lb;
    }
    const muA = sA / n, muB = sB / n;
    const vA = sA2 / n - muA * muA;
    const vB = sB2 / n - muB * muB;
    const cov = sAB / n - muA * muB;
    const C1 = (0.01 * 255) ** 2;
    const C2 = (0.03 * 255) ** 2;
    return ((2 * muA * muB + C1) * (2 * cov + C2)) /
           ((muA ** 2 + muB ** 2 + C1) * (vA + vB + C2));
  }

  static grade(psnr) {
    if (!isFinite(psnr)) return 'Perfect';
    if (psnr >= 40) return 'Excellent';
    if (psnr >= 35) return 'Good';
    if (psnr >= 30) return 'Acceptable';
    if (psnr >= 25) return 'Poor';
    return 'Very Poor';
  }
}


class DCT8x8 {
  static C(k) { return k === 0 ? 1 / Math.SQRT2 : 1; }

  static forward(block) {
    const out = new Array(64).fill(0);
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        let s = 0;
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            s += block[x * 8 + y]
              * Math.cos((2 * x + 1) * u * Math.PI / 16)
              * Math.cos((2 * y + 1) * v * Math.PI / 16);
          }
        }
        out[u * 8 + v] = 0.25 * DCT8x8.C(u) * DCT8x8.C(v) * s;
      }
    }
    return out;
  }

  static inverse(coeffs) {
    const out = new Array(64).fill(0);
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        let s = 0;
        for (let u = 0; u < 8; u++) {
          for (let v = 0; v < 8; v++) {
            s += DCT8x8.C(u) * DCT8x8.C(v) * coeffs[u * 8 + v]
              * Math.cos((2 * x + 1) * u * Math.PI / 16)
              * Math.cos((2 * y + 1) * v * Math.PI / 16);
          }
        }
        out[x * 8 + y] = 0.25 * s;
      }
    }
    return out;
  }

  static lumaQuantMatrix(quality) {
    quality = quality || 50;
    const base = [
      16, 11, 10, 16, 24, 40, 51, 61,
      12, 12, 14, 19, 26, 58, 60, 55,
      14, 13, 16, 24, 40, 57, 69, 56,
      14, 17, 22, 29, 51, 87, 80, 62,
      18, 22, 37, 56, 68,109,103, 77,
      24, 35, 55, 64, 81,104,113, 92,
      49, 64, 78, 87,103,121,120,101,
      72, 92, 95, 98,112,100,103, 99
    ];
    const scale = quality < 50 ? 5000 / quality : 200 - quality * 2;
    return base.map(v => Math.max(1, Math.min(255, Math.floor((v * scale + 50) / 100))));
  }
}


class Histogram {
  static compute(imageData) {
    const r = new Array(256).fill(0);
    const g = new Array(256).fill(0);
    const b = new Array(256).fill(0);
    const luma = new Array(256).fill(0);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      r[d[i]]++;
      g[d[i + 1]]++;
      b[d[i + 2]]++;
      const l = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      luma[l]++;
    }
    return { r, g, b, luma };
  }
}


class Filters {
  static applyKernel(imageData, kernel, kSize) {
    const W = imageData.width;
    const H = imageData.height;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    const half = Math.floor(kSize / 2);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sumR = 0, sumG = 0, sumB = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = Math.min(W - 1, Math.max(0, x + kx - half));
            const py = Math.min(H - 1, Math.max(0, y + ky - half));
            const pi = (py * W + px) * 4;
            const kv = kernel[ky * kSize + kx];
            sumR += src[pi]     * kv;
            sumG += src[pi + 1] * kv;
            sumB += src[pi + 2] * kv;
          }
        }
        const i = (y * W + x) * 4;
        out[i]     = Math.min(255, Math.max(0, Math.round(sumR)));
        out[i + 1] = Math.min(255, Math.max(0, Math.round(sumG)));
        out[i + 2] = Math.min(255, Math.max(0, Math.round(sumB)));
        out[i + 3] = src[i + 3];
      }
    }
    return new ImageData(out, W, H);
  }

  static gaussianBlur(imageData, sigma) {
    sigma = sigma || 1;
    const kSize = Math.max(3, Math.min(9, Math.round(sigma * 3) * 2 + 1));
    const half = Math.floor(kSize / 2);
    const kernel = [];
    let sum = 0;
    for (let y = 0; y < kSize; y++) {
      for (let x = 0; x < kSize; x++) {
        const dx = x - half, dy = y - half;
        const v = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        kernel.push(v);
        sum += v;
      }
    }
    return Filters.applyKernel(imageData, kernel.map(v => v / sum), kSize);
  }

  static sharpen(imageData) {
    const kernel = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    return Filters.applyKernel(imageData, kernel, 3);
  }

  static emboss(imageData) {
    const kernel = [
      -2, -1,  0,
      -1,  1,  1,
       0,  1,  2
    ];
    return Filters.applyKernel(imageData, kernel, 3);
  }

  static sobelEdge(imageData) {
    const W = imageData.width;
    const H = imageData.height;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);

    const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let gx = 0, gy = 0;
        for (let ky2 = 0; ky2 < 3; ky2++) {
          for (let kx2 = 0; kx2 < 3; kx2++) {
            const pi = ((y + ky2 - 1) * W + (x + kx2 - 1)) * 4;
            const luma = 0.299 * src[pi] + 0.587 * src[pi + 1] + 0.114 * src[pi + 2];
            gx += luma * kx[ky2 * 3 + kx2];
            gy += luma * ky[ky2 * 3 + kx2];
          }
        }
        const mag = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy)));
        const i = (y * W + x) * 4;
        out[i] = out[i + 1] = out[i + 2] = mag;
        out[i + 3] = 255;
      }
    }
    return new ImageData(out, W, H);
  }

  static grayscale(imageData) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      const l = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
      out[i] = out[i + 1] = out[i + 2] = l;
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  static threshold(imageData, t) {
    t = t || 128;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      const l = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
      const v = l >= t ? 255 : 0;
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  static medianFilter(imageData) {
    const W = imageData.width;
    const H = imageData.height;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const rs = [], gs = [], bs = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pi = ((y + dy) * W + (x + dx)) * 4;
            rs.push(src[pi]);
            gs.push(src[pi + 1]);
            bs.push(src[pi + 2]);
          }
        }
        rs.sort((a, b) => a - b);
        gs.sort((a, b) => a - b);
        bs.sort((a, b) => a - b);
        const i = (y * W + x) * 4;
        out[i]     = rs[4];
        out[i + 1] = gs[4];
        out[i + 2] = bs[4];
        out[i + 3] = src[i + 3];
      }
    }
    return new ImageData(out, W, H);
  }

  static brightnessContrast(imageData, brightness, contrast) {
    brightness = brightness || 0;
    contrast = contrast || 1;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      out[i]     = Math.min(255, Math.max(0, (src[i]     - 128) * contrast + 128 + brightness));
      out[i + 1] = Math.min(255, Math.max(0, (src[i + 1] - 128) * contrast + 128 + brightness));
      out[i + 2] = Math.min(255, Math.max(0, (src[i + 2] - 128) * contrast + 128 + brightness));
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  static negative(imageData) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      out[i]     = 255 - src[i];
      out[i + 1] = 255 - src[i + 1];
      out[i + 2] = 255 - src[i + 2];
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  static histogramEqualize(imageData) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    const n = src.length / 4;

    const hist = new Array(256).fill(0);
    for (let i = 0; i < src.length; i += 4) {
      const l = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
      hist[l]++;
    }

    const cdf = new Array(256).fill(0);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

    const cdfMin = cdf.find(v => v > 0);
    const lut = cdf.map(v => Math.round(((v - cdfMin) / (n - cdfMin)) * 255));

    for (let i = 0; i < src.length; i += 4) {
      const l = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
      const newL = lut[l];
      const ratio = l > 0 ? newL / l : 1;
      out[i]     = Math.min(255, Math.round(src[i]     * ratio));
      out[i + 1] = Math.min(255, Math.round(src[i + 1] * ratio));
      out[i + 2] = Math.min(255, Math.round(src[i + 2] * ratio));
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }
}


window.ColorQuantizer = ColorQuantizer;
window.FloydSteinberg = FloydSteinberg;
window.DiffImage      = DiffImage;
window.ImageMetrics   = ImageMetrics;
window.DCT8x8         = DCT8x8;
window.Histogram      = Histogram;
window.Filters        = Filters;