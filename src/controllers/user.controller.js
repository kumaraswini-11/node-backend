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

// Controller for reissuing the Access token.
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Retrieve the refresh token from either cookies or request body.
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request.");
  }

  try {
    // Verify the incoming refresh token using the secret key.
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    // Find the user associated with the decoded token's user ID.
    const user = await User.findById(decodedToken?._id);
    console.log(user);
    if (!user) {
      throw new ApiError(404, "Invalid refresh token.");
    }

    // Check if the incoming refresh token matches the stored refresh token for the user in database.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used.");
    }

    // Generate new access and refresh tokens for the user.
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user?._id);

    // Configure cookie options for secure and HTTP-only cookies.
    const options = {
      httpOnly: true,
      secure: true,
    };

    // Send a successful response with updated cookies.
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

// Controller for changing the password.
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Retrieve the password from the request body.
  const { oldPassword, newPassword } = req.body;

  // It's obvious that the user must be logged in to change the password.
  // Since the authmiddleware is executed, we already have access to the user details.
  const user = await User.findById(req.user?._id);

  // Check if the provided old password is correct.
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password.");
  }

  // Update the user's password with the new password.
  user.password = newPassword;

  // Save the user with validateBeforeSave set to false to bypass validation for this specific operation.
  await user.save({ validateBeforeSave: false });

  // Respond with a success message.
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."));
});

// Controller for getting the current user.
const getCurrentUser = asyncHandler(async (req, res) => {
  // Assuming that the user information is attached to the request by the authentication middleware.
  // Respond with the current user details in the response.
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully."));
});

// Controller for updating the current user details (text-based)
const updateAccountDetails = asyncHandler(async (res, req) => {
  // Retrieve the updated details from the request body.
  const { email, fullName } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required.");
  }

  // Assuming that the user information is attached to the request by the authentication middleware.
  // It's obvious that the user must be logged in to change his details.
  // Since the auth middleware is executed, we already have access to the user details.
  // { new: true } returns the updated information after the update.
  // $set: {} is a MongoDB operator used for updating specific fields.
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { new: true }
  ).select("-password");

  // Respond with the updated user details.
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully."));
});

// Controller for updating the current user avatar image (file-based)
const updateUserAvatar = asyncHandler(async (req, res) => {
  // Get the local path of the uploaded avatar file
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing.");
  }

  // Upload the avatar file to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar file to Cloudinary.");
  }

  // Update the user's avatar URL in the database
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  // Respond with success message
  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar changed successfully."));
});

// Controller for updating the current user cover image (file-based)
const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Get the local path of the uploaded cover image file
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing.");
  }

  // Upload the cover image file to Cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(
      400,
      "Error while uploading cover image file to Cloudinary."
    );
  }

  // Update the user's cover image URL in the database
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");

  // Respond with success message
  return res
    .status(200)
    .json(new ApiResponse(200, "Cover image changed successfully."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
