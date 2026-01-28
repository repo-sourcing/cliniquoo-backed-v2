"use strict";
/**
 * Fixed email notification engine models.
 * Replaces the broken plain-object exports with proper Sequelize.define() calls.
 * Uses the same db config pattern as every other module in this codebase.
 */

const db = require("../../config/db");
const { DataTypes, sequelize } = db;

const EmailTemplate = sequelize.define(
  "EmailTemplate",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clinicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    templateKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    htmlBody: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    placeholders: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    retryStrategy: {
      type: DataTypes.ENUM("none", "linear", "exponential"),
      defaultValue: "exponential",
    },
  },
  {
    tableName: "email_templates",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["clinicId", "templateKey"] },
    ],
  }
);

const EmailQueue = sequelize.define(
  "EmailQueue",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clinicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "email_templates", key: "id" },
    },
    recipient: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    recipientName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    placeholderData: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high"),
      defaultValue: "normal",
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "sent", "failed"),
      defaultValue: "pending",
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "email_queue",
    timestamps: true,
  }
);

const EmailLog = sequelize.define(
  "EmailLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clinicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    queueId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    recipient: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("success", "failure", "bounce"),
      allowNull: false,
    },
    deliverTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Delivery time in milliseconds",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "email_logs",
    timestamps: true,
  }
);

// Associations
EmailTemplate.hasMany(EmailQueue, { foreignKey: "templateId", as: "queueEntries" });
EmailQueue.belongsTo(EmailTemplate, { foreignKey: "templateId", as: "template" });

EmailTemplate.hasMany(EmailLog, { foreignKey: "templateId", as: "logs" });
EmailQueue.hasMany(EmailLog, { foreignKey: "queueId", as: "deliveryLogs" });
EmailLog.belongsTo(EmailQueue, { foreignKey: "queueId", as: "queueEntry" });

module.exports = { EmailTemplate, EmailQueue, EmailLog };
