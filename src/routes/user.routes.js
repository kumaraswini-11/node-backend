import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Define file fields for upload middleware. Each field represents a file type with maxCount limit.
const fileFields = [
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
];

// Define a route for user registration with file upload. Used the 'upload' middleware for handling file uploads.
router.route("/register").post(upload.fields(fileFields), registerUser);

// Route for user login. Accepts a POST request with user credentials.
router.route("/login").post(loginUser);

// Secured route for user logout. Requires a valid JWT token for authentication.
router.route("/logout").post(verifyJWT, logoutUser);

// Check and reissue a new access token.
router.route("/token").post(refreshAccessToken);

export default router;
