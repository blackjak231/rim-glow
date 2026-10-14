// Example cards: each one turns its own glow on and off, so their animations never line up.
const card = (name) => document.querySelector(`rim-glow[data-card="${name}"]`);
const photo = card("photo");
const text = card("text");
const assistant = card("assistant");
const voice = card("voice");

photo.setAttribute("image", "./assets/photo.jpg");

/** Simulates a task: glow on, then off after `duration` ms, then `done`. Ignores clicks meanwhile. */
function processing(glow, duration, done) {
    if (glow.dataset.busy !== undefined) {
        return;
    }

    glow.dataset.busy = "";
    glow.active = true;
    setTimeout(() => {
        glow.active = false;
        delete glow.dataset.busy;
        done?.();
    }, duration);
}

photo.querySelector("[data-action=retouch]").addEventListener("click", () => processing(photo, 3000));

const DRAFT = "hey team, so the new listings page is kinda slow and people are complaining about it. we should probably look at it soon because its affecting conversions i think";
const IMPROVED = "The new listings page loads slowly, and users have noticed. Since it is likely hurting conversions, let's make the fix a priority for this sprint.";
const textBody = text.querySelector("[data-text]");
const improve = text.querySelector("[data-action=improve]");
let improved = false;
textBody.textContent = DRAFT;

improve.addEventListener("click", () =>
    processing(text, 2600, () => {
        improved = !improved;
        textBody.textContent = improved ? IMPROVED : DRAFT;
        improve.textContent = improved ? "Show the draft" : "Improve writing";
    }),
);

const input = assistant.querySelector("input");
input.addEventListener("focus", () => (assistant.active = true));
input.addEventListener("blur", () => (assistant.active = false));
assistant.querySelector("[data-ask]").addEventListener("submit", (event) => {
    event.preventDefault();
    input.value = "";
    const send = event.submitter.getBoundingClientRect();
    assistant.ripple({ clientX: send.x + send.width / 2, clientY: send.y + send.height / 2 });
});

voice.querySelector(".toggle-button").addEventListener("click", () => {
    voice.active = !voice.active;
});
