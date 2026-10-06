/**
 * Waitlist form.
 *
 * ⚠️ NO BACKEND IS WIRED UP YET.
 *
 * This is deliberately NOT a silent fake. A waitlist that accepts an email and
 * drops it is worse than no waitlist at all: it manufactures the exact signal
 * Phase 1 depends on, and the signal would be fiction.
 *
 * Before this page goes public for real, one of these must be wired:
 *
 *   1. A form endpoint (Formspree, Buttondown, Basin — free tiers exist).
 *      Set ENDPOINT below and it starts working.
 *   2. A tiny server-side handler, if we ever self-host.
 *
 * Until then the form validates input, then refuses honestly. Change ENDPOINT
 * to a real URL and the rest of this file works unchanged.
 */

const ENDPOINT = null; // ← e.g. "https://formspree.io/f/xxxxxxx"

const form = document.getElementById("wl");
const email = document.getElementById("email");
const stack = document.getElementById("stacks");
const note = document.getElementById("note");

function setNote(text, cls) {
  note.textContent = text;
  note.className = "form-note" + (cls ? " " + cls : "");
}

// Basic sanity check. Real validation happens server-side; this only avoids
// obviously-wrong input reaching a mail API.
const RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const value = email.value.trim();

  if (!value) {
    setNote("An email is required.", "err");
    email.focus();
    return;
  }
  if (!RE.test(value)) {
    setNote("That doesn't look like a valid email.", "err");
    email.focus();
    return;
  }

  if (!ENDPOINT) {
    // Honest refusal — see the header comment.
    setNote(
      "Still not connected to anything — this form doesn't send yet. " +
        "Ask Nawapon to wire up an endpoint, or email directly.",
      "err"
    );
    return;
  }

  const btn = form.querySelector("button");
  btn.disabled = true;
  setNote("Sending…");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: value, editor: stack.value || null }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);

    form.replaceChildren();
    setNote("You're on the list. We'll be honest either way.", "ok");
  } catch (err) {
    btn.disabled = false;
    setNote("Could not send. Try again, or email directly.", "err");
  }
});