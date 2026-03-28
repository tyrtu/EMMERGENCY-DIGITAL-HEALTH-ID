import express from "express";
const router = express.Router();
import {
  ScanAnalytics,
  PracticeAnalytics,
  MonthlyAnalytics,
  AlertAnalytics,
  SystemAnalytics,
  PatientActivity,
  MedicPerformance,
  RealTimeAnalytics,
  PredictiveAnalytics
} from '../models/Analytic.js';

// Utility function for handling errors
const handleError = (res, error, message = 'Server error') => {
  console.error(error);
  res.status(500).json({ 
    success: false, 
    message, 
    error: error.message 
  });
};

// Utility function for pagination
const getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};

// SCAN ANALYTICS ROUTES

// Get all scan analytics with pagination and filtering
router.get('/scans', async (req, res) => {
  try {
    const { page = 0, size = 10, medicId, patientId, scanType, startDate, endDate } = req.query;
    const { limit, offset } = getPagination(page, size);

    let filter = {};
    if (medicId) filter.medicId = medicId;
    if (patientId) filter.patientId = patientId;
    if (scanType) filter.scanType = scanType;
    if (startDate || endDate) {
      filter.scannedAt = {};
      if (startDate) filter.scannedAt.$gte = new Date(startDate);
      if (endDate) filter.scannedAt.$lte = new Date(endDate);
    }

    const scans = await ScanAnalytics.find(filter)
      .sort({ scannedAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await ScanAnalytics.countDocuments(filter);

    res.json({
      success: true,
      data: scans,
      pagination: {
        total,
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch scan analytics');
  }
});

// Get scan analytics by ID
router.get('/scans/:id', async (req, res) => {
  try {
    const scan = await ScanAnalytics.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan analytics not found'
      });
    }
    res.json({ success: true, data: scan });
  } catch (error) {
    handleError(res, error, 'Failed to fetch scan analytics');
  }
});

// Create new scan analytics
router.post('/scans', async (req, res) => {
  try {
    const scanData = {
      ...req.body,
      scannedAt: req.body.scannedAt || new Date()
    };

    // Calculate severity score if not provided
    if (!scanData.severityScore) {
      scanData.severityScore = calculateSeverityScore(scanData);
    }

    const scan = new ScanAnalytics(scanData);
    await scan.save();

    // Update practice analytics
    await updatePracticeAnalytics(scan.medicId, scan.scannedAt, scan);

    res.status(201).json({
      success: true,
      message: 'Scan analytics created successfully',
      data: scan
    });
  } catch (error) {
    handleError(res, error, 'Failed to create scan analytics');
  }
});

// Update scan analytics
router.put('/scans/:id', async (req, res) => {
  try {
    const scan = await ScanAnalytics.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan analytics not found'
      });
    }

    res.json({
      success: true,
      message: 'Scan analytics updated successfully',
      data: scan
    });
  } catch (error) {
    handleError(res, error, 'Failed to update scan analytics');
  }
});

// Delete scan analytics
router.delete('/scans/:id', async (req, res) => {
  try {
    const scan = await ScanAnalytics.findByIdAndDelete(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan analytics not found'
      });
    }

    res.json({
      success: true,
      message: 'Scan analytics deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'Failed to delete scan analytics');
  }
});

// Get scan statistics for dashboard
router.get('/scans-stats/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.scannedAt = {};
      if (startDate) dateFilter.scannedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.scannedAt.$lte = new Date(endDate);
    }

    const stats = await ScanAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter }
      },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          emergencyScans: {
            $sum: { $cond: [{ $eq: ['$scanType', 'Emergency'] }, 1, 0] }
          },
          routineScans: {
            $sum: { $cond: [{ $eq: ['$scanType', 'Routine'] }, 1, 0] }
          },
          criticalScans: {
            $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] }
          },
          averageResponseTime: { $avg: '$responseTime' },
          uniquePatients: { $addToSet: '$patientId' },
          totalCriticalConditions: { $sum: '$criticalConditionsFound' }
        }
      },
      {
        $project: {
          totalScans: 1,
          emergencyScans: 1,
          routineScans: 1,
          criticalScans: 1,
          averageResponseTime: 1,
          uniquePatientsCount: { $size: '$uniquePatients' },
          totalCriticalConditions: 1
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalScans: 0,
      emergencyScans: 0,
      routineScans: 0,
      criticalScans: 0,
      averageResponseTime: 0,
      uniquePatientsCount: 0,
      totalCriticalConditions: 0
    };

    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch scan statistics');
  }
});

