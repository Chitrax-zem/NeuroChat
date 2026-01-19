const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');

// If you plan to parse PDFs/text, you can re-enable these:
// const { processPDF, processTextFile, processImageFile } = require('../utils/fileProcessor');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the 'uploads' folder exists in backend root
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, text, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024 // 10 MB
  },
  fileFilter
});

// Utility to build a short “context” string for the chat based on type + URL
function buildContext(mimetype, url) {
  if (mimetype.startsWith('image/')) {
    return `[Image attached] ${url}`;
  }
  if (mimetype === 'application/pdf') {
    return `[PDF attached] ${url}`;
  }
  if (mimetype === 'text/plain') {
    return `[Text file attached] ${url}`;
  }
  return `[File attached] ${url}`;
}

// POST /api/upload/process
router.post('/process', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Public URL for the stored file (served by /uploads static route)
    const publicUrl = `/uploads/${req.file.filename}`;

    // If you want to parse file content, do it here (commented out for simplicity):
    // let processedData = null;
    // if (req.file.mimetype === 'application/pdf') {
    //   processedData = await processPDF(req.file.path);
    // } else if (req.file.mimetype === 'text/plain') {
    //   processedData = await processTextFile(req.file.path);
    // } else if (req.file.mimetype.startsWith('image/')) {
    //   processedData = await processImageFile(req.file.path);
    // }

    const context = buildContext(req.file.mimetype, publicUrl);

    return res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: publicUrl
      },
      context
    });
  } catch (error) {
    console.error('File Processing Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process file'
    });
  }
});

// POST /api/upload/voice
router.post('/voice', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file uploaded'
      });
    }

    return res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Voice Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice input'
    });
  }
});

module.exports = router;
