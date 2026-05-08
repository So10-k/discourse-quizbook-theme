// Quiz Book theme — JS initializer.
//
// Responsibilities:
//   1) Inject the main-site nav strip into the Discourse header.
//   2) Inject a tournament-state HUD strip ("📚 Chapter 4 · 12
//      players in · closes in 2h 14m") fed by the public
//      /api/forum/state JSON on the quiz site.
//   3) Inject a "Discuss the tournament" hero block at the top of
//      the homepage so it visually anchors the forum as part of
//      the Quiz Book site.
//   4) Render the picture-book sky scene behind everything.
//
// Modernized: avoids `Discourse.SiteSettings` (deprecated). The
// theme system auto-injects `settings` (the theme's own settings)
// as a global into this file's scope.

import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "quizbook-init",

  initialize() {
    withPluginApi("1.14.0", (api) => {
      const themeSettings =
        typeof settings === "object" && settings !== null ? settings : {};
      const url = themeSettings.quiz_site_url || "https://quiz.miaswebsites.art";
      const showLink = themeSettings.show_quiz_link !== false;
      const tagline =
        themeSettings.community_tagline ||
        "Talk about the tournament. Predictions, gloating, snack reviews.";

      // ─── Nav strip in the header ──────────────────────────────
      const NAV_LINKS = [
        { href: url + "/", label: "🌞", title: "Quiz Book home", className: "qb-link-home" },
        { href: url + "/play", label: "▶ Play" },
        { href: url + "/qotd", label: "💡 QOTD" },
        { href: url + "/blog", label: "📝 Blog" },
        { href: url + "/listen", label: "🎵 Theme" },
        { href: url + "/status", label: "🟢 Status" },
      ];
      const ensureStrip = () => {
        if (!showLink) return;
        const container = document.querySelector(".d-header .header-buttons");
        if (!container) return;
        if (container.querySelector(".qb-nav-strip")) return;
        const strip = document.createElement("div");
        strip.className = "qb-nav-strip";
        for (const link of NAV_LINKS) {
          const a = document.createElement("a");
          a.href = link.href;
          a.className = "qb-nav-link " + (link.className || "");
          a.target = "_self";
          if (link.title) a.title = link.title;
          a.textContent = link.label;
          strip.appendChild(a);
        }
        container.insertBefore(strip, container.firstChild);
      };

      // ─── Picture-book hero on the homepage ────────────────────
      const HERO_PATHS = new Set(["/", "/latest", "/categories", "/top", "/new", "/unread"]);
      const ensureHero = () => {
        const main = document.getElementById("main-outlet");
        if (!main) return;
        main.querySelectorAll(".qb-hero").forEach((el) => el.remove());
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (!HERO_PATHS.has(path)) return;
        const hero = document.createElement("div");
        hero.className = "qb-hero";
        hero.innerHTML = `
          <span class="qb-hero-eyebrow">🗣️ The Discuss page</span>
          <h1>Mia&rsquo;s Quiz · Discuss</h1>
          <p>${escapeHtml(tagline)}</p>
        `;
        main.insertBefore(hero, main.firstChild);
      };

      // ─── Animated sky scene (clouds + sun + grassy hill) ─────
      // Same scene the main site uses, inlined as one SVG-bearing
      // <div id="qb-sky"> fixed behind Discourse content. Inserted
      // once at first paint; persists across SPA route changes
      // (don't recreate, just leave it).
      ensureSkyScene();

      // ─── Tournament HUD strip ─────────────────────────────────
      // Sits between the header and the main content. Fed by
      // /api/forum/state on the quiz site. Re-fetches every
      // 5 minutes when the tab is visible.
      const stateUrl = url.replace(/\/$/, "") + "/api/forum/state";
      let lastFetchedAt = 0;
      const ensureHud = async () => {
        const main = document.getElementById("main-outlet-wrapper") ||
                     document.getElementById("main-outlet");
        if (!main) return;
        let hud = document.getElementById("qb-hud");
        if (!hud) {
          hud = document.createElement("div");
          hud.id = "qb-hud";
          hud.className = "qb-hud qb-hud-loading";
          hud.innerHTML = `<span class="qb-hud-emoji">📚</span><span class="qb-hud-text">Loading tournament state…</span>`;
          main.parentNode.insertBefore(hud, main);
        }
        // Throttle the fetch to once per 5 min unless forced.
        const now = Date.now();
        if (now - lastFetchedAt < 5 * 60 * 1000 && hud.dataset.loaded === "1") {
          return;
        }
        lastFetchedAt = now;
        try {
          const res = await fetch(stateUrl, {
            credentials: "omit",
            cache: "no-store",
          });
          if (!res.ok) throw new Error("bad status");
          const data = await res.json();
          renderHud(hud, data, url);
        } catch (e) {
          // Silent failure — leave the loading state to disappear
          // gracefully, or hide on retry.
          hud.classList.add("qb-hud-error");
          hud.querySelector(".qb-hud-text").textContent =
            "Tournament state unavailable.";
        }
      };

      // ─── Terms-agreement gate ─────────────────────────────────
      // If the current user is in `pending_terms` (set by the
      // bridge plugin on first SSO login), redirect every page to
      // their welcome PM until they reply with "yes". Soft gate —
      // not a hard ACL — but enough for a family-game forum.
      const ensureTermsGate = () => {
        const me = api.getCurrentUser();
        if (!me || !me.qb_is_pending_terms) return;
        const path = window.location.pathname;
        const pmId = me.qb_terms_pm_topic_id;
        if (!pmId) return;
        // Already on the welcome PM? Let it through.
        if (path.startsWith(`/t/`) && path.includes(`/${pmId}`)) return;
        // Allow the inbox + the user's own profile + login pages.
        if (path.startsWith(`/u/${me.username}/messages`)) return;
        if (path === "/login" || path === "/signup") return;
        window.location.replace(`/t/${pmId}`);
      };

      api.onPageChange(() => {
        ensureStrip();
        ensureHero();
        ensureHud();
        ensureTermsGate();
      });
      setTimeout(() => {
        ensureStrip();
        ensureHero();
        ensureHud();
        ensureTermsGate();
      }, 100);
      // Refresh HUD every 5 minutes while the tab is open.
      setInterval(() => {
        if (document.visibilityState === "visible") ensureHud();
      }, 5 * 60 * 1000);
    });
  },
};

