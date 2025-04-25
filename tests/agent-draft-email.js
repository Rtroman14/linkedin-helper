require("dotenv").config();
const Agents = require("../src/Agents");
const Airtable = require("../src/Airtable");

const AIRTABLE_BASE_ID = "appO4M5tv5lukVPRX";

(async () => {
    try {
        const Agent = new Agents({
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0,
            model: "gpt-4o",
        });

        let linkedinUrl = "https://www.linkedin.com/in/monica-martinez-61445ab0/";

        // Create a version of the URL without trailing slash if it exists
        const linkedinUrlNoSlash = linkedinUrl.endsWith("/")
            ? linkedinUrl.slice(0, -1)
            : linkedinUrl;

        // Search for existing record in Airtable with both URL formats
        const existingRecords = await Airtable.fetchFilteredRecords(
            AIRTABLE_BASE_ID,
            "Prospects",
            `OR({LinkedIn URL} = "${linkedinUrl}", {LinkedIn URL} = "${linkedinUrlNoSlash}")`
        );

        console.log(`existingRecords -->`, existingRecords);

        const conversationStr = existingRecords[0].conversation;

        const mostRecentMessage = `
Good morning and thanks for reaching out. If you would like to become one of our vendors, please reach out to Jordan@blackdiamondgc.com and she will assist with getting you qualified and on our bid list for upcoming projects. 
Best, 
Justin
`;

        const determineFollowUpResult = await Agent.determineFollowUp({
            message: mostRecentMessage,
        });

        const { invited_to_email, email_address } = determineFollowUpResult.data;

        console.log(`determineFollowUpResult -->`, determineFollowUpResult);

        const personalizedLine = await Agent.draftEmailPersonalization({
            conversation: conversationStr,
            mostRecentMessage,
        });

        console.log(`personalizedLine -->`, personalizedLine);
    } catch (error) {
        console.error(error);
    }
})();
