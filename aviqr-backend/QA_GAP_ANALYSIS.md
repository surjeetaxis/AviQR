# QA Gap Analysis: AviQR Platform vs. Enterprise Multi-Tenant Marketplace Spec

Scope: compares the current AviQR codebase (backend: `aviqr-backend`, web: `aviqr-ui-web`, mobile: `aviqr-mobile-expo`) against the pasted enterprise spec (multi-tenant org hierarchy, RBAC, supplier/hotel/restaurant/retail management, subscriptions, billing, QR payments, support, audit logs). No code was changed for this report.

**Bottom line: AviQR today is a QR-based ordering platform for independently-owned shops/hotels/malls with light admin tooling. It is not a multi-tenant enterprise marketplace.** Roughly 10-15% of the spec exists in real, working form; another ~20% exists as stubs, hardcoded strings, or mock UI data; the rest is absent.

---

## 1. Multi-tenant org hierarchy (Organization → Business Unit → Location → Outlet → Department)

**Missing.** No `Organization`, `BusinessUnit`, `Location`, `Outlet`, or `Department` entities anywhere. `Shop`, `Hotel`, and `Mall` (shop-service, hotel-service, mall-service) are flat, independently-owned records (`ownerId`/`adminId`), with no parent-group concept. There is no `HotelGroup`, `RestaurantChain`, or `ShopChain`. `User` has loose `shopId/hotelId/mallId/brandId` fields but nothing links multiple shops/hotels under one owner as a "chain."

**Impact:** Section 1, 2, 7, 8, 9 of the spec (hotel groups, restaurant groups, retail chains, tenant data isolation) have no structural support. Tenant isolation today is per-record ownership, not per-organization scoping.

## 2. RBAC (roles & permissions)

**Partial — hardcoded enums, no permission framework.**
- `auth-service/entity/UserRole.java`: 12 hardcoded values (`OWNER, MANAGER, CASHIER, KITCHEN, MENU_EDITOR, ORDER_VIEWER, ADMIN, SUPPORT, SUPPLIER, HOTEL, MALL, CUSTOMER`).
- `shop-service/entity/StaffRole.java`: separate, shop-scoped enum.
- `ShopStaff.permissions` is a free-text `List<String>`, not enforced anywhere.
- Web `AuthContext.jsx` recognizes 10 roles; mobile recognizes 7, with admin/hotel/supplier/mall/support reduced to a single stub screen each.

**Missing vs. spec:** no DB-backed `roles`/`permissions` tables, no Platform Admin vs. Super Admin separation, no Supplier Manager/Hotel Manager/Restaurant Manager/Branch Manager/Outlet Manager as distinct roles — these all collapse into the generic `MANAGER`/`OWNER` enum values with no scoping to a specific entity instance beyond the single ID fields on `User`.

## 3. Supplier management

**Missing — `Vendor` is not a B2B supplier.** `mall-service/entity/Vendor.java` represents a mall stall (`mallId, name, category, floor, contact, shopId`), not a supplier with warehouses, purchase orders, or deliveries. No `Supplier`, `Warehouse`, `PurchaseOrder`, or `Delivery` entity/table exists in the schema or codebase. The web `SupplierDashboard.jsx` shows an outlet list and stub Menu Sync/Reports tabs — no warehouse, PO, or delivery UI.

## 4. Product management

**Partial.** `menu-service/entity/MenuItem.java` has name/description/single `imageUrl`/single `price`, plus ranking metadata (rating, salesVolume, rankingScore). No SKU, brand, variants, multi-image galleries, videos, or documents. `Category` exists but is minimal (no subcategories).

## 5. Subscription & billing

**Partial — string field only, no real subscription system.** `Shop`, `Hotel`, `Mall` each have a plain `subscriptionPlan: String` (e.g. `"STARTER"`) with no FK, no plan-definition table, no validity/renewal dates, no invoice entity. Web `AdminDashboard.jsx` has a "Subscription" tab and hardcoded plan names in a dropdown, but no upgrade/downgrade workflow, no invoice history, no renewal reminders. No `invoices`, `subscriptions` tables in the DB schema.

## 6. Billing & payments

**Partial, order-centric only.** `payment-service/entity/Payment.java` is tied to `orderId` and uses Razorpay for order checkout. There is no subscription billing, no tax calculation, no centralized Paid/Unpaid/Overdue/Failed/Pending-Verification status model spanning subscriptions + orders — only per-order payment status.

## 7. QR payments

**Partial — QR is navigation, not payment.** `qr-service` (`QrCode`, `QrScanLog`) tracks scan counts and routes to ordering (`SHOP, TABLE, GROUP, MALL, HOTEL_ROOM, CAMPAIGN` types). Actual payment happens via Razorpay in `payment-service`, decoupled from the QR record. No "QR for subscription/invoice/renewal" concept, and QR payment states (Created/Scanned/Paid/Expired) aren't modeled — only scan-count.

