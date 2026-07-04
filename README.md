# OMANUTRO

A self-contained street fashion ecommerce website built with Node.js, a vanilla frontend, JWT-based authentication, product search and filters, shopping cart and checkout, product administration, and order tracking.

## Features

- User registration and login using JWT sessions
- Empty product catalog ready for merchant-added streetwear drops
- Product filters for search, category, price, rating, and stock availability
- Customer ratings and reviews for future product entries
- Shopping cart with options to add quantities and check out
- Customer order tracking
- Administration page to add, edit, and delete products
- Orders listing for administration with status information
- Uploading product images locally, optionally uploading images using Cloudinary
- Creating a Stripe Checkout session optionally
- Database backed by file system for simple deployment

## Run Locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
backend/             Node/Express server, routes, API helpers, and backend scripts
backend/application  Business workflows used by API routes
backend/repositories SQLite-backed persistence helpers
backend/services     External integrations and shared backend services
frontend/            Static storefront HTML served by Express
frontend/assets/     Storefront images, logos, icons, and flags
frontend/scripts/    Browser JavaScript grouped by core, shared, feature, and integration code
frontend/styles/     Storefront CSS
public/admin/        Static admin dashboard served from /admin
```

The storefront starts without demo products, orders, categories, reviews, or placeholder inventory.

## Optional Environment Variables

Create a `.env` file or set environment variables in your host.

```text
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
APP_URL=http://localhost:3000
CORS_ORIGIN=https://your-domain.example

STRIPE_SECRET_KEY=sk_test_...

CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

FIREBASE_PROJECT_ID=omanutro
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@omanutro.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Or use one encoded secret instead:
FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=base64-encoded-service-account-json
```

When payment provider credentials are missing, checkout remains guarded by the existing local payment flow. When Cloudinary variables are missing, uploaded images are stored under `data/uploads` and served by the local server.

## Deploying On Vercel

This app deploys through `api/index.js`, which mounts the Express application as a Vercel Node function. Set these Vercel environment variables for production:

- `JWT_SECRET`: required, must be stable across deployments or normal email/phone sessions will expire.
- `APP_URL`: your deployed site URL.
- `CORS_ORIGIN`: your deployed site URL.
- Firebase Admin credentials: use either `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` or the `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` trio so Google sign-in tokens can be verified by the backend.

On Vercel, the bundled filesystem is not persistent. The default SQLite file is therefore created in `/tmp` so auth requests can run, but production data will reset on cold starts. Use a persistent database service for real customer accounts and orders.

