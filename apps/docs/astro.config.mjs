// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Zapp SDK",
      social: {
        github: "https://github.com/withastro/starlight"
      },
      components: {
        SiteTitle: "./src/components/starlight/SiteTitle.astro"
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Getting Started", slug: "guides/getting-started" },
            { label: "Example Guide", slug: "guides/example" }
          ]
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" }
        }
      ],
      customCss: ["./src/tailwind.css"]
    }),
    tailwind({ applyBaseStyles: false })
  ]
});
