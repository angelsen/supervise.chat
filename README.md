# supervise.chat

The public site for supervise: Astro Starlight, themed from Material 3 tokens.

```bash
pnpm install
pnpm dev        # local server
pnpm build      # static site in dist/
```

Two files under `src/` are generated and committed, so a build needs neither
tool:

- `src/styles/m3.css`: `pnpm tokens` (bun, and the local m3.material.io token
  mirror).
- `src/generated/seatview.json`: from the repository root,
  `uv run python www/scripts/seatview-gen.py > www/src/generated/seatview.json`
  (supervise's own seat-view renderer on a made-up project).
