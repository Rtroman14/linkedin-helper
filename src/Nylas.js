require("dotenv").config();
const Nylas = require("nylas").default;

class NylasClient {
    constructor({
        apiKey = process.env.NYLAS_API_KEY,
        grantId,
        apiUri = "https://api.us.nylas.com",
    }) {
        if (!grantId) {
            throw new Error("grantId is required");
        }

        this.grantId = grantId;

        // Initialize Nylas client
        this.nylas = new Nylas({
            apiKey: apiKey,
            apiUri: apiUri,
        });
    }

    async createDraft(draftData) {
        if (!draftData || !draftData.to || !draftData.subject) {
            throw new Error("Draft must include subject and recipients");
        }

        try {
            const draft = await this.nylas.drafts.create({
                identifier: this.grantId,
                requestBody: draftData,
            });
            return draft;
        } catch (error) {
            console.error("Nylas API error:", error);
            throw new Error(`Failed to create draft: ${error.message}`);
        }
    }

    async sendDraft(draftId) {
        if (!draftId) {
            throw new Error("draftId is required");
        }

        try {
            const message = await this.nylas.drafts.send({
                identifier: this.grantId,
                draftId: draftId,
            });
            return message;
        } catch (error) {
            console.error("Nylas API error:", error);
            throw new Error(`Failed to send draft: ${error.message}`);
        }
    }

    async sendEmail(emailData) {
        try {
            const draft = await this.createDraft(emailData);
            return await this.sendDraft(draft.id);
        } catch (error) {
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    async getMessages(options = { limit: 10 }) {
        try {
            const messages = await this.nylas.messages.list({
                identifier: this.grantId,
                queryParams: options,
            });
            return messages;
        } catch (error) {
            console.error("Nylas API error:", error);
            throw new Error(`Failed to fetch messages: ${error.message}`);
        }
    }
}

module.exports = NylasClient;
