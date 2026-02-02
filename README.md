---
title: Free Translation Voice Bot
emoji: 🌍🎙️
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# Free Translation Voice Bot

This is a Telegram bot that translates text and sends voice messages using free Google services.

## Deployment Details
- **Environment**: Docker
- **Required Secrets / Environment Variables**: 
  - `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token from @BotFather.
  - `GOOGLE_API_KEY`: Your Google Cloud / Gemini API key.

## How to Deploy on JustRunMy.app

1. **Upload Code**: You can either link your GitHub repository or upload a `.zip` file of this project folder.
2. **Configure Environment**:
   - Go to your application settings in JustRunMy.app.
   - Add `TELEGRAM_BOT_TOKEN` and `GOOGLE_API_KEY` to the **Environment Variables** section.
3. **Port Mapping**:
   - Ensure the app is mapped to port **7860**.
4. **Deploy**: Click deploy and the bot will be online 24/7!

## How to Upload to GitHub

1. Create a new repository on GitHub.
2. If you have Git installed, follow the instructions provided by GitHub.
3. If you don't have Git, just click "Upload an existing file" on GitHub and drag-and-drop all files **EXCEPT** `.env` and `node_modules`.
