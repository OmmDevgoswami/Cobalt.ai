# Slack Connect Application
### This is submission for Cobalt.ai  - Refold Intern Assignment

## What it does
A minimal Slack - message passing implementation. It demonstrates:
- Slack OAuth 2.0 flow (connect workspace)
- Store Slack token locally in `backend/db.json and backend/data.db`
- Send immediate messages via `/api/send`
- Schedule messages via `/api/schedule` and a cron job that runs every minute
- List & cancel scheduled messages
- Automatically join the channel it is not part of (pucblic channels only, private channels still require invites)

## How we built it
---
- Frontend: [Vanilla-HTML,Vanilla-CSS,Javascrpit]
- Backend: [Node.js - Express.js]
- APIs: [Slack API]
---

## Credentials for Testing
```
SLACK_CLIENT_ID=9037657823280.9335478123077
SLACK_CLIENT_SECRET=baff8a89f1917f2653111179340c46a0
SLACK_REDIRECT_URI=https://localhost:3000/auth/slack/callback
PORT=3000
```

## INSTALLATION:
### To run the Slack-Messenger locally, follow these steps:
1. On the GitHub page for this repository, click on the button "Fork."
2. Clone your forked repository to your computer by typing the following command in the Terminal: 
``` https://github.com/<your-github-username>/Cobalt.ai.git ```
3. Navigate into the cloned repository by typing the following command in the Terminal:
``` cd <project-file> ``` and then run ```npm install```
4. Set-up the Credentials
5. Start server: `npm start`.
6. Open `http://localhost:3000` and click **Connect Slack**.
7. Send Messages to your required channel or Schudle them for future instances.

## Problems I faced
I really Didn't had alot of experience with Node.js and Express.js so had to learn the basics and took some external help for the creation of this Porject. Thank you for checking.
