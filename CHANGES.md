# AviQR v2.1 — Changes from v2.0
## Updated June 2025

### New Pages Added
- `/inventory` — Stock tracking with low-stock alerts, inline editing, out-of-stock filter
- `/loyalty` — Customer loyalty dashboard: add points, redeem, member list, stats

### Pages Fixed & Improved

**Dashboard**
- Real greeting by time of day (Good morning/afternoon/evening + owner name)
- Low-stock alert banner links directly to Inventory page
- New order count shown in ticker
- AI Features added to quick actions grid
- Better empty states with helpful context

**Orders**
- Urgent order highlight (red border after 15 minutes)
- New order banner with "View new orders" CTA
- Cancel order button (for NEW and ACCEPTED orders)
- Table number search support
- Browser tab title flashes when new orders arrive
- KOT print and Invoice download buttons confirmed working

**Settings**
- Plan & Billing now reads actual `subscriptionPlan` from API
- Upgrade CTA shown when not on Business plan
- Notification toggles now save to backend
- GSTIN field auto-uppercases for GST compliance
- Shop description field added

**Sidebar**
- Inventory and Loyalty links added
- Live order count badge on Orders link
- Correct initials shown in shop card

### Mobile (Expo)
- Dashboard: proper greeting, offline indicator with context message
- New order alert banner with tap to navigate
- Removed silent fallback to mock data — offline state is explicit
- Order card shows table number and customer name correctly

### API Client (api/index.js)
- inventoryApi already present — connected to new Inventory page
- loyaltyApi already present — connected to new Loyalty page
- All 14 API namespaces confirmed mapped to correct endpoints

### What still needs backend work
1. Razorpay: set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env
2. WhatsApp: set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in .env
3. Inventory tables: run loyalty/inventory SQL migration (see INSTALL.md)
4. Subscription billing tables: invoices + subscriptions tables needed for billing

---

## AviQR v2.1 — New Features Added (June 2025)

### Feature: POS / Billing (`/billing`)
Full point-of-sale terminal in the browser:
- Browse menu by category with search
- Add items to bill with variant picker (S/M/L) and add-on selection
- Live cart with qty +/− controls, per-item notes
- GST calculation with editable tax rate per bill
- Payment method: Cash / UPI / Card
- Print KOT and download GST invoice after billing
- Customer name, phone, and table number fields

### Feature: Raw Materials & Recipes (`/raw-materials`)
Complete ingredient management:
- Ingredient master with unit, current stock, min level, cost/unit, supplier
- Stock adjustment (add or subtract with reason)
- Recipe editor: link ingredients to menu items with quantities
- Dish cost calculation: total ingredient cost per portion
- Gross margin display: selling price − dish cost = margin %
- Low stock alert banner with list of items below threshold
- Total inventory value calculation

### Feature: Menu Variations & Add-ons (`/variations`)
- Size/portion variants per menu item (Small/Medium/Large, Half/Full, 250ml/500ml)
- Default variant flag (shown first in POS and customer menu)
- Shop-wide add-on master (Extra Cheese, Extra Sauce, Butter)
- Add-ons apply to all items, selectable in POS and customer-facing QR menu
- Inline variant editor with save per item

### Feature: Advanced Analytics (`/analytics`)
- Revenue trend (7D/14D/30D/90D) with line chart
- Orders trend with coloured bar chart
- Food cost % and gross margin breakdown with industry benchmark comparison
- Raw material stock progress bars with low-stock highlighting
- Top 10 items by revenue with progress bars
- Revenue by category (horizontal bar chart + legend)
- Peak hours heatmap with staffing recommendation (peak/slow hour identification)
- Export all data to CSV

### Backend: New Java entities
- `MenuVariant` — size/portion variants per menu item
- `MenuAddon` — shop-wide add-on items
- `RawMaterial` — ingredient master with stock tracking
- `RecipeItem` — ingredient lines per menu item
- `VariantAddonService` + `RecipeService` — business logic
- `RecipeVariantController` — 15 new REST endpoints

### Database: New tables (SQL migration in aviqr_setup.sql Section 15)
- `menu_variants` — variants per item
- `menu_addons` — shop add-ons
- `raw_materials` — ingredient master
- `recipe_items` — recipe ingredient lines
