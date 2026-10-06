/**
 * repackage — interaction layer
 *
 * Deliberately small. No framework, no build step, no dependencies.
 * Three jobs: reveal on scroll, wire the stage, and let the frames be inspected.
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- reveal on scroll ---------------- */

const reveals = document.querySelectorAll(".reveal");

// Safety net. A scroll-reveal that never fires leaves the page blank, and a
// blank page is a catastrophic failure for a product site. If the observer
// hasn't finished its job shortly after load, show everything anyway.
const revealAll = () => reveals.forEach((el) => {
  el.classList.add("in");
  el.classList.remove("failed");
});

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealAll();
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target); // reveal once; never re-animate on scroll back
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  reveals.forEach((el) => io.observe(el));

  // Belt and braces: if a straggler never intersects (weird viewport, print
  // mode, restored scroll position), reveal it rather than hide it forever.
  setTimeout(() => {
    reveals.forEach((el) => {
      if (!el.classList.contains("in")) {
        const r = el.getBoundingClientRect();
        const onScreen = r.top < window.innerHeight * 2 && r.bottom > -window.innerHeight;
        if (onScreen) el.classList.add("in");
        else el.classList.add("failed");
      }
    });
  }, 2500);
}

/* ---------------- the stage: one source, three outputs ---------------- */

const stage = document.getElementById("stage");

if (stage) {
  const outs = [...stage.querySelectorAll(".out")];

  // Hovering an output highlights it and dims the others. Makes the
  // "one source → many" relationship legible without any copy.
  outs.forEach((out) => {
    out.addEventListener("mouseenter", () => {
      outs.forEach((o) => (o.style.opacity = o === out ? "1" : "0.32"));
    });
    out.addEventListener("mouseleave", () => {
      outs.forEach((o) => (o.style.opacity = "1"));
    });
  });

  // Draw the connector once the stage scrolls into view, so the "one video
  // becomes three" idea lands as a motion rather than a static diagram.
  if (!reduceMotion && "IntersectionObserver" in window) {
    const wire = stage.querySelector(".stage-wire span");
    if (wire) {
      wire.style.transform = "scaleX(0)";
      wire.style.transformOrigin = "left center";
      wire.style.transition = "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)";

      const stageObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          requestAnimationFrame(() => {
            wire.style.transform = "scaleX(1)";
          });
          outs.forEach((out, i) => {
            out.style.opacity = "0";
            out.style.transform = "translateY(10px)";
            out.style.transition = "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)";
            setTimeout(() => {
              out.style.opacity = "1";
              out.style.transform = "none";
            }, 220 + i * 130);
          });
          stageObserver.disconnect();
        },
        { threshold: 0.3 }
      );
      stageObserver.observe(stage);
    }
  }
}

/* ---------------- specs: highlight matching rules ---------------- */

document.querySelectorAll(".specs-row").forEach((row) => {
  row.addEventListener("mouseenter", () => {
    const name = row.dataset.platform;
    document.querySelectorAll(".out figcaption b").forEach((b) => {
      b.style.color = b.textContent.trim() === name ? "var(--accent)" : "";
    });
  });
  row.addEventListener("mouseleave", () => {
    document.querySelectorAll(".out figcaption b").forEach((b) => (b.style.color = ""));
  });
});