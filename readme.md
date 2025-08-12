# Slack Connect - Starter

A minimal implementation of the Cobalt.ai assignment using plain Node.js/Express (backend) and vanilla HTML/CSS (frontend). It demonstrates:
- Slack OAuth 2.0 flow (connect workspace)
- Store Slack token locally in `backend/db.json`
- Send immediate messages via `/api/send`
- Schedule messages via `/api/schedule` and a cron job that runs every minute
- List & cancel scheduled messages

## Quick start
1. Clone repo and save files as shown.
2. `cd` to project folder and run `npm install`.
3. Copy `.env.example` to `.env` and fill `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`.
4. Start server: `npm start`.
5. Open `http://localhost:3000` and click **Connect Slack**.

## Notes
- This is a simple starter — for production, store tokens encrypted, use a proper DB, verify webhook signatures, handle token refresh flows per Slack docs, add error handling, and secure the frontend APIs with authentication.

// -----------------------------------------------------------------
// End of starter package. Open the created files in your editor and run as described in README.