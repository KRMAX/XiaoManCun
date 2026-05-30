# Xiaomancun Initial-Style Pixel Pack

Generated to better match the prototype screenshot's soft, pastel pixel-art direction:

- light yellow-green grass and muted olive details
- warm cream/tan soil, wood, and stone
- soft brown outlines instead of black outlines
- chunky readable shapes for a cozy rural farming game

## Files

Transparent, project-ready sheets live in `sheets/`:

- `xiaomancun-tiles-spring.png` - grass, field, path, water, wood, stone, and straw tiles
- `xiaomancun-courtyard-props.png` - simplified courtyard props matching the initial design more closely
- `xiaomancun-courtyard-props-detailed.png` - more detailed alternate prop sheet
- `xiaomancun-crops.png` - crop growth rows and harvested item icons
- `xiaomancun-buildings.png` - village buildings and small production structures
- `xiaomancun-characters-livestock.png` - farmer, NPCs, small livestock frames, and simple item icons

Original chroma-key generations live in `source/` for future reprocessing.

## Usage Notes

- The `sheets/` PNGs have transparent backgrounds.
- The source images used a magenta chroma-key background and were processed locally with the imagegen chroma-key helper.
- Sprites are arranged for manual slicing rather than exact engine metadata. Before production use, slice and normalize final sprites to the prototype's target grid sizes, for example 16x16 tiles and 32x32 or 48x48 objects.
- Use `xiaomancun-courtyard-props.png` as the preferred prop sheet. The detailed alternate is kept only as a richer reference.

## Prompt Set Summary

Built-in image generation was used. The prompts asked for project-bound 2D pixel-art sprite sheets using the attached gameplay screenshot as style reference, with uniform `#ff00ff` chroma-key backgrounds, no text, no labels, no UI, no watermark, low-contrast pastel colors, soft brown outlines, and separated sprites for slicing.
