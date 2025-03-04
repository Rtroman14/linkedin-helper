require("dotenv").config();
const Airtable = require("./Airtable");
const slackNotification = require("./slackNotification");

const AIRTABLE_BASE_ID = "appO4M5tv5lukVPRX";

class LinkedIn {
    async contactReplied(webhookData) {
        try {
            // 1. Validate required fields
            if (!webhookData.miniProfile || !webhookData.messagesInfo) {
                console.log("Missing required fields");
                console.log(webhookData);
                return {
                    success: false,
                    message: "Missing required fields",
                };
            }

            // 2. Search for existing record by LinkedIn URL
            const linkedinUrl = webhookData.profileUrl;
            if (!linkedinUrl) {
                console.log("Missing LinkedIn profile URL");
                console.log(webhookData);
                return {
                    success: false,
                    message: "Missing LinkedIn profile URL",
                };
            }

            console.log("CONTACT REPLIED");
            console.log("webhookData.messagesInfo\n", webhookData.messagesInfo);
            console.log("webhookData.fullMessagingHistory\n", webhookData.fullMessagingHistory);
            console.log(
                "webhookData.lastSendAndReceivedMessages\n",
                webhookData.lastSendAndReceivedMessages
            );

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

            // Format conversation
            const conversation = webhookData.messagesInfo
                .map((info) => {
                    const sender =
                        info.miniProfile.firstName === webhookData.my_full_name
                            ? "company"
                            : "prospect";
                    return `${sender}: ${info.message.text}`;
                })
                .join("\n\n");

            const fullName =
                webhookData.miniProfile.firstName + " " + webhookData.miniProfile.lastName || "";

            // 3. Prepare data for Airtable
            const airtableData = {
                "Full Name": fullName,
                "First Name": webhookData.miniProfile.firstName || "",
                "Last Name": webhookData.miniProfile.lastName || "",
                Email: webhookData.email?.email || "",
                "Company Name": webhookData.currentPosition?.company || "",
                Title:
                    webhookData.currentPosition?.position || webhookData.miniProfile.headline || "",
                Address: webhookData.location?.name || "",
                "In Campaign": true,
                // Conversation: conversation,
                Responded: true,
                Response: webhookData.messagesInfo[0].message.text || "",
                "Response Date": new Date().toISOString(),
                Source: "LinkedIn",
            };

            let result;

            // Update existing record
            if (existingRecords && existingRecords.length > 0) {
                const recordId = existingRecords[0].recordID;
                result = await Airtable.updateRecord(
                    AIRTABLE_BASE_ID,
                    "Prospects",
                    recordId,
                    airtableData
                );

                const slackMessage = `\n*From:* _<${linkedinUrl}|${fullName}>_\n*Response* _"${
                    webhookData.messagesInfo[0].message.text || ""
                }"_`;

                await slackNotification("Contact Replied", slackMessage, "#linkedin");

                return {
                    success: true,
                    message: "Record updated successfully with reply",
                    data: result,
                };
            } else {
                // Create new record if not found
                result = await Airtable.createRecord(AIRTABLE_BASE_ID, "Prospects", airtableData);

                await slackNotification(
                    "LinkedIn Webhook",
                    `Created new LinkedIn contact with reply: ${webhookData.miniProfile.firstName} ${webhookData.miniProfile.lastName}`,
                    "#app-testing"
                );

                return {
                    success: true,
                    message: "Record created successfully with reply",
                    data: result,
                };
            }
        } catch (error) {
            console.error("LinkedIn contactReplied error:", error.message);

            await slackNotification(
                "LinkedIn Webhook Error",
                JSON.stringify(error.message),
                "#error-alerts"
            );

            return {
                success: false,
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    async contactMessaged(webhookData) {
        try {
            if (!webhookData.full_name) {
                console.log("Missing full name");
                console.log(webhookData);
                return {
                    success: false,
                    message: "Missing full name",
                };
            }

            console.log("CONTACT MESSAGED");
            console.log(webhookData);

            // Search for existing record by LinkedIn URL
            const linkedinUrl = webhookData.profile_url;
            if (!linkedinUrl) {
                console.log("Missing LinkedIn profile URL");
                console.log(webhookData);
                return {
                    success: false,
                    message: "Missing LinkedIn profile URL",
                };
            }

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

            // Prepare data for Airtable
            const airtableData = {
                "Full Name": webhookData.full_name || "",
                "First Name": webhookData.first_name || "",
                "Last Name": webhookData.last_name || "",
                Email: webhookData.email || "",
                "Phone Number": webhookData.phone_1 || "",
                "Company Name": webhookData.current_company || "",
                Title: webhookData.current_company_position || webhookData.headline || "",
                Address: webhookData.location_name || "",
                "In Campaign": true,
                Source: "LinkedIn",
            };

            let result;

            // Update or create record
            if (existingRecords && existingRecords.length > 0) {
                // Update existing record
                const recordId = existingRecords[0].recordID;
                result = await Airtable.updateRecord(
                    AIRTABLE_BASE_ID,
                    "Prospects",
                    recordId,
                    airtableData
                );

                await slackNotification(
                    "LinkedIn Webhook",
                    `Updated LinkedIn contact: ${webhookData.full_name}`,
                    "#app-testing"
                );

                return {
                    success: true,
                    message: "Record updated successfully",
                    data: result,
                };
            } else {
                // Create new record
                result = await Airtable.createRecord(AIRTABLE_BASE_ID, "Prospects", airtableData);

                await slackNotification(
                    "LinkedIn Webhook",
                    `Created new LinkedIn contact: ${webhookData.full_name}`,
                    "#app-testing"
                );

                return {
                    success: true,
                    message: "Record created successfully",
                    data: result,
                };
            }
        } catch (error) {
            console.error("LinkedIn contactMessaged error:", error.message);

            await slackNotification(
                "LinkedIn Webhook Error",
                JSON.stringify(error.message),
                "#error-alerts"
            );

            return {
                success: false,
                message: "Internal server error",
                error: error.message,
            };
        }
    }
}

module.exports = new LinkedIn();
