class SPoster {

    fileSelect = null;
    ctx;
    loadedImage = new Image();

    valueSliders = [];

    initialize() {
        this.fileSelect = document.getElementById('fileSelect');
        this.canvas = document.getElementById('imageDisplay');
        this.ctx = this.canvas.getContext('2d');
        this.sampleCharacter = document.querySelector('#sampleCharacter');
        this.showGuySelect = document.querySelector('#toggleGuy');

        this.ctx.imageSmoothingEnabled = false;


        document.getElementById('testButton').addEventListener('click', this.applyEffect.bind(this));
        document.getElementById('resetButton').addEventListener('click', this.resetImage.bind(this));
        document.getElementById('downloadImage').addEventListener('click', this.downloadCanvas.bind(this));

        this.valueSliders = document.querySelectorAll(".valueSlider");
        this.valueSliders.forEach(slider => {
            slider.onchange = () => this.applyEffect();
        });

        this.loadedImage.addEventListener('load', this.drawLoadedImageToCanvas.bind(this));

        this.fileSelect.onchange = e => {

            this.loadedImage.src = URL.createObjectURL(e.target.files[0]);

        }


    }

    applyEffect() {
        this.resetImage();

        let valueRanges = Array.from(this.valueSliders, slider => Number(slider.value));
        //let valueRanges = [0.1, 0.2, 0.5, 0.8, 0.9];
        valueRanges.sort((a, b) => a - b);
        console.log(valueRanges);


        let hSplit = document.getElementById('hSplit').value;
        let sSplit = document.getElementById('sSplit').value;

        let margin = document.getElementById('margin').value;

        let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        let data = imageData.data;

        for (let i = 0; i < imageData.data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            let a = data[i + 3];

            let hsl = this.rgbToHsl(r, g, b);
            hsl.h = this.round(hsl.h, hSplit, 0);
            hsl.s = this.round(hsl.s, sSplit, 0);
            hsl.l = this.stratify(hsl.l, valueRanges, margin);

            let rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            data[i] = rgb.r;
            data[i + 1] = rgb.g;
            data[i + 2] = rgb.b;
        }

        this.ctx.putImageData(imageData, 0, 0);

        if (this.showGuySelect.checked) {
            this.ctx.drawImage(this.sampleCharacter, (this.canvas.width / 2) - this.sampleCharacter.width / 2, (this.canvas.height / 2) - this.sampleCharacter.height / 2);
        }
    }

    resetImage() {
        this.drawLoadedImageToCanvas();
    }

    drawLoadedImageToCanvas() {

        let scale = document.querySelector('#scale').value;

        const img = this.loadedImage;
        this.canvas.height = img.height / scale;
        this.canvas.width = img.width / scale;

        this.ctx.imageSmoothingEnabled = false;

        this.ctx.drawImage(img, 0, 0, img.width / scale, img.height / scale);


        this.canvas.style.width = '100%';
        this.ctx.imageSmoothingEnabled = false;

    }

    downloadCanvas() {
        var anchor = document.createElement('a');
        anchor.href = this.canvas.toDataURL('image/png');
        anchor.download = 'image.png';
        anchor.click();
    }

    stratify(number, ranges, margin) {
        margin = margin == null ? 0 : margin;

        let result = number;
        for (const range of ranges) {
            let totalRange = Number(range) + Number(margin);
            if (number <= totalRange) {
                result = number <= range ? range : number;
                break;
            }
        }

        return result;
    }

    round(number, increment, offset) {
        return Math.ceil((number - offset) / increment) * increment + offset;
    }

    rgbToHsl(r, g, b) {
        r /= 255, g /= 255, b /= 255;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return { h: h, s: s, l: l };
    }

    hslToRgb(h, s, l) {
        var r, g, b;

        if (s == 0) {
            r = g = b = l; // achromatic
        } else {
            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return { r: r * 255, g: g * 255, b: b * 255 };
    }
}

new SPoster().initialize();

// --- AI Pixel Art Normalizer ---
class PixelNormalizer {
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
            // Draw to work canvas at 1:1 for sampling
            this.workCanvas.width = this.srcImage.width;
            this.workCanvas.height = this.srcImage.height;
            this.workCtx.imageSmoothingEnabled = false;
            this.workCtx.drawImage(this.srcImage, 0, 0);
            if (this.analysisInfo) this.analysisInfo.textContent = `Loaded ${this.srcImage.width}x${this.srcImage.height}. Ready to analyze.`;
            // Update visible source view with grid
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

