import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to verify the JWT token in the request.
 * If the token is valid, sets the authenticated user in the request object.
 */
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Extract token from either cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request. Missing token.");
    }

    // Verify the JWT token using the secret key
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Retrieve user information based on the decoded token
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token. User not found.");
    }

    // Set authenticated user in the request object
    req.user = user;
    next();
  } catch (error) {
    // Handle JWT verification errors
    throw new ApiError(401, error.message || "Invalid Access Token.");
  }
});
