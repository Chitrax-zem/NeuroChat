import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../utils/api';
import { TrendingUp, MessageSquare, Zap, Clock, Brain } from 'lucide-react';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboard(timeRange);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="error-state">
        <p>Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Welcome back, {user?.username}!</p>
        </div>
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === 7 ? 'active' : ''}`}
            onClick={() => setTimeRange(7)}
          >
            7 Days
          </button>
          <button
            className={`range-btn ${timeRange === 30 ? 'active' : ''}`}
            onClick={() => setTimeRange(30)}
          >
            30 Days
          </button>
          <button
            className={`range-btn ${timeRange === 90 ? 'active' : ''}`}
            onClick={() => setTimeRange(90)}
          >
            90 Days
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={MessageSquare}
          label="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          color="#8B5CF6"
        />
        <StatCard
          icon={Zap}
          label="Total Tokens"
          value={stats.totalTokens.toLocaleString()}
          color="#EC4899"
        />
        <StatCard
          icon={Brain}
          label="Total Chats"
          value={stats.totalChats.toLocaleString()}
          color="#3B82F6"
        />
        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value={`${stats.avgResponseTime}s`}
          color="#10B981"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Languages Used</h3>
          <div className="languages-list">
            {Object.entries(stats.languagesUsed || {}).map(([lang, count]) => (
              <div key={lang} className="language-item">
                <span>{lang.toUpperCase()}</span>
                <span>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Queries</h3>
          <div className="queries-list">
            {stats.topQueries?.length === 0 ? (
              <p className="no-data">No query data available</p>
            ) : (
              stats.topQueries.map((query, index) => (
                <div key={index} className="query-item">
                  <div className="query-rank">#{index + 1}</div>
                  <div className="query-content">
                    <p className="query-text">{query.query}</p>
                    <p className="query-count">{query.count} times</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;