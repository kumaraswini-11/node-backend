import mongoose, { Schema } from "mongoose";

// Creating a new mongoose schema for the 'Subscription' model
const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // Reference to the 'User' model (one who is subscribing)
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // Reference to the 'User' model representing the channel being subscribed to (one to whom 'subscriber' is subscribing)
      ref: "User",
    },
  },
  // Including timestamps for createdAt and updatedAt fields
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
