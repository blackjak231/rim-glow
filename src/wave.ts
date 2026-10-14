/** Options of a lens wave (SVG distortion). */
export interface WaveOptions {
    /** Scales the shift: 1 = the source, 12 px at most. */
    strength: number;
    /** Scales the wave speed, 2000 px/s in the source. */
    speedFactor: number;
    /** Radius of the pressed area, in px: it starts moving at once and the wave leaves from its edge. */
    press: number;
}

/**
 * The source curve sin(15τ)·exp(-8τ) at `distance` px from the press, `elapsed` s after it, for a
 * finger of radius `press` instead of a point: the whole pressed disc starts at once, and the
 * shift fades to zero toward its center, where its direction flips (a point press pinches there,
 * like a needle). Within ±0.5.
 */
export function pressedCurve(elapsed: number, distance: number, speed: number, press: number): number {
    const tau = elapsed - Math.max(0, distance - press) / speed;

    if (tau <= 0) {
        return 0;
    }

    const softness = press > 0 ? distance ** 2 / (distance ** 2 + (press / 2) ** 2) : 1;

    return Math.sin(15 * tau) * Math.exp(-8 * tau) * softness;
}
