export class PixelNormalizer {
    constructor() {
        this.inputFile = null;
        this.srcImage = new Image();
        this._objectUrl = null;
        this.workCanvas = document.createElement('canvas');
        this.workCtx = this.workCanvas.getContext('2d');
        this.outCanvas = null;
        this.outCtx = null;
        this.srcCanvas = null;
        this.srcCtx = null;
        this.analysisInfo = null;
        this.normalizeButton = null;
        this.displayScaleInput = null;
        this.downloadButton = null;
        this.autoDetect = null;
        this.blockWInput = null;
        this.blockHInput = null;
        this.snapToleranceInput = null;
        this.snapButton = null;

        this.srcImage.addEventListener('load', () => {
            this.workCanvas.width = this.srcImage.width;
            this.workCanvas.height = this.srcImage.height;
            this.workCtx.imageSmoothingEnabled = false;
            this.workCtx.drawImage(this.srcImage, 0, 0);
            if (this.analysisInfo) this.analysisInfo.textContent = `Loaded ${this.srcImage.width}x${this.srcImage.height}. Ready to analyze.`;
            this._drawSourceWithGrid();
        });
    }

    initialize() {
        this.inputFile = document.getElementById('aiFileSelect');
        this.outCanvas = document.getElementById('normalizedCanvas');
        this.outCtx = this.outCanvas.getContext('2d');
        this.srcCanvas = document.getElementById('sourceCanvas');
        this.srcCtx = this.srcCanvas ? this.srcCanvas.getContext('2d') : null;
        this.analysisInfo = document.getElementById('analysisInfo');
        this.normalizeButton = document.getElementById('normalizeButton');
        this.displayScaleInput = document.getElementById('normScale');
        this.downloadButton = document.getElementById('downloadNormalized');
        this.autoDetect = document.getElementById('autoDetect');
        this.blockWInput = document.getElementById('blockW');
        this.blockHInput = document.getElementById('blockH');
        this.gridOffsetXInput = document.getElementById('gridOffsetX');
        this.gridOffsetYInput = document.getElementById('gridOffsetY');
        this.snapToleranceInput = document.getElementById('snapTolerance');
        this.snapButton = document.getElementById('snapColorsBtn');

        if (!this.inputFile || !this.outCanvas) return;

        if (this.autoDetect && !this.autoDetect.checked) {
            this.blockWInput.disabled = false;
            this.blockHInput.disabled = false;
        }

        this.inputFile.onchange = (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            if (this._objectUrl) {
                try { URL.revokeObjectURL(this._objectUrl); } catch { }
            }
            this._objectUrl = URL.createObjectURL(f);
            this.srcImage.src = this._objectUrl;
            if (this.srcCanvas) this.srcCanvas.style.display = '';
        };

        this.normalizeButton.addEventListener('click', async () => {
            if (!this.srcImage.width) return;
            const result = this.analyzeAndNormalize();
            this.renderOutput(result);
        });

        this.displayScaleInput.addEventListener('change', () => {
            if (this._lastResult) this.renderOutput(this._lastResult);
            this._drawSourceWithGrid();
        });

        this.downloadButton.addEventListener('click', () => {
            if (!this._lastResult) return;
            const a = document.createElement('a');
            a.href = this._lastResult.canvas.toDataURL('image/png');
            a.download = 'normalized.png';
            a.click();
        });

        this.autoDetect.addEventListener('change', () => {
            const manual = !this.autoDetect.checked;
            this.blockWInput.disabled = !manual;
            this.blockHInput.disabled = !manual;
            this._drawSourceWithGrid();
        });

        this.blockWInput.addEventListener('input', () => this._drawSourceWithGrid());
        this.blockHInput.addEventListener('input', () => this._drawSourceWithGrid());
        this.gridOffsetXInput.addEventListener('input', () => this._drawSourceWithGrid());
        this.gridOffsetYInput.addEventListener('input', () => this._drawSourceWithGrid());

        this.snapButton.addEventListener('click', () => {
            if (!this._lastResult) return;
            const tolPct = Math.max(0, Math.min(100, parseInt(this.snapToleranceInput.value || '8', 10)));
            this._lastResult = this.snapColorsHSL(this._lastResult, tolPct);
            this.renderOutput(this._lastResult);
        });
    }

