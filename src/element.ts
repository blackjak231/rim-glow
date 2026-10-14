import css from "./rim-glow.css?inline";
import { SvgDistortion } from "./distortion";
import { rimGlowMarkup } from "./markup";

export type RippleMode = "toggle" | "activate" | "press" | "none";

/** Color themes defined in rim-glow.css. Without a theme, the source colors (iOS system colors). */
export const RIM_GLOW_THEMES = ["aurora", "sunset", "ocean", "neon", "ember", "pastel", "mono"] as const;

export type RimGlowTheme = (typeof RIM_GLOW_THEMES)[number];

export interface PointLike {
    clientX: number;
    clientY: number;
}

interface Press extends PointLike {
    time: number;
}

/** Default distortion strength, as --rim-glow-distort in rim-glow.css (1 = the source). */
const DEFAULT_DISTORT_STRENGTH = 0.7;

/** Radius of the pressed area of a wave, in px, as --rim-glow-press-size in rim-glow.css. */
const DEFAULT_PRESS_SIZE = 100;

/** A toggle this close to the last click (or press) comes from it. */
const TRIGGER_WINDOW_MS = 100;
/** A press held longer than this is not the start of that click. */
const MAX_PRESS_LEAD_MS = 500;

/**
 * How the wave moves the content, as the source shader does (12 * sin(15τ) * exp(-8τ) px along
 * the line from the press):
 * - svg: any HTML content, through an SVG filter; follows the wave front, but moves in pixel steps.
 * - css: the content scales toward the press point with the same time curve; smooth, all at once.
 */
export type DistortStyle = "svg" | "css";

/**
 * The two pairs of clocks of rim-glow.css: their keyframes, the attribute and the CSS variable
 * that set their pace, and the default pace (the source runs at 1).
 */
const CLOCKS = [
    { animations: ["rg-clock-base", "rg-clock-boost"], attribute: "gradient-speed", variable: "--rim-glow-gradient-speed", fallback: 0.8 },
    { animations: ["rg-blob-base", "rg-blob-boost"], attribute: "blob-speed", variable: "--rim-glow-blob-speed", fallback: 0.7 },
];

const HOST_CSS = ":host{display:block}:host([hidden]){display:none}.rim-glow{height:100%;border-radius:inherit}";

/** Shadow trees ignore @property: the same registrations as rim-glow.css, made from script. */
const PROPERTIES: PropertyDefinition[] = [
    { name: "--rg-time-base", syntax: "<number>", inherits: true, initialValue: "0" },
    { name: "--rg-time-boost", syntax: "<number>", inherits: true, initialValue: "0" },
    { name: "--rg-blob-base", syntax: "<number>", inherits: true, initialValue: "0" },
    { name: "--rg-blob-boost", syntax: "<number>", inherits: true, initialValue: "0" },
    { name: "--rg-scale", syntax: "<number>", inherits: true, initialValue: "1.2" },
    { name: "--rg-blur", syntax: "<length>", inherits: true, initialValue: "8px" },
    { name: "--rg-mesh-opacity", syntax: "<number>", inherits: true, initialValue: "0" },
    { name: "--rg-ripple-r", syntax: "<length>", inherits: true, initialValue: "0px" },
    { name: "--rg-flow-angle", syntax: "<angle>", inherits: false, initialValue: "0deg" },
];

const KEYWORDS: Record<string, string> = { left: "0%", top: "0%", center: "50%", right: "100%", bottom: "100%" };

let lastPress: Press | null = null;
let lastClickTime = -Infinity;
let listening = false;

function rememberPresses(): void {
    if (listening) {
        return;
    }

    listening = true;
    const options = { capture: true, passive: true };
    window.addEventListener(
        "pointerdown",
        (event) => {
            lastPress = { clientX: event.clientX, clientY: event.clientY, time: performance.now() };
        },
        options,
    );
    window.addEventListener("click", () => (lastClickTime = performance.now()), options);
}