// PRACTICE ANALYTICS ROUTES

// Get practice analytics for a medic
router.get('/practice/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { startDate, endDate, period = 'daily' } = req.query;

    let filter = { medicId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const analytics = await PracticeAnalytics.find(filter)
      .sort({ date: -1 })
      .lean();

    // If no analytics found, generate summary from scan data
    if (analytics.length === 0) {
      const summary = await generatePracticeSummary(medicId, startDate, endDate);
      return res.json({ success: true, data: [summary] });
    }

    res.json({ success: true, data: analytics });
  } catch (error) {
    handleError(res, error, 'Failed to fetch practice analytics');
  }
});

// Create or update practice analytics
router.post('/practice', async (req, res) => {
  try {
    const { medicId, date } = req.body;
    
    // Check if analytics already exist for this date
    const existing = await PracticeAnalytics.findOne({ medicId, date });
    
    let practiceAnalytics;
    if (existing) {
      practiceAnalytics = await PracticeAnalytics.findByIdAndUpdate(
        existing._id,
        req.body,
        { new: true, runValidators: true }
      );
    } else {
      practiceAnalytics = new PracticeAnalytics(req.body);
      await practiceAnalytics.save();
    }

    res.status(201).json({
      success: true,
      message: 'Practice analytics saved successfully',
      data: practiceAnalytics
    });
  } catch (error) {
    handleError(res, error, 'Failed to save practice analytics');
  }
});

// Get practice comparison (current vs previous period)
router.get('/practice-comparison/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { period = 'month' } = req.query;

    const currentDate = new Date();
    let previousDate = new Date();

    if (period === 'month') {
      previousDate.setMonth(previousDate.getMonth() - 1);
    } else if (period === 'week') {
      previousDate.setDate(previousDate.getDate() - 7);
    } else if (period === 'year') {
      previousDate.setFullYear(previousDate.getFullYear() - 1);
    }

    const [currentAnalytics, previousAnalytics] = await Promise.all([
      PracticeAnalytics.findOne({
        medicId,
        date: { $gte: currentDate }
      }).sort({ date: -1 }),
      PracticeAnalytics.findOne({
        medicId,
        date: { $gte: previousDate, $lt: currentDate }
      }).sort({ date: -1 })
    ]);

    const comparison = {
      current: currentAnalytics,
      previous: previousAnalytics,
      growth: calculateGrowthRate(currentAnalytics, previousAnalytics)
    };

    res.json({ success: true, data: comparison });
  } catch (error) {
    handleError(res, error, 'Failed to fetch practice comparison');
  }
});

// MONTHLY ANALYTICS ROUTES

// Get monthly analytics for a medic
router.get('/monthly/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { year, month } = req.query;

    let filter = { medicId };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const analytics = await MonthlyAnalytics.find(filter)
      .sort({ year: -1, month: -1 })
      .lean();

    res.json({ success: true, data: analytics });
  } catch (error) {
    handleError(res, error, 'Failed to fetch monthly analytics');
  }
});

// Generate monthly analytics
router.post('/monthly/generate', async (req, res) => {
  try {
    const { medicId, year, month } = req.body;

    // Check if monthly analytics already exist
    const existing = await MonthlyAnalytics.findOne({ medicId, year, month });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Monthly analytics already exist for this period'
      });
    }

    // Generate monthly analytics from scan data
    const monthlyData = await generateMonthlyAnalytics(medicId, year, month);
    const monthlyAnalytics = new MonthlyAnalytics(monthlyData);
    await monthlyAnalytics.save();

    res.status(201).json({
      success: true,
      message: 'Monthly analytics generated successfully',
      data: monthlyAnalytics
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate monthly analytics');
  }
});

// ALERT ANALYTICS ROUTES

// Get alert analytics
router.get('/alerts', async (req, res) => {
  try {
    const { page = 0, size = 10, medicId, alertType, priority, status } = req.query;
    const { limit, offset } = getPagination(page, size);

    let filter = {};
    if (medicId) filter.medicId = medicId;
    if (alertType) filter.alertType = alertType;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    const alerts = await AlertAnalytics.find(filter)
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await AlertAnalytics.countDocuments(filter);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch alert analytics');
  }
});