    analyzeAndNormalize() {
        const { width, height } = this.workCanvas;
        const srcData = this.workCtx.getImageData(0, 0, width, height);

        let pxW, pxH;
        if (this.autoDetect && this.autoDetect.checked) {
            const yPeriod = this._estimatePeriodVertical(srcData, width, height);
            const xPeriod = this._estimatePeriodHorizontal(srcData, width, height);
            pxH = Math.max(1, Math.round(yPeriod || xPeriod || 8));
            pxW = Math.max(1, Math.round(xPeriod || yPeriod || 8));
        } else {
            pxW = Math.max(1, parseInt(this.blockWInput.value || '8', 10));
            pxH = Math.max(1, parseInt(this.blockHInput.value || '8', 10));
        }

        pxW = Math.max(1, pxW);
        pxH = Math.max(1, pxH);

        const outW = Math.max(1, Math.round((width  - (parseInt(this.gridOffsetXInput?.value || '0', 10) % pxW)) / pxW));
        const outH = Math.max(1, Math.round((height - (parseInt(this.gridOffsetYInput?.value || '0', 10) % pxH)) / pxH));

        const outCanvas = document.createElement('canvas');
        outCanvas.width  = outW;
        outCanvas.height = outH;
        const outCtx  = outCanvas.getContext('2d', { willReadFrequently: true });
        const outImage = outCtx.createImageData(outW, outH);
        const outArr   = outImage.data;

        const offX  = parseInt(this.gridOffsetXInput?.value || '0', 10) || 0;
        const offY  = parseInt(this.gridOffsetYInput?.value || '0', 10) || 0;
        const cxOff = (pxW / 2) + offX;
        const cyOff = (pxH / 2) + offY;
        const rx = Math.max(1, Math.floor(pxW * 0.25));
        const ry = Math.max(1, Math.floor(pxH * 0.25));

        for (let y = 0; y < outH; y++) {
            for (let x = 0; x < outW; x++) {
                const cx  = Math.min(width  - 1, Math.floor(x * pxW + cxOff));
                const cy  = Math.min(height - 1, Math.floor(y * pxH + cyOff));
                const avg = this._medianRect(srcData, width, height, cx - rx, cy - ry, cx + rx, cy + ry);
                const idx = (y * outW + x) * 4;
                outArr[idx]     = avg.r;
                outArr[idx + 1] = avg.g;
                outArr[idx + 2] = avg.b;
                outArr[idx + 3] = 255;
            }
        }
        outCtx.putImageData(outImage, 0, 0);

        if (this.analysisInfo) {
            const mode = (this.autoDetect && this.autoDetect.checked) ? 'auto' : 'manual';
            this.analysisInfo.textContent = `Source ${width}x${height} → ${mode} block ${pxW}x${pxH} → native ${outW}x${outH}`;
        }

        const baseCanvas = document.createElement('canvas');
        baseCanvas.width  = outW;
        baseCanvas.height = outH;
        baseCanvas.getContext('2d').drawImage(outCanvas, 0, 0);

        const result = { canvas: outCanvas, baseCanvas, pxW, pxH, outW, outH, palette: null };
        this._lastResult = result;
        this._drawSourceWithGrid(pxW, pxH);
        if (this.srcCanvas) this.srcCanvas.style.display = 'none';
        return result;
    }

    renderOutput(result) {
        const scale = Math.max(1, parseInt(this.displayScaleInput.value || '1', 10));
        this.outCanvas.width  = result.outW * scale;
        this.outCanvas.height = result.outH * scale;
        this.outCtx.imageSmoothingEnabled = false;
        this.outCtx.clearRect(0, 0, this.outCanvas.width, this.outCanvas.height);
        this.outCtx.drawImage(result.canvas, 0, 0, this.outCanvas.width, this.outCanvas.height);
    }

    _drawSourceWithGrid(pxW, pxH) {
        if (!this.srcCanvas || !this.srcCtx || !this.srcImage || !this.srcImage.width) return;
        const imgW = this.srcImage.width;
        const imgH = this.srcImage.height;
        this.srcCanvas.width  = imgW;
        this.srcCanvas.height = imgH;
        const scale    = Math.max(1, parseInt(this.displayScaleInput?.value || '8', 10));
        const cssScale = Math.min(scale, 4);
        this.srcCanvas.style.width  = (imgW * cssScale) + 'px';
        this.srcCanvas.style.height = (imgH * cssScale) + 'px';
        this.srcCtx.imageSmoothingEnabled = false;
        this.srcCtx.clearRect(0, 0, imgW, imgH);
        this.srcCtx.drawImage(this.srcImage, 0, 0);

        let bw = pxW, bh = pxH;
        if (!bw || !bh) {
            if (this.autoDetect && this.autoDetect.checked && this._lastResult) {
                bw = this._lastResult.pxW;
                bh = this._lastResult.pxH;
            } else {
                bw = Math.max(1, parseInt(this.blockWInput?.value || '8', 10));
                bh = Math.max(1, parseInt(this.blockHInput?.value || '8', 10));
            }
        }

        this.srcCtx.save();
        this.srcCtx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        this.srcCtx.lineWidth = 1;
        const offX = parseInt(this.gridOffsetXInput?.value || '0', 10) || 0;
        const offY = parseInt(this.gridOffsetYInput?.value || '0', 10) || 0;
        for (let x = offX; x <= imgW; x += bw) {
            this.srcCtx.beginPath();
            this.srcCtx.moveTo(Math.floor(x) + 0.5, 0);
            this.srcCtx.lineTo(Math.floor(x) + 0.5, imgH);
            this.srcCtx.stroke();
        }
        for (let y = offY; y <= imgH; y += bh) {
            this.srcCtx.beginPath();
            this.srcCtx.moveTo(0, Math.floor(y) + 0.5);
            this.srcCtx.lineTo(imgW, Math.floor(y) + 0.5);
            this.srcCtx.stroke();
        }
        this.srcCtx.restore();
    }