/**
 * The press that caused a toggle happening now, if any: the toggle follows a click (or the press
 * itself) by less than TRIGGER_WINDOW_MS, and that click follows the press. A keyboard click has
 * no press before it, so it returns null.
 */
function pressBehindToggle(): Press | null {
    const now = performance.now();

    if (lastPress === null) {
        return null;
    }

    const fromClick =
        now - lastClickTime < TRIGGER_WINDOW_MS &&
        lastClickTime >= lastPress.time &&
        lastClickTime - lastPress.time < MAX_PRESS_LEAD_MS;

    return fromClick || now - lastPress.time < TRIGGER_WINDOW_MS ? lastPress : null;
}

function isOn(value: string | null): boolean {
    return value !== null && value !== "false";
}

function toPixels(token: string, size: number): number {
    const value = KEYWORDS[token] ?? token;

    return value.endsWith("%") ? (parseFloat(value) / 100) * size : parseFloat(value);
}

const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

/**
 * `<rim-glow>`: the animated edge glow, drawn over its own content (or over the viewport with
 * `fixed`). Owns the wave triggers, the clocks across activations, the distortion drivers and the
 * optional background image; the look itself lives in rim-glow.css, which also works without this
 * element.
 *
 * Attributes: `active`, `fixed`, `ripple` (toggle | activate | press | none, default toggle),
 * `ripple-origin` (pointer, or a CSS position such as "50% 100%"), `distort` (svg by default,
 * css or none),
 * `image` (background image URL, drawn under the content), `blob` ("original": the source's
 * regular blob; by default the blob keeps changing shape, same amplitude and pace), `flow`
 * (clockwise | counterclockwise: the colors travel around the edges, off by default), `gradient-speed` and `blob-speed` (paces of the gradient and of the blob, 1 = source,
 * 0.8 and 0.7 by default), `theme` (one of RIM_GLOW_THEMES, default = source colors).
 */
export class RimGlowElement extends Base {
    static observedAttributes = ["active", "fixed", "gradient-speed", "blob-speed", "theme", "distort", "image", "blob", "flow"];