// Create alert analytics
router.post('/alerts', async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      triggeredAt: req.body.triggeredAt || new Date()
    };

    const alert = new AlertAnalytics(alertData);
    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Alert analytics created successfully',
      data: alert
    });
  } catch (error) {
    handleError(res, error, 'Failed to create alert analytics');
  }
});

// Update alert status
router.patch('/alerts/:id/status', async (req, res) => {
  try {
    const { status, actionTaken, notes } = req.body;
    const updateData = { status };

    if (status === 'acknowledged') {
      updateData.acknowledgedAt = new Date();
    } else if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      if (actionTaken) updateData.actionTaken = actionTaken;
    }

    if (notes) {
      updateData.$push = {
        notes: {
          note: notes,
          addedBy: 'system',
          addedAt: new Date()
        }
      };
    }

    const alert = await AlertAnalytics.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert analytics not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert status updated successfully',
      data: alert
    });
  } catch (error) {
    handleError(res, error, 'Failed to update alert status');
  }
});

// Get alert statistics
router.get('/alerts-stats/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.triggeredAt = {};
      if (startDate) dateFilter.triggeredAt.$gte = new Date(startDate);
      if (endDate) dateFilter.triggeredAt.$lte = new Date(endDate);
    }

    const stats = await AlertAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter }
      },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          pendingAlerts: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          resolvedAlerts: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          highPriorityAlerts: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
          },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ['$alertType', 'critical'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    const alertByType = await AlertAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter }
      },
      {
        $group: {
          _id: '$alertType',
          count: { $sum: 1 }
        }
      }
    ]);

    const alertByStatus = await AlertAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      summary: stats.length > 0 ? stats[0] : {
        totalAlerts: 0,
        pendingAlerts: 0,
        resolvedAlerts: 0,
        highPriorityAlerts: 0,
        criticalAlerts: 0,
        avgResponseTime: 0
      },
      byType: alertByType,
      byStatus: alertByStatus
    };

    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch alert statistics');
  }
});

// SYSTEM ANALYTICS ROUTES

// Get system analytics
router.get('/system', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const analytics = await SystemAnalytics.find(filter)
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: analytics });
  } catch (error) {
    handleError(res, error, 'Failed to fetch system analytics');
  }
});

// Create system analytics
router.post('/system', async (req, res) => {
  try {
    const systemData = {
      ...req.body,
      date: req.body.date || new Date()
    };

    // Check if system analytics already exist for this date
    const existing = await SystemAnalytics.findOne({ date: systemData.date });
    
    let systemAnalytics;
    if (existing) {
      systemAnalytics = await SystemAnalytics.findByIdAndUpdate(
        existing._id,
        systemData,
        { new: true, runValidators: true }
      );
    } else {
      systemAnalytics = new SystemAnalytics(systemData);
      await systemAnalytics.save();
    }

    res.status(201).json({
      success: true,
      message: 'System analytics saved successfully',
      data: systemAnalytics
    });
  } catch (error) {
    handleError(res, error, 'Failed to save system analytics');
  }
});

// PATIENT ACTIVITY ROUTES

// Get patient activity
router.get('/patient-activity', async (req, res) => {
  try {
    const { page = 0, size = 10, patientId, activityType, startDate, endDate } = req.query;
    const { limit, offset } = getPagination(page, size);

    let filter = {};
    if (patientId) filter.patientId = patientId;
    if (activityType) filter.activityType = activityType;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const activities = await PatientActivity.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await PatientActivity.countDocuments(filter);

    res.json({
      success: true,
      data: activities,
      pagination: {
        total,
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch patient activity');
  }
});

// Log patient activity
router.post('/patient-activity', async (req, res) => {
  try {
    const activityData = {
      ...req.body,
      timestamp: req.body.timestamp || new Date(),
      performedBy: req.body.performedBy || {
        userId: 'system',
        userType: 'system',
        userName: 'System'
      }
    };

    const activity = new PatientActivity(activityData);
    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Patient activity logged successfully',
      data: activity
    });
  } catch (error) {
    handleError(res, error, 'Failed to log patient activity');
  }
});

// MEDIC PERFORMANCE ROUTES

// Get medic performance
router.get('/medic-performance/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { periodType, startDate, endDate } = req.query;

    let filter = { medicId };
    if (periodType) filter['evaluationPeriod.periodType'] = periodType;
    if (startDate || endDate) {
      filter['evaluationPeriod.startDate'] = {};
      if (startDate) filter['evaluationPeriod.startDate'].$gte = new Date(startDate);
      if (endDate) filter['evaluationPeriod.startDate'].$lte = new Date(endDate);
    }

    const performance = await MedicPerformance.find(filter)
      .sort({ 'evaluationPeriod.startDate': -1 })
      .lean();

    res.json({ success: true, data: performance });
  } catch (error) {
    handleError(res, error, 'Failed to fetch medic performance');
  }
});

