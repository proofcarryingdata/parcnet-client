import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
// @ts-check
import { defineConfig } from "astro/config";
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
        github: "https://github.com/proofcarryingdata/parcnet-client",
        "x.com": "https://twitter.com/zupassproject",
        telegram: "https://t.me/zupass"
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
            { label: "Getting Started", slug: "guides/getting-started" },
            {
              label: "Making Proofs about Ticket PODs",
              slug: "guides/ticket-proofs"
            }
          ]
        },
        typeDocSidebarGroup
      ],
      customCss: ["./src/tailwind.css"]
    }),
    tailwind({ applyBaseStyles: false })
  ]
});
