# Cynthy Gozy Collections: Code Responsibility Guide

This document explains what the application code does and which part of the ecommerce flow each code block owns. Responsibilities are grouped by code block rather than fixed line number so the guide remains useful after formatting or small edits change line positions.

## Application Shape

- **Framework:** Next.js App Router with React client components.
- **Backend:** Supabase Auth, Postgres, Row Level Security, and Storage.
- **Authentication boundary:** Supabase browser client in UI code plus middleware session refresh and route protection.
- **Main user flows:** Browse products, filter/search, open product details, add to cart, submit an order through WhatsApp, view order history.
- **Admin flows:** Manage products, upload images, set gender and variants, mark products as trending, view orders, confirm orders.

## Directory Map

```text
app/
  layout.tsx                 Global HTML shell and metadata
  page.tsx                   Storefront homepage and product browsing
  globals.css                Global Tailwind/theme styles
  account/page.tsx           Signed-in customer profile
  admin/page.tsx             Product inventory management
  admin/orders/page.tsx      Admin order queue and confirmation
  cart/page.tsx              Cart, checkout, and customer order history
  login/page.tsx             Password login
  signup/page.tsx            Account creation
components/
  Navbar.tsx                 Header search and bottom navigation
  ProductCard.tsx            Product display, variants, and cart action
lib/supabase/
  client.ts                  Browser Supabase client factory
  server.ts                  Server Supabase client factory
supabase/orders.sql          Orders table and RLS policies
middleware.ts                Auth refresh and route authorization
```

## Global Request Flow

1. `middleware.ts` refreshes the Supabase session and protects `/cart`, `/account`, and `/admin`.
2. `app/layout.tsx` supplies the global HTML/body shell.
3. Each page creates a browser Supabase client through `lib/supabase/client.ts`.
4. Product pages read from `products`; customer actions read or mutate `cart_items`.
5. Checkout inserts an immutable order snapshot into `orders`, deletes the submitted cart rows, and opens the vendor's WhatsApp chat.
6. Admin reads `orders` and changes `processing` orders to `confirmed`.

## `middleware.ts`

- Imports `createServerClient` to use Supabase Auth on the server and `NextResponse`/`NextRequest` to control requests and responses.
- `middleware(request)` creates a response that can carry refreshed auth cookies.
- The Supabase cookie adapter reads all request cookies and writes refreshed cookies to both the request response and outgoing response.
- `supabase.auth.getUser()` validates the current session instead of trusting an unverified cookie.
- The cloned URL is used for safe redirects while preserving the original request context.
- Unauthenticated `/cart` and `/account` requests redirect to `/login` with a `redirectTo` query value.
- `/admin` and all nested admin paths require a signed-in user.
- The `profiles` query checks the user's database role; non-admin users are redirected to `/`.
- `config.matcher` limits middleware work to protected paths.

## `app/layout.tsx`

- Imports Next metadata types, Geist fonts, and global CSS.
- Font declarations expose Geist variables to Tailwind through CSS classes.
- `metadata` defines the document title and description. These values are still starter text and should be customized for production.
- `dynamic = "force-dynamic"` prevents the root layout from being statically cached.
- `RootLayout` creates the `<html>` language/root class and a full-height flex `<body>` around all routes.

## `app/globals.css`

- Imports Tailwind CSS v4.
- Defines root background and foreground variables.
- Maps the variables and generated font variables into the Tailwind theme.
- The dark-mode media query changes the root colors when the system requests dark mode.
- The body applies the global background, foreground, and fallback font.

## `app/page.tsx`: Storefront Homepage

### Imports and constants

- React hooks manage loading, selected product, Supabase data, and carousel refs.
- `Navbar`, `ProductCard`, and the shared `Product` type connect the page to common UI/data contracts.
- `CATEGORIES` defines the homepage filters: all products, Men, Women, Clothes, Shoes, and Jewelries.

### `ProductCarouselRow`

