import multer from "multer";
import { v4 as uuidv4 } from "uuid";

// Configure multer storage settings
const storage = multer.diskStorage({
  // Ensure the destination path exists and is writable
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // Generate a unique filename using uuid and original filename
    const uniqueFilename = `${file.originalname}-${uuidv4()}`;
    cb(null, uniqueFilename);
  },
});

export const upload = multer({ storage });
