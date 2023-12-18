import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

// Load environment variables from the .env file
dotenv.config({
  path: "./.env",
});

// Connect to the MongoDB database
connectDB()
  .then(() => {
    // Start the Express server
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port: ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    // Log an error message if MongoDB connection fails
    console.error("MONGO db connection failed !!! ", err);
  });

/*
(async () => {
  try {
    const connect = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
  } catch (error) {
    console.error("ERROR: ", error);
  }
})();
*/

/*
// Graceful shutdown (Extra)
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Closing server and database connections...");
  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown: ", error);
    process.exit(1);
  }
});
*/
