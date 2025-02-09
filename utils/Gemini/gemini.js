const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function Gemini(query){
    try{
    const result = await model.generateContent(query);
    return result.response.text();
    }catch(error){
        console.error("Error: ",error);
        return "An error occurred while generating content.";
    }    
};

module.exports = Gemini;