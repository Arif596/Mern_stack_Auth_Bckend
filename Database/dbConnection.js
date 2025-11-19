const mongoose = require("mongoose");
const connectionDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URL);
    console.log(`✅ MongoDB Connected: ${connect.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to database: ${error.message}`);
    process.exit(1);
  }
};
module.exports=connectionDb
