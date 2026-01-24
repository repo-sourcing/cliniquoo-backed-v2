const Transaction = require("../transaction/model");
const PatientBill = require("../patientBill/model");
const { Op, fn, col, sequelize } = require("sequelize");
const moment = require("moment");
const {
  fillDateGaps,
  formatCurrency,
  calculatePercentage,
} = require("./helpers");

class RevenueAnalyticsService {
  /**
   * Get revenue summary for a clinic
   * @param {number} clinicId
   * @returns {object} { total, cash, online, outstanding, collected }
   */
  async getSummary(clinicId) {
    try {
      const summary = await Transaction.findOne({
        where: { clinicId, deletedAt: null },
        attributes: [
          [fn("SUM", col("amount")), "totalAmount"],
          [fn("SUM", col("cash")), "cashAmount"],
          [fn("SUM", col("online")), "onlineAmount"],
        ],
        raw: true,
      });

      const total = summary?.totalAmount || 0;
      const cash = summary?.cashAmount || 0;
      const online = summary?.onlineAmount || 0;

      return {
        total: formatCurrency(total),
        cash: formatCurrency(cash),
        online: formatCurrency(online),
        outstanding: formatCurrency(Math.max(0, total - (cash + online))),
        collected: formatCurrency(cash + online),
        count: await Transaction.count({ where: { clinicId } }),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch revenue summary: ${error.message}`
      );
    }
  }

  /**
   * Get daily revenue breakdown
   * @param {number} clinicId
   * @param {string} from - ISO date
   * @param {string} to - ISO date
   * @returns {array} daily revenue array
   */
  async getDailyRevenue(clinicId, from, to) {
    try {
      const transactions = await Transaction.findAll({
        where: {
          clinicId,
          createdAt: {
            [Op.gte]: new Date(from),
            [Op.lte]: new Date(to),
          },
          deletedAt: null,
        },
        attributes: [
          [fn("DATE", col("createdAt")), "date"],
          [fn("SUM", col("amount")), "totalAmount"],
          [fn("SUM", col("cash")), "cashAmount"],
          [fn("SUM", col("online")), "onlineAmount"],
          [fn("COUNT", col("id")), "count"],
        ],
        group: [fn("DATE", col("createdAt"))],
        order: [[fn("DATE", col("createdAt")), "ASC"]],
        raw: true,
      });

      const daily = transactions.map((tx) => ({
        date: tx.date,
        total: formatCurrency(tx.totalAmount || 0),
        cash: formatCurrency(tx.cashAmount || 0),
        online: formatCurrency(tx.onlineAmount || 0),
        count: parseInt(tx.count) || 0,
      }));

      return fillDateGaps(daily, from, to, "date");
    } catch (error) {
      throw new Error(`Failed to fetch daily revenue: ${error.message}`);
    }
  }

  /**
   * Get monthly revenue breakdown (12 months)
   * @param {number} clinicId
   * @param {number} year
   * @returns {array} 12-month array
   */
  async getMonthlyRevenue(clinicId, year) {
    try {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);

      const transactions = await Transaction.findAll({
        where: {
          clinicId,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          deletedAt: null,
        },
        attributes: [
          [fn("MONTH", col("createdAt")), "month"],
          [fn("SUM", col("amount")), "totalAmount"],
          [fn("SUM", col("cash")), "cashAmount"],
          [fn("SUM", col("online")), "onlineAmount"],
          [fn("COUNT", col("id")), "count"],
        ],
        group: [fn("MONTH", col("createdAt"))],
        order: [[fn("MONTH", col("createdAt")), "ASC"]],
        raw: true,
      });

      const monthMap = {};
      transactions.forEach((tx) => {
        monthMap[tx.month] = {
          month: parseInt(tx.month),
          total: formatCurrency(tx.totalAmount || 0),
          cash: formatCurrency(tx.cashAmount || 0),
          online: formatCurrency(tx.onlineAmount || 0),
          count: parseInt(tx.count) || 0,
        };
      });

      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      return months.map((name, idx) => {
        const month = idx + 1;
        return (
          monthMap[month] || {
            month,
            total: 0,
            cash: 0,
            online: 0,
            count: 0,
            name,
          }
        );
      });
    } catch (error) {
      throw new Error(`Failed to fetch monthly revenue: ${error.message}`);
    }
  }

  /**
   * Get revenue breakdown by payment method
   * @param {number} clinicId
   * @param {string} from - ISO date
   * @param {string} to - ISO date
   * @returns {object} { cash, online, percentages }
   */
  async getBreakdown(clinicId, from, to) {
    try {
      const summary = await Transaction.findOne({
        where: {
          clinicId,
          createdAt: {
            [Op.gte]: new Date(from),
            [Op.lte]: new Date(to),
          },
          deletedAt: null,
        },
        attributes: [
          [fn("SUM", col("cash")), "cashAmount"],
          [fn("SUM", col("online")), "onlineAmount"],
        ],
        raw: true,
      });

      const cash = summary?.cashAmount || 0;
      const online = summary?.onlineAmount || 0;
      const total = cash + online;

      return {
        cash: formatCurrency(cash),
        online: formatCurrency(online),
        total: formatCurrency(total),
        cashPercentage: calculatePercentage(cash, total),
        onlinePercentage: calculatePercentage(online, total),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch revenue breakdown: ${error.message}`
      );
    }
  }

