const functions = require("@google-cloud/functions-framework");
const LinkedIn = require("./src/LinkedIn");
const slackNotification = require("./src/slackNotification");

// LinkedIn webhook handler
functions.http("linkedin-helper", async (req, res) => {
    try {
        const webhookData = req.body;

        if (!webhookData) {
            console.log("Invalid webhook data");
            console.log(webhookData);
            throw new Error("Invalid webhook data:", JSON.stringify(webhookData, null, 4));
        }

        let result;
        if (webhookData.messagesInfo) {
            result = await LinkedIn.contactReplied(webhookData);
        } else {
            result = await LinkedIn.contactMessaged(webhookData);
        }

        return res.json(result);
    } catch (error) {
        console.error("LinkedIn webhook error:", error);

        await slackNotification(
            "LinkedIn Webhook Error",
            JSON.stringify(error.message),
            "#error-alerts"
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
});
