# RepCard — Asset Generation Prompts

One prompt per asset. Written for gpt-image-class models (ChatGPT/Codex CLI, DALL-E,
Midjourney all accept this shape). Palette is fixed across every asset:

- Emerald primary `#10B981` · light emerald `#34D399` · deep emerald `#065F46`
- Near-black green ground `#04120C` · ink `#052E22` · white `#FFFFFF`

Style constants (append to any prompt if the model drifts): *flat modern vector, soft
inner glows, premium fintech aesthetic, no photorealism, no watermark, no extraneous text.*

---

## 1. App icon (`icon.png`, 1024×1024, opaque)

> An iOS app icon, 1024×1024. A minimalist sports trading card seen slightly rotated
> (3 degrees), centered on a deep near-black green background (#04120C). The card has a
> vivid emerald gradient border (#34D399 → #065F46), a dark interior, and on the card face
> only three abstract elements: a large glowing emerald number "87" top-left, a small
> lightning-bolt glyph top-right, and two thin horizontal emerald bars in the lower third
> suggesting stats. Flat modern vector style, soft inner glow, no photorealism, no text
> other than the number 87, square edge-to-edge composition (iOS applies its own mask),
> premium fintech-app aesthetic.

## 2. Android adaptive foreground (`android-icon-foreground.png`, 1024×1024, transparent)

> The same minimalist emerald trading card as the app icon — rotated 3 degrees, emerald
> gradient border, glowing "87", bolt glyph, two stat bars — isolated on a fully
> TRANSPARENT background, scaled so the whole card fits inside the central 66% safe zone
> of a 1024×1024 canvas (Android crops the outer ring). Flat vector, soft glow, no
> background of any kind.

## 3. Android adaptive monochrome (`android-icon-monochrome.png`, 1024×1024, transparent)

> A single-color WHITE silhouette version of the emerald trading-card icon: card outline
> with rounded corners, the number 87, bolt glyph, and two stat bars all as solid white
> shapes on a fully transparent background. No gradients, no gray, pure #FFFFFF fills
> only, centered in the 66% safe zone of a 1024×1024 canvas.

## 4. Splash logo (`splash-logo.png`, ~1024×512, transparent)

> A horizontal white wordmark lockup on a fully transparent background: a small simplified
> white trading-card glyph (rounded-corner card outline containing a tiny bolt) followed by
> the word "RepCard" in a bold geometric sans-serif, all pure white #FFFFFF. Clean flat
> vector, generous letter spacing, no background, no gradients, sized to sit centered on a
> dark emerald splash screen.

## 5. Welcome hero background (`welcome-bg.png`, 1080×1920 portrait)

> A moody, dark atmospheric gym scene for a mobile welcome screen, portrait 9:16. Deep
> near-black green tones (#04120C shadows) with a single dramatic emerald rim light
> (#10B981) tracing the silhouette of a barbell on a rack in the lower third; heavy
> vignette, subtle film grain, large soft negative space in the upper two thirds for
> overlay text. Cinematic, premium, no people's faces, no logos, no text.

## 6. Streak flame (`streak-flame.png`, 512×512, transparent)

> A small app icon of a stylized flame merged with a lightning bolt, drawn as a flat
> vector glyph: emerald gradient fill (#34D399 top → #10B981 base) with a subtle inner
> glow, on a fully transparent background, centered with 15% padding. Bold, rounded,
> friendly — reads clearly at 24 pixels. No text, no background.

## 7. Store feature banner (`store-banner.png`, 1024×500)

> A wide store feature graphic: the emerald trading-card icon standing slightly rotated on
> the right third, casting a soft glow onto a deep near-black green ground (#04120C);
> the left two-thirds is clean negative space with a faint emerald grid pattern at 4%
> opacity. Flat premium vector aesthetic, no text (typography is overlaid separately),
> no photorealism.

---

## 8a. Store screenshot backdrop A (`shot-frame-a.png`, 1024×1820)

> Portrait store-screenshot backdrop: deep near-black green ground with a large soft
> emerald radial glow centered in the upper half where a phone mockup will sit, faint
> 4%-opacity grid, subtle edge vignette. Pure backdrop — no devices, no text.

## 8b. Store screenshot backdrop B (`shot-frame-b.png`, 1024×1820)

> Portrait store-screenshot backdrop, deep near-black green ground: a large soft
> emerald glow sweeping diagonally from the lower-left corner, three oversized
> translucent emerald trading-card outlines drifting in the background at 6% opacity,
> a faint 4%-opacity grid, and a subtle edge vignette. Pure backdrop — no devices,
> no text.

## 9. Empty-state spot art (`empty-state-art.png`, 1024×1024, transparent)

> A stack of three minimalist emerald trading cards fanned like a hand of cards, top
> card showing a faint glowing 87 and stat bars, flat vector glow style, fully
> transparent background, centered with 12% padding.

## Post-processing (deterministic, `sips` on macOS)

```bash
# resize master -> required sizes
sips -z 1024 1024 icon-master.png --out assets/images/icon.png
sips -z 1024 1024 foreground.png --out assets/images/android-icon-foreground.png
# splash: keep aspect, cap width
sips --resampleWidth 1024 splash-logo.png --out assets/images/splash-logo.png
```

Android adaptive background is a flat color (`#065F46`) — set in app.json, no image needed.
