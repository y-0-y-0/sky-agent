import { $ } from "bun"
import { mkdir } from "node:fs/promises"
import path from "node:path"

// Preserve source alpha and proportions, centering each export on a transparent square.
const source = path.resolve(import.meta.dir, "../../app/src/assets/sky-agent.png")
const dest = path.resolve(import.meta.dir, "../resources/icons")

await mkdir(dest, { recursive: true })

for (const size of [16, 24, 32, 48, 64, 96, 128, 180, 256, 512, 1024]) {
  await $`magick ${source} -background none -resize ${`${size}x${size}`} -gravity center -extent ${`${size}x${size}`} ${path.join(dest, `${size}x${size}.png`)}`
}

await $`magick ${source} -background none -resize 512x512 -gravity center -extent 512x512 ${path.join(dest, "icon.png")}`
await $`magick ${source} -background none -resize 256x256 -gravity center -extent 256x256 ${path.join(dest, "dock.png")}`
await $`magick ${source} -background none -resize 256x256 -gravity center -extent 256x256 -define icon:auto-resize=256,128,64,48,32,24,16 ${path.join(dest, "icon.ico")}`
await $`magick ${source} -background none -resize 512x512 -gravity center -extent 512x512 ${path.resolve(import.meta.dir, "../../app/src/assets/sky-agent-display.png")}`

console.log(`Generated Sky Agent Windows/Linux icons from ${source} in ${dest}`)
