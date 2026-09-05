import { Command } from 'commander';

import { runMapDiff } from './map/diff.js';
import { runMapFetch } from './map/fetch.js';
import { runMapHtml } from './map/html.js';
import { runPick } from './pick/output.js';

const program = new Command();

program
  .name('skillpack')
  .description(
    'Recommend and safely combine meta-skill frameworks for AI coding agents',
  )
  .version('0.1.0');

program
  .command('pick')
  .description(
    'Interactive quiz → one primary router + safe cherry-pick list + install snippets',
  )
  .option('-y, --yes', 'Non-interactive (requires --answers)')
  .option('--answers <file>', 'JSON file of quiz answers (questionId → optionId)')
  .option('--json', 'Emit recommendation as JSON')
  .action(async (opts: { yes?: boolean; answers?: string; json?: boolean }) => {
    try {
      await runPick({
        yes: opts.yes,
        answersPath: opts.answers,
        json: opts.json,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

const map = program
  .command('map')
  .description('Inventory, diff, and HTML report for the three skill packs');

map
  .command('fetch')
  .description('Download & parse the three pack repos into the local cache')
  .option('--refresh', 'Force re-download even if cache exists')
  .action(async (opts: { refresh?: boolean }) => {
    try {
      await runMapFetch({ refresh: opts.refresh });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

map
  .command('diff')
  .description(
    'Unique / overlapping / conflict report across the three packs',
  )
  .option('--json', 'Emit structured JSON')
  .option(
    '--fail-on-collision',
    'Exit 1 if any red conflict is found (for CI)',
  )
  .action(
    async (opts: { json?: boolean; failOnCollision?: boolean }) => {
      try {
        const code = await runMapDiff({
          json: opts.json,
          failOnCollision: opts.failOnCollision,
        });
        process.exitCode = code;
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    },
  );

map
  .command('html')
  .description('Write a self-contained skillpack-map.html report')
  .option('-o, --output <path>', 'Output path', 'skillpack-map.html')
  .action(async (opts: { output?: string }) => {
    try {
      await runMapHtml({ output: opts.output });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
