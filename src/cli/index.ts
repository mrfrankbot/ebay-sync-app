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
import { syncPrices } from '../sync/price-sync.js';
import { syncFulfillments } from '../sync/fulfillment-sync.js';
import { getValidEbayToken, getValidShopifyToken } from '../ebay/token-manager.js';
import { info, error as logError } from '../utils/logger.js';

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
  .option('--watch <minutes>', 'Poll continuously every N minutes')
  .action(async (opts: { since?: string; dryRun?: boolean; json?: boolean; watch?: string }) => {
    const runSync = async () => {
      const ebayToken = await getValidEbayToken();
      const shopifyToken = await getValidShopifyToken();

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
      info(`  ${new Date().toISOString()}`);
      info('');

      // 1. Order sync (eBay → Shopify)
      const orderSpinner = ora('Step 1/4: Syncing eBay orders → Shopify').start();
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

      // 2. Price sync (Shopify → eBay)
      const priceSpinner = ora('Step 2/4: Syncing prices Shopify → eBay').start();
      try {
        const priceResult = await syncPrices(ebayToken, shopifyToken, {
          dryRun: opts.dryRun,
        });
        priceSpinner.succeed(
          `Prices: ${priceResult.updated} updated, ${priceResult.skipped} unchanged, ${priceResult.failed} failed`,
        );
      } catch (err) {
        priceSpinner.fail(`Price sync error: ${err instanceof Error ? err.message : err}`);
      }

      // 3. Inventory sync (Shopify → eBay)
      const invSpinner = ora('Step 3/4: Syncing inventory Shopify → eBay').start();
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

      // 4. Fulfillment sync (Shopify → eBay)
      const fulfillSpinner = ora('Step 4/4: Syncing fulfillments Shopify → eBay').start();
      try {
        const fulfillResult = await syncFulfillments(ebayToken, shopifyToken, {
          dryRun: opts.dryRun,
        });
        fulfillSpinner.succeed(
          `Fulfillments: ${fulfillResult.updated} shipped, ${fulfillResult.skipped} unchanged, ${fulfillResult.failed} failed`,
        );
      } catch (err) {
        fulfillSpinner.fail(`Fulfillment sync error: ${err instanceof Error ? err.message : err}`);
      }

      info('');
      info('Sync complete.');
    };

    await runSync();

    // Watch mode — poll continuously
    if (opts.watch) {
      const intervalMin = parseInt(opts.watch) || 15;
      info(`\nWatch mode: polling every ${intervalMin} minutes. Ctrl+C to stop.`);
      setInterval(runSync, intervalMin * 60 * 1000);
      // Keep process alive
      await new Promise(() => {});
    }
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
