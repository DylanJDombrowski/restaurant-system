This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```
restaurant-system
├─ eslint.config.mjs
├─ middleware.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ src
│  ├─ app
│  │  ├─ admin
│  │  │  ├─ analytics
│  │  │  │  └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ menu
│  │  │  │  ├─ categories
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ item
│  │  │  │  │  └─ [id]
│  │  │  │  │     ├─ layout.tsx
│  │  │  │  │     ├─ page.tsx
│  │  │  │  │     └─ variants
│  │  │  │  │        └─ page.tsx
│  │  │  │  ├─ layout.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ page.tsx
│  │  │  └─ staff
│  │  │     └─ page.tsx
│  │  ├─ api
│  │  │  ├─ admin
│  │  │  │  ├─ menu
│  │  │  │  │  ├─ categories
│  │  │  │  │  │  ├─ route.ts
│  │  │  │  │  │  └─ [id]
│  │  │  │  │  │     └─ route.ts
│  │  │  │  │  └─ items
│  │  │  │  │     ├─ route.ts
│  │  │  │  │     └─ [id]
│  │  │  │  │        ├─ route.ts
│  │  │  │  │        └─ variants
│  │  │  │  │           └─ route.ts
│  │  │  │  └─ staff
│  │  │  │     ├─ route.ts
│  │  │  │     └─ [id]
│  │  │  │        └─ route.ts
│  │  │  ├─ auth
│  │  │  │  ├─ password
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ staff
│  │  │  │     └─ route.ts
│  │  │  ├─ customers
│  │  │  │  ├─ lookup
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ [id]
│  │  │  │     └─ addresses
│  │  │  │        └─ route.ts
│  │  │  ├─ debug
│  │  │  │  ├─ customer-addresses
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ menu
│  │  │  │  ├─ calculate-price
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ categories
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ customization
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ full
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ pizza
│  │  │  │  │  ├─ calculate-price
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ orders
│  │  │  │  ├─ route.ts
│  │  │  │  └─ [id]
│  │  │  │     └─ status
│  │  │  │        └─ route.ts
│  │  │  ├─ restaurants
│  │  │  │  └─ route.ts
│  │  │  └─ test
│  │  │     └─ route.ts
│  │  ├─ customer
│  │  │  ├─ layout.tsx
│  │  │  └─ order
│  │  │     └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ kitchen
│  │  │  ├─ layout.tsx
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ staff
│  │     ├─ layout.tsx
│  │     ├─ orders
│  │     │  └─ page.tsx
│  │     └─ page.tsx
│  ├─ components
│  │  ├─ features
│  │  │  ├─ Navigation.tsx
│  │  │  └─ orders
│  │  │     ├─ AppetizerCustomizer.tsx
│  │  │     ├─ ChickenCustomizer.tsx
│  │  │     ├─ CustomerDetails.tsx
│  │  │     ├─ MenuNavigator.tsx
│  │  │     ├─ OrderCart.tsx
│  │  │     ├─ OrderSuccessMessage.tsx
│  │  │     ├─ PizzaCustomizer.tsx
│  │  │     └─ SandwichCustomizer.tsx
│  │  └─ ui
│  │     ├─ Breadcrumbs.tsx
│  │     └─ Skeleton.tsx
│  └─ lib
│     ├─ contexts
│     │  ├─ auth-context.tsx
│     │  └─ menu-context.tsx
│     ├─ supabase
│     │  ├─ client.ts
│     │  └─ server.ts
│     ├─ types
│     │  ├─ database.ts
│     │  ├─ database.types.ts
│     │  └─ index.ts
│     └─ utils
│        ├─ cart-transformers.ts
│        └─ variant-modifier-system.ts
├─ supabase
│  ├─ .temp
│  │  ├─ cli-latest
│  │  ├─ gotrue-version
│  │  ├─ pooler-url
│  │  ├─ postgres-version
│  │  ├─ project-ref
│  │  └─ rest-version
│  └─ schema.sql
├─ TODO.txt
└─ tsconfig.json

```