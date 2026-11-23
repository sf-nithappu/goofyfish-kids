# Goofy Kids

Sixteen tiny stick-figure games for little kids (made for a 4-year-old), packaged as one app you launch from a picture menu.
Nothing ever ends, loses or keeps score. Any tap, click or key makes something fun happen.

Works on iPad, Android tablets and Mac laptops, online or offline.

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:5174
```

## Install it as an app

Host the folder anywhere static (GitHub Pages works), open it once, then:

- **iPad (Safari):** Share, Add to Home Screen.
- **Android tablet (Chrome):** menu, Install app / Add to Home screen.
- **Mac (Chrome or Edge):** the install icon in the address bar. **Safari:** File, Add to Dock.

It then opens full screen and works offline.

## For parents

Press and hold the small gear (bottom right of the menu) for 1.5 seconds: sound on/off, a play-time timer
(a bedtime screen appears when it runs out) and full screen. Inside a game the home button (top left) needs a
1.2 second hold, or hold Esc on a keyboard, so a toddler can't leave by accident.

## Add a game

See [GAMES.md](GAMES.md), then add it to `games.json` and run:

```sh
pnpm check <slug>   # plays it with a random-tapper bot on 4 device sizes
pnpm thumbs <slug>  # menu picture
pnpm build          # refresh the offline cache list (sw.js)
```

## Credits

The stick figure, drawing and sound code is adapted from [goofyfish](https://github.com/nilbuild/goofyfish)
by Kamran Ahmed (MIT, see LICENSE).