function renderHud(hud, data, baseUrl) {
  hud.classList.remove("qb-hud-loading", "qb-hud-error");
  hud.dataset.loaded = "1";
  if (!data || !data.ok || !data.tournament) {
    hud.classList.add("qb-hud-empty");
    hud.innerHTML = `
      <span class="qb-hud-emoji">📖</span>
      <span class="qb-hud-text">No tournament running right now.</span>
      <a class="qb-hud-cta" href="${baseUrl}">Visit Quiz Book →</a>`;
    return;
  }
  const t = data.tournament;
  const stage = t.status === "complete"
    ? "🏆 Tournament complete"
    : t.status === "in_progress"
    ? `⚔️ ${t.title}`
    : `🎟️ ${t.title}`;
  const chapter = t.currentRoundChapter
    ? `Chapter ${t.currentRoundChapter}${t.currentRoundTitle ? " · " + escapeHtml(t.currentRoundTitle) : ""}`
    : "Registration open";
  let countdown = "";
  if (data.nextRoundClosesAt) {
    const ms = Date.parse(data.nextRoundClosesAt) - Date.now();
    if (ms > 0) countdown = `closes in ${humanDuration(ms)}`;
  } else if (data.nextRoundOpensAt) {
    const ms = Date.parse(data.nextRoundOpensAt) - Date.now();
    if (ms > 0) countdown = `opens in ${humanDuration(ms)}`;
  }
  const playersBadge =
    data.activePlayers > 0
      ? `${data.activePlayers} of ${data.totalEnrolled} still in`
      : `${data.totalEnrolled} signed up`;
  const championLine = data.champion
    ? ` · 🏆 Champion: ${escapeHtml(data.champion.name || data.champion.username)}`
    : "";
  hud.innerHTML = `
    <span class="qb-hud-emoji">${t.status === "complete" ? "🏆" : "📚"}</span>
    <span class="qb-hud-stage">${escapeHtml(stage)}</span>
    <span class="qb-hud-sep">·</span>
    <span class="qb-hud-chapter">${escapeHtml(chapter)}</span>
    <span class="qb-hud-sep">·</span>
    <span class="qb-hud-players">${escapeHtml(playersBadge)}</span>
    ${countdown ? `<span class="qb-hud-sep">·</span><span class="qb-hud-countdown">⏳ ${escapeHtml(countdown)}</span>` : ""}
    ${championLine ? `<span class="qb-hud-champion">${championLine}</span>` : ""}
    <a class="qb-hud-cta" href="${baseUrl}/play">Play →</a>
  `;
}

// Human-friendly "in 2h 14m" / "in 3d" formatting. Mirrors the
// main-site countdown widget so the forum HUD reads the same.
function humanDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

