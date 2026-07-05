const { validateStartupConfig: validateTwilioConfig } = require("./twilio");
const { validateStartupConfig: validateQueueConfig } = require("./queue");

function validateMessagingStartupConfig() {
  validateTwilioConfig();
  validateQueueConfig();
}

module.exports = {
  validateMessagingStartupConfig
};
