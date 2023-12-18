/**
 * Wraps an asynchronous route handler with a Promise, allowing the use of async/await syntax.
 * The wrapped handler is expected to return a Promise, and any errors are caught and passed to the next middleware.
 */
// Using Promise-based approach
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    // Ensure that the asynchronous handler's result is a Promise and catch any errors.
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

// Export the asyncHandler function for use in other modules.
export { asyncHandler };

/*
// Alternative approach using try-catch block
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    // Execute the asynchronous handler and handle any potential errors.
    await fn(req, res, next);
  } catch (error) {
    // Respond with an error status and message if an exception occurs.
    res
      .status(error.code || 500)
      .json({ success: false, message: error.message });
  }
};
*/
