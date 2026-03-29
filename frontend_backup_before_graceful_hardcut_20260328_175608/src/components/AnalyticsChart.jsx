import React from "react";
import styles from "./AnalyticsChart.module.css";

const AnalyticsChart = ({ data }) => {
  const { patientTrends, conditionDistribution } = data;

  // Simple bar chart for patient trends
  const maxPatients = Math.max(...patientTrends.map(trend => trend.patients));
  
  return (
    <div className={styles.analyticsChart}>
      <h3>Analytics Overview</h3>
      
      {/* Patient Trends Chart */}
      <div className={styles.chartSection}>
        <h4>Patient Trends (Last 6 Months)</h4>
        <div className={styles.barChart}>
          {patientTrends.map((trend, index) => (
            <div key={index} className={styles.barContainer}>
              <div 
                className={styles.bar}
                style={{ 
                  height: `${(trend.patients / maxPatients) * 100}%`,
                  backgroundColor: index % 2 === 0 ? '#3b82f6' : '#10b981'
                }}
              ></div>
              <div className={styles.barLabel}>{trend.month}</div>
              <div className={styles.barValue}>{trend.patients}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Condition Distribution */}
      <div className={styles.chartSection}>
        <h4>Condition Distribution</h4>
        <div className={styles.conditionList}>
          {conditionDistribution.map((condition, index) => (
            <div key={index} className={styles.conditionItem}>
              <div className={styles.conditionName}>{condition.condition}</div>
              <div className={styles.conditionBar}>
                <div 
                  className={styles.conditionFill}
                  style={{ 
                    width: `${(condition.count / Math.max(...conditionDistribution.map(c => c.count))) * 100}%`,
                    backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                  }}
                ></div>
              </div>
              <div className={styles.conditionCount}>{condition.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{patientTrends[patientTrends.length - 1]?.patients || 0}</div>
          <div className={styles.statLabel}>This Month</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {Math.round(patientTrends.reduce((sum, trend) => sum + trend.patients, 0) / patientTrends.length)}
          </div>
          <div className={styles.statLabel}>Avg/Month</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {Math.max(...patientTrends.map(trend => trend.patients))}
          </div>
          <div className={styles.statLabel}>Peak</div>
        </div>
      </div>

      <button className={styles.detailedBtn}>View Detailed Analytics</button>
    </div>
  );
};

export default AnalyticsChart;