## 8. Order lifecycle

**Partial — 7 states vs. spec's 11.** `order-service/entity/OrderStatus.java`: `NEW, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED, REJECTED`. Spec wants `Draft, Pending, Confirmed, Processing, Packed, Shipped, Delivered, Completed, Cancelled, Returned, Refunded`. Current model fits dine-in/takeout restaurant flow, not e-commerce/shipping flow (no Packed/Shipped/Delivered/Returned/Refunded states).

## 9. Support system

**Partial.** `support-service/entity/SupportTicket.java` + `TicketStatus` (`OPEN, PENDING, RESOLVED, CLOSED`) — missing `ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER`. No escalation level or internal-notes field on the entity (web `SupportDashboard.jsx` has assign/reply UI but backed by mock data, not the real ticket fields). `ImpersonationLog` exists and is audited.

## 10. Notifications

**Partial — storage only, channels stubbed.** `notification-service` persists to MongoDB (`Notification` doc: userId/title/body/type/read) and consumes RabbitMQ events (`order.new.queue`, `hotel.request.queue`). Code comments mark FCM push / WhatsApp via Twilio as "in production" TODOs — no actual Email/SMS/WhatsApp send implementation exists today; only in-app storage.

## 11. Audit logs

**Partial — auth-service only, not platform-wide.** `auth-service/service/AuditLogService.java` logs user status/role/delete actions to MongoDB. `ImpersonationLog` covers impersonation separately. No `activity_logs` table, and no audit trail for orders, payments, or permission changes outside auth-service. Web `SupportDashboard.jsx` has an Audit panel, but it renders mock data, not a live cross-service feed.

## 12. Dashboards

**Partial.** Web has real dashboards for admin, supplier, hotel, mall, support (`aviqr-ui-web/src/pages/{admin,supplier,hotel,mall,support}`), each with KPI cards and some charts (e.g. `AdminDashboard.jsx` has revenue/signup charts + 8 KPI cards). Missing: dedicated restaurant-group, retail-chain, branch-manager, and outlet-manager dashboards — these all currently share one generic owner/staff layout. Mobile app dashboards for non-owner/non-customer roles (admin, hotel, supplier, mall, support) are single-screen stubs with no sub-navigation.

## 13. Database schema

Current tables (`aviqr_setup.sql`): `users, otp_records, refresh_tokens, shops, shop_opening_hours, shop_staff, staff_permissions, shop_settings, categories, menu_items, pricing_rules, orders, order_items, payments, qr_codes, qr_scan_logs, hotels, hotel_enabled_services, rooms, room_requests, malls, vendors, support_tickets, impersonation_logs, report_snapshots, reviews`.

**Entirely absent from schema:** `organizations, business_units, locations, outlets, departments, suppliers, warehouses, products, product_categories (generic), product_variants, inventories, invoices, subscriptions, notifications (relational), activity_logs, qr_payments`.

## 14. Seed data

Not evaluated in depth here (no code changes made), but given the schema gap above, idempotent seed data for the spec's 13 roles and downstream entities (suppliers, hotel groups, restaurant groups, subscriptions, invoices) cannot exist yet because the underlying tables don't exist.

## 15. Services not in the spec (extra capabilities already built)

- `ocr-service`: menu digitization — image/PDF upload → extracted menu items via OCR, feeding `menu-service`.
- `review-service`: shop/menu-item/order ratings & reviews.

These are mature, working additions beyond the spec's listed scope and don't need rework for this gap analysis.

---

## Priority gaps if the enterprise spec is the actual target

1. **No organization/chain hierarchy** — every "Group Owner" role in the spec (Hotel Group, Restaurant Group, Shop chain) has nothing to attach to. This is the foundational schema change; everything else (RBAC scoping, chain dashboards, multi-outlet billing) depends on it.
2. **No supplier/warehouse domain** — `mall-service.Vendor` is unrelated; a real B2B supplier module would need new entities end-to-end (schema, service, controller, UI).
3. **No real subscription/invoice system** — `subscriptionPlan` strings need to become a proper `subscriptions` + `invoices` model with renewal/upgrade logic.
4. **RBAC is enum-based, not data-driven** — adding the spec's ~13 roles with org-scoped permissions requires a `roles`/`permissions` table and a scoping mechanism (which organization/outlet a role applies to), not just more enum values.
5. **Mock data in "working" UI** — Support and Audit dashboards in the web app look complete but are wired to mock arrays, not live APIs; verify before counting them as done.
