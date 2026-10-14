import { pressedCurve, type WaveOptions } from "./wave";

const SVG_NS = "http://www.w3.org/2000/svg";

const BASE_SPEED = 2000;
const AMPLITUDE = 12;
const MAX_DURATION = 3;
/** Past this delay behind the wave, the shift stays under 0.05 px. */
const TAIL = 0.7;
const TABLE_SIZE = 128;
const FIELD_SIZE = 512;
/**
 * The filter keeps its default region, 10 % beyond the target on each side: Safari crops a
 * userSpaceOnUse region set on a shadow host.
 */
const REGION_MARGIN = 0.1;

let nextId = 0;
let field: Promise<string> | null = null;

/**
 * Field image shared by every instance, a disc of radius 1 around the origin, decoded before use
 * (an undecoded feImage reads as transparent, which shifts the whole target).
 * R/G = 0.5 + 0.5 * unit vector away from the center, B = distance / radius.
 */
function fieldImage(): Promise<string> {
    if (field !== null) {
        return field;
    }

    const canvas = document.createElement("canvas");
    canvas.width = FIELD_SIZE;
    canvas.height = FIELD_SIZE;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(FIELD_SIZE, FIELD_SIZE);
    const half = FIELD_SIZE / 2;

    for (let row = 0; row < FIELD_SIZE; row++) {
        const dy = (row + 0.5 - half) / half;

        for (let column = 0; column < FIELD_SIZE; column++) {
            const dx = (column + 0.5 - half) / half;
            const distance = Math.hypot(dx, dy);
            const offset = (row * FIELD_SIZE + column) * 4;

            image.data[offset] = Math.round((0.5 + dx / distance / 2) * 255);
            image.data[offset + 1] = Math.round((0.5 + dy / distance / 2) * 255);
            image.data[offset + 2] = Math.round(Math.min(distance, 1) * 255);
            image.data[offset + 3] = 255;
        }
    }

    context.putImageData(image, 0, 0);
    const url = canvas.toDataURL();
    const decoder = new Image();
    decoder.src = url;
    field = decoder.decode().then(() => url);

    return field;
}

/**
 * Lens part of the source ripple shader for any HTML content: every pixel is moved along the line
 * from the origin by 12 * sin(15τ) * exp(-8τ) px, through an SVG filter (feDisplacementMap).
 * Browsers move pixels by whole device pixels here, so the motion advances in steps.
 *
 * The map is built inside the filter: the field image (direction in R/G, distance in B), a
 * per-frame lookup table turning distance into shift, then an arithmetic composite.
 */
export class SvgDistortion {
    readonly svg: SVGSVGElement;

    readonly #target: HTMLElement;
    readonly #filterId = `rim-glow-distortion-${nextId++}`;
    readonly #field: SVGFEImageElement;
    readonly #map: SVGFEDisplacementMapElement;
    readonly #tables: SVGComponentTransferFunctionElement[];
    #frame = 0;
    #run = 0;

    constructor(target: HTMLElement) {
        this.#target = target;
        this.svg = document.createElementNS(SVG_NS, "svg");
        this.svg.setAttribute("aria-hidden", "true");
        this.svg.setAttribute("width", "0");
        this.svg.setAttribute("height", "0");
        this.svg.style.position = "absolute";
        this.svg.innerHTML = `<filter id="${this.#filterId}" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feImage result="field" preserveAspectRatio="none"/>
<feColorMatrix in="field" type="matrix" values="0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  0 0 0 0 1" result="distance"/>
<feComponentTransfer in="distance" result="shift"><feFuncR type="table"/><feFuncG type="table"/></feComponentTransfer>
<feComposite in="field" in2="shift" operator="arithmetic" k1="2" k2="-1" k3="-1" k4="1" result="map"/>
<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;
        this.#field = this.svg.querySelector("feImage")!;
        this.#map = this.svg.querySelector("feDisplacementMap")!;
        this.#tables = [...this.svg.querySelectorAll<SVGComponentTransferFunctionElement>("feFuncR, feFuncG")];
        // Prepared now so the first wave does not appear mid-way once the image has decoded.
        void fieldImage().then((url) => this.#field.setAttribute("href", url));
    }

    /**
     * Starts the lens wave from (x, y), in px from the target's top-left corner (outside the box
     * works), as if it had started `leadMs` earlier. Applies a CSS filter to the target until the
     * wave has left it. See WaveOptions for the strength, speed and pressed area.
     */
    play(x: number, y: number, leadMs: number, { strength, speedFactor, press }: WaveOptions): void {
        const width = this.#target.offsetWidth;
        const height = this.#target.offsetHeight;

        if (width === 0 || height === 0 || strength <= 0) {
            return;
        }

        const speed = BASE_SPEED * speedFactor;
        const start = performance.now() - leadMs;
        const radius = Math.hypot(
            Math.max(x, width - x) + width * REGION_MARGIN,
            Math.max(y, height - y) + height * REGION_MARGIN,
        );
        const end = Math.min(MAX_DURATION / speedFactor, Math.max(0, radius - press) / speed + TAIL);
        const run = ++this.#run;

        fieldImage().then((url) => {
            if (run !== this.#run) {
                return;
            }

            this.#field.setAttribute("href", url);
            // The table holds the pressed curve (within ±0.5) mapped to [0, 1]; the composite turns
            // it into 0.5 + curve / 2 along the direction, and feDisplacementMap applies
            // scale * (map - 0.5): scale = 2 * amplitude gives amplitude * curve.
            this.#map.setAttribute("scale", String(2 * AMPLITUDE * strength));
            this.#setBox(this.#field, x - radius, y - radius, radius * 2, radius * 2);

            const tick = (now: number): void => {
                const elapsed = (now - start) / 1000;

                if (elapsed >= end) {
                    this.stop();
                    return;
                }

                this.#writeTable(elapsed, radius, speed, press);
                this.#frame = requestAnimationFrame(tick);
            };

            cancelAnimationFrame(this.#frame);
            this.#writeTable(Math.max(0, (performance.now() - start) / 1000), radius, speed, press);
            this.#target.style.filter = `url(#${this.#filterId})`;
            this.#frame = requestAnimationFrame(tick);
        });
    }

    /** Removes the filter from the target and stops the frame loop. */
    stop(): void {
        this.#run++;
        cancelAnimationFrame(this.#frame);
        this.#target.style.filter = "";
    }

    /** The pressed curve (within ±0.5) mapped to [0, 1], per distance. */
    #writeTable(elapsed: number, radius: number, speed: number, press: number): void {
        const values: string[] = [];

        for (let index = 0; index < TABLE_SIZE; index++) {
            const shift = pressedCurve(elapsed, (index / (TABLE_SIZE - 1)) * radius, speed, press);
            values.push((0.5 + shift / 2).toFixed(4));
        }

        const table = values.join(" ");

        for (const func of this.#tables) {
            func.setAttribute("tableValues", table);
        }
    }

    #setBox(element: Element, x: number, y: number, width: number, height: number): void {
        element.setAttribute("x", String(x));
        element.setAttribute("y", String(y));
        element.setAttribute("width", String(width));
        element.setAttribute("height", String(height));
    }
}