// Create or update medic performance
router.post('/medic-performance', async (req, res) => {
  try {
    const { medicId, evaluationPeriod } = req.body;
    
    // Check if performance already exists for this period
    const existing = await MedicPerformance.findOne({
      medicId,
      'evaluationPeriod.startDate': evaluationPeriod.startDate,
      'evaluationPeriod.endDate': evaluationPeriod.endDate
    });
    
    let medicPerformance;
    if (existing) {
      medicPerformance = await MedicPerformance.findByIdAndUpdate(
        existing._id,
        req.body,
        { new: true, runValidators: true }
      );
    } else {
      medicPerformance = new MedicPerformance(req.body);
      await medicPerformance.save();
    }

    res.status(201).json({
      success: true,
      message: 'Medic performance saved successfully',
      data: medicPerformance
    });
  } catch (error) {
    handleError(res, error, 'Failed to save medic performance');
  }
});

// REAL-TIME ANALYTICS ROUTES

// Get real-time analytics
router.get('/real-time', async (req, res) => {
  try {
    const realTimeData = await RealTimeAnalytics.findOne()
      .sort({ timestamp: -1 })
      .lean();

    // If no real-time data, generate current snapshot
    const data = realTimeData || await generateRealTimeSnapshot();

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch real-time analytics');
  }
});

// Update real-time analytics
router.post('/real-time', async (req, res) => {
  try {
    const realTimeData = new RealTimeAnalytics(req.body);
    await realTimeData.save();

    res.status(201).json({
      success: true,
      message: 'Real-time analytics updated successfully',
      data: realTimeData
    });
  } catch (error) {
    handleError(res, error, 'Failed to update real-time analytics');
  }
});

// PREDICTIVE ANALYTICS ROUTES

// Get predictive analytics for a medic
router.get('/predictive/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { predictionDate } = req.query;

    let filter = { medicId };
    if (predictionDate) {
      filter.predictionDate = new Date(predictionDate);
    }

    const predictions = await PredictiveAnalytics.find(filter)
      .sort({ predictionDate: -1 })
      .lean();

    res.json({ success: true, data: predictions });
  } catch (error) {
    handleError(res, error, 'Failed to fetch predictive analytics');
  }
});

// Generate predictive analytics
router.post('/predictive/generate', async (req, res) => {
  try {
    const { medicId, predictionDate } = req.body;

    // Check if prediction already exists
    const existing = await PredictiveAnalytics.findOne({
      medicId,
      predictionDate: new Date(predictionDate)
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Predictive analytics already exist for this date'
      });
    }

    // Generate predictions based on historical data
    const predictions = await generatePredictions(medicId, predictionDate);
    const predictiveAnalytics = new PredictiveAnalytics(predictions);
    await predictiveAnalytics.save();

    res.status(201).json({
      success: true,
      message: 'Predictive analytics generated successfully',
      data: predictiveAnalytics
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate predictive analytics');
  }
});

// DASHBOARD SUMMARY ROUTE

// Get comprehensive dashboard summary
router.get('/dashboard-summary/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { period = '30days' } = req.query;

    const startDate = new Date();
    if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90days') {
      startDate.setDate(startDate.getDate() - 90);
    }

    const [
      scanStats,
      alertStats,
      practiceAnalytics,
      performance
    ] = await Promise.all([
      ScanAnalytics.aggregate([
        {
          $match: {
            medicId,
            scannedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalScans: { $sum: 1 },
            emergencyScans: {
              $sum: { $cond: [{ $eq: ['$scanType', 'Emergency'] }, 1, 0] }
            },
            criticalScans: {
              $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] }
            },
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ]),
      AlertAnalytics.aggregate([
        {
          $match: {
            medicId,
            triggeredAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalAlerts: { $sum: 1 },
            pendingAlerts: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            highPriorityAlerts: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
            }
          }
        }
      ]),
      PracticeAnalytics.findOne({
        medicId,
        date: { $gte: startDate }
      }).sort({ date: -1 }),
      MedicPerformance.findOne({
        medicId,
        'evaluationPeriod.endDate': { $gte: startDate }
      }).sort({ 'evaluationPeriod.endDate': -1 })
    ]);

    const summary = {
      scanStats: scanStats[0] || {
        totalScans: 0,
        emergencyScans: 0,
        criticalScans: 0,
        avgResponseTime: 0
      },
      alertStats: alertStats[0] || {
        totalAlerts: 0,
        pendingAlerts: 0,
        highPriorityAlerts: 0
      },
      practiceAnalytics: practiceAnalytics || {},
      performance: performance || {}
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    handleError(res, error, 'Failed to fetch dashboard summary');
  }
});

