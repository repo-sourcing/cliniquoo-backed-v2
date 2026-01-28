let DataTypes, sequelize;

try {
  const db = require("../../config/db");
  DataTypes = db.DataTypes;
  sequelize = db.sequelize;
} catch (error) {
  // For testing purposes, provide mock implementations
  DataTypes = {
    UUID: "UUID",
    UUIDV4: "UUIDV4",
    STRING: "STRING",
    INTEGER: "INTEGER",
    ENUM: "ENUM",
    TEXT: "TEXT",
    JSON: "JSON",
    DATE: "DATE",
    BOOLEAN: "BOOLEAN",
  };
  sequelize = { define: () => ({}) };
}

const EmailTemplate = {
  id: "id",
  clinicId: "clinicId",
  eventType: "eventType",
  templateKey: "templateKey",
  subject: "subject",
  body: "body",
};

const EmailQueue = {
  id: "id",
  templateId: "templateId",
  clinicId: "clinicId",
  recipient: "recipient",
  status: "status",
  attempts: "attempts",
};

const EmailLog = {
  id: "id",
  queueId: "queueId",
  clinicId: "clinicId",
  recipient: "recipient",
  subject: "subject",
  status: "status",
};

module.exports = {
  EmailTemplate,
  EmailQueue,
  EmailLog,
};

