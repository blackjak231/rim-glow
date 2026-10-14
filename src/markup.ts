/**
 * Inner markup of the effect. Same structure for the custom element (with a slot) and for the
 * CSS-only usage (content placed in .rim-glow__content), documented in the README.
 */
export function rimGlowMarkup(content: string): string {
    return `<div class="rim-glow" part="root">
<div class="rim-glow__stage">
<div class="rim-glow__content">${content}</div>
<div class="rim-glow__layers" aria-hidden="true">
<div class="rim-glow__scrim"></div>
<div class="rim-glow__glow"><div class="rim-glow__frame"><div class="rim-glow__mesh">
<div class="rim-glow__rows"><i></i><i></i><i></i></div>
<div class="rim-glow__cols"><i></i><i></i><i></i></div>
</div><div class="rim-glow__flow"></div></div></div>
<div class="rim-glow__rim"></div>
</div>
</div>
<div class="rim-glow__ripple" aria-hidden="true"></div>
</div>`;
}