    snapColorsHSL(result, tolerancePercent) {
        const srcCtx = (result.baseCanvas || result.canvas).getContext('2d');
        const srcImg = srcCtx.getImageData(0, 0, result.outW, result.outH);
        const d = srcImg.data;
        const len = result.outW * result.outH;
        const radius = (tolerancePercent / 100) * 1.0;

        const toHSL = (r, g, b) => {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h, s, l };
        };

        const hDist = (h1, h2) => { let dh = Math.abs(h1 - h2); return Math.min(dh, 1 - dh); };
        const dist  = (a, b)   => Math.hypot(1.2 * hDist(a.h, b.h), a.s - b.s, a.l - b.l);

        const values = new Array(len);
        for (let i = 0; i < len; i++) {
            const o = i * 4; values[i] = toHSL(d[o], d[o + 1], d[o + 2]);
        }

        const clusters = [];
        const toCentroid = (c) => ({
            h: (Math.atan2(c.hSin, c.hCos) / (2 * Math.PI) + 1) % 1,
            s: c.s / c.n,
            l: c.l / c.n,
        });

        for (let i = 0; i < len; i++) {
            const v = values[i];
            let best = -1, bestD = Infinity;
            for (let k = 0; k < clusters.length; k++) {
                const di = dist(v, toCentroid(clusters[k]));
                if (di < bestD) { bestD = di; best = k; }
            }
            if (bestD <= radius && best >= 0) {
                const cl = clusters[best];
                cl.s += v.s; cl.l += v.l; cl.n += 1;
                const ang = 2 * Math.PI * v.h; cl.hCos += Math.cos(ang); cl.hSin += Math.sin(ang);
            } else {
                const ang = 2 * Math.PI * v.h;
                clusters.push({ hCos: Math.cos(ang), hSin: Math.sin(ang), s: v.s, l: v.l, n: 1 });
            }
        }

        const paletteHSL = clusters.map(toCentroid);
        const paletteRGB = paletteHSL.map(c => this._hslToRgb255(c.h, c.s, c.l));

        for (let i = 0; i < len; i++) {
            const v = values[i];
            let best = Infinity, bi = 0;
            for (let p = 0; p < paletteHSL.length; p++) {
                const di = dist(v, paletteHSL[p]);
                if (di < best) { best = di; bi = p; }
            }
            const pc = paletteRGB[bi];
            values[i]._r = pc.r; values[i]._g = pc.g; values[i]._b = pc.b;
        }

