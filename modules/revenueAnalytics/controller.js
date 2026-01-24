const service = require("./service");
const {
  validateSummary,
  validateDaily,
  validateMonthly,
  validateBreakdown,
  validateOutstanding,
  validateTrend,
} = require("./validation");

/**
 * GET /revenueAnalytics/:clinicId/summary
 * Get overall revenue summary for clinic
 */
exports.getSummary = async (req, res, next) => {
  try {
    const { error, value } = validateSummary({
      clinicId: parseInt(req.params.clinicId),
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
        code: "VALIDATION_ERROR",
      });
    }

    const summary = await service.getSummary(value.clinicId);

    res.status(200).json({
      status: "success",
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /revenueAnalytics/:clinicId/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Get daily revenue breakdown
 */
exports.getDaily = async (req, res, next) => {
  try {
    const { error, value } = validateDaily({
      clinicId: parseInt(req.params.clinicId),
      from: req.query.from,
      to: req.query.to,
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
        code: "VALIDATION_ERROR",
      });
    }

    const daily = await service.getDailyRevenue(
      value.clinicId,
      value.from,
      value.to
    );

    res.status(200).json({
      status: "success",
      data: daily,
      metadata: {
        from: value.from,
        to: value.to,
        count: daily.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /revenueAnalytics/:clinicId/monthly?year=YYYY
 * Get monthly revenue breakdown (12 months)
 */
exports.getMonthly = async (req, res, next) => {
  try {
    const year =
      req.query.year || new Date().getFullYear();
    const { error, value } = validateMonthly({
      clinicId: parseInt(req.params.clinicId),
      year: parseInt(year),
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
        code: "VALIDATION_ERROR",
      });
    }

    const monthly = await service.getMonthlyRevenue(
      value.clinicId,
      value.year
    );

    res.status(200).json({
      status: "success",
      data: monthly,
      metadata: {
        year: value.year,
        months: 12,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /revenueAnalytics/:clinicId/breakdown?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Get revenue breakdown by payment method
 */
exports.getBreakdown = async (req, res, next) => {
  try {
    const { error, value } = validateBreakdown({
      clinicId: parseInt(req.params.clinicId),
      from: req.query.from,
      to: req.query.to,
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
        code: "VALIDATION_ERROR",
      });
    }

    const breakdown = await service.getBreakdown(
      value.clinicId,
      value.from,
      value.to
    );

    res.status(200).json({
      status: "success",
      data: breakdown,
      metadata: {
        from: value.from,
        to: value.to,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /revenueAnalytics/:clinicId/outstanding?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Get outstanding/unpaid transactions
 */
exports.getOutstanding = async (req, res, next) => {
  try {
    const { error, value } = validateOutstanding({
      clinicId: parseInt(req.params.clinicId),
      from: req.query.from,
      to: req.query.to,
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
        code: "VALIDATION_ERROR",
      });
    }

    const outstanding = await service.getOutstanding(
      value.clinicId,
      value.from,
      value.to
    );

    res.status(200).json({
      status: "success",
      data: outstanding,
      metadata: {
        from: value.from,
        to: value.to,
        count: outstanding.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /revenueAnalytics/:clinicId/trend
 * Get revenue trend between two periods
 */
exports.getTrend = async (req, res, next) => {
  try {
    const { error, value } = validateTrend({
      clinicId: parseInt(req.params.clinicId),
      period1From: req.query.period1From,
      period1To: req.query.period1To,
      period2From: req.query.period2From,
      period2To: req.query.period2To,
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
        code: "VALIDATION_ERROR",
      });
    }

    const trend = await service.getTrend(
      value.clinicId,
      value.period1From,
      value.period1To,
      value.period2From,
      value.period2To
    );

    res.status(200).json({
      status: "success",
      data: trend,
      metadata: {
        period1: {
          from: value.period1From,
          to: value.period1To,
        },
        period2: {
          from: value.period2From,
          to: value.period2To,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
