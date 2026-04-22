import { Particle } from './Particle.js';
import { hexToRgb } from './utils.js';

export function initParticles() {
    const canvas          = document.getElementById('particleCanvas');
    const widthInput      = document.getElementById('canvasWidth');
    const heightInput     = document.getElementById('canvasHeight');
    const scaleInput      = document.getElementById('canvasScale');
    const applyBtn        = document.getElementById('applyCanvasSize');
    const imageLoad       = document.getElementById('particleImageLoad');
    const imageNameDisplay = document.getElementById('particleImageName');
    const clearImageBtn   = document.getElementById('clearParticleImage');
    const colorRow        = document.getElementById('particleColorRow');
    const colorPicker     = document.getElementById('particleColor');
    const alphaSlider     = document.getElementById('particleAlpha');
    const alphaLabel      = document.getElementById('particleAlphaLabel');
    const originX         = document.getElementById('originX');
    const originY         = document.getElementById('originY');
    const originW         = document.getElementById('originW');
    const originH         = document.getElementById('originH');
    const particleCountInput = document.getElementById('particleCount');
    const spawnBtn        = document.getElementById('spawnParticles');

    let loadedImage = null;
    let particles   = [];

    // ── Drawing ──────────────────────────────────────────────────────────────

    function drawParticleSprite(ctx, x, y) {
        if (loadedImage) {
            ctx.drawImage(loadedImage, Math.round(x), Math.round(y));
        } else {
            const { r, g, b } = hexToRgb(colorPicker.value);
            const a = parseInt(alphaSlider.value, 10) / 255;
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
    }

    function drawOriginBox() {
        const ctx = canvas.getContext('2d');
        const x = parseFloat(originX.value) || 0;
        const y = parseFloat(originY.value) || 0;
        const w = Math.max(0, parseFloat(originW.value) || 0);
        const h = Math.max(0, parseFloat(originH.value) || 0);
        if (w === 0 && h === 0) return;
        const left = Math.round(x - w / 2);
        const top  = Math.round(y - h / 2);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, top + 0.5, w, h);
        ctx.restore();
    }

    function redraw() {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            drawParticleSprite(ctx, p.x, p.y);
        }
        drawOriginBox();
    }

    // ── Canvas size ───────────────────────────────────────────────────────────

    function applySize() {
        const w     = Math.max(1, parseInt(widthInput.value,  10) || 64);
        const h     = Math.max(1, parseInt(heightInput.value, 10) || 64);
        const scale = Math.max(1, parseInt(scaleInput.value,  10) || 8);
        widthInput.value  = w;
        heightInput.value = h;
        scaleInput.value  = scale;
        canvas.width  = w;
        canvas.height = h;
        canvas.style.width  = (w * scale) + 'px';
        canvas.style.height = (h * scale) + 'px';
        redraw();
    }

    // ── Spawning ──────────────────────────────────────────────────────────────

    function spawnParticles() {
        const count = Math.max(0, parseInt(particleCountInput.value, 10) || 0);
        const cx    = parseFloat(originX.value) || 0;
        const cy    = parseFloat(originY.value) || 0;
        const bw    = Math.max(0, parseFloat(originW.value) || 0);
        const bh    = Math.max(0, parseFloat(originH.value) || 0);
        const left  = cx - bw / 2;
        const top   = cy - bh / 2;
        particles = [];
        for (let i = 0; i < count; i++) {
            const px = bw > 0 ? left + Math.random() * bw : cx;
            const py = bh > 0 ? top  + Math.random() * bh : cy;
            particles.push(new Particle(px, py));
        }
        redraw();
    }

    // ── Image loading ─────────────────────────────────────────────────────────

    imageLoad.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        imageNameDisplay.textContent = file.name;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function () {
            loadedImage = img;
            URL.revokeObjectURL(url);
            colorRow.hidden     = true;
            clearImageBtn.hidden = false;
            redraw();
        };
        img.src = url;
    });

    clearImageBtn.addEventListener('click', function () {
        loadedImage = null;
        imageLoad.value = '';
        imageNameDisplay.textContent = 'No file chosen';
        clearImageBtn.hidden = true;
        colorRow.hidden      = false;
        redraw();
    });

    // ── Color / alpha ─────────────────────────────────────────────────────────

    colorPicker.addEventListener('input', () => { if (!loadedImage) redraw(); });

    alphaSlider.addEventListener('input', () => {
        alphaLabel.textContent = alphaSlider.value;
        if (!loadedImage) redraw();
    });

    // ── Origin box ────────────────────────────────────────────────────────────

    [originX, originY, originW, originH].forEach(input => {
        input.addEventListener('input', redraw);
    });

    // ── Spawn button ──────────────────────────────────────────────────────────

    spawnBtn.addEventListener('click', spawnParticles);

    // ── Canvas size ───────────────────────────────────────────────────────────

    applyBtn.addEventListener('click', applySize);

    // ── Background picker ─────────────────────────────────────────────────────

    const canvasWrap = canvas.closest('.particles-canvas-wrap');
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.bg-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            canvasWrap.className = 'particles-canvas-wrap particles-canvas-bg--' + this.dataset.bg;
        });
    });

    // ── Init ──────────────────────────────────────────────────────────────────

    applySize();
}
