require('dotenv').config();
const fs = require('fs');

async function testTTS() {
    try {
        console.log("Generating audio for test via raw fetch...");

        const body = {
            contents: [{ parts: [{ text: "Hello! This is a test of the Gemini Text to Speech capability." }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "aoede" // Corrected spelling
                        }
                    }
                }
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log("Response status:", response.status);

        if (data.candidates && data.candidates[0].content.parts[0].inlineData) {
            const audioData = data.candidates[0].content.parts[0].inlineData.data;
            console.log("Audio found! Size:", audioData.length);
            fs.writeFileSync("test-audio.wav", Buffer.from(audioData, "base64"));
            console.log("Saved to test-audio.wav");
        } else {
            console.log("Failed to get audio:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testTTS();
