require("dotenv").config();
const express = require("express");
var cors = require('cors');
const Gemini = require("./utils/Gemini/gemini");
const mongoose = require("mongoose");
const axios = require("axios");
const authRoutes = require("./routes/authRoutes");
// const leaderboardRoutes = require("./routes/leaderboardRoutes");
const Score = require("./models/Score"); // Assuming you have a Score model defined
const app = express();

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));


// app.use("/api", leaderboardRoutes);


app.use(cors())
app.use(express.json());
app.use("/api/auth", authRoutes);
//.........................................................................


app.get('/', (req, res) => res.send('<center><h1>E.C.E. IE Project backend</h1></center>'))


// Fetch random words from an API



const getWords = async () => {
  try {
    const response = await axios.get("https://random-word-api.vercel.app/api?words=5");

    return response.data; // Returns an array of 5 words
  } catch (error) {
    console.error("Error fetching words:", error);
    return ["default"]; 
  }
};

// Function to scramble a word
const scrambleWord = (word) => {
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

app.get("/scramble", async (req, res) => {
  try {
    const words = await getWords(); // Get 5 words

    const wordData = await Promise.all(
      words.map(async (word) => {
        const meaning = await getMeaning(word);
        return {
          scrambled: scrambleWord(word),
          original: word.toUpperCase(),
          meaning,
        };
      })
    );

    res.json({ words: wordData });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Endpoint to check if the guess is correct
app.post("/check", (req, res) => {
  const { word, guess } = req.body;
  if (!word || !guess) {
    return res.status(400).json({ message: "Missing word or guess" });
  }
  const correct = word.toLowerCase() === guess.toLowerCase();
  res.json({ correct });
});


app.post("/submit-score", async (req, res) => {
  try {
    const { username, score, category } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    console.log("DFSDFSDFSDFSDFSDFSD")
    if (!token || !username || typeof score !== "number") {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Store the score with the current date in MongoDB
    const newScore = new Score({
      username,
      score,
      category,
      date: new Date(),
    });

    await newScore.save();

    res.json({ success: true, message: "Score submitted successfully" });
  } catch (error) {
    console.error("Error in /submit-score:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/score-history/WordScramble/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch score history from MongoDB with category "Word Scramble"
    const scores = await Score.find({ username, category: "Word Scramble" }).sort({ date: -1 });

    if (!scores || scores.length === 0) {
      return res.status(404).json({ message: "No score history found for this user in Word Scramble category" });
    }

    res.json({ success: true, scores });
  } catch (error) {
    console.error("Error in /score-history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/score-history/MCQ/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch score history from MongoDB with category "Word Scramble"
    const scores = await Score.find({ username, category: "MCQ" }).sort({ date: -1 });

    if (!scores || scores.length === 0) {
      return res.status(404).json({ message: "No score history found for this user in Word Scramble category" });
    }

    res.json({ success: true, scores });
  } catch (error) {
    console.error("Error in /score-history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/leaderboard/:category", async (req, res) => {
  try {
    const { category } = req.params;
    if (!category || (category !== "MCQ" && category !== "Word Scramble")) {
      return res.status(400).json({ error: "Invalid category. Use 'MCQ' or 'Word Scramble'." });
    }

    // Fetch top 10 scores for the given category sorted in descending order
    const topScores = await Score.find({ category })
      .sort({ score: -1, date: -1 })
      .limit(10);

    if (!topScores || topScores.length === 0) {
      return res.status(404).json({ message: `No scores found for ${category}` });
    }

    res.json({ success: true, category, topScores });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/make-question', async (req, res) => {
    try {
        const { paragraph } = req.body;
        if (!paragraph || typeof paragraph !== "string" || paragraph.trim().length === 0) {
            return res.status(400).json({ error: "A valid paragraph is required" });
        }

        // Construct prompt to get MCQs in JSON format
        const query = `${paragraph.trim()},Create a reading comprehension quiz based on the provided paragraph.Generate 10 question.  Generate multiple-choice questions (MCQs), including at least one "fill in the blank" type question with multiple options, and at least "true/false" type question with true ans false option.  Return the quiz in JSON format, adhering to the structure below.  The JSON should be easily parsable for use in a quiz-style game.  Ensure the "correctAnswer" field contains the correct answer for each question.  For fill-in-the-blank questions, the "correctAnswer" should correspond to the correct option (A, B, C, or D). For MCQs, the "correctAnswer" should correspond to the correct option (A, B, C, or D).  For true/false questions, use "true" or "false" as the correctAnswer.Make question in same language as paragraph. Try to provide different questions every time even though the paragraph is same.

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