// Get overall platform statistics
router.get('/platform-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const platformStats = await SystemAnalytics.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: null,
          totalMedics: { $max: '$platformStats.totalMedics' },
          activeMedics: { $max: '$platformStats.activeMedics' },
          totalPatients: { $max: '$platformStats.totalPatients' },
          totalScans: { $max: '$platformStats.totalScans' },
          emergencyScans: { $max: '$platformStats.emergencyScans' },
          averageUptime: { $avg: '$systemPerformance.uptime' },
          averageResponseTime: { $avg: '$systemPerformance.averageResponseTime' }
        }
      }
    ]);

    const latestStats = await SystemAnalytics.findOne()
      .sort({ date: -1 })
      .lean();

    const result = {
      overall: platformStats[0] || {
        totalMedics: 0,
        activeMedics: 0,
        totalPatients: 0,
        totalScans: 0,
        emergencyScans: 0,
        averageUptime: 0,
        averageResponseTime: 0
      },
      current: latestStats?.platformStats || {},
      performance: latestStats?.systemPerformance || {}
    };

    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch platform statistics');
  }
});

// Get trend data for charts
router.get('/trends/:medicId', async (req, res) => {
  try {
    const { medicId } = req.params;
    const { metric = 'scans', period = '30days' } = req.query;

    const startDate = new Date();
    if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90days') {
      startDate.setDate(startDate.getDate() - 90);
    }

    let trendData;
    
    if (metric === 'scans') {
      trendData = await ScanAnalytics.aggregate([
        {
          $match: {
            medicId,
            scannedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$scannedAt'
              }
            },
            count: { $sum: 1 },
            emergencyScans: {
              $sum: { $cond: [{ $eq: ['$scanType', 'Emergency'] }, 1, 0] }
            },
            criticalScans: {
              $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
    } else if (metric === 'alerts') {
      trendData = await AlertAnalytics.aggregate([
        {
          $match: {
            medicId,
            triggeredAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$triggeredAt'
              }
            },
            count: { $sum: 1 },
            highPriority: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
            },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
    }

    res.json({ success: true, data: trendData });
  } catch (error) {
    handleError(res, error, 'Failed to fetch trend data');
  }
});

// HELPER FUNCTIONS

// Calculate severity score for scan
function calculateSeverityScore(scanData) {
  let score = 0;
  if (scanData.criticalConditionsFound > 0) score += 5;
  if (scanData.responseTime > 300) score += 2; // > 5 minutes
  if (scanData.emergencyContactsCalled) score += 3;
  if (scanData.scanType === 'Emergency') score += 2;
  return Math.min(score, 10);
}

// Update practice analytics when new scan is added
async function updatePracticeAnalytics(medicId, date, scan) {
  try {
    const practiceDate = new Date(date);
    practiceDate.setHours(0, 0, 0, 0);

    let practice = await PracticeAnalytics.findOne({
      medicId,
      date: practiceDate
    });

    if (!practice) {
      practice = new PracticeAnalytics({
        medicId,
        date: practiceDate,
        dailyStats: {
          totalScans: 0,
          emergencyScans: 0,
          routineScans: 0,
          criticalAlerts: 0,
          uniquePatients: [],
          averageResponseTime: 0
        }
      });
    }

    // Update statistics
    practice.dailyStats.totalScans += 1;
    if (scan.scanType === 'Emergency') {
      practice.dailyStats.emergencyScans += 1;
    } else if (scan.scanType === 'Routine') {
      practice.dailyStats.routineScans += 1;
    }
    if (scan.scanStatus === 'critical') {
      practice.dailyStats.criticalAlerts += 1;
    }

    // Update unique patients
    if (!practice.dailyStats.uniquePatients.includes(scan.patientId)) {
      practice.dailyStats.uniquePatients.push(scan.patientId);
    }

    // Update average response time
    const totalResponseTime = practice.dailyStats.averageResponseTime * 
      (practice.dailyStats.totalScans - 1) + scan.responseTime;
    practice.dailyStats.averageResponseTime = totalResponseTime / practice.dailyStats.totalScans;

    await practice.save();
  } catch (error) {
    console.error('Error updating practice analytics:', error);
  }
}

// Generate practice summary from scan data
async function generatePracticeSummary(medicId, startDate, endDate) {
  const scans = await ScanAnalytics.find({
    medicId,
    scannedAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });

  const summary = {
    medicId,
    date: new Date(),
    dailyStats: {
      totalScans: scans.length,
      emergencyScans: scans.filter(s => s.scanType === 'Emergency').length,
      routineScans: scans.filter(s => s.scanType === 'Routine').length,
      criticalAlerts: scans.filter(s => s.scanStatus === 'critical').length,
      uniquePatients: [...new Set(scans.map(s => s.patientId))].length,
      averageResponseTime: scans.reduce((acc, s) => acc + s.responseTime, 0) / scans.length || 0
    }
  };

  return summary;
}

// Calculate growth rate for practice comparison
function calculateGrowthRate(current, previous) {
  if (!current || !previous) return {};

  const growth = {};
  const currentStats = current.dailyStats;
  const previousStats = previous.dailyStats;

  growth.totalScans = ((currentStats.totalScans - previousStats.totalScans) / previousStats.totalScans) * 100;
  growth.emergencyScans = ((currentStats.emergencyScans - previousStats.emergencyScans) / previousStats.emergencyScans) * 100;
  growth.averageResponseTime = ((currentStats.averageResponseTime - previousStats.averageResponseTime) / previousStats.averageResponseTime) * 100;

  return growth;
}

// Generate monthly analytics
async function generateMonthlyAnalytics(medicId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const scans = await ScanAnalytics.find({
    medicId,
    scannedAt: { $gte: startDate, $lte: endDate }
  });

  const monthlyData = {
    medicId,
    year,
    month,
    monthlyTrends: {
      totalPatients: new Set(scans.map(s => s.patientId)).size,
      totalScans: scans.length,
      emergencyScans: scans.filter(s => s.scanType === 'Emergency').length,
      criticalCases: scans.filter(s => s.scanStatus === 'critical').length
    }
  };

  return monthlyData;
}

// Generate real-time snapshot
async function generateRealTimeSnapshot() {
  const activeSessions = Math.floor(Math.random() * 100) + 1; // Mock data
  const concurrentScans = Math.floor(Math.random() * 50) + 1; // Mock data

  return {
    timestamp: new Date(),
    activeSessions,
    concurrentScans,
    activeAlerts: await AlertAnalytics.countDocuments({ status: 'pending' }),
    systemLoad: {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100
    }
  };
}

// Generate predictions based on historical data
async function generatePredictions(medicId, predictionDate) {
  const historicalData = await ScanAnalytics.find({ medicId })
    .sort({ scannedAt: -1 })
    .limit(100);

  // Simple prediction algorithm (in real app, use ML model)
  const avgScansPerDay = historicalData.length / 30; // Average over last 30 days
  const emergencyRate = historicalData.filter(s => s.scanType === 'Emergency').length / historicalData.length;

  return {
    medicId,
    predictionDate: new Date(predictionDate),
    predictions: {
      patientVolume: {
        expected: Math.round(avgScansPerDay * 1.1), // 10% growth
        confidence: 0.75,
        factors: ['historical_trends', 'seasonality']
      },
      emergencyProbability: {
        probability: emergencyRate,
        confidence: 0.8,
        riskFactors: ['patient_demographics', 'historical_patterns']
      }
    },
    recommendations: [
      {
        category: 'staffing',
        recommendation: 'Consider additional staff during peak hours',
        priority: 'medium',
        impact: 0.7
      }
    ]
  };
}

// ============================================
// MINIMAL EMERGENCY-FOCUSED ANALYTICS ROUTES
// ============================================

// Track a scan (called when QR code is scanned)
router.post('/track-scan', async (req, res) => {
  try {
    let { medicId, patientId, patientInfo, scanStatus, responseTime, conditions, medicalConditions, allergies, medications, bloodGroup } = req.body;
    
    // If medicId is not provided, try to get from auth (if token is present)
    // This allows the route to work with or without full auth
    if (!medicId && req.userType === 'medic' && req.profile?.authId) {
      medicId = req.profile.authId.toString();
    }
    
    if (!medicId || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'medicId and patientId are required'
      });
    }

    // Generate unique scan ID
    const scanId = `${medicId}-${patientId}-${Date.now()}`;

    const scanData = {
      scanId,
      medicId,
      patientId,
      patientInfo: patientInfo || {},
      scanType: 'Emergency',
      scanStatus: scanStatus || 'normal',
      scannedAt: new Date(),
      responseTime: responseTime || 0,
      conditions: conditions || [], // Keep for backward compatibility
      medicalConditions: medicalConditions || [],
      allergies: allergies || [],
      medications: medications || [],
      criticalConditionsFound: medicalConditions ? medicalConditions.length : (conditions ? conditions.length : 0)
    };

    // Set blood group if provided
    if (bloodGroup) {
      scanData.patientInfo = {
        ...scanData.patientInfo,
        bloodGroup
      };
    }

    const scan = new ScanAnalytics(scanData);
    await scan.save();

    // Log for debugging
    console.log('Scan tracked:', {
      scanId: scan.scanId,
      medicId: scan.medicId,
      patientId: scan.patientId,
      medicalConditionsCount: scan.medicalConditions?.length || 0,
      medicalConditions: scan.medicalConditions,
      conditionsCount: scan.conditions?.length || 0,
      conditions: scan.conditions
    });

    res.status(201).json({
      success: true,
      message: 'Scan tracked successfully',
      data: scan
    });
  } catch (error) {
    handleError(res, error, 'Failed to track scan');
  }
});

// Get recent emergency log (last 10-20 scans)
router.get('/recent-logs/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // If user is authenticated, ensure they can only access their own data
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    const limit = parseInt(req.query.limit) || 20;

    const recentScans = await ScanAnalytics.find({ medicId })
      .sort({ scannedAt: -1 })
      .limit(limit)
      .select('scanId patientInfo scanStatus scannedAt responseTime conditions')
      .lean();

    res.json({
      success: true,
      data: recentScans
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch recent logs');
  }
});

// Get blood type distribution
router.get('/blood-types/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // If user is authenticated, ensure they can only access their own data
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.scannedAt = {};
      if (startDate) dateFilter.scannedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.scannedAt.$lte = new Date(endDate);
    }

    const bloodTypes = await ScanAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter, 'patientInfo.bloodGroup': { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$patientInfo.bloodGroup',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: bloodTypes
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch blood type distribution');
  }
});