- Receives one product batch and a product-selection callback.
- The `carouselRef` points to the row's horizontal scroll container.
- The effect registers pointer, touch, wheel, and scroll listeners.
- User interaction pauses that row's auto-scroll for 2.5 seconds.
- A row-specific interval advances one card every 3.5 seconds.
- At the end of a row, scrolling returns to the start.
- Cleanup clears the interval, timeout, and all listeners.
- The row renders one `ProductCard` wrapper per product.
- `hideLastOnMobile` hides the eleventh trending item on small screens while retaining it on desktop.
- The row is horizontally scrollable at all sizes, so desktop also receives the auto-scroll behavior.

### `HomePage` state and data

- `products` stores the current Supabase result.
- `selectedCategory` stores the active category filter.
- `selectedProduct` controls the full product detail modal.
- `loading` controls skeleton/empty/catalog rendering.
- `createClient()` creates the browser Supabase client once per component instance.
- `useSearchParams()` reads the homepage `search` query.
- The product effect queries all product columns ordered by newest first.
- Men filters by `gender = 'Male'`; Women filters by `gender = 'Female'`.
- Other non-All categories filter by the product `category` value.
- Search applies a case-insensitive product-name match.
- Successful data populates `products`; loading is cleared after the request.
- The development `console.log` prints the product result and query error.

### Product grouping

- `trendingProducts` keeps only products whose `trending` flag is true and limits the result to 11.
- `productRows` splits the complete filtered product list into batches of 11.
- Trending is rendered only for the All category and only when at least one product is marked trending.
- Each catalog batch renders below the previous batch, allowing additional rows without a hard total limit.

### Homepage rendering

- The outer wrapper provides the page background and vertical layout.
- `Navbar` supplies the top brand/search area and bottom navigation.
- The announcement banner communicates the store identity and supported categories.
- The Trending Now section displays the first product batch marked trending.
- Category buttons change the active query without a full page reload.
- Loading skeletons represent the product request state.
- The empty state appears when the query returns no products.
- Product rows display compact cards and open the selected-product modal on card selection.
- The modal closes when its backdrop or Close button is clicked; its inner click handler prevents accidental backdrop closing.
- The modal renders a non-compact `ProductCard`, which exposes the full description, variants, gender, and cart action.
- The footer displays the current year and store name.

## `components/Navbar.tsx`

- The component accepts `showSearch`; homepage uses the default `true`, while account, cart, admin, and admin orders pass `false`.
- `isAdmin` controls whether the Admin navigation action appears.
- `cartCount` displays the total quantity across the signed-in user's cart rows.
- `searchQuery` controls the homepage search input.
- `usePathname` highlights the active bottom-navigation route.
- The effect syncs the search input to the URL and loads the user's profile role and cart quantities.
- The `cart-updated` browser event refreshes the cart badge after a product-card add.
- `handleSearch` navigates only the homepage search route.
- `clearSearch` resets the homepage search query.
- The top header contains the store link and optional search form.
- The fixed bottom nav contains Home, conditional Admin, Cart, and Account links.
- `data-cart-target="true"` gives the product-card flight animation a stable cart destination.

## `components/ProductCard.tsx`

### Product contract

- `Product` defines the shared product fields used by homepage, admin, and detail views.
- `gender` supports Male, Female, Unisex, or an existing string value.
- `trending` controls inclusion in the homepage Trending Now row.
- `sizes` and `colors` are stored as comma-separated strings in the current UI contract.

### Props and derived values

- `compact` hides description, size, and color controls on homepage cards.
- `onSelect` makes the card clickable when supplied.
- `sizeList` and `colorList` split stored variant strings into selectable arrays.
- `selectedSize` and `selectedColor` hold the chosen variants in the full detail card.
- `adding` disables repeated submissions while the cart request is running.
- `added` controls the temporary Added Successfully button state.
- `imageRef` identifies the source image for the add-to-cart animation.

### Add-to-cart flow

