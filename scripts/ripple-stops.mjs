// Prints the two radial-gradient stop lists used by .rim-glow__ripple.
// Source shader: color.rgb += 0.3 * sin(15τ) * exp(-8τ), τ = time since the wave reached the pixel,
// wave speed 2000 px/s. The gradient is that profile laid out behind the front (var(--rg-ripple-r)).
// Run: node scripts/ripple-stops.mjs, then paste the output into src/rim-glow.css.

const SPEED = 2000;
const FREQUENCY = 15;
const DECAY = 8;
const LIGHT_GAIN = 0.3;

const brightness = (tau) => LIGHT_GAIN * Math.sin(FREQUENCY * tau) * Math.exp(-DECAY * tau);

const halfPeriod = Math.PI / FREQUENCY;
const lightTaus = [halfPeriod, 0.19, 0.17, 0.15, 0.13, 0.11, 0.09, 0.072, 0.06, 0.045, 0.03, 0.018, 0.008, 0];
const shadeTaus = [2 * halfPeriod, 0.39, 0.36, 0.33, 0.305, 0.2815, 0.26, 0.235, halfPeriod];

const stops = (taus, rgb) =>
    taus
        .map((tau) => {
            const alpha = Math.abs(brightness(tau)).toFixed(4);
            const offset = (SPEED * tau).toFixed(1);
            const position = offset === "0.0" ? "var(--rg-ripple-r)" : `calc(var(--rg-ripple-r) - ${offset}px)`;
            return `        rgb(${rgb} / ${alpha}) ${position}`;
        })
        .join(",\n");

console.log("/* light */\n" + stops(lightTaus, "255 255 255"));
console.log("/* shade */\n" + stops(shadeTaus, "0 0 0"));
