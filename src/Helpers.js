const { isWeekend, addDays, differenceInSeconds } = require("date-fns");

class Helpers {
    convertNewlinesToHtml = (text) => {
        return text.replace(/\n/g, "<br/>");
    };

    getSecondsUntilFutureWeekday = (daysToAdd) => {
        const now = new Date();
        let futureDate = addDays(now, daysToAdd);

        while (isWeekend(futureDate)) {
            futureDate = addDays(futureDate, 1);
        }

        return {
            date: futureDate,
            inSeconds: differenceInSeconds(futureDate, now),
        };
    };

    formatForLLM = (array) => {
        if (!Array.isArray(array) || array.length === 0) return "";

        return array
            .map((obj) =>
                Object.entries(obj)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join("\n")
            )
            .join("\n\n");
    };
}

module.exports = new Helpers();