// Get top medical conditions - NEW STRATEGY
// Directly query medicalConditions array from ScanAnalytics
router.get('/top-medical-conditions/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // Authentication check
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const { limit = 10 } = req.query;

    // Simple, direct aggregation - only medicalConditions field
    const result = await ScanAnalytics.aggregate([
      // Match documents with non-empty medicalConditions array
      {
        $match: {
          medicId: medicId.toString(),
          medicalConditions: { 
            $exists: true, 
            $type: 'array',
            $ne: []
          }
        }
      },
      // Unwind the medicalConditions array
      {
        $unwind: '$medicalConditions'
      },
      // Filter out empty/null/whitespace strings
      {
        $match: {
          medicalConditions: {
            $exists: true,
            $ne: null,
            $ne: '',
            $type: 'string',
            $regex: /^[a-zA-Z].*[a-zA-Z0-9]$/  // Must start with letter and end with alphanumeric
          }
        }
      },
      // Trim and normalize
      {
        $project: {
          condition: {
            $trim: {
              input: {
                $cond: {
                  if: { $eq: [{ $type: '$medicalConditions' }, 'string'] },
                  then: '$medicalConditions',
                  else: { $toString: '$medicalConditions' }
                }
              }
            }
          }
        }
      },
      // Filter out empty after trim
      {
        $match: {
          condition: { 
            $ne: '',
            $exists: true,
            $regex: /^.{3,}$/  // At least 3 characters
          }
        }
      },
      // Group by lowercase to combine variations (Diabetes = diabetes)
      {
        $group: {
          _id: { $toLower: '$condition' },
          count: { $sum: 1 },
          original: { $first: '$condition' }
        }
      },
      // Filter out common invalid terms
      {
        $match: {
          _id: {
            $nin: ['unknown', 'none', 'n/a', 'na', 'null', 'undefined', 'test', 'sample', 'no', 'yes']
          }
        }
      },
      // Project final result
      {
        $project: {
          _id: 0,
          condition: '$original',
          count: 1,
          occurrences: '$count'
        }
      },
      // Sort by count descending
      {
        $sort: { count: -1 }
      },
      // Limit results
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching top medical conditions:', error);
    handleError(res, error, 'Failed to fetch top medical conditions');
  }
});

