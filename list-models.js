require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
        const data = await response.json();
        const models = data.models.map(m => ({
            name: m.name,
            methods: m.supportedGenerationMethods
        }));
        console.log(JSON.stringify(models, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
