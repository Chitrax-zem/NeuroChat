const pdf = require('pdf-parse');
const fs = require('fs').promises;

async function processPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('PDF Processing Error:', error);
    throw new Error('Failed to process PDF file');
  }
}

async function processTextFile(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return { text };
  } catch (error) {
    console.error('Text File Processing Error:', error);
    throw new Error('Failed to process text file');
  }
}

async function processImageFile(filePath) {
  try {
    const imageData = await fs.readFile(filePath);
    const base64Image = imageData.toString('base64');
    
    return {
      base64: base64Image,
      mimeType: 'image/jpeg'
    };
  } catch (error) {
    console.error('Image Processing Error:', error);
    throw new Error('Failed to process image file');
  }
}

function getFileSummary(text, maxLength = 500) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  return cleanText.substring(0, maxLength) + '...';
}

function generateContextFromFile(fileData, fileType) {
  const summaries = {
    'application/pdf': `[PDF Content]: ${getFileSummary(fileData.text, 300)}\n\nPages: ${fileData.pages}`,
    'text/plain': `[Text File Content]: ${getFileSummary(fileData.text, 500)}`,
    'image/jpeg': '[Image attached - Please describe what you see or ask questions about this image]',
    'image/png': '[Image attached - Please describe what you see or ask questions about this image]'
  };
  
  return summaries[fileType] || '[File attached]';
}

module.exports = {
  processPDF,
  processTextFile,
  processImageFile,
  getFileSummary,
  generateContextFromFile
};