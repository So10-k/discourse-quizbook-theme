// Quiz Book theme — JS initializer.
//
// Two responsibilities:
//   1) Inject the main-site nav strip into the Discourse header.
//   2) Inject a "Discuss the tournament" hero block at the top of
//      the homepage so it visually anchors the forum as part of
//      the Quiz Book site.
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

      api.onPageChange(() => {
        ensureStrip();
        ensureHero();
      });
      setTimeout(() => {
        ensureStrip();
        ensureHero();
      }, 100);
    });
  },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
