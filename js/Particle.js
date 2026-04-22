export class Particle {
    constructor(x, y, vx, vy) {
        this.x  = x;
        this.y  = y;
        this.vx = vx;
        this.vy = vy;
        // opacity animation state
        this.alpha      = 1;         // current draw alpha (0–1)
        this.phase      = 'visible'; // 'visible'|'fading-out'|'invisible'|'fading-in'
        this.phaseTimer = 0;         // frames remaining in current phase
    }
}
