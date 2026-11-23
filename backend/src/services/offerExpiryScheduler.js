
const cron = require("node-cron");
const { processExpiredOffers } = require("../controllers/offerController");

let isProcessing = false;

const startOfferExpiryScheduler = (io) => {
  console.log("Offer expiry scheduler initialized");

  // Run once every minute.
  cron.schedule("* * * * *", async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    try {
      const result = await processExpiredOffers(io);

      if (result.processed > 0) {
        console.log(
          `Offer expiry worker processed ${result.processed} offer(s)`
        );
      }
    } catch (error) {
      console.error(
        "Offer expiry scheduler error:",
        error.message
      );
    } finally {
      isProcessing = false;
    }
  });
};

module.exports = startOfferExpiryScheduler;

