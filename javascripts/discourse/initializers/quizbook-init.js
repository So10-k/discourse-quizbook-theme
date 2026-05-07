// Quiz Book theme — JS initializer.
//
// Injects a "Quiz Book" nav strip into the Discourse header so the
// forum reads as part of the same site. Honors theme settings from
// settings.yml (show_quiz_link, quiz_site_url) — admins can toggle
// without touching code.
//
// Modernized: avoids `Discourse.SiteSettings` which is deprecated. The
// theme system auto-injects `settings` (the theme's own settings) as a
// global into this file's scope, so we read it directly.

import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "quizbook-init",

  initialize() {
    withPluginApi("1.14.0", (api) => {
      // `settings` is the global injected by Discourse's theme JS
      // loader, populated from settings.yml. Wrap in a try/typeof
      // because some build paths (tests, asset compile) don't expose it.
      const themeSettings =
        typeof settings === "object" && settings !== null ? settings : {};
      const url = themeSettings.quiz_site_url || "https://quiz.miaswebsites.art";
      const enabled = themeSettings.show_quiz_link !== false;
      if (!enabled) return;

      // Mirror the main site's mobile/desktop nav. Order chosen to
      // match the Quiz Book Nav.tsx top-level chiclets (Home, Play,
      // QOTD) plus secondary links.
      const NAV_LINKS = [
        { href: url + "/", label: "🌞", title: "Quiz Book home", className: "qb-link-home" },
        { href: url + "/play", label: "▶ Play" },
        { href: url + "/qotd", label: "💡 QOTD" },
        { href: url + "/blog", label: "📝 Blog" },
        { href: url + "/listen", label: "🎵 Theme" },
        { href: url + "/status", label: "🟢 Status" },
      ];

      // Inject the strip into the header. Re-runs on page change
      // because Discourse's SPA navigation re-renders the header in
      // some cases.
      const ensureStrip = () => {
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
      api.onPageChange(ensureStrip);
      // Also fire once after mount in case onPageChange hasn't yet.
      setTimeout(ensureStrip, 100);
    });
  },
};
