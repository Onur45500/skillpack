# Contributing

Thanks for helping keep skillpack current as the three meta-skill frameworks evolve.

## Setup

```bash
git clone https://github.com/Onur45500/skillpack.git
cd skillpack
npm install
npm test
```

## Add a quiz question or change scoring

1. Edit [`src/pick/scoring-rules.ts`](src/pick/scoring-rules.ts).
2. Add a `Question` with short prompt + 2–4 punchy options and `scores` per pack.
3. Keep the total quiz at ≤7 questions.
4. Add or update a fixture in `tests/scoring.test.ts` and an example under `examples/`.
5. Tie-breaks are deterministic via `TIE_BREAK_ORDER` — do not re-ask questions.

## Update pack URLs / install snippets / keywords

Edit [`src/config/packs.ts`](src/config/packs.ts) only. Do not hardcode skill counts in README or help text.

## Regenerate the bundled snapshot

Requires network access:

```bash
npm run regenerate-snapshot
```

This writes `data/inventory.json` from live GitHub tarballs. Commit the updated file and note the date in the PR.

## Adapter layout drift

If a pack renames directories, update the matching parser in [`src/shared/adapters/index.ts`](src/shared/adapters/index.ts). Parsers **must** throw when they find 0 skills (parse-health guard).

## Tests

```bash
npm test
```

All tests are fixture/mocked — CI never clones live repos.

## Pull requests

Use the PR template checklist. Keep changes focused (scoring vs. adapters vs. docs in separate PRs when practical).
