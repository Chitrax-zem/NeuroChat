const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const Chat = require('../models/Chat');
const moment = require('moment');

router.get('/dashboard', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = moment().subtract(days, 'days').startOf('day').toDate();

    const analytics = await Analytics.find({
      user: req.user.id,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const totalMessages = analytics.reduce((sum, a) => sum + a.totalMessages, 0);
    const totalTokens = analytics.reduce((sum, a) => sum + a.totalTokens, 0);
    const totalChats = await Chat.countDocuments({
      user: req.user.id,
      createdAt: { $gte: startDate }
    });
    const avgResponseTime = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + a.avgResponseTime, 0) / analytics.length
      : 0;

    const allLanguages = analytics.reduce((acc, a) => {
      a.languagesUsed.forEach(l => {
        if (!acc[l.language]) acc[l.language] = 0;
        acc[l.language] += l.count;
      });
      return acc;
    }, {});

    const allRoles = analytics.reduce((acc, a) => {
      a.botRolesUsed.forEach(r => {
        if (!acc[r.role]) acc[r.role] = 0;
        acc[r.role] += r.count;
      });
      return acc;
    }, {});

    const allQueries = analytics.reduce((acc, a) => {
      a.topQueries.forEach(q => {
        if (!acc[q.query]) acc[q.query] = 0;
        acc[q.query] += q.count;
      });
      return acc;
    }, {});

    const sortedQueries = Object.entries(allQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const dailyStats = analytics.map(a => ({
      date: a.date,
      messages: a.totalMessages,
      tokens: a.totalTokens
    }));

    res.json({
      success: true,
      stats: {
        totalMessages,
        totalTokens,
        totalChats,
        avgResponseTime: Math.round(avgResponseTime / 1000),
        languagesUsed: allLanguages,
        botRolesUsed: allRoles,
        topQueries: sortedQueries,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Analytics Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

router.get('/trends', protect, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = moment().subtract(days, 'days').startOf('day').toDate();

    const analytics = await Analytics.find({
      user: req.user.id,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const trends = analytics.map(a => ({
      date: a.date,
      messages: a.totalMessages,
      tokens: a.totalTokens,
      responseTime: a.avgResponseTime / 1000
    }));

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Analytics Trends Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trends'
    });
  }
});

module.exports = router;