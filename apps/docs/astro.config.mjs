// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

// https://astro.build/config
export default defineConfig({
  server: {
    port: 4374
  },

  integrations: [
    starlight({
      plugins: [
        // Generate the documentation.
        starlightTypeDoc({
          entryPoints: [
            "../../packages/app-connector/src/index.ts",
            "../../packages/podspec/src/index.ts"
          ],
          tsconfig: "../../packages/app-connector/tsconfig.json"
        })
      ],
      title: "Zapp SDK",
      social: {
        github: "https://github.com/proofcarryingdata/zupass",
        "x.com": "https://twitter.com/zupassproject"
      },
      components: {
        SiteTitle: "./src/components/starlight/SiteTitle.astro"
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Introduction", slug: "guides/introduction" },
            { label: "Getting Started", slug: "guides/getting-started" }
          ]
        },
        typeDocSidebarGroup
      ],
      customCss: ["./src/tailwind.css"]
    }),
    tailwind({ applyBaseStyles: false })
  ]
});
