const cron = require("node-cron");
const User = require("../Model/UserModel");

const removeUnverifiedUsers = () => {
  const deleteUnverified = async () => {
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️ MongoDB not connected yet. Skipping delete.");
      return;
    }

    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const result = await User.deleteMany({
        accountVerified: false,
        createdAt: { $lt: thirtyMinutesAgo },
      });
      console.log(`🧹 Deleted ${result.deletedCount} unverified users.`);
    } catch (error) {
      console.error("❌ Error deleting unverified users:", error);
    }
  };

  // Schedule cron job to run every 30 minutes
  cron.schedule("*/30 * * * *", deleteUnverified);
  console.log(
    "⏰ Cron job to remove unverified users scheduled every 30 minutes."
  );
};

module.exports = removeUnverifiedUsers;
