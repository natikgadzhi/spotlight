import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import spotlight from "./spotlight";
import sentry from "./sentry";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://getsentry.github.io',
  base: '/spotlight',
  integrations: [
    starlight({
      title: "Spotlight",
      social: {
        github: "https://github.com/getsentry/spotlight",
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            {
              label: "What is Spotlight?",
              link: "/what-is-spotlight/",
            },
            {
              label: "Architecture",
              link: "/architecture/",
            },
          ],
        },

        {
          label: "Setup",
          items: [
            {
              label: "for your custom project",
              link: "/setup/",
            },
            {
              label: "for Astro",
              link: "/setup/astro/",
            },
          ],
        },
        {
          label: "Guides",
          items: [
            {
              label: "Write an integration",
              link: "/guides/integration/",
            },
          ],
        },
        {
          label: "Integrations",
          autogenerate: {
            directory: "integrations",
          },
        },
        {
          label: "Reference",
          autogenerate: {
            directory: "reference",
          },
        },
      ],
      customCss: ["./src/tailwind.css"],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
    sentry(),
    spotlight()
  ],
});