        const outCtx  = result.canvas.getContext('2d');
        const outImg  = outCtx.createImageData(result.outW, result.outH);
        const outData = outImg.data;
        for (let i = 0; i < len; i++) {
            const o = i * 4;
            outData[o]     = values[i]._r;
            outData[o + 1] = values[i]._g;
            outData[o + 2] = values[i]._b;
            outData[o + 3] = 255;
        }
        outCtx.putImageData(outImg, 0, 0);
        if (this.analysisInfo) this.analysisInfo.textContent += ` | HSL snapped to ${paletteRGB.length} colors (tol ${tolerancePercent}%)`;
        this._renderPalette(paletteRGB);
        return { ...result, canvas: result.canvas, palette: paletteRGB };
    }

    _hslToRgb255(h, s, l) {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    _mergePalette(palette, mergeRadius) {
        const clusters = [];
        for (const c of palette) {
            let best = -1, bestD = Infinity;
            for (let i = 0; i < clusters.length; i++) {
                const cc = clusters[i];
                const d = Math.hypot(c.r - cc.r, c.g - cc.g, c.b - cc.b);
                if (d < bestD) { bestD = d; best = i; }
            }
            if (bestD <= mergeRadius && best >= 0) {
                const cc = clusters[best];
                cc.r = Math.round((cc.r + c.r) / 2);
                cc.g = Math.round((cc.g + c.g) / 2);
                cc.b = Math.round((cc.b + c.b) / 2);
            } else {
                clusters.push({ ...c });
            }
        }
        return clusters;
    }

    _renderPalette(palette) {
        const container = document.getElementById('paletteSwatches');
        if (!container) return;
        container.innerHTML = '';
        palette.forEach(c => {
            const sw = document.createElement('div');
            sw.className = 'swatch';
            sw.title = `rgb(${c.r},${c.g},${c.b})`;
            sw.style.background = `rgb(${c.r}, ${c.g}, ${c.b})`;
            container.appendChild(sw);
        });
    }

    _avgRect(srcData, w, h, x0, y0, x1, y1) {
        x0 = Math.max(0, Math.min(w - 1, x0));
        y0 = Math.max(0, Math.min(h - 1, y0));
        x1 = Math.max(0, Math.min(w - 1, x1));
        y1 = Math.max(0, Math.min(h - 1, y1));
        let r = 0, g = 0, b = 0, c = 0;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const i = (y * w + x) * 4;
                r += srcData.data[i]; g += srcData.data[i + 1]; b += srcData.data[i + 2];
                c++;
            }
        }
        if (!c) return { r: 0, g: 0, b: 0 };
        return { r: Math.round(r / c), g: Math.round(g / c), b: Math.round(b / c) };
    }

    _medianRect(srcData, w, h, x0, y0, x1, y1) {
        x0 = Math.max(0, Math.min(w - 1, x0));
        y0 = Math.max(0, Math.min(h - 1, y0));
        x1 = Math.max(0, Math.min(w - 1, x1));
        y1 = Math.max(0, Math.min(h - 1, y1));
        const rs = [], gs = [], bs = [];
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const i = (y * w + x) * 4;
                rs.push(srcData.data[i]); gs.push(srcData.data[i + 1]); bs.push(srcData.data[i + 2]);
            }
        }
        if (rs.length === 0) return { r: 0, g: 0, b: 0 };
        rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
        const mid  = Math.floor(rs.length / 2);
        const even = (rs.length % 2) === 0;
        return {
            r: even ? Math.round((rs[mid - 1] + rs[mid]) / 2) : rs[mid],
            g: even ? Math.round((gs[mid - 1] + gs[mid]) / 2) : gs[mid],
            b: even ? Math.round((bs[mid - 1] + bs[mid]) / 2) : bs[mid],
        };
    }

    _estimatePeriodVertical(img, w, h) {
        const lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const o = i * 4;
            lum[i] = 0.2126 * img.data[o] + 0.7152 * img.data[o + 1] + 0.0722 * img.data[o + 2];
        }
        const maxLag = Math.min(128, Math.floor(h / 2));
        const scores = new Float64Array(maxLag + 1);
        let bestLag = 0, bestScore = -Infinity;
        for (let lag = 1; lag <= maxLag; lag++) {
            let score = 0;
            for (let y = lag; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    score += (1 - Math.abs(lum[y * w + x] - lum[(y - lag) * w + x]) / 255);
                }
            }
            score -= lag * 0.001 * w * h;
            scores[lag] = score;
            if (score > bestScore) { bestScore = score; bestLag = lag; }
        }
        if (!bestLag) return null;
        const threshold = bestScore * 0.96;
        for (let lag = 1; lag <= maxLag; lag++) { if (scores[lag] >= threshold) return lag; }
        return bestLag;
    }

    _estimatePeriodHorizontal(img, w, h) {
        const lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const o = i * 4;
            lum[i] = 0.2126 * img.data[o] + 0.7152 * img.data[o + 1] + 0.0722 * img.data[o + 2];
        }
        const maxLag = Math.min(128, Math.floor(w / 2));
        const scores = new Float64Array(maxLag + 1);
        let bestLag = 0, bestScore = -Infinity;
        for (let lag = 1; lag <= maxLag; lag++) {
            let score = 0;
            for (let y = 0; y < h; y++) {
                for (let x = lag; x < w; x++) {
                    score += (1 - Math.abs(lum[y * w + x] - lum[y * w + (x - lag)]) / 255);
                }
            }
            score -= lag * 0.001 * w * h;
            scores[lag] = score;
            if (score > bestScore) { bestScore = score; bestLag = lag; }
        }
        if (!bestLag) return null;
        const threshold = bestScore * 0.96;
        for (let lag = 1; lag <= maxLag; lag++) { if (scores[lag] >= threshold) return lag; }
        return bestLag;
    }
}
