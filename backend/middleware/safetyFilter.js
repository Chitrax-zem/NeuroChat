const safetyFilter = (req, res, next) => {
  const forbiddenContent = [
    'hate speech',
    'violence',
    'terrorism',
    'illegal activities',
    'self-harm',
    'suicide',
    'pornography',
    'harassment',
    'abuse',
    'drugs',
    'weapon',
    'bomb',
    'kill',
    'murder',
    'rape',
    'torture',
    'genocide',
    'racist',
    'discrimination'
  ];

  const checkContent = (content) => {
    const lowerContent = content.toLowerCase();
    return forbiddenContent.some(word => lowerContent.includes(word));
  };

  if (req.body && req.body.content && checkContent(req.body.content)) {
    return res.status(400).json({
      success: false,
      message: 'Content violates safety guidelines. Please rephrase your request.'
    });
  }

  if (req.body && req.body.messages) {
    for (const msg of req.body.messages) {
      if (msg.content && checkContent(msg.content)) {
        return res.status(400).json({
          success: false,
          message: 'Content violates safety guidelines. Please rephrase your request.'
        });
      }
    }
  }

  next();
};

module.exports = safetyFilter;