        if (!this.inputFile || !this.outCanvas) return; // Not on this tab

        // Since auto-detect is off by default, ensure manual fields are enabled
        if (this.autoDetect && !this.autoDetect.checked) {
            this.blockWInput.disabled = false;
            this.blockHInput.disabled = false;
        }

        this.inputFile.onchange = (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            // Clean up previous object URL if any
            if (this._objectUrl) {
                try { URL.revokeObjectURL(this._objectUrl); } catch { }
            }
            this._objectUrl = URL.createObjectURL(f);
            this.srcImage.src = this._objectUrl;
            // Ensure source canvas is visible for grid alignment before analysis
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
            // Download the 1:1 pixel art, not the scaled display
            if (!this._lastResult) return;
            const a = document.createElement('a');
            a.href = this._lastResult.canvas.toDataURL('image/png');
            a.download = 'normalized.png';
            a.click();
        });

        this.autoDetect.addEventListener('change', () => {
            const manual = !this.autoDetect.checked;
            this.blockWInput.disabled = !manual ? true : false;
            this.blockHInput.disabled = !manual ? true : false;
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

    // Main algorithm: estimate pixel grid, sample centers, average local region, output normalized image
    analyzeAndNormalize() {
        const { width, height } = this.workCanvas;
        const srcData = this.workCtx.getImageData(0, 0, width, height);

        // 1) Determine block size: auto-detect or manual override
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

        // Fallback safety
        pxW = Math.max(1, pxW);
        pxH = Math.max(1, pxH);

        const outW = Math.max(1, Math.round((width - (parseInt(this.gridOffsetXInput?.value || '0', 10) % pxW)) / pxW));
        const outH = Math.max(1, Math.round((height - (parseInt(this.gridOffsetYInput?.value || '0', 10) % pxH)) / pxH));

        // 2) For each destination pixel, find corresponding center in source and take median color in a local window
        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
        const outImage = outCtx.createImageData(outW, outH);
        const outArr = outImage.data;

        // Center offsets: assume pixel centers near block centers
        const offX = parseInt(this.gridOffsetXInput?.value || '0', 10) || 0;
        const offY = parseInt(this.gridOffsetYInput?.value || '0', 10) || 0;
        const cxOff = (pxW / 2) + offX;
        const cyOff = (pxH / 2) + offY;
        // Sampling radius within the block to reduce boundary artifacts
        const rx = Math.max(1, Math.floor(pxW * 0.25));
        const ry = Math.max(1, Math.floor(pxH * 0.25));

        for (let y = 0; y < outH; y++) {
            for (let x = 0; x < outW; x++) {
                const cx = Math.min(width - 1, Math.floor(x * pxW + cxOff));
                const cy = Math.min(height - 1, Math.floor(y * pxH + cyOff));
                const avg = this._medianRect(srcData, width, height, cx - rx, cy - ry, cx + rx, cy + ry);
                const idx = (y * outW + x) * 4;
                outArr[idx] = avg.r;
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

        // Keep a base copy of the normalized image so snaps are non-cumulative
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = outW;
        baseCanvas.height = outH;
        const baseCtx = baseCanvas.getContext('2d');
        baseCtx.drawImage(outCanvas, 0, 0);

        const result = { canvas: outCanvas, baseCanvas, pxW, pxH, outW, outH, palette: null };
        this._lastResult = result;
        // Refresh source view with detected grid
        this._drawSourceWithGrid(pxW, pxH);
        // Hide source canvas after normalization as requested
        if (this.srcCanvas) this.srcCanvas.style.display = 'none';
        return result;
    }

    renderOutput(result) {
        const scale = Math.max(1, parseInt(this.displayScaleInput.value || '1', 10));
        this.outCanvas.width = result.outW * scale;
        this.outCanvas.height = result.outH * scale;
        this.outCtx.imageSmoothingEnabled = false;
        this.outCtx.clearRect(0, 0, this.outCanvas.width, this.outCanvas.height);
        this.outCtx.drawImage(result.canvas, 0, 0, this.outCanvas.width, this.outCanvas.height);
    }

    _drawSourceWithGrid(pxW, pxH) {
        if (!this.srcCanvas || !this.srcCtx || !this.srcImage || !this.srcImage.width) return;
        const imgW = this.srcImage.width;
        const imgH = this.srcImage.height;
        // Internal size stays 1:1; scale via CSS for view
        this.srcCanvas.width = imgW;
        this.srcCanvas.height = imgH;
        const scale = Math.max(1, parseInt(this.displayScaleInput?.value || '8', 10));
        const cssScale = Math.min(scale, 4); // cap to avoid huge element
        this.srcCanvas.style.width = (imgW * cssScale) + 'px';
        this.srcCanvas.style.height = (imgH * cssScale) + 'px';
        this.srcCtx.imageSmoothingEnabled = false;
        this.srcCtx.clearRect(0, 0, imgW, imgH);
        this.srcCtx.drawImage(this.srcImage, 0, 0);

        // Determine grid block size to show
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

        // Draw grid overlay
        this.srcCtx.save();
        this.srcCtx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        this.srcCtx.lineWidth = 1;
        const offX = parseInt(this.gridOffsetXInput?.value || '0', 10) || 0;
        const offY = parseInt(this.gridOffsetYInput?.value || '0', 10) || 0;
        // Vertical lines
        for (let x = offX; x <= imgW; x += bw) {
            this.srcCtx.beginPath();
            this.srcCtx.moveTo(Math.floor(x) + 0.5, 0);
            this.srcCtx.lineTo(Math.floor(x) + 0.5, imgH);
            this.srcCtx.stroke();
        }
        // Horizontal lines
        for (let y = offY; y <= imgH; y += bh) {
            this.srcCtx.beginPath();
            this.srcCtx.moveTo(0, Math.floor(y) + 0.5);
            this.srcCtx.lineTo(imgW, Math.floor(y) + 0.5);
            this.srcCtx.stroke();
        }
        this.srcCtx.restore();
    }

    // HSL snapping: cluster in HSL space with circular hue distance
    snapColorsHSL(result, tolerancePercent) {
        const srcCtx = (result.baseCanvas || result.canvas).getContext('2d');
        const srcImg = srcCtx.getImageData(0, 0, result.outW, result.outH);
        const d = srcImg.data;
        const len = result.outW * result.outH;

        // Build clusters with radius based on tolerance. Distance metric: weighted HSL distance.
        // Hue distance is circular in degrees (0..360). We'll convert RGB->HSL per pixel.
        const radius = (tolerancePercent / 100) * 1.0; // H,S,L in [0,1], hue in [0,1] wrap

        const clusters = []; // { hSumCos, hSumSin, s, l, n }
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

        const hDist = (h1, h2) => {
            let dh = Math.abs(h1 - h2);
            return Math.min(dh, 1 - dh);
        };

        const dist = (a, b) => {
            // Weight hue slightly more than S and L
            const wh = 1.2, ws = 1.0, wl = 1.0;
            return Math.hypot(wh * hDist(a.h, b.h), ws * (a.s - b.s), wl * (a.l - b.l));
        };

        // Online clustering
        const values = new Array(len);
        for (let i = 0; i < len; i++) {
            const o = i * 4; values[i] = toHSL(d[o], d[o + 1], d[o + 2]);
        }

        const toCentroid = (c) => {
            const h = (Math.atan2(c.hSin, c.hCos) / (2 * Math.PI) + 1) % 1;
            return { h, s: c.s / c.n, l: c.l / c.n };
        };

        for (let i = 0; i < len; i++) {
            const v = values[i];
            let best = -1, bestD = Infinity;
            for (let k = 0; k < clusters.length; k++) {
                const c = toCentroid(clusters[k]);
                const di = dist(v, c);
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

        // Build palette from HSL centroids, then map pixels to nearest and convert to RGB
        const paletteHSL = clusters.map(toCentroid);
        const paletteRGB = paletteHSL.map(c => this._hslToRgb255(c.h, c.s, c.l));

        for (let i = 0; i < len; i++) {
            const v = values[i];
            let best = Infinity, bi = 0;
            for (let p = 0; p < paletteHSL.length; p++) {
                const di = dist(v, paletteHSL[p]);
                if (di < best) { best = di; bi = p; }
            }
            const o = i * 4; const pc = paletteRGB[bi];
            // write to a fresh output buffer so snaps are from base each time
            values[i]._r = pc.r; values[i]._g = pc.g; values[i]._b = pc.b;
        }

        // Put results into the working canvas (not base)
        const outCtx = result.canvas.getContext('2d');
        const outImg = outCtx.createImageData(result.outW, result.outH);
        const outData = outImg.data;
        for (let i = 0; i < len; i++) {
            const o = i * 4; outData[o] = values[i]._r; outData[o + 1] = values[i]._g; outData[o + 2] = values[i]._b; outData[o + 3] = 255;
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
            r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    // (RGB snap and binned snap removed; HSL snap is the default)

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
                // average merge
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

    // Helpers
    _avgRect(srcData, w, h, x0, y0, x1, y1) {
        x0 = Math.max(0, Math.min(w - 1, x0));
        y0 = Math.max(0, Math.min(h - 1, y0));
        x1 = Math.max(0, Math.min(w - 1, x1));
        y1 = Math.max(0, Math.min(h - 1, y1));
        let r = 0, g = 0, b = 0, c = 0;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const i = (y * w + x) * 4;
                r += srcData.data[i];
                g += srcData.data[i + 1];
                b += srcData.data[i + 2];
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
        const rs = [];
        const gs = [];
        const bs = [];
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const i = (y * w + x) * 4;
                rs.push(srcData.data[i]);
                gs.push(srcData.data[i + 1]);
                bs.push(srcData.data[i + 2]);
            }
        }
        if (rs.length === 0) return { r: 0, g: 0, b: 0 };
        rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
        const mid = Math.floor(rs.length / 2);
        const even = (rs.length % 2) === 0;
        const r = even ? Math.round((rs[mid - 1] + rs[mid]) / 2) : rs[mid];
        const g = even ? Math.round((gs[mid - 1] + gs[mid]) / 2) : gs[mid];
        const b = even ? Math.round((bs[mid - 1] + bs[mid]) / 2) : bs[mid];
        return { r, g, b };
    }

    // Estimate vertical pixel height by autocorrelation across columns (sum of abs diffs of row-shift)
    _estimatePeriodVertical(img, w, h) {
        const lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const o = i * 4;
            lum[i] = 0.2126 * img.data[o] + 0.7152 * img.data[o + 1] + 0.0722 * img.data[o + 2];
        }
        const maxLag = Math.min(128, Math.floor(h / 2));
        const scores = new Float64Array(maxLag + 1);
        let bestLag = 0;
        let bestScore = -Infinity;
        for (let lag = 1; lag <= maxLag; lag++) {
            let score = 0;
            for (let y = lag; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const a = lum[y * w + x];
                    const b = lum[(y - lag) * w + x];
                    score += (1 - Math.abs(a - b) / 255);
                }
            }
            score -= lag * 0.001 * w * h; // slight penalty for larger lags
            scores[lag] = score;
            if (score > bestScore) { bestScore = score; bestLag = lag; }
        }
        if (!bestLag) return null;
        // Prefer the smallest lag whose score is close to the best (avoid choosing harmonics)
        const threshold = bestScore * 0.96; // within 4%
        for (let lag = 1; lag <= maxLag; lag++) {
            if (scores[lag] >= threshold) return lag;
        }
        return bestLag;
    }

    // Estimate horizontal pixel width by autocorrelation across rows
    _estimatePeriodHorizontal(img, w, h) {
        const lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const o = i * 4;
            lum[i] = 0.2126 * img.data[o] + 0.7152 * img.data[o + 1] + 0.0722 * img.data[o + 2];
        }
        const maxLag = Math.min(128, Math.floor(w / 2));
        const scores = new Float64Array(maxLag + 1);
        let bestLag = 0;
        let bestScore = -Infinity;
        for (let lag = 1; lag <= maxLag; lag++) {
            let score = 0;
            for (let y = 0; y < h; y++) {
                for (let x = lag; x < w; x++) {
                    const a = lum[y * w + x];
                    const b = lum[y * w + (x - lag)];
                    score += (1 - Math.abs(a - b) / 255);
                }
            }
            score -= lag * 0.001 * w * h;
            scores[lag] = score;
            if (score > bestScore) { bestScore = score; bestLag = lag; }
        }
        if (!bestLag) return null;
        const threshold = bestScore * 0.96;
        for (let lag = 1; lag <= maxLag; lag++) {
            if (scores[lag] >= threshold) return lag;
        }
        return bestLag;
    }
}

// Initialize the normalizer (tab elements exist in DOM already)
new PixelNormalizer().initialize();