const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900,
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await rateLimiter.consume(key);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    res.set('Retry-After', Math.round(msBeforeNext / 1000));
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

const chatRateLimiter = new RateLimiterMemory({
  keyPrefix: 'chat',
  points: 20,
  duration: 60,
});

const chatRateLimiterMiddleware = async (req, res, next) => {
  try {
    const key = req.user ? req.user.id : req.ip;
    await chatRateLimiter.consume(key);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    res.set('Retry-After', Math.round(msBeforeNext / 1000));
    res.status(429).json({
      success: false,
      message: 'Too many chat requests, please slow down',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

module.exports = { rateLimiterMiddleware, chatRateLimiterMiddleware };