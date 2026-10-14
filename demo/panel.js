// Every example card: they share the settings, each keeps its own animation.
const glows = [...document.querySelectorAll("rim-glow.demo-card")];
const STORAGE_KEY = "rim-glow-demo-v16";

// Positions in the 3x3 mesh, in the source order. The labels say where each color shows.
const COLORS = [
    ["yellow", "Top left corner"],
    ["purple", "Top"],
    ["indigo", "Top right corner"],
    ["orange", "Left"],
    ["red", "Center"],
    ["blue", "Right"],
    ["indigo-2", "Bottom left corner"],
    ["green", "Bottom"],
    ["mint", "Bottom right corner"],
];

const THEMES = [
    ["", "Original"],
    ["aurora", "Aurora"],
    ["sunset", "Sunset"],
    ["ocean", "Ocean"],
    ["neon", "Neon"],
    ["ember", "Ember"],
    ["pastel", "Pastel"],
    ["mono", "White"],
];

const probe = document.createElement("rim-glow");
probe.hidden = true;
document.body.append(probe);
const themeCache = new Map();

/** The nine colors of a theme, read from the library's own CSS so the demo never drifts from it. */
function themeColors(theme) {
    if (!themeCache.has(theme)) {
        probe.setAttribute("theme", theme);
        const style = getComputedStyle(probe.shadowRoot.querySelector(".rim-glow"));
        themeCache.set(theme, Object.fromEntries(COLORS.map(([name]) => [name, style.getPropertyValue(`--rg-${name}`).trim()])));
    }

    return themeCache.get(theme);
}

/** What to know about each distortion style, shown behind the "i" next to its select. */
const DISTORT_NOTES = {
    svg: [
        "Works in Chrome, Edge, Safari and Firefox, which all support SVG filters on HTML. Smooth in Chrome and Edge; less smooth in Firefox.",
        "Pixels move in whole-pixel steps, so fine lines can look slightly jagged while the wave passes.",
        "During the wave (under a second), the content gets a CSS filter: position: fixed elements inside it are placed relative to the card, and anything overflowing it by more than 10 % is clipped.",
        "Costs more on phones and in Safari, where filters run on the CPU. Skipped in fixed mode and with reduced motion.",
    ],
    css: [
        "Works in every browser and stays smooth: the content scales toward the press point.",
        "The whole content moves at once instead of following the wave front. During the bounce, position: fixed elements inside are placed relative to the card.",
    ],
    none: ["No distortion: the wave is only light."],
};

