require("dotenv").config();

const OpenAI = require("openai");

const { zodResponseFormat } = require("openai/helpers/zod");

const { generateObject, generateText } = require("ai");
const { z } = require("zod");
const { createOpenAI } = require("@ai-sdk/openai");

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

    determineFollowUp = async ({ message }) => {
        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        try {
            const result = await generateObject({
                model: openai("gpt-4o"),
                temperature: 0,
                schema: z.object({
                    invited_to_email: z
                        .boolean()
                        .describe(
                            "Whether the prospect has invited Ocean Group to send an email with more information."
                        ),
                    email_address: z
                        .string()
                        .nullable()
                        .describe(
                            "The email address provided by the prospect for follow-up, if present in the message. Set to null if no email address is found."
                        ),
                }),
                system: `You are an AI assistant helping to analyze responses from a LinkedIn messaging campaign for Ocean Group Construction, a roofing company. Your task is to determine if the prospect has invited Ocean Group to send an email with more information and to extract any email address provided for follow-up. Follow these guidelines:
                1. Set 'invited_to_email' to true if the prospect explicitly or implicitly invites Ocean Group to send an email with more information (e.g., 'Please send me an email with details', 'Can you email me more info?', 'I am happy to pass your information along if you want to email me').
                2. Set 'email_address' to the specific email address found in the message (e.g., 'stephanie@example.com'). If no email address is present, set it to null.
                3. If the invitation or email is ambiguous or not stated, set the respective field to false or null.
                4. Focus only on the content of the provided message.`,
                prompt: `Analyze the following LinkedIn message from a prospect to determine if they are inviting Ocean Group Construction to send an email with more information and to extract any email address provided for follow-up.

Message: <linkedin_message>${message}</linkedin_message>`,
            });

            return {
                success: true,
                data: result.object,
            };
        } catch (error) {
            console.error("Error in determineFollowUp:", error);
            return {
                success: false,
                message: error.message || "Failed to analyze follow-up request",
            };
        }
    };

    draftEmailPersonalization = async ({ conversation }) => {
        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        try {
            const result = await generateText({
                model: openai("gpt-4o"),
                temperature: 0.7,
                system: `You are an AI assistant helping to draft a personalized opening line for an email to a LinkedIn prospect on behalf of Ocean Group Construction, a roofing company. Your task is to create a single line that references the specific interaction from the provided LinkedIn conversation to make the email feel tailored and relevant. Follow these guidelines:
                1. Keep the tone professional yet friendly.
                2. Reference a specific point from the conversation to show continuity (e.g., a question they asked, a topic they mentioned).
                3. Ensure the line transitions naturally into providing more information about the company.
                4. Output only the personalized line, nothing else.
                5. Avoid generic statements that could apply to anyone; make it specific to this interaction.`,
                prompt: `Based on the following LinkedIn conversation and the overall email draft, draft a personalized opening line for an email to the prospect. The line should reference our interaction and lead into sharing more information about Ocean Group Construction.

Conversation:
"""
${conversation}
"""

Email Draft:
"""
Hi {{first_name}},

[Personalized Line Goes Here]

We are a Roofing contractor, fully licensed and insured with workers comp. My team has been roofing in Florida for over 20 years and we are extremely passionate about what we do.

We build TPO, Tile, Shingle, Metal (5v + standing seam), and Modified roof systems. We have unmarked trucks and trailers as well as bi-lingual project managers for every project.

Below, I have provided a link to our website's project page as well as some references and photos of projects I completed in South FL over the last few weeks. 

<a href="https://www.ogroof.com/project">https://www.ogroof.com/project</a>

List of References:

1. American Building Contractors
Josh Kestner: 239-777-0459
<a href="mailto:josh.kestner@abc-usa.com">josh.kestner@abc-usa.com</a>

2. Blusky Restoration
Zac Whittle: 502-655-9044
<a href="mailto:zac.whittle@goblusky.com">zac.whittle@goblusky.com</a>

3. Double G Construction
Bob Palmiere: 561-376-8495
<a href="mailto:bob@doublegconstruction.com">bob@doublegconstruction.com</a>

4. ATI Restoration
John Clabeaux: 480-688-7603
<a href="mailto:clabeaux.jj@gmail.com">clabeaux.jj@gmail.com</a>

5. Kris Konstruction
Mike Shifter: 813-376-6268
<a href="mailto:mschifter@kriskonstruction.com">mschifter@kriskonstruction.com</a>

{{image}}
4,000 SQ TILE Remove and Replace
9270 Belleza Way Fort Myers, FL 33908

{{image}}
330 SQ Remove modified insall Firestone TPO
4519 Del Prado Blvd S Cape Coral, FL 33904

{{image}}
330SQ Flute Filled Rhinobond TPO Roof System installed over Standing seam
14601 6 Mile Cypress Pkwy Fort Myers, FL 33912

Sophia Ochoa 

Account Manager 
Ocean Construction Group 
"""`,
            });

            return {
                success: true,
                data: result.text,
            };
        } catch (error) {
            console.error("Error in draftEmailPersonalization:", error);
            return {
                success: false,
                message: error.message || "Failed to draft personalized email line",
            };
        }
    };
};