- `animateCartAdd` finds the source image and navbar cart target, clones the image, and animates the clone toward the cart.
- `handleAddToCart` checks the Supabase session and redirects guests to login.
- It looks for an existing user/product cart row.
- Existing rows are incremented; otherwise a row is inserted with selected variants.
- A fallback insert omits variant columns for legacy cart schemas that do not contain them.
- A successful write dispatches `cart-updated`, starts the flight animation, and shows Added Successfully for five seconds.
- Failures are logged to the browser console and the loading state is always cleared.

### Card rendering

- Compact cards use the homepage's smaller filled image treatment.
- Full cards use a larger image frame and contained image rendering so the whole product picture stays inside the card.
- Category and gender badges identify the product.
- Full cards show size and color selectors side by side, followed by description.
- The cart button stops propagation so clicking it does not also open the product detail modal.

## `app/cart/page.tsx`

### Types and state

- `CartItem` models the joined `cart_items` to `products` query.
- `Order` models the customer-facing order summary.
- `cartItems` stores active cart contents.
- `loading` controls the initial cart skeleton.
- `userName` is placed into the WhatsApp message and order record.
- `orders` stores the customer's order history.
- `orderStatus` controls the checkout button text.

### Data operations

- `fetchCart` authenticates the user, loads cart rows, and loads all of that user's orders newest first.
- `updateQuantity` changes a cart row quantity while preventing values below one.
- `deleteItem` removes a cart row and refreshes the cart.
- `subtotal` calculates the current cart total from live product prices and quantities.

### WhatsApp checkout

- The configured `NEXT_PUBLIC_WHATSAPP_NUMBER` is normalized to digits.
- The current user and cart are required before checkout can continue.
- A readable order message is assembled from customer, item, quantity, price, and total data.
- An order snapshot is inserted into `orders` with `processing` status.
- After the order insert succeeds, all of that user's active cart rows are deleted.
- The new order is added to the local order history and the cart is emptied in the UI.
- The encoded message opens the vendor's `https://wa.me/<number>` chat.
- The button displays Order Processing until an admin confirms the order; customer order history displays the resulting status.

### Rendering

- The cart section shows loading, empty, or active-cart states.
- Quantity controls and delete actions mutate `cart_items`.
- The order summary shows subtotal and the WhatsApp action.
- The Your Orders section lists order ID prefix, creation time, total, and processing/confirmed status.

## `app/admin/page.tsx`: Inventory

- The local `Product` type includes gender and trending flags used by the inventory UI.
- Category and gender constants populate admin filters and form selectors.
- Product state stores the current inventory list and selected inventory category.
- `inventorySearch` filters the already-loaded inventory locally and never redirects to the homepage.
- Modal state controls create/edit mode.
- Form state stores name, description, price, category, gender, image, sizes, and colors.
- `fetchProducts` queries inventory ordered by newest first and applies the selected admin category.
- Create/edit modal functions reset or populate form state.
- Image selection creates a local preview and upload state.
- `addSize` and `addColor` prevent empty or duplicate variant values.
- `handleSubmit` uploads an image to the Supabase `products` bucket, creates or updates the database product, shows an in-app toast, closes the modal, and refreshes inventory.
- `handleDeleteProduct` confirms and deletes a product, then refreshes the list.
- `toggleTrending` updates the product's `trending` flag and updates local state without reloading.
- Each inventory card displays image, category, name, price, description, and edit/delete actions.
- The per-product More menu exposes Add to Trending or Remove from Trending.
- The modal form collects product name, category, gender, price, image, sizes, colors, and description.
- The toast displays success/error messages for five seconds.

## `app/admin/orders/page.tsx`

- `OrderItem` models one snapshot item stored in the order JSON.
- `Order` models the admin order record.
- `fetchOrders` loads all orders newest first; RLS limits this to admins.
- `confirmOrder` updates one processing order to confirmed and updates local state.
- The page renders customer, date, total, status, item lines, and a Confirm Order action.
- Confirmed orders no longer show the confirmation button.
- The Inventory link returns to product management.

## `app/account/page.tsx`

