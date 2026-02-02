require('dotenv').config();
const { Bot, InputFile, InlineKeyboard } = require("grammy");
const translate = require('translate-google');
const googleTTS = require('google-tts-api');
const axios = require('axios');
const express = require('express');
const { HfInference } = require('@huggingface/inference');
const fetch = require('node-fetch');

// Check Environment Variables
console.log("Checking Environment Variables...");
if (!process.env.TELEGRAM_BOT_TOKEN) console.error("CRITICAL: TELEGRAM_BOT_TOKEN is missing!");
if (!process.env.GOOGLE_API_KEY) console.warn("WARNING: GOOGLE_API_KEY is missing!");
if (!process.env.HF_TOKEN) console.log("INFO: HF_TOKEN is missing, will fallback to GOOGLE_API_KEY if available.");

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// Using gemini-flash-latest as verified in tests
const geminiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Initialize Telegram Bot
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Simple in-memory storage for user text (State)
const userSessions = new Map();

const LANGUAGES = {
    'Arabic': 'ar',
    'English': 'en',
    'French': 'fr',
    'Italian': 'it',
    'Japanese': 'ja',
    'Spanish': 'es',
    'German': 'de',
    'Chinese': 'zh-cn',
    'Russian': 'ru',
    'Portuguese': 'pt',
    'Korean': 'ko',
    'Turkish': 'tr'
};

// Map display language to TTS code (usually same, but Chinese is zh in TTS)
const TTS_LANG_CODES = {
    'zh-cn': 'zh'
};

async function generateSpeech(text, langCode) {
    const ttsCode = TTS_LANG_CODES[langCode] || langCode;
    const url = googleTTS.getAudioUrl(text, {
        lang: ttsCode,
        slow: false,
        host: 'https://translate.google.com',
    });

    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
}

async function transcribeAudio(audioBuffer) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is missing.");
    }

    try {
        console.log("Sending audio to Google Gemini...");
        const result = await geminiModel.generateContent([
            {
                inlineData: {
                    mimeType: "audio/ogg", // Telegram voice is OGG
                    data: audioBuffer.toString("base64")
                }
            },
            { text: "Transcribe this audio exactly. Do not add any conversational filler. Just the text." }
        ]);

        const text = result.response.text();
        return text;

    } catch (error) {
        console.error("Gemini Transcription error:", error);
        throw new Error(`Failed to transcribe with Google. ${error.message}`);
    }
}

bot.command("start", (ctx) => ctx.reply("Welcome to the **100% Free** Translation Voice Bot!\n\nSend me any text, then choose the language you want to translate it to. I will send you the translation as text and voice!"));

bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;

    if (text.length > 1000) {
        return ctx.reply("Text is too long. Please keep it under 1000 characters.");
    }

    // Save text to session
    userSessions.set(ctx.chat.id, text);

    await showLanguageSelection(ctx);
});

async function showLanguageSelection(ctx) {
    // Create language keyboard
    const keyboard = new InlineKeyboard();
    const langNames = Object.keys(LANGUAGES);

    for (let i = 0; i < langNames.length; i++) {
        keyboard.text(langNames[i], `lang_${langNames[i]}`);
        if ((i + 1) % 3 === 0) keyboard.row(); // 3 buttons per row
    }

    await ctx.reply("Choose the target language for translation:", {
        reply_markup: keyboard
    });
}

bot.on("message:voice", async (ctx) => {
    const statusMsg = await ctx.reply("Processing voice message...");
    try {
        const file = await ctx.getFile();
        const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(response.data);

        const transcribedText = await transcribeAudio(audioBuffer);

        if (!transcribedText || transcribedText.trim() === "") {
            throw new Error("Could not understand the audio.");
        }

        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `Transcribed: "${transcribedText}"`);

        // Save to session
        userSessions.set(ctx.chat.id, transcribedText);

        await showLanguageSelection(ctx);
    } catch (error) {
        console.error("Voice Processing Error:", error);
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, "Error: " + error.message);
    }
});

bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("lang_")) return;

    const targetLangName = data.replace("lang_", "");
    const langCode = LANGUAGES[targetLangName];
    const originalText = userSessions.get(ctx.chat.id);

    if (!originalText) {
        return ctx.answerCallbackQuery({ text: "Please send some text first!", show_alert: true });
    }

    await ctx.answerCallbackQuery();
    const statusMsg = await ctx.reply(`Translating to ${targetLangName}...`);

    try {
        // 1. Free Translation (via translate-google)
        const translatedText = await translate(originalText, { to: langCode });
        console.log(`Translated [${targetLangName}]: ${translatedText}`);

        // 2. Generate Speech
        const audioBuffer = await generateSpeech(translatedText, langCode);

        // 3. Send result
        await ctx.reply(`<b>Translation (${targetLangName}):</b>\n${translatedText}`, { parse_mode: "HTML" });
        await ctx.replyWithVoice(new InputFile(audioBuffer, "translation.mp3"));

        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (error) {
        console.error("Translation Error:", error);
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, "Error: " + error.message);
    }
});

bot.catch((err) => {
    console.error("Bot encountered an error:", err);
});

bot.start().catch(err => {
    console.error("Failed to start bot:", err);
});
console.log("100% Free Translation Voice Bot is starting...");

// Simple Express server for Hugging Face health checks
const app = express();
const port = process.env.PORT || 7860;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});
