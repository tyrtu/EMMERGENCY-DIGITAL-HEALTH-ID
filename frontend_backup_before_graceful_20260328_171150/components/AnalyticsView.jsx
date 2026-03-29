import React, { useState, useEffect, useRef } from 'react';
import styles from './AnalyticsView.module.css';
import apiClient from '../config/apiClient';
import {
  AccessTime,
  TrendingUp,
  LocalHospital,
  FavoriteRounded,
  Warning,
  CalendarToday,
  Schedule,
  BarChart,
  PieChart,
  List,
  Refresh
} from '@mui/icons-material';

const AnalyticsView = ({ medicId }) => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [bloodTypes, setBloodTypes] = useState([]);
  const [topMedicalConditions, setTopMedicalConditions] = useState([]);
  const [commonAllergies, setCommonAllergies] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryPeriod, setSummaryPeriod] = useState('month'); // 'week' or 'month'
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (medicId) {
      fetchAnalytics();
    }
    
    // Cleanup: cancel ongoing requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [medicId, summaryPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Fetch all analytics in parallel using apiClient
      const [dashboardData, recentData, bloodData, conditionsData, allergiesData, peakData, summaryData] = await Promise.all([
        apiClient.get(`/api/analytics/dashboard/${medicId}`, { signal }).catch(() => ({ data: null })),
        apiClient.get(`/api/analytics/recent-logs/${medicId}?limit=20`, { signal }).catch(() => ({ data: [] })),
        apiClient.get(`/api/analytics/blood-types/${medicId}`, { signal }).catch(() => ({ data: [] })),
        apiClient.get(`/api/analytics/top-medical-conditions/${medicId}?limit=10`, { signal }).catch(() => ({ data: [] })),
        apiClient.get(`/api/analytics/common-allergies/${medicId}?limit=10`, { signal }).catch(() => ({ data: [] })),
        apiClient.get(`/api/analytics/peak-hours/${medicId}`, { signal }).catch(() => ({ data: [] })),
        apiClient.get(`/api/analytics/summary/${medicId}?period=${summaryPeriod}`, { signal }).catch(() => ({ data: null }))
      ]);

      if (dashboardData?.data) setDashboardStats(dashboardData.data);
      if (recentData?.data) setRecentLogs(recentData.data || []);
      if (bloodData?.data) setBloodTypes(bloodData.data || []);
      if (conditionsData?.data) setTopMedicalConditions(conditionsData.data || []);
      if (allergiesData?.data) setCommonAllergies(allergiesData.data || []);
      if (peakData?.data) setPeakHours(peakData.data || []);
      if (summaryData?.data) setSummary(summaryData.data);
    } catch (error) {
      // Don't show error for cancelled requests
      if (error.name === 'AbortError' || (error.message && error.message.includes('cancelled'))) {
        return;
      }
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return { bg: '#fee2e2', text: '#dc2626' };
      case 'caution': return { bg: '#fef3c7', text: '#d97706' };
      default: return { bg: '#d1fae5', text: '#059669' };
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Refresh className={styles.spinner} />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className={styles.analyticsContainer}>
      {/* Scan Activity Dashboard */}
      <section className={styles.section}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.sectionTitle}>
              <BarChart style={{ marginRight: '8px' }} />
              Scan Activity Dashboard
            </h3>
            <button onClick={fetchAnalytics} className={styles.refreshBtn}>
              <Refresh /> Refresh
            </button>
          </div>
          {dashboardStats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>
                  <CalendarToday />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>Today</p>
                  <h3 className={styles.statValue}>{dashboardStats.today?.totalScans || 0}</h3>
                  <span className={styles.statSubtext}>
                    {dashboardStats.today?.criticalCases || 0} critical
                  </span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                  <Schedule />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>This Week</p>
                  <h3 className={styles.statValue}>{dashboardStats.thisWeek?.totalScans || 0}</h3>
                  <span className={styles.statSubtext}>
                    {dashboardStats.thisWeek?.criticalCases || 0} critical
                  </span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
                  <CalendarToday />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>This Month</p>
                  <h3 className={styles.statValue}>{dashboardStats.thisMonth?.totalScans || 0}</h3>
                  <span className={styles.statSubtext}>
                    {dashboardStats.thisMonth?.criticalCases || 0} critical
                  </span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                  <AccessTime />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>Avg Response Time</p>
                  <h3 className={styles.statValue}>
                    {formatTime(dashboardStats.averageResponseTime)}
                  </h3>
                  <span className={styles.statSubtext}>Scan to action</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Weekly/Monthly Summary */}
      {summary && (
        <section className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <TrendingUp style={{ marginRight: '8px' }} />
                {summaryPeriod === 'week' ? 'Weekly' : 'Monthly'} Summary
              </h3>
              <div className={styles.periodToggle}>
                <button
                  onClick={() => setSummaryPeriod('week')}
                  className={summaryPeriod === 'week' ? styles.active : ''}
                >
                  Week
                </button>
                <button
                  onClick={() => setSummaryPeriod('month')}
                  className={summaryPeriod === 'month' ? styles.active : ''}
                >
                  Month
                </button>
              </div>
            </div>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <LocalHospital className={styles.summaryIcon} style={{ color: '#3b82f6' }} />
                <h4>{summary.totalPatients || 0}</h4>
                <p>Total Patients Helped</p>
              </div>
              <div className={styles.summaryCard}>
                <Warning className={styles.summaryIcon} style={{ color: '#dc2626' }} />
                <h4>{summary.criticalCases || 0}</h4>
                <p>Critical Cases Handled</p>
              </div>
              <div className={styles.summaryCard}>
                <Warning className={styles.summaryIcon} style={{ color: '#d97706' }} />
                <h4>{summary.cautionCases || 0}</h4>
                <p>Caution Cases</p>
              </div>
              <div className={styles.summaryCard}>
                <AccessTime className={styles.summaryIcon} style={{ color: '#10b981' }} />
                <h4>{formatTime(summary.averageResponseTime)}</h4>
                <p>Average Response Efficiency</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Critical Case Counter */}
      <section className={styles.section}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.sectionTitle}>
              <Warning style={{ marginRight: '8px' }} />
              Critical Case Counter
            </h3>
          </div>
          {dashboardStats && (
            <div className={styles.criticalStats}>
              <div className={styles.criticalStat}>
                <div className={styles.criticalIcon} style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <Warning />
                </div>
                <div>
                  <h4>Critical Cases</h4>
                  <p className={styles.criticalCount}>
                    {dashboardStats.today?.criticalCases || 0} today
                  </p>
                  <p className={styles.criticalSubtext}>
                    {dashboardStats.thisMonth?.criticalCases || 0} this month
                  </p>
                </div>
              </div>
              <div className={styles.criticalStat}>
                <div className={styles.criticalIcon} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                  <Warning />
                </div>
                <div>
                  <h4>Caution Cases</h4>
                  <p className={styles.criticalCount}>
                    {(dashboardStats.today?.totalScans || 0) - (dashboardStats.today?.criticalCases || 0)} today
                  </p>
                  <p className={styles.criticalSubtext}>
                    Normal cases handled safely
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className={styles.twoColumnLayout}>
        {/* Recent Emergency Log */}
        <section className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <List style={{ marginRight: '8px' }} />
                Recent Emergency Log
              </h3>
            </div>
            <div className={styles.logList}>
              {recentLogs.length > 0 ? (
                recentLogs.map((log, index) => {
                  const statusColor = getStatusColor(log.scanStatus);
                  return (
                    <div key={log.scanId || index} className={styles.logItem}>
                      <div className={styles.logLeft}>
                        <div className={styles.logAvatar}>
                          {(log.patientInfo?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div className={styles.logInfo}>
                          <p className={styles.logName}>{log.patientInfo?.name || 'Unknown'}</p>
                          <p className={styles.logTime}>{formatDate(log.scannedAt)}</p>
                        </div>
                      </div>
                      <div className={styles.logRight}>
                        <span
                          className={styles.logStatus}
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          {log.scanStatus || 'normal'}
                        </span>
                        {log.responseTime > 0 && (
                          <span className={styles.logTime}>
                            {formatTime(log.responseTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <List style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                  <p>No scans recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Blood Type Distribution */}
        <section className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <FavoriteRounded style={{ marginRight: '8px' }} />
                Blood Type Distribution
              </h3>
            </div>
            <div className={styles.bloodTypeList}>
              {bloodTypes.length > 0 ? (
                bloodTypes.map((item, index) => (
                  <div key={index} className={styles.bloodTypeItem}>
                    <div className={styles.bloodTypeLabel}>
                      <FavoriteRounded style={{ color: '#dc2626', marginRight: '8px' }} />
                      <span className={styles.bloodType}>{item._id || 'Unknown'}</span>
                    </div>
                    <span className={styles.bloodTypeCount}>{item.count || 0}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <FavoriteRounded style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                  <p>No blood type data yet</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className={styles.twoColumnLayout}>
        {/* Top Medical Conditions */}
        <section className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <LocalHospital style={{ marginRight: '8px' }} />
                Top Medical Conditions
              </h3>
            </div>
            <div className={styles.conditionsList}>
              {topMedicalConditions.length > 0 ? (
                topMedicalConditions.map((item, index) => (
                  <div key={index} className={styles.conditionItem}>
                    <div className={styles.conditionRank}>#{index + 1}</div>
                    <div className={styles.conditionInfo}>
                      <p className={styles.conditionName}>{item.condition || item.name || 'Unknown'}</p>
                      <p className={styles.conditionCount}>{item.count || item.occurrences || 0} {item.count === 1 ? 'case' : 'cases'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <LocalHospital style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                  <p>No medical condition data yet</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Most Common Allergies */}
        <section className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <Warning style={{ marginRight: '8px' }} />
                Most Common Allergies
              </h3>
            </div>
            <div className={styles.conditionsList}>
              {commonAllergies.length > 0 ? (
                commonAllergies.map((item, index) => (
                  <div key={index} className={styles.conditionItem}>
                    <div className={styles.conditionRank}>#{index + 1}</div>
                    <div className={styles.conditionInfo}>
                      <p className={styles.conditionName}>{item._id || 'Unknown'}</p>
                      <p className={styles.conditionCount}>{item.count || 0} cases</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <Warning style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                  <p>No allergy data yet</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Peak Emergency Hours */}
      <section className={styles.section}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.sectionTitle}>
              <Schedule style={{ marginRight: '8px' }} />
              Peak Emergency Hours
            </h3>
          </div>
          <div className={styles.peakHoursList}>
              {peakHours.length > 0 ? (
                peakHours.slice(0, 8).map((item, index) => {
                  const hour = item._id || 0;
                  const hourLabel = `${hour}:00 - ${hour + 1}:00`;
                  const maxCount = Math.max(...peakHours.map(h => h.count || 0));
                  const percentage = ((item.count || 0) / maxCount) * 100;

                  return (
                    <div key={index} className={styles.peakHourItem}>
                      <div className={styles.peakHourLabel}>
                        <span>{hourLabel}</span>
                        <span className={styles.peakHourCount}>{item.count || 0}</span>
                      </div>
                      <div className={styles.peakHourBar}>
                        <div
                          className={styles.peakHourBarFill}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <Schedule style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
                  <p>No peak hour data yet</p>
                </div>
              )}
            </div>
          </div>
        </section>
    </div>
  );
};

export default AnalyticsView;

