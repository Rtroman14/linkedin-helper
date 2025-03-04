require("dotenv").config();

const axios = require("axios");

module.exports = async (username, text, channel) => {
    const channels = [
        {
            text,
            username,
            icon_emoji: ":telephone_receiver:",
            unfurl_links: true,
            channel: "#error-alerts",
        },
        {
            text,
            username,
            icon_emoji: ":telephone_receiver:",
            unfurl_links: false,
            channel: "#app-testing",
        },
        {
            text,
            username,
            icon_emoji: ":speech_balloon:",
            unfurl_links: false,
            channel: "#linkedin",
        },
    ];

    const payload = channels.find((el) => el.channel === channel);

    try {
        await axios.post(process.env.SLACK_CHANNELS, payload);
    } catch (error) {
        console.log("slackNotification() --", error);
    }
};
