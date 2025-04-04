const OpenAI = require("openai");

const { z } = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");

module.exports = class Agents {
    constructor({ apiKey, temperature, model }) {
        this.apiKey = apiKey;
        this.openai = new OpenAI({ apiKey });
        this.temperature = temperature;
        this.model = model;
    }

    conversationStatus = async ({ conversation }) => {
        let completionMessages = [
            {
                role: "system",
                content: `
## Objective:
Analyze LinkedIn conversation responses between Ocean Group Construction and prospects to classify their level of interest or status using a single label.

## Context:
- These are LinkedIn conversations between Ocean Group Construction (a roofing company) and potential business prospects
- Ocean Group typically initiates contact to become a preferred roofing vendor
- The initial message often includes: "Hi [first_name] - I'm wondering how we can become preferred roofing vendors with you. We specialize in TPO, flat, tile, shingle, metal, and coatings and can provide references or details of recent projects."
- You must classify based on the prospect's most recent response

## Label Definitions:
1. Cold: Prospect explicitly declines or shows no interest (e.g., "No thanks", "Not interested", "We have existing vendors")
2. Wrong info: Contact is incorrect or not decision maker (e.g., "I'm not in charge of vendors", "I don't handle this")
3. DND (Do Not Disturb): Shows anger, irritation, or requests to stop contact (e.g., "Please don't message me", "Not appropriate")
4. Warm: Shows potential interest but no immediate commitment (e.g., "Send me more information", "What's your service area?")
5. Future: Requests to be contacted at a future date/time (e.g., "Contact me next quarter", "Let's discuss this in Q2")
6. Hot: Shows strong interest and engagement (e.g., "Yes, we're looking for vendors", "Let's set up a call")
7. Meeting scheduled: Confirmed appointment for discussion (e.g., "Meeting set for Tuesday", "Call scheduled")

## Conversation:
"""
${conversation}
"""

## Task:
Select exactly ONE label that best matches the prospect's response(s), prioritizing their most recent message.
    `,
            },
        ];

        const labelOptions = z.enum([
            "Cold",
            "Wrong info",
            "DND",
            "Warm",
            "Future",
            "Hot",
            "Meeting scheduled",
        ]);

        const LabelOptions = z.object({
            label: labelOptions,
        });

        const openai = new OpenAI({ apiKey: this.apiKey });

        try {
            const completion = await openai.beta.chat.completions.parse({
                model: this.model,
                messages: completionMessages,
                response_format: zodResponseFormat(LabelOptions, "label"),
            });

            let object = completion.choices[0].message.parsed;

            return { success: true, data: object };
        } catch (error) {
            console.error(error);
            return { success: false, data: null, error: error.message };
        }
    };

    futureDate = async ({ conversation }) => {
        let completionMessages = [
            {
                role: "system",
                content: `
## Objective:
Extract and convert the prospect's requested future contact date from a conversation into a specific calendar date format (mm/dd/yyyy).

## Context:
- These are text conversations between a roofing company and building owners
- The prospect may specify a future contact date in various ways:
  * Specific dates ("call me on December 1st")
  * Relative dates ("reach out next week", "call tomorrow")
  * Seasonal references ("contact me in spring")
  * Holiday references ("after Christmas")
- Today's date is: ${new Date().toLocaleDateString()}

## Date Interpretation Rules:
1. For specific dates: Use the exact date mentioned
2. For relative dates:
   - "tomorrow" = next calendar day
   - "next week" = 7 days from today
   - "next month" = same day next month
3. For seasons (if no year specified, use next occurrence):
   - Spring = March 20
   - Summer = June 21
   - Fall/Autumn = September 22
   - Winter = December 21
4. For holidays (if no year specified, use next occurrence):
   - Christmas = December 25
   - New Year = January 1
   - Easter = Use next year's date
   - Thanksgiving (US) = Fourth Thursday of November

## Conversation:
"""
${conversation}
"""

## Task:
1. Identify when the prospect wants to be contacted again
2. Convert that timing into a specific calendar date
3. Return the date in mm/dd/yyyy format
4. If multiple dates are mentioned, use the most recent one
5. If no specific timing is mentioned, return null

Example outputs:
- "call tomorrow" on 11/14/2024 → "11/15/2024"
- "reach out next spring" on 11/14/2024 → "03/20/2025"
- "after Christmas" on 11/14/2024 → "12/26/2024"
`,
            },
        ];

        const FutureDate = z.object({
            date: z.string(),
        });

        const openai = new OpenAI({ apiKey: this.apiKey });

        try {
            const completion = await openai.beta.chat.completions.parse({
                model: this.model,
                messages: completionMessages,
                response_format: zodResponseFormat(FutureDate, "date"),
            });

            let object = completion.choices[0].message.parsed;

            return { success: true, data: object };
        } catch (error) {
            console.error(error);
            return { success: false, data: null, error: error.message };
        }
    };
};
