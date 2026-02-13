# Task: Products Page Redesign — Match Shopify Native Look

## Goal
Completely redesign `src/web/pages/ShopifyProducts.tsx` to look like Shopify's native Products page. Make it clean, spacious, and professional. The current version is cramped with cut-off product names.

## Reference: Shopify Native Products Page Layout
The target design looks like this:
- **Full-width table** that uses ALL available horizontal space
- **Product column**: Thumbnail (small, ~40px) + Full product name (NOT truncated) + Status badge (Draft/Active) all in one row — the name takes as much space as it needs
- **Status badges**: Small, colored pills — Draft = grey/blue, Active = green, compact `<Badge>` components
- **Clean columns**: Product | Status | SKU | Price | AI Description | Images | eBay Status
- **NO separate Shopify Status column** — status is INLINE with the product name
- **NO Actions column in the table** — move actions to a detail view or hover
- **Tabs at the top**: All | Draft | Active (like Shopify's filter tabs, not dropdown)
- **Compact row height** — no excessive padding
- **Search bar** at top, full width

## Specific Changes Required

### 1. Remove Actions column from the table
The "Run Pipeline" and "View on eBay" buttons are taking too much space. Remove the Actions column entirely. Users click the row to go to product detail where actions live.

### 2. Replace dropdown filters with Tabs
Replace the `<Select>` dropdown filter with Polaris `<Tabs>` component at the top:
- All (count)
- Draft (count) 
- Active (count)
- Needs Description (count)
- Needs Images (count)
- Listed on eBay (count)

### 3. Product name column
- Show the FULL product name — no truncation
- Thumbnail (extra-small, ~32px) on the left
- Product name as a clickable link
- Status badge (Draft/Active) immediately after the name, on the same line
- This column should take the majority of the width

### 4. Simplify status indicators
Replace `❌ Not yet` / `✅ Done` with cleaner indicators:
- AI Description: small dot/icon — green checkmark if done, grey dash if not
- Images Processed: same pattern
- eBay Status: Badge — "Listed" (green), "Draft" (blue), "—" if not listed

### 5. Summary cards at top
Keep the Catalog Summary card but make it cleaner:
- Horizontal stat pills, not a full card
- Example: "1,162 products · 0 AI descriptions · 0 images processed · 1 eBay draft"

### 6. Responsive table
- Use Polaris `<IndexTable>` properly
- Product name column should flex to fill available space
- Other columns should be fixed-width and compact
- Remove the checkbox column (not needed)

### 7. Sort controls
- Keep sort by dropdown but make it subtle (top-right, near search)
- Default sort: Draft first, then Active

## Files to modify
- `src/web/pages/ShopifyProducts.tsx` — main redesign (the product list/table section, NOT the detail view `ShopifyProductDetail`)

## Technical constraints
- Use only `@shopify/polaris` components (already imported)
- Keep all existing data fetching (useQuery, apiClient) — don't change API calls
- Keep the `ShopifyProductDetail` component unchanged — only modify the list view
- Keep existing `navigate` and routing logic
- TypeScript must pass (`npx tsc --noEmit`)
- Keep `lucide-react` icons if needed but prefer Polaris icons where available

## DO NOT
- Change any API endpoints or backend code
- Modify the ShopifyProductDetail component
- Break existing functionality (search, filter, sort, pagination, navigation)
- Add new npm dependencies
