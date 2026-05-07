// Quiz Book theme — JS initializer.
//
// Adds a small "🌞 Quiz Book" link to the Discourse header pointing
// back at the main site. Honors the theme settings from settings.yml
// (show_quiz_link, quiz_site_url) so admins can toggle / re-target
// without touching code.
//
// This runs once per page load via Discourse's `withPluginApi` hook.

import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "quizbook-init",

  initialize() {
    withPluginApi("1.14.0", (api) => {
      const settings =
        (typeof Discourse !== "undefined" &&
          Discourse.SiteSettings &&
          Discourse.SiteSettings) ||
        {};
      // Theme settings are exposed under `settings` inside this scope
      // by Discourse — not on Discourse.SiteSettings.
      const themeSettings = api.container?.lookup?.("service:theme-settings");
      const url =
        (typeof settings === "object" && settings.quiz_site_url) ||
        "https://quiz.miaswebsites.art";
      const enabled = (typeof settings === "object" &&
        "show_quiz_link" in settings)
        ? settings.show_quiz_link
        : true;
      if (!enabled) return;

      // Inject the link inside .d-header .header-buttons. Re-render
      // safe — only adds it if not already present.
      const ensureLink = () => {
        const headerButtons = document.querySelector(
          ".d-header .header-buttons"
        );
        if (!headerButtons) return;
        if (headerButtons.querySelector(".qb-site-link")) return;
        const a = document.createElement("a");
        a.href = url;
        a.className = "qb-site-link";
        a.target = "_self";
        a.innerHTML = "🌞 Quiz Book";
        headerButtons.insertBefore(a, headerButtons.firstChild);
      };
      api.onPageChange(ensureLink);
      // Run once on load too — onPageChange fires on navigations.
      setTimeout(ensureLink, 100);
    });
  },
};
