# Hireability Score

A resume scoring app: free instant score, paid full breakdown unlocked via a Gumroad license key.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Create `.env.local` beside `package.json`:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ANTHROPIC_MODEL=claude-sonnet-5
   GUMROAD_PRODUCT_PERMALINK=your-product-permalink
   ```
   Get the API key from https://console.anthropic.com. Scoring requests use your Anthropic account and may incur API charges.
3. In Gumroad, enable unique license keys for the product.
4. Start the app:
   ```
   npm run dev
   ```
5. Open http://localhost:3000.

To preview the score and upgrade UI without calling Anthropic, add `DEMO_MODE=true` to `.env.local` and restart the dev server. Demo mode uses a fixed sample score and should remain disabled for real users.

## Before Launch

- Replace `YOUR_PRODUCT_PERMALINK` in `app/page.js` with the real Gumroad permalink.
- Test a real PDF and confirm the score response appears.
- Restart the dev server after changing `.env.local`.

## Notes

- Resume scoring runs through Anthropic in `app/api/score/route.js`.
- Free scans return the score and general assessment; detailed suggestions are returned only after server-side Gumroad license verification.
- PDF only for now. Word documents are not parsed.
- The scoring prompt is in `app/api/score/route.js`.