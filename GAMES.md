# Writing a game

Every game is one file: `games/<slug>.html`. Copy `games/pop.html` and change the game part.
It loads `shared/kid.css`, `shared/shell.js` (home button, bedtime screen) and `shared/core.js` (stick figure,
drawing, particles, sound, input), then calls `kid({...})`. Read the comments at the top of each section in
`shared/core.js` for the helpers.

Toddler rules (age 4+, iPad / Android tablet / Mac laptop):

- Nothing ever ends, loses, or scores. No text, no numbers needed to play. A tap always does something fun.
- Any press works: touch, mouse, or any key (the core turns keys into taps at random spots).
- Big targets (fat-finger tolerance 30+ world units), big visuals, soft pentatonic sounds (`SND`, `note()`).
- Instant feedback on every input: sound + squash/wobble + a few confetti or ink bits.
- Style: ink outlines (`inkShape`), `PAL` toy colours as fills, wobbly ground (`groundLine()`), classic stick figure
  (`drawFigure` with an `Actor` and the `P` poses; add poses with `mk()`). No gradients.
- Fill the real screen: use `screenRect()` for edges. Keep the action in `VIEW.minW` around `focusX` for portrait.
- Never hide anything behind hover. Don't draw in the top-left 110px (the home button lives there).
- No network calls, no external assets, nothing but this one file.

Test: `pnpm check <slug>` plays with `?bot` on 4 device sizes, fails on console errors and writes screenshots to
`tmp/check/<slug>-<device>.png`. Look at them.
