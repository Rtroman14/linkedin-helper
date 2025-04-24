require("dotenv").config();
const Agents = require("../src/Agents");

(async () => {
    try {
        const Agent = new Agents({
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0,
            model: "gpt-4o",
        });

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

        const conversation = `company: Hi Barrett - I'm wondering how we can become preferred roofing vendors with you. We specialize in TPO, flat, tile, shingle, metal, and coatings and can provide references or details of recent projects.

Thanks in advance!
user: Sophia,

Please send me an email to barrett@mdmservices.com with your service areas and I will get you connected with our team for current projects `;

        const personalizedLine = await Agent.draftEmailPersonalization({ conversation });

        console.log(`personalizedLine -->`, personalizedLine);
    } catch (error) {
        console.error(error);
    }
})();
