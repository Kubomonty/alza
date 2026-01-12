# Alza Mock Interview Project

Mock e-shop project built for interview purposes (Next.js App Router + TypeScript + Tailwind).

## What’s implemented

- **Hero carousel**: draggable, looping carousel with buttons
- **Product grid**: tabbed listing
- **Mock API**: `/api/products` (POST) returns product data for selected category/country
- **Caching**: server-side caching via `next/cache` (`unstable_cache`) with revalidation
- **Responsive + a11y**: responsive layout, ARIA labels/roles where relevant

## Tech stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- ESLint + Prettier

## Getting started

Install and run:

```bash
npm install
npm run dev
```

Open: http://localhost:3000

### Useful scripts

- `npm run dev` – dev server
- `npm run build` – production build
- `npm run start` – run production build
- `npm run lint` – lint
- `npm run format` – format with Prettier

## Project structure (high level)

- `src/app/`
  - App Router pages + API routes
  - `page.tsx` fetches products on the server and renders the home page
  - `api/products/route.ts` mock backend endpoint
- `src/features/products/`
  - `domain/` product types/models, DTOs, typeguards, sorting, tab config, buy actions
  - `components/` product UI (grid, card, tabs, navigation, buy button integration, carousel)
- `src/ui/components/`
  - shared UI pieces (e.g. `StarRating`)
- `src/services/`
  - API clients (`productsApi.ts`) + cached wrapper (`productsApi.cached.ts`)

## Data flow overview

1. `src/app/page.tsx` calls `getProducts(...)`
2. `getProducts` uses `unstable_cache` (revalidate ~2 minutes) and falls back to direct fetch on cache errors
3. `fetchProducts` POSTs to the local mock API (`/api/products`)
4. API response is validated (`isProductsApiResponse`) and mapped from `ProductDTO` → domain `Product`

## Carousel behavior (how looping + drag works)

The carousel is built to feel “infinite” while staying implementation-simple:

- no DOM node moving/re-parenting
- only array rotation + a temporary drag translation

### 1) When looping is enabled (and when it isn’t)

Looping/dragging only turns on when there are _more products than fit on screen_:

- `capacity` = how many cards fit fully in the container
- `loopEnabled = products.length > capacity`

If everything fits, the carousel shows the products as-is and doesn’t enable drag/loop buttons.

### 2) Measuring card step and capacity

A metrics hook measures the first rendered card:

- `cardStepPx = cardWidth + horizontal margins`
- `capacity = floor(containerWidth / cardStepPx)` (minimum 1)

cardStepPx represents how many pixels the carousel must move to shift by 1 card.
capacity represents how many cards fit fully in the visible area.

### 3) “Infinite” feel via a repeated list (3×)

When looping is enabled, the carousel renders a repeated list:

- base: `[A, B, C, D]`
- rendered list: `[A, B, C, D, A, B, C, D, A, B, C, D]`

Because there are always items “before” and “after” the currently visible area, you don’t hit a hard edge while dragging.

Each rendered card gets a unique `carouselId` so React keys stay stable even for duplicates.

### 4) Looping logic: rotate the array by an `offset`

The carousel keeps an integer `offset` and uses it to rotate the rendered array.

Important detail: modulo is handled with a custom function so negative offsets wrap correctly.

Conceptually:

- `effectiveOffset = customMod(offset, base.length)`
- `productsArray = rotate(base, effectiveOffset)`

So “moving” the carousel is simply changing `offset`.

For example, with base `[A, B, C, D]`:

- rendered with `offset = 0` → `[A, B, C, D, A, B, C, D, A, B, C, D]`
- rendered with `offset = 1` → `[B, C, D, A, B, C, D, A, B, C, D, A]`
- rendered with `offset = -1` which can be represented as `offset = 3` thanks to custom modulo → `[D, A, B, C, D, A, B, C, D, A, B, C]`

### 5) Dragging: translate while the pointer is down

During pointer drag, the carousel does _not_ continuously change `offset`.
Instead it applies a temporary CSS transform:

- `transform: translate3d(dragX, 0, 0)`

`dragX` is updated on `requestAnimationFrame` for smoother performance.

Touch behavior:

- `touch-action: pan-y` allows vertical scrolling while still enabling horizontal drag gestures.

### 6) On release: convert pixels → whole-card shift, then rotate

When the pointer is released, the code converts the final drag distance into “how many cards to move”:

- `raw = dx / cardStepPx`
- if `abs(raw) >= minTriggerFraction` (default `0.35`), a shift happens
- `shift = round(raw)` with a small correction so it never becomes `0` once past the threshold
- `shift` is clamped to `maxShiftPerRelease` (default `8`)

That `shift` is then applied to `offset` (positive shift = move left in this implementation), which rotates the array accordingly.

Finally, `dragX` resets back to `0`. A short “settling” flag disables transitions during this reset to avoid a visible snap-back flash.

### 7) Click suppression (avoid accidental link clicks)

If the pointer moved more than a small threshold (default `8px`), the drag hook marks the gesture as a drag.
Product cards are links, so onClick is suppressed in that case:

- dragged → preventDefault() on click
- not dragged → normal click works

### 8) Buttons move by a full “page”

Prev/Next buttons shift by a whole page rather than by 1 card:

- `pageShift = max(1, capacity)`
- left button: `offset += pageShift`
- right button: `offset -= pageShift`

Because modulo wrapping is used, button navigation loops naturally.

## Notes / decisions

- Real Alza API cannot be requested directly from the client in this setup (Cloudflare protection), so a local mock API is used.
- Product-specific code lives in `src/features/products`. Shared UI lives in `src/ui`.