// Get most common allergies
router.get('/common-allergies/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // If user is authenticated, ensure they can only access their own data
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    const { startDate, endDate, limit = 10 } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.scannedAt = {};
      if (startDate) dateFilter.scannedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.scannedAt.$lte = new Date(endDate);
    }

    const allergies = await ScanAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter, allergies: { $exists: true, $ne: [] } }
      },
      {
        $unwind: '$allergies'
      },
      {
        $group: {
          _id: '$allergies',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      data: allergies
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch common allergies');
  }
});

// Get peak emergency hours
router.get('/peak-hours/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // If user is authenticated, ensure they can only access their own data
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.scannedAt = {};
      if (startDate) dateFilter.scannedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.scannedAt.$lte = new Date(endDate);
    }

    const peakHours = await ScanAnalytics.aggregate([
      {
        $match: { medicId, ...dateFilter }
      },
      {
        $group: {
          _id: { $hour: '$scannedAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: peakHours
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch peak hours');
  }
});

// Get weekly/monthly summary
router.get('/summary/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // If user is authenticated, ensure they can only access their own data
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    const { period = 'month' } = req.query; // 'week' or 'month'

    const now = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const summary = await ScanAnalytics.aggregate([
      {
        $match: {
          medicId,
          scannedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          criticalCases: {
            $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] }
          },
          cautionCases: {
            $sum: { $cond: [{ $eq: ['$scanStatus', 'caution'] }, 1, 0] }
          },
          averageResponseTime: { $avg: '$responseTime' },
          uniquePatients: { $addToSet: '$patientId' }
        }
      },
      {
        $project: {
          totalPatients: 1,
          criticalCases: 1,
          cautionCases: 1,
          averageResponseTime: { $round: ['$averageResponseTime', 2] },
          uniquePatientsCount: { $size: '$uniquePatients' }
        }
      }
    ]);

    const result = summary.length > 0 ? summary[0] : {
      totalPatients: 0,
      criticalCases: 0,
      cautionCases: 0,
      averageResponseTime: 0,
      uniquePatientsCount: 0
    };

    res.json({
      success: true,
      data: {
        ...result,
        period
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch summary');
  }
});

// Get emergency-focused dashboard stats
router.get('/dashboard/:medicId', async (req, res) => {
  try {
    let { medicId } = req.params;
    
    // If user is authenticated, ensure they can only access their own data
    if (req.userType === 'medic' && req.profile?.authId) {
      const authMedicId = req.profile.authId.toString();
      if (medicId !== authMedicId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }
    
    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // This week's stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    // This month's stats
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);

    const [todayStats, weekStats, monthStats] = await Promise.all([
      ScanAnalytics.aggregate([
        {
          $match: {
            medicId,
            scannedAt: { $gte: todayStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] } }
          }
        }
      ]),
      ScanAnalytics.aggregate([
        {
          $match: {
            medicId,
            scannedAt: { $gte: weekStart }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] } }
          }
        }
      ]),
      ScanAnalytics.aggregate([
        {
          $match: {
            medicId,
            scannedAt: { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$scanStatus', 'critical'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const today = todayStats[0] || { count: 0, critical: 0 };
    const week = weekStats[0] || { count: 0, critical: 0 };
    const month = monthStats[0] || { count: 0, critical: 0 };

    // Get average response time
    const avgResponseTime = await ScanAnalytics.aggregate([
      {
        $match: { medicId }
      },
      {
        $group: {
          _id: null,
          avg: { $avg: '$responseTime' }
        }
      }
    ]);

    const avgResponse = avgResponseTime[0]?.avg || 0;

    res.json({
      success: true,
      data: {
        today: {
          totalScans: today.count,
          criticalCases: today.critical
        },
        thisWeek: {
          totalScans: week.count,
          criticalCases: week.critical
        },
        thisMonth: {
          totalScans: month.count,
          criticalCases: month.critical
        },
        averageResponseTime: Math.round(avgResponse * 100) / 100
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch dashboard stats');
  }
});

export default router