    readonly #root: HTMLElement;
    readonly #glow: HTMLElement;
    readonly #content: HTMLElement;
    #svg: SvgDistortion | null = null;
    #imageLayer: HTMLElement | null = null;
    #flip = false;
    #connected = false;
    /** Active time before the current activation, for the clock that only runs while active. */
    #activeMs = 0;
    #activatedAt = 0;
    /**
     * Random head start of this element's clocks, so several glows on a page never move in sync
     * (same pace, different gradient and blob at any moment).
     */
    readonly #baseOffsetMs = Math.random() * 3_600_000;
    readonly #boostOffsetMs = Math.random() * 3_600_000;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `<style>${css}${HOST_CSS}</style>${rimGlowMarkup("<slot></slot>")}`;
        this.#root = shadow.querySelector<HTMLElement>(".rim-glow")!;
        this.#glow = shadow.querySelector<HTMLElement>(".rim-glow__glow")!;
        this.#content = shadow.querySelector<HTMLElement>(".rim-glow__content")!;
        this.#root.dataset.ripple = "manual";
        this.#root.dataset.distort = "svg";
    }

    get active(): boolean {
        return isOn(this.getAttribute("active"));
    }

    set active(value: boolean) {
        this.toggleAttribute("active", Boolean(value));
    }

    /** The distortion style: svg by default, null with distort="none" (or "false"). */
    get distortStyle(): DistortStyle | null {
        const style = this.getAttribute("distort");

        if (style === "false" || style === "none") {
            return null;
        }

        return style === "css" ? style : "svg";
    }

    get rippleMode(): RippleMode {
        const mode = this.getAttribute("ripple");

        return mode === "activate" || mode === "press" || mode === "none" ? mode : "toggle";
    }

    connectedCallback(): void {
        // A framework may have set the property before the element was defined: an own property
        // then hides the setter.
        if (Object.prototype.hasOwnProperty.call(this, "active")) {
            const value = (this as { active?: boolean }).active;
            delete (this as { active?: boolean }).active;
            this.active = Boolean(value);
        }

        this.#connected = true;
        rememberPresses();
        window.addEventListener("pointerdown", this.#onPress, { capture: true, passive: true });
        this.#syncImage();
    }

    disconnectedCallback(): void {
        this.#connected = false;
        window.removeEventListener("pointerdown", this.#onPress, { capture: true });
        this.#svg?.stop();
    }

    attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
        if (name === "theme") {
            if (value === null || value === "") {
                delete this.#root.dataset.theme;
            } else {
                this.#root.dataset.theme = value;
            }
            return;
        }

        if (name === "distort") {
            this.#root.dataset.distort = this.distortStyle ?? "";
            if (this.distortStyle !== "svg") {
                this.#svg?.stop();
            }
            this.#syncImage();
            return;
        }

        if (name === "image") {
            this.#syncImage();
            return;
        }

        if (name === "flow") {
            this.#root.dataset.flow = value ?? "";
            return;
        }

        if (name === "blob") {
            this.#root.dataset.blob = value ?? "";
            return;
        }

        if (name === "gradient-speed" || name === "blob-speed") {
            this.#applySpeed();
            return;
        }

        if (name === "fixed") {
            this.#root.toggleAttribute("data-fixed", isOn(value));
            return;
        }

        const wasActive = isOn(previous);
        const active = isOn(value);

        if (wasActive === active) {
            return;
        }

        this.#resumeClocks(active);
        this.#root.toggleAttribute("data-active", active);
        this.#applySpeed();

        if (!this.#connected) {
            return;
        }

        const mode = this.rippleMode;

        if (mode === "toggle" || (mode === "activate" && active)) {
            const press = pressBehindToggle();
            this.#play(press ?? undefined, press === null ? 0 : performance.now() - press.time);
        }
    }

    /**
     * Plays the light wave (and the distortion with `distort`). The wave starts from `point`
     * (viewport coordinates, a PointerEvent works), unless `ripple-origin` sets a fixed position;
     * without either, from the center.
     */
    ripple(point?: PointLike): void {
        this.#play(point, 0);
    }

    #onPress = (event: PointerEvent): void => {
        if (this.rippleMode !== "press") {
            return;
        }

        if (this.#root.hasAttribute("data-fixed") || event.composedPath().includes(this)) {
            this.#play(event, 0);
        }
    };

    /**
     * The glow is display: none while inactive, which restarts its CSS clocks. Negative delays
     * carry them on as in the source: one counts since page load, the other only while active,
     * each from this element's own random head start.
     */
    #resumeClocks(active: boolean): void {
        const now = performance.now();

        if (!active) {
            this.#activeMs += now - this.#activatedAt;
            return;
        }

        this.#activatedAt = now;
        this.#root.style.setProperty("--rg-clock-base-delay", `${-(now + this.#baseOffsetMs)}ms`);
        this.#root.style.setProperty("--rg-clock-boost-delay", `${-(this.#activeMs + this.#boostOffsetMs)}ms`);
    }

    /**
     * `gradient-speed` and `blob-speed` change the playback rate of their clocks rather than their
     * duration, so the gradient and the blob keep their position and only change pace. They are
     * absolute: the rate is relative to the pace the CSS already applies (the CSS variable, or its
     * default). The glow's animations are new after each activation (display: none cancels them),
     * hence the call on every toggle.
     */
    #applySpeed(): void {
        const computed = getComputedStyle(this);

        for (const clock of CLOCKS) {
            const cssSpeed = parseFloat(computed.getPropertyValue(clock.variable));
            const base = cssSpeed > 0 ? cssSpeed : clock.fallback;
            const speed = parseFloat(this.getAttribute(clock.attribute) ?? "");
            const rate = Number.isFinite(speed) && speed >= 0 ? speed / base : 1;

            for (const animation of this.#glow.getAnimations()) {
                if (animation instanceof CSSAnimation && clock.animations.includes(animation.animationName) && animation.playbackRate !== rate) {
                    animation.updatePlaybackRate(rate);
                }
            }
        }
    }

    #play(point: PointLike | undefined, leadMs: number): void {
        const lead = Math.min(Math.max(leadMs, 0), MAX_PRESS_LEAD_MS);
        const box = this.#root.getBoundingClientRect();
        const [x, y] = this.#origin(box, point);

        this.#root.style.setProperty("--rim-glow-ripple-x", `${x}px`);
        this.#root.style.setProperty("--rim-glow-ripple-y", `${y}px`);
        this.#root.style.setProperty("--rg-ripple-delay", `${-lead}ms`);
        this.#flip = !this.#flip;
        this.#root.dataset.rippling = this.#flip ? "a" : "b";

        const style = this.distortStyle;

        if (style === null || style === "css" || this.#root.hasAttribute("data-fixed")) {
            return;
        }

        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const computed = getComputedStyle(this);
        const strength = parseFloat(computed.getPropertyValue("--rim-glow-distort"));
        const speedFactor = parseFloat(computed.getPropertyValue("--rim-glow-ripple-speed"));
        const press = parseFloat(computed.getPropertyValue("--rim-glow-press-size"));
        const options = {
            strength: Number.isFinite(strength) ? strength : DEFAULT_DISTORT_STRENGTH,
            speedFactor: speedFactor > 0 ? speedFactor : 1,
            press: press >= 0 ? press : DEFAULT_PRESS_SIZE,
        };

        if (this.#svg === null) {
            this.#svg = new SvgDistortion(this.#content);
            this.shadowRoot!.append(this.#svg.svg);
        }

        this.#svg.play(x, y, lead, options);
    }

    /** Keeps the image layer (a CSS background under the content) in line with `image`. */
    #syncImage(): void {
        const source = this.getAttribute("image");

        if (source === null || source === "") {
            this.#imageLayer?.remove();
            this.#imageLayer = null;
            this.#root.style.removeProperty("--rg-image");
            return;
        }

        if (this.#imageLayer === null) {
            this.#imageLayer = document.createElement("div");
            this.#imageLayer.className = "rim-glow__image";
            this.#content.prepend(this.#imageLayer);
        }

        this.#root.style.setProperty("--rg-image", `url(${JSON.stringify(source)})`);
    }

    #origin(box: DOMRect, point: PointLike | undefined): [number, number] {
        const fixedOrigin = this.getAttribute("ripple-origin");

        if (fixedOrigin !== null && fixedOrigin.trim() !== "" && fixedOrigin !== "pointer") {
            let [first, second = "center"] = fixedOrigin.trim().split(/\s+/);

            if (first === "top" || first === "bottom" || second === "left" || second === "right") {
                [first, second] = [second, first];
            }

            return [toPixels(first, box.width), toPixels(second, box.height)];
        }

        if (point !== undefined) {
            return [point.clientX - box.left, point.clientY - box.top];
        }

        return [box.width / 2, box.height / 2];
    }
}

/**
 * Registers the custom properties and defines `<rim-glow>` (or `tagName`). Safe to call several
 * times, during server rendering and in DOM emulators without CSS support, where it does nothing.
 */
export function defineRimGlow(tagName = "rim-glow"): void {
    if (typeof window === "undefined" || typeof customElements === "undefined") {
        return;
    }

    if (typeof CSS !== "undefined" && "registerProperty" in CSS) {
        for (const property of PROPERTIES) {
            try {
                CSS.registerProperty(property);
            } catch (error) {
                // Already registered, by an earlier call or by rim-glow.css loaded in the page.
                if (!(error instanceof DOMException && error.name === "InvalidModificationError")) {
                    throw error;
                }
            }
        }
    }

    if (customElements.get(tagName) === undefined) {
        customElements.define(tagName, class extends RimGlowElement {});
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "rim-glow": RimGlowElement;
    }
}
