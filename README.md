# Atlas Automations website

Front end only, for now. Plain HTML, CSS and JavaScript with no build step, so it can be hosted anywhere static (Vercel, Netlify, cPanel).

## Run it locally

```
node tools/serve.js
```

Then open http://localhost:8090. Use the server rather than double-clicking `index.html`: the videos need it to loop smoothly.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole page. All the copy lives here, so edit words directly in this file |
| `assets/css/atlas.css` | All styling. Colours, type sizes and spacing are tokens at the top |
| `assets/js/main.js` | Motion and interaction: the hero, the phone story, the case study reel, the finale |
| `assets/vendor/` | GSAP 3.15 (with ScrollTrigger and SplitText) and Lenis, stored locally |
| `assets/media/` | 8 short VSI clips (540×960 MP4, no audio) and a poster image for each |
| `assets/img/` | Screenshots of the VSI site and newsletter, plus the favicon |

## The page, top to bottom

1. **Hero**: "Seen. Found. Handled." The logo assembles on load. As you scroll, it opens like a pair of doors.
2. **Story** (`#story`): one customer, one morning, told in four timestamps. The phone swaps screens as each chapter reaches the middle of the screen.
3. **Manifesto**: the words light up as you read.
4. **Services** (`#services`): animated content, then web design and SEO, then automation. Each has its own visual.
5. **Case study** (`#work`): VSI Accountants in a sideways reel. It's pinned on desktop and swipes on phones.
6. **Process** (`#process`) and **FAQ** (`#faq`): the light section.
7. **Finale** (`#contact`): the logo halves come back together. "Put the world down."

## Brand tokens

```
--abyss   #041419   page background (petrol-tinted black)
--petrol  #0389A6   logo, left half (sampled from Atlas logo.jpeg)
--signal  #04D8D9   logo, right half, and all CTAs
--foam    #E6F5F4   text on dark
--daylight #EAF4F3  the process + FAQ section
```

Type is **Archivo** throughout, used at different widths: titles at 125% width, weight 800; timestamps at 125% width, weight 200; body text at normal width.

The logo mark is rebuilt as an SVG from the supplied JPEG (the two half-hexagons plus the small square), so it scales cleanly. Ask for the original vector file and swap it in if the geometry is ever slightly off.

## Accessibility and fallbacks

- `prefers-reduced-motion`: no smooth scroll, no pinning and no autoplay. Everything shows in its final state.
- No JavaScript: every section is still readable, and the case study becomes a swipeable row.
- Videos only play while they're on screen. The case study has a "Pause videos" button.

## To check before going live

Everything in this list is a claim a client could hold Atlas to, or a detail only you can confirm:

- **Booking link**: every "Book a call" button goes to `calendly.com/drikusbisschoff/al-agency-discovery-call`. The slug still says "al-agency".
- **Email**: `discover@atlasleadsagency.com`, the Atlas Leads domain. Swap it if Atlas Automations gets its own.
- **VSI permission**: VSI's videos, site and name are used as a case study. Confirm they're happy to be featured.
- **"13 animated videos"**: counted from the compositions in `vsi-video/src/Root.tsx`.
- **FAQ timings**: "one to two weeks" per video and "four to six weeks" per website.
- **FAQ promises**: "we work across South Africa", "you own everything once paid", and "fixed quote in rand".
- **Story copy**: "within a minute she has a reply" describes what the automation can do, not a measured result.
- **VSI hero photo**: the VSI site screenshots include `hero-tower.jpg`, whose licence VSI's own notes list as unconfirmed.

Content deliberately left out: VSI video end cards (they show Jan-Righardt's old mobile number, which VSI's notes say must not be republished) and the "No lecture" line (VSI rejected that phrasing in September 2026).