const SECTIONS = [
    {
        title: "State",
        fields: [
            { key: "active", label: "All glows active", type: "toggle", value: false, kind: "active", keep: false },
        ],
    },
    {
        title: "Motion",
        fields: [
            { key: "gradientSpeed", label: "Gradient speed", type: "range", min: 0, max: 4, step: 0.05, value: 0.8, unit: "×", kind: "attr", attr: "gradient-speed" },
            { key: "blobSpeed", label: "Blob speed", type: "range", min: 0, max: 4, step: 0.05, value: 0.7, unit: "×", kind: "attr", attr: "blob-speed" },
            { key: "wobble", label: "Blob amplitude", type: "range", min: 0, max: 40, step: 1, value: 8, unit: "px", kind: "var", name: "--rim-glow-wobble" },
            { key: "blur", label: "Glow thickness (blur)", type: "range", min: 0, max: 80, step: 1, value: 28, unit: "px", kind: "var", name: "--rim-glow-blur" },
            { key: "duration", label: "Fade-in duration", type: "range", min: 0.1, max: 3, step: 0.05, value: 0.9, unit: "s", kind: "var", name: "--rim-glow-duration" },
            { key: "blob", label: "Organic blob (keeps changing shape)", type: "toggle", value: true, kind: "blob" },
            { key: "organic", label: "Organic drift", type: "range", min: 0, max: 2, step: 0.05, value: 1, unit: "×", kind: "var", name: "--rim-glow-organic", showIf: (state) => state.blob },
            {
                key: "flow",
                label: "Color flow around the edges",
                type: "select",
                options: [
                    ["off", "Off (original)"],
                    ["clockwise", "Clockwise"],
                    ["counterclockwise", "Counterclockwise"],
                ],
                value: "off",
                kind: "flow",
            },
            { key: "flowDuration", label: "Time per turn", type: "range", min: 2, max: 40, step: 0.5, value: 12, unit: "s", kind: "var", name: "--rim-glow-flow-duration", showIf: (state) => state.flow !== "off" },
            { key: "flowMix", label: "Flow over the mesh", type: "range", min: 0, max: 1, step: 0.05, value: 1, unit: "", kind: "var", name: "--rim-glow-flow-mix", showIf: (state) => state.flow !== "off" },
            {
                key: "easing",
                label: "Fade-in easing",
                type: "select",
                options: [
                    ["cubic-bezier(0.42, 0, 0.58, 1)", "Ease in out (original)"],
                    ["linear", "Linear"],
                    ["cubic-bezier(0, 0, 0.58, 1)", "Ease out"],
                    ["cubic-bezier(0.34, 1.56, 0.64, 1)", "Overshoot"],
                ],
                value: "cubic-bezier(0.42, 0, 0.58, 1)",
                kind: "var",
                name: "--rim-glow-easing",
            },
        ],
    },
    {
        title: "Wave",
        fields: [
            {
                key: "ripple",
                label: "Trigger",
                type: "select",
                options: [
                    ["press", "On every press (original)"],
                    ["toggle", "On every activation and deactivation"],
                    ["activate", "On activation only"],
                    ["none", "Never"],
                ],
                value: "toggle",
                kind: "attr",
                attr: "ripple",
            },
            {
                key: "origin",
                label: "Origin",
                type: "select",
                options: [
                    ["pointer", "Pointer position"],
                    ["fixed", "Fixed position"],
                ],
                value: "pointer",
                kind: "origin",
            },
            { key: "originX", label: "Origin X", type: "range", min: 0, max: 100, step: 1, value: 50, unit: "%", kind: "origin", showIf: (state) => state.origin === "fixed" },
            { key: "originY", label: "Origin Y", type: "range", min: 0, max: 100, step: 1, value: 85, unit: "%", kind: "origin", showIf: (state) => state.origin === "fixed" },
            { key: "pressSize", label: "Press size (finger radius)", type: "range", min: 0, max: 150, step: 1, value: 100, unit: "px", kind: "var", name: "--rim-glow-press-size" },
            { key: "rippleSpeed", label: "Wave speed", type: "range", min: 0.25, max: 3, step: 0.05, value: 1, unit: "×", kind: "var", name: "--rim-glow-ripple-speed" },
            { key: "rippleIntensity", label: "Light intensity", type: "range", min: 0, max: 1, step: 0.05, value: 1, unit: "", kind: "var", name: "--rim-glow-ripple-intensity" },
            {
                key: "distort",
                label: "Distortion style",
                type: "select",
                options: [
                    ["none", "None"],
                    ["svg", "SVG filter (any content, follows the wave)"],
                    ["css", "CSS scale (any content, smooth)"],
                ],
                value: "svg",
                kind: "distort",
                info: (state) => DISTORT_NOTES[state.distort],
                warn: (state) => state.distort === "svg",
            },
            { key: "distortStrength", label: "Distortion strength", type: "range", min: 0, max: 3, step: 0.05, value: 0.7, unit: "×", kind: "var", name: "--rim-glow-distort", showIf: (state) => state.distort !== "none" },
            { key: "fire", label: "Play a wave on every card", type: "button", action: () => glows.forEach((glow) => glow.ripple()) },
        ],
    },
    {
        title: "Rim",
        fields: [
            { key: "rimOpacity", label: "Opacity", type: "range", min: 0, max: 1, step: 0.05, value: 0.6, unit: "", kind: "var", name: "--rim-glow-rim-opacity" },
            {
                key: "radiusMode",
                label: "Rim corners",
                type: "select",
                options: [
                    ["inherit", "Inherited from the element"],
                    ["fixed", "Fixed radius"],
                ],
                value: "inherit",
                kind: "radius",
            },
            { key: "radius", label: "Fixed radius", type: "range", min: 0, max: 80, step: 1, value: 52, unit: "px", kind: "radius", showIf: (state) => state.radiusMode === "fixed" },
            { key: "blockRadius", label: "Card corner radius (demo)", type: "range", min: 0, max: 80, step: 1, value: 28, unit: "px", kind: "demoRadius" },
            { key: "rimColor", label: "Color", type: "color", value: "#ffffff", kind: "var", name: "--rim-glow-rim-color" },
        ],
    },
    {
        title: "Scrims",
        fields: [
            { key: "demoScrim", label: "Photo and voice scrim (demo)", type: "range", min: 0, max: 1, step: 0.05, value: 0.8, unit: "", kind: "demoScrim" },
            { key: "scrim", label: "rim-glow scrim over the content", type: "range", min: 0, max: 1, step: 0.05, value: 0, unit: "", kind: "var", name: "--rim-glow-scrim" },
            { key: "scrimColor", label: "rim-glow scrim color", type: "color", value: "#000000", kind: "var", name: "--rim-glow-scrim-color" },
            { key: "backdrop", label: "Backdrop under the gradient", type: "color", value: "#000000", kind: "var", name: "--rim-glow-backdrop" },
        ],
    },
    {
        title: "Color theme",
        fields: [{ key: "theme", label: "Theme", type: "themes", value: "", kind: "theme" }],
    },
    {
        title: "Colors, one by one",
        grid: true,
        fields: [
            ...COLORS.map(([name, label]) => ({ key: `color-${name}`, color: name, label, type: "color", value: null, kind: "color", name: `--rim-glow-${name}` })),
        ],
        after: { key: "resetColors", label: "Back to the theme colors", type: "button", action: () => resetColors() },
    },
];

