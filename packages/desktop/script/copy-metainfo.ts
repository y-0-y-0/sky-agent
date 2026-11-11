import { desktopBrand } from "../brand"

const arg = process.argv[2]

const brand = desktopBrand(arg ?? process.env.OPENCODE_CHANNEL)

const appId = brand.id

const productName = brand.name

const summary = "Independent OpenCode desktop fork"

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="io.github.y0y0">
    <name>Sky Agent contributors</name>
  </developer>

  <description>
    <p>
      ${productName} is an independent fork of OpenCode, an open source AI coding agent.
      It is not affiliated with or endorsed by OpenCode or Anomaly Innovations Inc.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://github.com/y-0-y-0/sky-agent/issues</url>
  <url type="homepage">https://github.com/y-0-y-0/sky-agent</url>
  <url type="vcs-browser">https://github.com/y-0-y-0/sky-agent</url>
</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)

console.log(`Generated metainfo for ${brand.channel} at resources/${appId}.metainfo.xml`)
