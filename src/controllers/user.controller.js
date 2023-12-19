import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Generates access and refresh tokens for a given user ID.
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens."
    );
  }
};

// Controller for user registration
const registerUser = asyncHandler(async (req, res) => {
  // Extract user details from the request body
  const { fullName, email, username, password } = req.body;

  // Validate that all required fields are provided
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  // Check if user already exists with the given username or email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists.");
  }

  // Upload avatar and cover image to Cloudinary
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error uploading avatar file to Cloudinary.");
  }

  // Create user object and store it in the database
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Check if the user creation was successful and remove sensitive fields from the response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user.");
  }

  // Return success response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully."));
});

// Controller for user login
const loginUser = asyncHandler(async (req, res) => {
  // Extract user login credentials from the request body
  const { email, username, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "Must provide a email or username.");
  }

  /*
  if (!email && !username) {
    throw new ApiError(400, "Must provide a email or username.");
  }
  */

  // Check if the username or email is present in the database
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User doesnt exist.");
  }

  // Verify the password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Invalid user credentials.");
  }

  // Generate access token and refresh token by 'id'
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  // Update the user object
  const loggedInUser = await User.findById(user._id).select(
    "_password, _refreshToken"
  );

  // Store tokens in cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully."
      )
    );
});

// Controller for user logout.
const logoutUser = asyncHandler(async (req, res) => {
  // Logout user by updating the user object and clearing cookies.
  // Update the user object for logout
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  // Store tokens in cookies
  const options = { httpOnly: true, secure: true };

  // Clear cookies and send response
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out."));
});

// Controller for reissue the Access token.
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token from cokies
  // match it with the id , if mtched send the _id
  // generate new access token  and store it cookies, but the resfresh token
  // allow him to the wanted page automatically

  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request.");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    console.log(user);
    if (!user) {
      throw new ApiError(404, "Invalid refresh token.");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used.");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user?._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    // Send response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "User logged in again successfully. Access token refreshed."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token.");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