const FIELDS = SECTIONS.flatMap((section) => section.fields).filter((field) => field.type !== "button");
const defaults = Object.fromEntries(FIELDS.map((field) => [field.key, field.value]));
const state = { ...defaults, ...loadSaved() };
const inputs = new Map();

function loadSaved() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        return Object.fromEntries(Object.entries(saved).filter(([key]) => key in defaults));
    } catch {
        return {};
    }
}

function save() {
    const kept = Object.fromEntries(FIELDS.filter((field) => field.keep !== false).map((field) => [field.key, state[field.key]]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
}

function colorFields() {
    return FIELDS.filter((field) => field.kind === "color");
}

function resetColors() {
    for (const field of colorFields()) {
        state[field.key] = null;
        apply(field);
    }
    sync();
    refresh();
    save();
}

function cssValue(field, value) {
    return field.type === "range" && field.unit && field.unit !== "×" ? `${value}${field.unit}` : String(value);
}

function apply(field) {
    const value = state[field.key];

    switch (field.kind) {
        case "active":
            for (const glow of glows) {
                glow.active = value;
            }
            break;
        case "attr":
            for (const glow of glows) {
                if (field.type === "toggle") {
                    glow.toggleAttribute(field.attr, value);
                } else {
                    glow.setAttribute(field.attr, String(value));
                }
            }
            break;
        case "var":
            for (const glow of glows) {
                glow.style.setProperty(field.name, cssValue(field, value));
            }
            break;
        case "origin":
            for (const glow of glows) {
                if (state.origin === "fixed") {
                    glow.setAttribute("ripple-origin", `${state.originX}% ${state.originY}%`);
                } else {
                    glow.removeAttribute("ripple-origin");
                }
            }
            break;
        case "theme":
            for (const glow of glows) {
                if (value) {
                    glow.setAttribute("theme", value);
                } else {
                    glow.removeAttribute("theme");
                }
            }
            break;
        case "color":
            for (const glow of glows) {
                if (value === null) {
                    glow.style.removeProperty(field.name);
                } else {
                    glow.style.setProperty(field.name, value);
                }
            }
            break;
        case "radius":
            for (const glow of glows) {
                if (state.radiusMode === "fixed") {
                    glow.style.setProperty("--rim-glow-radius", `${state.radius}px`);
                } else {
                    glow.style.removeProperty("--rim-glow-radius");
                }
            }
            break;
        case "demoRadius":
            document.documentElement.style.setProperty("--demo-radius", `${value}px`);
            break;
        case "distort":
            for (const glow of glows) {
                glow.setAttribute("distort", value);
            }
            break;
        case "flow":
            for (const glow of glows) {
                if (value === "off") {
                    glow.removeAttribute("flow");
                } else {
                    glow.setAttribute("flow", value);
                }
            }
            break;
        case "blob":
            for (const glow of glows) {
                if (value) {
                    glow.removeAttribute("blob");
                } else {
                    glow.setAttribute("blob", "original");
                }
            }
            break;
        case "demoScrim":
            document.documentElement.style.setProperty("--demo-scrim", String(value));
            break;
    }
}

function format(field, value) {
    if (field.type !== "range") {
        return "";
    }

    if (field.percent) {
        return `${(value * 100).toFixed(2)} %`;
    }

    const digits = field.step < 0.1 ? 2 : field.step < 1 ? 1 : 0;

    return `${Number(value).toFixed(digits)}${field.unit === "%" || field.unit === "px" || field.unit === "s" ? " " + field.unit : field.unit}`;
}

function render() {
    const container = document.querySelector("[data-sections]");

    for (const section of SECTIONS) {
        const element = document.createElement("section");
        element.className = "panel__section";
        const heading = document.createElement("h3");
        heading.textContent = section.title;
        element.append(heading);
        const list = document.createElement("div");
        list.className = section.grid ? "panel__grid" : "panel__fields";

        for (const field of section.fields) {
            list.append(renderField(field));
        }

        element.append(list);

        if (section.after) {
            element.append(renderField(section.after));
        }

        container.append(element);
    }
}

function renderThemes(field) {
    const list = document.createElement("div");
    list.className = "themes";

    for (const [id, label] of THEMES) {
        const colors = themeColors(id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme";
        button.dataset.theme = id;
        // Around the chip, clockwise from the top: the colors as they show along the edges.
        const ring = [colors.purple, colors.indigo, colors.blue, colors.mint, colors.green, colors["indigo-2"], colors.orange, colors.yellow, colors.purple];
        button.style.setProperty("--ring", `conic-gradient(${ring.join(", ")})`);
        button.innerHTML = '<span class="theme__chip"></span>';
        const name = document.createElement("span");
        name.className = "theme__name";
        name.textContent = label;
        button.append(name);
        button.addEventListener("click", () => {
            state.theme = id;
            apply(field);
            resetColors();
        });
        list.append(button);
    }

    inputs.set(field.key, { field, input: list, output: document.createElement("output"), row: list });

    return list;
}

function renderField(field) {
    if (field.type === "themes") {
        return renderThemes(field);
    }

    if (field.type === "hidden") {
        return document.createComment(field.key);
    }

    if (field.type === "button") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "panel__button";
        button.textContent = field.label;
        button.addEventListener("click", field.action);
        if (field.showIf) {
            inputs.set(field.key, { field, input: button, output: document.createElement("output"), row: button });
        }
        return button;
    }

    const row = document.createElement("label");
    row.className = `field field--${field.type}`;
    const label = document.createElement("span");
    label.className = "field__label";
    label.textContent = field.label;
    row.append(label);

    let reset = null;

    if (field.keep !== false) {
        reset = document.createElement("button");
        reset.type = "button";
        reset.className = "field__reset";
        reset.textContent = "↺";
        reset.title = "Reset to default";
        reset.setAttribute("aria-label", `Reset ${field.label} to default`);
        reset.addEventListener("click", (event) => {
            // The row is a <label>: keep the click from reaching its control.
            event.preventDefault();
            state[field.key] = defaults[field.key];
            apply(field);
            sync();
            refresh();
            save();
        });
        label.append(reset);
    }

    let info = null;
    let note = null;

    if (field.info) {
        info = document.createElement("button");
        info.type = "button";
        info.className = "field__info";
        info.textContent = "i";
        info.setAttribute("aria-label", `About ${field.label}`);
        info.setAttribute("aria-expanded", "false");
        note = document.createElement("span");
        note.className = "field__note";
        note.hidden = true;
        info.addEventListener("click", (event) => {
            event.preventDefault();
            note.hidden = !note.hidden;
            info.setAttribute("aria-expanded", String(!note.hidden));
        });
        label.append(info);
    }

    let input;

    if (field.type === "select") {
        input = document.createElement("select");
        for (const [value, text] of field.options) {
            input.append(new Option(text, value));
        }
    } else {
        input = document.createElement("input");
        input.type = field.type === "toggle" ? "checkbox" : field.type;
        if (field.type === "toggle") {
            input.setAttribute("role", "switch");
        }
        if (field.type === "range") {
            Object.assign(input, { min: field.min, max: field.max, step: field.step });
        }
    }

    const output = document.createElement("output");
    output.className = "field__value";

    if (field.type === "range") {
        row.append(output);
    }

    row.append(input);

    const read = () => {
        if (field.type === "toggle") {
            return input.checked;
        }
        return field.type === "range" ? Number(input.value) : input.value;
    };

    input.addEventListener(field.type === "range" || field.type === "color" ? "input" : "change", () => {
        state[field.key] = read();
        output.textContent = format(field, state[field.key]);
        apply(field);
        sync();
        refresh();
        save();
    });

    if (note) {
        row.append(note);
    }

    inputs.set(field.key, { field, input, output, row, reset, info, note });

    return row;
}

function sync() {
    for (const { field, input, output, reset, info, note } of inputs.values()) {
        if (field.type === "button") {
            continue;
        }

        if (reset) {
            reset.hidden = state[field.key] === defaults[field.key];
        }

        if (note) {
            note.replaceChildren(
                ...field.info(state).map((line) => {
                    const item = document.createElement("span");
                    item.textContent = line;
                    return item;
                }),
            );
            info.classList.toggle("field__info--warn", Boolean(field.warn?.(state)));
        }

        if (field.type === "themes") {
            for (const button of input.children) {
                button.setAttribute("aria-pressed", String(button.dataset.theme === state.theme));
            }
        } else if (field.kind === "color") {
            input.value = state[field.key] ?? themeColors(state.theme)[field.color];
        } else if (field.type === "toggle") {
            input.checked = state[field.key];
        } else {
            input.value = state[field.key];
        }
        output.textContent = format(field, state[field.key]);
    }
}

function refresh() {
    for (const { field, row } of inputs.values()) {
        row.hidden = field.showIf ? !field.showIf(state) : false;
    }
    document.querySelector("[data-code]").textContent = code();
}

function code() {
    const attributes = [];

    if (state.ripple !== "toggle") {
        attributes.push(`ripple="${state.ripple}"`);
    }
    if (state.origin === "fixed") {
        attributes.push(`ripple-origin="${state.originX}% ${state.originY}%"`);
    }
    if (state.distort !== "svg") {
        attributes.push(`distort="${state.distort}"`);
    }
    if (state.flow !== "off") {
        attributes.push(`flow="${state.flow}"`);
    }
    if (!state.blob) {
        attributes.push('blob="original"');
    }
    if (state.gradientSpeed !== 0.8) {
        attributes.push(`gradient-speed="${state.gradientSpeed}"`);
    }
    if (state.blobSpeed !== 0.7) {
        attributes.push(`blob-speed="${state.blobSpeed}"`);
    }
    if (state.theme) {
        attributes.push(`theme="${state.theme}"`);
    }

    const variables = FIELDS.filter((field) => (field.kind === "var" || field.kind === "color") && state[field.key] !== field.value).map(
        (field) => `    ${field.name}: ${cssValue(field, state[field.key])};`,
    );

    if (state.radiusMode === "fixed") {
        variables.push(`    --rim-glow-radius: ${state.radius}px;`);
    }

    const opening = ["<rim-glow", ...attributes].join(" ");
    const style = variables.length > 0 ? ` style="\n${variables.join("\n")}\n"` : "";

    return `${opening}${style}>\n    …\n</rim-glow>`;
}

render();
sync();
for (const field of FIELDS) {
    apply(field);
}
refresh();

document.querySelector("[data-action=reset]").addEventListener("click", () => {
    Object.assign(state, defaults, { active: state.active });
    localStorage.removeItem(STORAGE_KEY);
    sync();
    for (const field of FIELDS) {
        apply(field);
    }
    refresh();
});

document.querySelector("[data-action=copy]").addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(code());
    event.target.textContent = "Copied";
    setTimeout(() => (event.target.textContent = "Copy"), 1500);
});

const toggle = document.querySelector(".panel-toggle");
toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("panel-closed") === false;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Hide" : "Settings";
});