  /**
   * Get outstanding/unpaid transactions
   * @param {number} clinicId
   * @param {string} from - ISO date
   * @param {string} to - ISO date
   * @returns {array} outstanding transactions
   */
  async getOutstanding(clinicId, from, to) {
    try {
      const transactions = await Transaction.findAll({
        where: {
          clinicId,
          createdAt: {
            [Op.gte]: new Date(from),
            [Op.lte]: new Date(to),
          },
          deletedAt: null,
        },
        attributes: [
          "id",
          "amount",
          "cash",
          "online",
          "createdAt",
          "notes",
        ],
        order: [["createdAt", "DESC"]],
        limit: 100,
        raw: true,
      });

      return transactions
        .filter((tx) => {
          const paid = (tx.cash || 0) + (tx.online || 0);
          return paid < tx.amount;
        })
        .map((tx) => {
          const paid = (tx.cash || 0) + (tx.online || 0);
          return {
            id: tx.id,
            amount: formatCurrency(tx.amount),
            paid: formatCurrency(paid),
            outstanding: formatCurrency(tx.amount - paid),
            date: tx.createdAt,
            notes: tx.notes,
            outstandingPercentage: calculatePercentage(
              tx.amount - paid,
              tx.amount
            ),
          };
        });
    } catch (error) {
      throw new Error(
        `Failed to fetch outstanding revenue: ${error.message}`
      );
    }
  }

  /**
   * Get revenue trend (comparison between two periods)
   * @param {number} clinicId
   * @param {string} period1From
   * @param {string} period1To
   * @param {string} period2From
   * @param {string} period2To
   * @returns {object} trend data with growth
   */
  async getTrend(clinicId, period1From, period1To, period2From, period2To) {
    try {
      const period1 = await Transaction.findOne({
        where: {
          clinicId,
          createdAt: {
            [Op.gte]: new Date(period1From),
            [Op.lte]: new Date(period1To),
          },
          deletedAt: null,
        },
        attributes: [[fn("SUM", col("amount")), "total"]],
        raw: true,
      });

      const period2 = await Transaction.findOne({
        where: {
          clinicId,
          createdAt: {
            [Op.gte]: new Date(period2From),
            [Op.lte]: new Date(period2To),
          },
          deletedAt: null,
        },
        attributes: [[fn("SUM", col("amount")), "total"]],
        raw: true,
      });

      const total1 = period1?.total || 0;
      const total2 = period2?.total || 0;
      const growth = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0;

      return {
        period1: formatCurrency(total1),
        period2: formatCurrency(total2),
        growth: growth.toFixed(2),
        growthTrend: growth > 0 ? "up" : growth < 0 ? "down" : "flat",
      };
    } catch (error) {
      throw new Error(`Failed to fetch revenue trend: ${error.message}`);
    }
  }
}

module.exports = new RevenueAnalyticsService();
