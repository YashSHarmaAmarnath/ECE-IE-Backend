const express = require('express')
var cors = require('cors')
const Gemini = require("./utils/Gemini/gemini");
const app = express()
const port = 3000
const axios = require("axios");

app.use(cors())

// Fetch random words from an API

const getWord = async () => {
  try {
    const response = await axios.get("https://random-word-api.herokuapp.com/word?number=1");
    return response.data[0]; // Returns a random word
  } catch (error) {
    console.error("Error fetching word:", error);
    return "default"; // Fallback word
  }
};

// Function to scramble a word
const scrambleWord = (word) => {
  // console.log("1",word)
  // console.log(typeof word)
  let shuffled = word.toUpperCase().split("");
  for (let i = shuffled.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.join("");
};

const getMeaning = async (word) => {
  try {
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    return response.data[0]?.meanings[0]?.definitions[0]?.definition || "Meaning not found";
  } catch (error) {
    console.error("Error fetching meaning:", error);
    return "Meaning not available";
  }
};



app.use(express.json()); // Middleware for JSON requests

app.get('/', (req, res) => res.send('<center><h1>E.C.E. IE Project backend</h1></center>'))

app.get("/scramble", async (req, res) => {
  const word = await getWord()
  const meaning = await getMeaning(word);
  // console.log(word)
  res.json({ scrambled: scrambleWord(word), original: word.toUpperCase(),meaning });
});

// Endpoint to check if the guess is correct
app.post("/check", (req, res) => {
  const { word, guess } = req.body;
  // console.log(req.body)
  if (!word || !guess) {
    return res.status(400).json({ message: "Missing word or guess" });
  }
  const correct = word.toLowerCase() === guess.toLowerCase();
  res.json({ correct });
});

app.post('/make-question', async (req, res) => {
    try {
        const { paragraph } = req.body;
        if (!paragraph || typeof paragraph !== "string" || paragraph.trim().length === 0) {
            return res.status(400).json({ error: "A valid paragraph is required" });
        }

        // Construct prompt to get MCQs in JSON format
        const query = `${paragraph.trim()},Create a reading comprehension quiz based on the provided paragraph.Generate 10 question.  Generate multiple-choice questions (MCQs), including at least one "fill in the blank" type question with multiple options, and at least "true/false" type question with true ans false option.  Return the quiz in JSON format, adhering to the structure below.  The JSON should be easily parsable for use in a quiz-style game.  Ensure the "correctAnswer" field contains the correct answer for each question.  For fill-in-the-blank questions, the "correctAnswer" should correspond to the correct option (A, B, C, or D). For MCQs, the "correctAnswer" should correspond to the correct option (A, B, C, or D).  For true/false questions, use "true" or "false" as the correctAnswer.Make question in same language as paragraph.

json
{
  "title": "Reading Comprehension Quiz",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "What is the main idea of the paragraph?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "B" // Example: Correct option is B
    },
    {
      "type": "fill-in-the-blank",
      "question": "The author emphasizes the importance of ______.",
      "options": {
        "A": "critical thinking",
        "B": "creative writing",
        "C": "data analysis",
        "D": "scientific research"
      },
      "correctAnswer": "A" // Example: Correct option is A ("critical thinking")
    },
    {
      "type": "true/false",
      "question": "The paragraph argues that X is more important than Y.",
      "correctAnswer": "true" // Example: The statement is true
    },
    {
      "type": "multiple-choice",
      "question": "According to the passage, which of the following is NOT mentioned?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "C" // Example: Correct option is C
    }
  ]
}`; 

        // Call Gemini API
        const response = await Gemini(query);

        console.log("Raw Gemini Response:", response); // Debugging log

        // Remove markdown artifacts (```json ... ```)
        const cleanedResponse = response.replace(/```json|```/g, "").trim();

        // Parse the response into JSON
        let formattedResponse;
        try {
            formattedResponse = JSON.parse(cleanedResponse);
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            return res.status(500).json({ error: "Failed to parse AI-generated response" });
        }

        // Send structured response
        res.json({ success: true, questions: formattedResponse });

    } catch (error) {
        console.error("Error in /make-question:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(port, () => console.log(`Example app running on http://localhost:${port}`))