// ─── sky scene markup ─────────────────────────────────────────
// Mirrors components/scene/* on the main site. Three drifting clouds
// (slow/mid/fast), one slow-spinning sun, one grassy hill with
// flowers across the bottom. Each animation has a CSS-only fallback
// at @media (prefers-reduced-motion).
function ensureSkyScene() {
  if (document.getElementById("qb-sky")) return;
  const sky = document.createElement("div");
  sky.id = "qb-sky";
  sky.setAttribute("aria-hidden", "true");
  sky.innerHTML = `
    <div class="qb-sky-gradient"></div>
    <div class="qb-sun qb-spin">${sunSVG()}</div>
    <div class="qb-cloud-row qb-drift-slow" style="top:130px;">${cloudSVG(150)}</div>
    <div class="qb-cloud-row qb-drift-mid"  style="top:230px;"><div style="margin-left:32%">${cloudSVG(110)}</div></div>
    <div class="qb-cloud-row qb-drift-fast" style="top:320px;"><div style="margin-left:65%">${cloudSVG(85)}</div></div>
    ${hillSVG()}
  `;
  // Insert as the very first child of <body> so it sits behind
  // everything — Discourse's #main-outlet etc. are already
  // positioned + win the z-index race.
  document.body.insertBefore(sky, document.body.firstChild);
}

function cloudSVG(size) {
  const w = size;
  const h = Math.round(size * 0.55);
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 200 110" aria-hidden="true">
      <ellipse cx="55"  cy="70" rx="40" ry="32" fill="#FFFFFF"/>
      <ellipse cx="100" cy="55" rx="48" ry="40" fill="#FFFFFF"/>
      <ellipse cx="150" cy="68" rx="38" ry="30" fill="#FFFFFF"/>
      <ellipse cx="80"  cy="78" rx="34" ry="22" fill="#FFFFFF"/>
      <ellipse cx="130" cy="80" rx="32" ry="20" fill="#FFFFFF"/>
      <path d="M30 78 Q22 50 60 44 Q66 22 100 22 Q140 18 152 44 Q186 46 178 80 Q190 96 158 96 L46 96 Q22 96 30 78 Z"
            fill="none" stroke="#1B2A4E" stroke-width="3" stroke-linejoin="round"/>
    </svg>
  `;
}

function sunSVG() {
  // 12 long rays + 12 short between them, sun face with eyes,
  // smile, blush. Same proportions as components/scene/Sun.tsx.
  let longRays = "";
  let shortRays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const x1 = 100 + Math.cos(a) * 80, y1 = 100 + Math.sin(a) * 80;
    const x2 = 100 + Math.cos(a) * 96, y2 = 100 + Math.sin(a) * 96;
    longRays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const ab = ((i * 30 + 15) * Math.PI) / 180;
    const xb1 = 100 + Math.cos(ab) * 78, yb1 = 100 + Math.sin(ab) * 78;
    const xb2 = 100 + Math.cos(ab) * 92, yb2 = 100 + Math.sin(ab) * 92;
    shortRays += `<line x1="${xb1}" y1="${yb1}" x2="${xb2}" y2="${yb2}"/>`;
  }
  return `
    <svg width="150" height="150" viewBox="0 0 200 200" aria-hidden="true">
      <g stroke="#1B2A4E" stroke-width="3" stroke-linecap="round">${longRays}</g>
      <g stroke="#1B2A4E" stroke-width="3" stroke-linecap="round">${shortRays}</g>
      <circle cx="100" cy="100" r="64" fill="#FFD93D" stroke="#1B2A4E" stroke-width="3"/>
      <circle cx="80"  cy="92" r="6" fill="#1B2A4E"/>
      <circle cx="120" cy="92" r="6" fill="#1B2A4E"/>
      <path d="M78 116 Q100 138 122 116" fill="none" stroke="#1B2A4E" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="74"  cy="112" r="6" fill="#E94B7E" opacity="0.7"/>
      <circle cx="126" cy="112" r="6" fill="#E94B7E" opacity="0.7"/>
    </svg>
  `;
}

function hillSVG() {
  // Two layered hill paths + sprinkled flowers. Same shape +
  // colours as components/scene/Hill.tsx.
  const flowers = [
    [120, 138, "#E94B7E"],
    [320, 132, "#FFD93D"],
    [560, 142, "#FFFFFF"],
    [820, 148, "#FFD93D"],
    [1080, 138, "#E94B7E"],
    [1280, 132, "#FFFFFF"],
  ]
    .map(
      ([x, y, c]) => `
      <g transform="translate(${x},${y})">
        <line x1="0" y1="0" x2="0" y2="14" stroke="#2E7E2E" stroke-width="2"/>
        <circle cx="0" cy="0" r="6" fill="${c}" stroke="#1B2A4E" stroke-width="2"/>
        <circle cx="0" cy="0" r="2" fill="#1B2A4E"/>
      </g>`
    )
    .join("");
  return `
    <svg class="qb-hill" viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 120 C 240 60 480 60 720 110 C 960 160 1200 160 1440 100 L 1440 240 L 0 240 Z"
            fill="#4FB04F" stroke="#1B2A4E" stroke-width="3"/>
      <path d="M0 160 C 200 130 420 130 720 165 C 1020 200 1240 195 1440 160 L 1440 240 L 0 240 Z"
            fill="#2E7E2E"/>
      ${flowers}
    </svg>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
