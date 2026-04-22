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
    const spawnBtn         = document.getElementById('spawnParticles');
    const playBtn          = document.getElementById('playBtn');
    const stopBtn          = document.getElementById('stopBtn');
    const respawnCheck     = document.getElementById('respawnCheck');
    const randomizeCheck   = document.getElementById('randomizeCheck');
    const simFpsInput      = document.getElementById('simFps');
    const opacityAnimCheck = document.getElementById('opacityAnimCheck');
    const fadeInFrames     = document.getElementById('fadeInFrames');
    const visibleFrames    = document.getElementById('visibleFrames');
    const fadeOutFrames    = document.getElementById('fadeOutFrames');
    const invisibleFrames  = document.getElementById('invisibleFrames');
    const emitDirection   = document.getElementById('emitDirection');
    const emitSpread      = document.getElementById('emitSpread');
    const emitSpeedMin    = document.getElementById('emitSpeedMin');
    const emitSpeedMax    = document.getElementById('emitSpeedMax');
    const maskImageLoad   = document.getElementById('maskImageLoad');
    const maskImageName   = document.getElementById('maskImageName');
    const clearMaskBtn    = document.getElementById('clearMaskImage');
    const maskOptions     = document.getElementById('maskOptions');
    const maskPositionRow = document.getElementById('maskPositionRow');
    const showMaskCheck   = document.getElementById('showMaskCheck');
    const maskOffsetX     = document.getElementById('maskOffsetX');
    const maskOffsetY     = document.getElementById('maskOffsetY');

    let loadedImage   = null;
    let maskImage     = null;
    let particles     = [];
    let rafId         = null;
    let spawnSnapshot = [];
    let lastStepTime  = 0;

    // offscreen canvas used to apply the mask before compositing onto the main canvas
    const offscreen = document.createElement('canvas');
    const offscreenCtx = offscreen.getContext('2d');

    let maskOX = 0;
    let maskOY = 0;

    // ── Simulation loop ───────────────────────────────────────────────────────

    function computeVelocity() {
        const dirDeg    = parseFloat(emitDirection.value) || 0;
        const spreadDeg = Math.abs(parseFloat(emitSpread.value) || 0);
        const spdMin    = parseFloat(emitSpeedMin.value) || 0;
        const spdMax    = Math.max(spdMin, parseFloat(emitSpeedMax.value) || 0);
        const angleDeg  = dirDeg + (Math.random() - 0.5) * spreadDeg;
        const angleRad  = angleDeg * Math.PI / 180;
        const speed     = spdMin + Math.random() * (spdMax - spdMin);
        return { vx: Math.cos(angleRad) * speed, vy: Math.sin(angleRad) * speed };
    }

    function stepOpacity(p, fadeIn, visible, fadeOut, invisible) {
        const cycleDur = fadeIn + visible + fadeOut + invisible;
        if (cycleDur === 0) { p.alpha = 1; return; }
        p.phaseTimer--;
        if (p.phaseTimer > 0) {
            if      (p.phase === 'fading-in')  p.alpha = fadeIn  > 0 ? 1 - p.phaseTimer / fadeIn  : 1;
            else if (p.phase === 'fading-out') p.alpha = fadeOut > 0 ?     p.phaseTimer / fadeOut  : 0;
            return;
        }
        // advance to next phase
        if (p.phase === 'visible') {
            p.phase = 'fading-out'; p.phaseTimer = fadeOut; p.alpha = 1;
        } else if (p.phase === 'fading-out') {
            p.phase = 'invisible'; p.phaseTimer = invisible; p.alpha = 0;
        } else if (p.phase === 'invisible') {
            p.phase = 'fading-in'; p.phaseTimer = fadeIn; p.alpha = 0;
        } else { // fading-in
            p.phase = 'visible'; p.phaseTimer = visible; p.alpha = 1;
        }
    }

    function step(timestamp) {
        const fps      = Math.max(1, parseInt(simFpsInput.value, 10) || 12);
        const interval = 1000 / fps;
        if (timestamp - lastStepTime < interval) {
            rafId = requestAnimationFrame(step);
            return;
        }
        lastStepTime = timestamp;
        const doOpacity   = opacityAnimCheck.checked;
        const fadeIn   = Math.max(0, parseInt(fadeInFrames.value,    10) || 0);
        const visible  = Math.max(0, parseInt(visibleFrames.value,   10) || 0);
        const fadeOut  = Math.max(0, parseInt(fadeOutFrames.value,   10) || 0);
        const invisible= Math.max(0, parseInt(invisibleFrames.value, 10) || 0);
        const doRespawn   = respawnCheck.checked;
        const doRandomize = randomizeCheck.checked;
        const cx  = parseFloat(originX.value) || 0;
        const cy  = parseFloat(originY.value) || 0;
        const bw  = Math.max(0, parseFloat(originW.value) || 0);
        const bh  = Math.max(0, parseFloat(originH.value) || 0);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (doOpacity) stepOpacity(p, fadeIn, visible, fadeOut, invisible);
            if (doRespawn && (p.x < 0 || p.x >= canvas.width || p.y < 0 || p.y >= canvas.height)) {
                if (doRandomize) {
                    p.x = bw > 0 ? cx - bw / 2 + Math.random() * bw : cx;
                    p.y = bh > 0 ? cy - bh / 2 + Math.random() * bh : cy;
                } else {
                    const snap = spawnSnapshot[i];
                    p.x = snap.x;
                    p.y = snap.y;
                }
                const vel = computeVelocity();
                p.vx = vel.vx;
                p.vy = vel.vy;
            }
        }
        redraw();
        rafId = requestAnimationFrame(step);
    }

    function play() {
        if (rafId !== null) return;
        for (const p of particles) {
            const vel = computeVelocity();
            p.vx = vel.vx;
            p.vy = vel.vy;
            // randomise starting phase so particles don't all pulse in sync
            const fadeIn   = Math.max(0, parseInt(fadeInFrames.value,    10) || 0);
            const visible  = Math.max(0, parseInt(visibleFrames.value,   10) || 0);
            const fadeOut  = Math.max(0, parseInt(fadeOutFrames.value,   10) || 0);
            const invisible= Math.max(0, parseInt(invisibleFrames.value, 10) || 0);
            const cycleDur = fadeIn + visible + fadeOut + invisible;
            if (opacityAnimCheck.checked && cycleDur > 0) {
                const offset = Math.floor(Math.random() * cycleDur);
                if (offset < fadeIn) {
                    p.phase = 'fading-in';  p.phaseTimer = fadeIn  - offset; p.alpha = fadeIn > 0 ? 1 - (fadeIn - offset) / fadeIn : 1;
                } else if (offset < fadeIn + visible) {
                    p.phase = 'visible';    p.phaseTimer = fadeIn + visible - offset; p.alpha = 1;
                } else if (offset < fadeIn + visible + fadeOut) {
                    const rem = fadeIn + visible + fadeOut - offset;
                    p.phase = 'fading-out'; p.phaseTimer = rem; p.alpha = fadeOut > 0 ? rem / fadeOut : 0;
                } else {
                    p.phase = 'invisible';  p.phaseTimer = cycleDur - offset; p.alpha = 0;
                }
            } else {
                p.alpha = 1; p.phase = 'visible'; p.phaseTimer = 0;
            }
        }
        rafId = requestAnimationFrame(step);
        playBtn.disabled = true;
        stopBtn.disabled = false;
    }

    function stopSim() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        particles = spawnSnapshot.map(p => new Particle(p.x, p.y, p.vx, p.vy));
        redraw();
        playBtn.disabled = false;
        stopBtn.disabled = true;
    }

    // ── Drawing ──────────────────────────────────────────────────────────────

    function drawParticleSprite(ctx, x, y, alpha) {
        ctx.save();
        ctx.globalAlpha *= alpha;
        if (loadedImage) {
            ctx.drawImage(loadedImage, Math.round(x), Math.round(y));
        } else {
            const { r, g, b } = hexToRgb(colorPicker.value);
            const a = parseInt(alphaSlider.value, 10) / 255;
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
        ctx.restore();
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

        if (maskImage) {
            // Draw particles onto the offscreen canvas
            offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height);
            for (const p of particles) {
                drawParticleSprite(offscreenCtx, p.x, p.y, p.alpha);
            }
            // Clip particles by the mask alpha (multiplicative transparency)
            offscreenCtx.globalCompositeOperation = 'destination-in';
            offscreenCtx.drawImage(maskImage, maskOX, maskOY);
            offscreenCtx.globalCompositeOperation = 'source-over';
            // Composite masked particles onto the main canvas
            ctx.drawImage(offscreen, 0, 0);
            // Optionally show the mask at 50% opacity for reference
            if (showMaskCheck.checked) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.drawImage(maskImage, maskOX, maskOY);
                ctx.restore();
            }
        } else {
            for (const p of particles) {
                drawParticleSprite(ctx, p.x, p.y, p.alpha);
            }
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
        offscreen.width  = w;
        offscreen.height = h;
        redraw();
    }

    // ── Spawning ──────────────────────────────────────────────────────────────

    function spawnParticles() {
        const count   = Math.max(0, parseInt(particleCountInput.value, 10) || 0);
        const cx      = parseFloat(originX.value) || 0;
        const cy      = parseFloat(originY.value) || 0;
        const bw      = Math.max(0, parseFloat(originW.value) || 0);
        const bh      = Math.max(0, parseFloat(originH.value) || 0);
        const left    = cx - bw / 2;
        const top     = cy - bh / 2;
        particles = [];
        for (let i = 0; i < count; i++) {
            const px = bw > 0 ? left + Math.random() * bw : cx;
            const py = bh > 0 ? top  + Math.random() * bh : cy;
            particles.push(new Particle(px, py, 0, 0));
        }
        spawnSnapshot = particles.map(p => new Particle(p.x, p.y, 0, 0));
        stopSim();
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

    // ── Mask image loading ────────────────────────────────────────────────────

    maskImageLoad.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        maskImageName.textContent = file.name;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function () {
            maskImage = img;
            URL.revokeObjectURL(url);
            clearMaskBtn.hidden   = false;
            maskOptions.hidden    = false;
            maskPositionRow.hidden = false;
            redraw();
        };
        img.src = url;
    });

    clearMaskBtn.addEventListener('click', function () {
        maskImage = null;
        maskImageLoad.value = '';
        maskImageName.textContent = 'No file chosen';
        clearMaskBtn.hidden    = true;
        maskOptions.hidden     = true;
        maskPositionRow.hidden = true;
        showMaskCheck.checked  = false;
        redraw();
    });

    showMaskCheck.addEventListener('change', redraw);

    [maskOffsetX, maskOffsetY].forEach(input => {
        input.addEventListener('input', () => {
            maskOX = parseInt(maskOffsetX.value, 10) || 0;
            maskOY = parseInt(maskOffsetY.value, 10) || 0;
            redraw();
        });
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

    playBtn.addEventListener('click', play);
    stopBtn.addEventListener('click', stopSim);

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