- Loads the signed-in Supabase user and matching profile row.
- Combines profile values with auth metadata fallbacks for name and phone.
- Shows customer identity, email, phone, and account creation date.
- `handleSignOut` signs out through Supabase, navigates home, and refreshes the route.
- Uses `Navbar showSearch={false}` because account pages do not perform storefront search.

## `app/login/page.tsx`

- Controlled email/password state powers the login form.
- `redirectTo` preserves the protected route the user originally requested.
- `signInWithPassword` authenticates through Supabase.
- Auth errors are rendered inside the page instead of browser alerts.
- Successful login navigates to the intended route and refreshes the app.
- The Remember me checkbox and Forgot Password link are currently visual controls only; they do not yet change auth behavior.

## `app/signup/page.tsx`

- Controlled fields collect first name, last name, email, phone, password, and confirmation.
- Password mismatch is rejected before calling Supabase.
- `signUp` stores full name and phone in Supabase user metadata.
- Auth errors are rendered in the form.
- Successful signup redirects to login with a success message query parameter.

## `lib/supabase/client.ts`

- Imports `createBrowserClient` from `@supabase/ssr`.
- `createClient` creates a browser-safe Supabase client using the two public environment variables.
- The anonymous key is safe for browser use only when Supabase RLS policies are correctly configured.

## `lib/supabase/server.ts`

- Imports the SSR client and Next's async cookie store.
- `createClient` creates a server-side Supabase client with request cookies.
- `getAll` exposes incoming cookies to Supabase.
- `setAll` writes refreshed auth cookies where the current server context permits it.
- The `try/catch` accommodates Server Component contexts where cookie mutation is unavailable and middleware performs the refresh instead.

## `supabase/orders.sql`

- Creates `public.orders` with user, customer, total, JSON item snapshot, status, and timestamp fields.
- Restricts status values to `processing` and `confirmed`.
- Enables Row Level Security.
- Users may read their own orders and insert orders for their own user ID.
- Admins are identified through `profiles.role = 'admin'` and may read all orders.
- Admins may update order status while the check constraint prevents unsupported statuses.
- Run this SQL in Supabase before using checkout or the admin orders page.
- The database also needs the existing `products.gender` and `products.trending` columns used by the current application.

## Configuration Files

### `package.json`

- `dev` starts the Next development server.
- `build` creates the production build.
- `start` runs the production server.
- `lint` runs ESLint.
- Dependencies provide Next, React, Supabase, Tailwind, Lucide icons, and class helpers.

### `tsconfig.json`

- Enables strict TypeScript checking and no emitted files.
- Uses bundler module resolution for Next.
- Enables the `@/*` alias to the project root.
- Includes app source, generated Next types, and TypeScript/MTS files.

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_WHATSAPP_NUMBER=...
```

`NEXT_PUBLIC_WHATSAPP_NUMBER` should contain the vendor's phone number. The cart code strips punctuation before building the WhatsApp URL.

## Important Data Contracts

### `products`

Expected fields include `id`, `name`, `description`, `price`, `category`, `gender`, `trending`, `image_url`, `sizes`, `colors`, `stock`, and `created_at`.

### `cart_items`

Expected fields include `id`, `user_id`, `product_id`, `quantity`, and optionally `selected_size`/`selected_color`. The product-card fallback supports older tables without the optional variant columns.

### `profiles`

Expected fields include `id` and `role`. The middleware and Navbar use `role = 'admin'` for authorization and admin navigation.

### `orders`

Expected fields and RLS policies are defined in `supabase/orders.sql`.

## Known Boundaries

- WhatsApp opening confirms that the browser opened a chat window, not that the vendor received or read the message. The application uses the database order state for processing and admin confirmation.
- RLS policies are the real security boundary for browser Supabase calls. Do not expose a service-role key in client code.
- Product sizes and colors are currently stored as strings/arrays rather than normalized variant tables.
- The login Remember me and Forgot Password controls are not fully implemented.
- Raw `<img>` elements are used throughout; ESLint may report image optimization advisories, but they are not compile errors.

## Validation Commands

Run from the `temo` directory:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
