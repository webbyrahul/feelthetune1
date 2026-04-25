import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Provider-agnostic LLM Parser Service.
 * Migrated from Gemini to Groq (Llama 3.3 70B).
 */
export const parsePlaylistPrompt = async (prompt) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('LLM Provider is not configured. Please set GROQ_API_KEY in .env and RESTART your server.');
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const systemInstruction = `
You are a music query parser for Spotify search.
Convert the user's natural language request into structured JSON.
Return ONLY valid JSON.
No markdown.
No explanation.

If missing values exist, return null.

Infer:
* mood
* language
* artist
* year
* decade
* type

Default type = track unless clearly album/artist/playlist.

The JSON schema must be:
{
  "query": "string",
  "type": "track" | "album" | "artist" | "playlist",
  "artist": "string|null",
  "track": "string|null",
  "album": "string|null",
  "genre": "string|null",
  "mood": "string|null",
  "language": "string|null",
  "year": "number|null",
  "decade": "string|null",
  "popularity": "string|null",
  "explicit": "boolean|null"
}
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `User Prompt: ${prompt}` }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const textResponse = chatCompletion.choices[0]?.message?.content || '{}';
    const parsedJson = JSON.parse(textResponse);

    // Map new Groq schema back to the internal format expected by downstream Spotify search code
    // This ensures no feature loss and preserves existing logic in musicController.js
    
    // Construct yearRange from year or decade
    let yearRange = '';
    if (parsedJson.year) {
      yearRange = `${parsedJson.year}-${parsedJson.year}`;
    } else if (parsedJson.decade) {
      // Handle '90s' -> '1990-1999' etc.
      const decadeMatch = parsedJson.decade.match(/(\d{2})s/);
      if (decadeMatch) {
        const century = Number(decadeMatch[1]) > 50 ? '19' : '20'; // basic heuristic
        const start = `${century}${decadeMatch[1]}`;
        yearRange = `${start}-${Number(start) + 9}`;
      } else {
        yearRange = parsedJson.decade;
      }
    }

    return {
      genre: parsedJson.genre || '',
      artists: parsedJson.artist ? [parsedJson.artist] : [],
      yearRange: yearRange,
      mood: parsedJson.mood || '',
      length: 20 // Default length as expected by downstream logic
    };
  } catch (error) {
    if (error.status === 401) {
      console.error('Groq API Key Error:', error.message);
      throw new Error('Invalid Groq API Key. Please check your .env file.');
    }
    if (error.status === 429) {
      console.error('Groq Rate Limit Hit:', error.message);
      throw new Error('Groq API rate limit reached. Please try again in a moment.');
    }
    console.error('LLM Parsing failed:', error);
    throw new Error('Failed to parse intent from the prompt. Please try rephrasing.');
  }
};
