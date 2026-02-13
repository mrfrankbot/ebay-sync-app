# Task: Dashboard & Home Page Redesign — Make It Incredible

## Goal
Redesign `src/web/pages/Dashboard.tsx` to be a stunning, professional home page for the Product Bridge app. Think Shopify-quality design. It should feel like a premium SaaS dashboard, not a dev prototype.

## Current State
The current dashboard has:
- Basic sync status card with metric numbers
- Connections card (Shopify/eBay connected badges)
- Recent sync activity list
- It's functional but boring and doesn't guide the user

## What It Should Be

### Hero Section — App Status at a Glance
- Clean header: "Product Bridge" with a subtle tagline
- Large, prominent status indicator (green dot + "All systems operational" or warning state)
- Connection status: Shopify ✓ Connected | eBay ✓ Connected — as compact inline indicators, not separate cards

### Quick Stats Row
4-5 metric cards in a horizontal row, each with:
- A relevant Polaris icon
- The number (large, bold)
- Label below
- Subtle background or border
- Stats: Total Products | Listed on eBay | Pipeline Active | Orders | Revenue

### Quick Actions Section
Large, visually appealing action cards/buttons that guide the user:
- **"List Products on eBay"** → navigates to /listings (Products page)
  - Subtitle: "Browse your Shopify catalog and run the listing pipeline"
  - Icon: ProductIcon or similar
- **"View eBay Listings"** → navigates to /ebay/listings
  - Subtitle: "Manage your active and draft eBay listings"
  - Icon: StoreIcon or similar
- **"Pipeline"** → navigates to /pipeline
  - Subtitle: "Monitor AI descriptions, image processing, and listing creation"
  - Icon: WorkflowIcon or similar  
- **"Settings"** → navigates to /settings
  - Subtitle: "Configure connections, prompts, and sync preferences"
  - Icon: SettingsIcon

These should be styled as clickable cards with hover effects, using Polaris `Card` + `InlineStack` or a grid layout. Make them visually prominent — these are the main navigation for the app.

### Recent Activity Feed
Keep the activity feed but make it cleaner:
- Use a proper Polaris `ResourceList` or styled list
- Each entry: icon + description + timestamp + status badge
- "View all" link to /logs
- Show "No activity yet — list your first product!" as empty state with a CTA

### Pipeline Status (if any active jobs)
If there are active pipeline jobs, show a small section:
- "Pipeline Active: 2 jobs running"
- Mini progress indicators
- Link to /pipeline for details

## Design Principles
1. **Spacious** — generous padding, whitespace
2. **Hierarchical** — most important info is biggest/first
3. **Actionable** — every section has a clear next step
4. **Polaris-native** — looks like it belongs in Shopify admin
5. **Responsive** — works on different widths

## Files to modify
- `src/web/pages/Dashboard.tsx` — full redesign

## Technical constraints
- Use `@shopify/polaris` components: Page, Card, Layout, BlockStack, InlineStack, InlineGrid, Text, Badge, Button, Banner, Box, Divider, Icon
- Use `@shopify/polaris-icons` for all icons (already in package.json)
- Keep existing data hooks: `useStatus()`, `useLogs()`, `useAppStore()`
- Keep `useNavigate` from react-router-dom
- Keep the MetricCard component (import from '../components/MetricCard') or replace with better inline implementation
- TypeScript must pass (`npx tsc --noEmit`)
- Keep all existing API data structures — don't change what the hooks return

## DO NOT
- Change any API endpoints or backend code
- Add new npm dependencies
- Break the existing data flow
- Make it look like a template — it should feel bespoke and premium
