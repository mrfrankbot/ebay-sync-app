import { Command } from 'commander';
import ora from 'ora';
import { buildAuthCommand } from './auth.js';
import { buildProductsCommand } from './products.js';
import { buildOrdersCommand } from './orders.js';
import { buildInventoryCommand } from './inventory.js';
import { buildStatusCommand } from './status.js';
import { setVerbose } from '../utils/logger.js';
import { syncOrders } from '../sync/order-sync.js';
import { syncInventory } from '../sync/inventory-sync.js';
import { getDb } from '../db/client.js';
import { authTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { info, error as logError } from '../utils/logger.js';

const getToken = async (platform: string): Promise<string | null> => {
  const db = await getDb();
  const row = await db
    .select()
    .from(authTokens)
    .where(eq(authTokens.platform, platform))
    .get();
  return row?.accessToken ?? null;
};

const program = new Command();

program
  .name('ebaysync')
  .description('Shopify ↔ eBay sync tool for UsedCameraGear.com')
  .version('0.1.0')
  .option('--json', 'JSON output')
  .option('--dry-run', 'Preview changes without applying')
  .option('--verbose', 'Detailed logging');

program.hook('preAction', (command) => {
  const options = command.opts();
  setVerbose(Boolean(options.verbose));
});

// Top-level sync command — runs all sync operations
program
  .command('sync')
  .description('Run full sync: orders (eBay→Shopify) + inventory (Shopify→eBay)')
  .option('--since <date>', 'Only sync orders/changes after this date')
  .option('--dry-run', 'Preview changes without applying')
  .option('--json', 'Output as JSON')
  .action(async (opts: { since?: string; dryRun?: boolean; json?: boolean }) => {
    const ebayToken = await getToken('ebay');
    const shopifyToken = await getToken('shopify');

    if (!shopifyToken) {
      logError('Shopify not connected. Run: ebaysync auth shopify');
      process.exitCode = 1;
      return;
    }
    if (!ebayToken) {
      logError('eBay not connected. Run: ebaysync auth ebay');
      process.exitCode = 1;
      return;
    }

    info('=== Full Sync ===');
    info('');

    // 1. Order sync (eBay → Shopify)
    const orderSpinner = ora('Step 1/2: Syncing eBay orders → Shopify').start();
    try {
      const orderResult = await syncOrders(ebayToken, shopifyToken, {
        createdAfter: opts.since,
        dryRun: opts.dryRun,
      });
      orderSpinner.succeed(
        `Orders: ${orderResult.imported} imported, ${orderResult.skipped} skipped, ${orderResult.failed} failed`,
      );
    } catch (err) {
      orderSpinner.fail(`Order sync error: ${err instanceof Error ? err.message : err}`);
    }

    // 2. Inventory sync (Shopify → eBay)
    const invSpinner = ora('Step 2/2: Syncing inventory Shopify → eBay').start();
    try {
      const invResult = await syncInventory(ebayToken, shopifyToken, {
        dryRun: opts.dryRun,
      });
      invSpinner.succeed(
        `Inventory: ${invResult.updated} updated, ${invResult.skipped} unchanged, ${invResult.failed} failed`,
      );
    } catch (err) {
      invSpinner.fail(`Inventory sync error: ${err instanceof Error ? err.message : err}`);
    }

    info('');
    info('Sync complete.');
  });

program.addCommand(buildAuthCommand());
program.addCommand(buildProductsCommand());
program.addCommand(buildOrdersCommand());
program.addCommand(buildInventoryCommand());
program.addCommand(buildStatusCommand());

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
