const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  languagesUsed: [{
    language: String,
    count: Number
  }],
  botRolesUsed: [{
    role: String,
    count: Number
  }],
  topQueries: [{
    query: String,
    count: Number
  }],
  fileUploads: {
    type: Number,
    default: 0
  },
  voiceInteractions: {
    type: Number,
    default: 0
  },
  avgResponseTime: {
    type: Number,
    default: 0
  },
  // Make rating optional/neutral by default:
  satisfactionRating: {
    type: Number,
    default: 0,  // neutral / not rated yet
    min: 0,      // allow 0 initially
    max: 5
  }
});

analyticsSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
