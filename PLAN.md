# Angle 2 — platform-aware repackaging

**Status:** pre-validation. Nothing built. No code committed.
**Author:** Nawapon Chaisang
**Date:** 2026-10-07

---

## The idea in one line

One long video in → correctly versioned cuts out, one per platform, automatically.

Not "an AI editor." Not "describe an edit, get an edit." A repackaging layer that
feeds an editor correctly.

---

## Why this and not driftwatch

driftwatch was chosen by me, from a network repo in the user's files. It was
never a problem the user had. It has no confirmed demand and a mature competitor
landscape (Batfish, Ansible, Oxidized, NetBox).

This idea came from the user, and the evidence is in their own work:

- `~/Dropbox/Promo-vid/` — six Higgsfield-generated 15s promo clips
- `~/video-freeze/freeze.sh` — a script written to do the boring part by hand
  (freeze ending at exactly 15s, hold final frame, fade audio, NVENC encode)

The user already automated half of it with ffmpeg. That is the "before" version
of this product.

---

## The market argument

**Generation collapsed. Publishing didn't.**

Generating video is now nearly free — an hour of clips costs almost nothing.
Everything downstream is still manual:

- choosing which seconds work
- cutting them into something with shape
- captions readable at small size
- pacing, music fit, platform-specific framing

The bottleneck moved from *making* video to *deciding what to do with it*. That
decision layer has not moved.

Every creator posting to more than one platform hits this. It is repetitive,
which is what makes willingness to pay real.

---

## Competitive reality

| Product | What it does | Gap |
|---|---|---|
| Descript | Edit by editing transcript | Creative editing, not platform repackaging |
| Opus Clip | Long → shorts, auto | One output shape, not per-platform versioning |
| CapCut / Premiere | Manual editing, AI features | Assumes you do it by hand |
| OpenCut (rewrite) | Editor API, MCP, headless batch | Infrastructure, not the decision layer |

Crowded at the *editor* layer. Empty at the *repackaging* layer.

---

## ⚠️ The strategic correction

**The original plan was to build after OpenCut's rewrite ships. This is a
dependency on someone else's roadmap, and it should be rejected.**

Reasons:

1. **We do not control the timeline.** OpenCut said they are "being rewritten from
   the ground up" and are "not set up to take outside contributions yet while the
   architecture is being designed." That is months of unknown.
2. **The needed API may never ship in the shape we need.** Their roadmap lists
   Editor API, MCP server, headless mode — but none of it is specified yet.
3. **Competitors will not wait.** If this is a real gap, someone else finds it.
4. **It inverts the dependency.** We would be validating *after* our window
   closes rather than before it opens.

### What we actually depend on

| Dependency | Status | Risk |
|---|---|---|
| ffmpeg | ✅ installed, n9.0.1 + NVENC | none |
| AI video generation | ✅ Higgsfield et al. | none |
| The demand itself | ❓ unvalidated | the real risk |
| OpenCut | ⏳ unknown | unnecessary |

**ffmpeg is the foundation, not OpenCut.** OpenCut becomes an optional render
backend later — an adapter, not a prerequisite.

Design rule: any core logic must run against ffmpeg alone, with no OpenCut import
anywhere. If we obey that rule, OpenCut can arrive whenever it likes and cost us
nothing.

---

## Phase 1 — Launch the idea (now)

Not the product. The claim. Goal: find out whether anyone actually wants this
before building it.

**Deliverable:** landing page + waitlist. Positioning test, not a product.

Success criteria — decide *before* posting, so we can't rationalize later:

- **Go:** ≥50 waitlist signups with email from outside our own network
- **Iterate:** 10–49, or signups but no replies when asked what they actually do
- **Stop:** <10, or zero

Timebox: 21 days from first post.

Distribution: Reddit (r/VideoEditing, r/ContentCreators, r/SmallYoutubers),
Indie Hackers, X build-in-public.

---

## Phase 2 — Manual concierge (only if Phase 1 passes)

Before writing any software: hand-edit 5 videos for 5 strangers, by hand, and
watch what they actually struggle with.

This tests demand far more honestly than a landing page does, because it surfaces
the real workflow instead of the imagined one.

Cost: a weekend. No code.

---

## Phase 3 — Build

Only after Phases 1 and 2.

First version: upload one video → get platform-correct cuts. ffmpeg only.
OpenCut integration deferred, optional, adapter-shaped.

---

## Open questions

- Is the unit of work "video" or "clip"? Changes the whole batching model.
- Does the user want auto-selection of moments, or manual marking + auto formatting?
- Which platform first? TikTok is the demand floor, but its rules change most often.
- Is this a tool people buy, or a feature inside something else they already use?

---

## Honest assessment

The idea is better than driftwatch. The user identified it, the evidence is in
their own work, and the market gap is real.

But "looks great on paper" is where every idea starts. Phase 1 exists precisely
because paper is cheap.

The biggest risk is not technical. It is that we spend months building a
repackager for a need that people solve by hand without noticing it costs them.

---

## Decision log

| Date | Decision |
|---|---|
| 2026-10-07 | Idea selected over driftwatch continuation |
| 2026-10-07 | Build-after-OpenCut dependency rejected; ffmpeg-only foundation |
| — | Phase 1 outcome: pending |