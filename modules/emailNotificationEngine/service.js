const { EmailTemplate, EmailQueue, EmailLog } = require("./model");
const helpers = require("./helpers");

exports.createTemplate = async (clinicId, templateData) => {
  const { eventType, templateKey, subject, body } = templateData;
  const placeholders = helpers.extractPlaceholders(body);
  
  const existingTemplate = await EmailTemplate.findOne({
    where: { clinicId, templateKey },
  });
  if (existingTemplate) {
    throw new Error(`Template with key '${templateKey}' already exists for this clinic`);
  }

  const template = await EmailTemplate.create({
    clinicId,
    eventType,
    templateKey,
    subject,
    body,
    htmlBody: templateData.htmlBody,
    placeholders,
    maxRetries: templateData.maxRetries || 3,
    retryStrategy: templateData.retryStrategy || "exponential",
  });

  return helpers.formatTemplateResponse(template);
};

exports.getTemplateByKey = async (clinicId, templateKey) => {
  const template = await EmailTemplate.findOne({
    where: { clinicId, templateKey, isActive: true },
  });

  if (!template) {
    throw new Error(`Template '${templateKey}' not found for this clinic`);
  }

  return template;
};

exports.getTemplatesByEventType = async (clinicId, eventType) => {
  const templates = await EmailTemplate.findAll({
    where: { clinicId, eventType, isActive: true },
  });

  return templates.map(t => helpers.formatTemplateResponse(t));
};

exports.updateTemplate = async (templateId, clinicId, updates) => {
  const template = await EmailTemplate.findOne({
    where: { id: templateId, clinicId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const allowedFields = ["subject", "body", "htmlBody", "maxRetries", "retryStrategy"];
  const filteredUpdates = {};
  
  allowedFields.forEach(field => {
    if (field in updates) {
      filteredUpdates[field] = updates[field];
    }
  });

  if (filteredUpdates.body) {
    filteredUpdates.placeholders = helpers.extractPlaceholders(filteredUpdates.body);
  }

  return template.update(filteredUpdates);
};

exports.deactivateTemplate = async (templateId, clinicId) => {
  const template = await EmailTemplate.findOne({
    where: { id: templateId, clinicId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  await template.update({ isActive: false });
  return { success: true };
};

exports.queueEmail = async (clinicId, queueData) => {
  const { templateKey, recipient, recipientName, placeholderData } = queueData;

  const template = await exports.getTemplateByKey(clinicId, templateKey);

  const queueEntry = await EmailQueue.create({
    templateId: template.id,
    clinicId,
    recipient,
    recipientName,
    placeholderData,
    priority: queueData.priority || "normal",
  });

  return helpers.formatQueueResponse(queueEntry);
};

exports.sendEmailNow = async (clinicId, emailData) => {
  const { templateKey, recipient, recipientName, placeholderData } = emailData;

  const template = await exports.getTemplateByKey(clinicId, templateKey);

  const subject = helpers.parseTemplate(template.subject, placeholderData);
  const body = helpers.parseTemplate(template.body, placeholderData);

  const startTime = Date.now();
  try {
    // Mock email sending (in production, use nodemailer, AWS SES, etc.)
    await helpers.simulateEmailSend(recipient, subject, body);
    
    const deliverTime = Date.now() - startTime;

    const log = await EmailLog.create({
      clinicId,
      templateId: template.id,
      recipient,
      subject,
      status: "success",
      deliverTime,
    });

    return { success: true, logId: log.id, deliverTime };
  } catch (error) {
    await EmailLog.create({
      clinicId,
      templateId: template.id,
      recipient,
      subject,
      status: "failure",
      errorMessage: error.message,
    });
    throw error;
  }
};

exports.getPendingEmails = async (clinicId, limit = 10) => {
  const pending = await EmailQueue.findAll({
    where: {
      clinicId,
      status: "pending",
    },
    order: [["priority", "DESC"], ["createdAt", "ASC"]],
    limit,
  });

  return pending.map(p => helpers.formatQueueResponse(p));
};

exports.getFailedEmails = async (clinicId, limit = 10) => {
  const failed = await EmailQueue.findAll({
    where: {
      clinicId,
      status: "failed",
    },
    order: [["attempts", "DESC"], ["createdAt", "DESC"]],
    limit,
  });

  return failed.map(f => helpers.formatQueueResponse(f));
};

exports.retryFailedEmails = async (clinicId) => {
  const failed = await EmailQueue.findAll({
    where: {
      clinicId,
      status: "failed",
      attempts: { [require("sequelize").Op.lt]: 3 },
    },
  });

  let retryCount = 0;
  for (const queueEntry of failed) {
    const template = await EmailTemplate.findByPk(queueEntry.templateId);
    
    if (template && template.isActive) {
      const nextRetryAt = helpers.calculateNextRetryTime(queueEntry.attempts, template.retryStrategy);
      await queueEntry.update({
        status: "pending",
        nextRetryAt,
      });
      retryCount++;
    }
  }

  return { retried: retryCount };
};

exports.processQueue = async (clinicId) => {
  const pending = await EmailQueue.findAll({
    where: {
      clinicId,
      status: "pending",
    },
    limit: 50,
  });

  let successCount = 0;
  let failureCount = 0;

  for (const queueEntry of pending) {
    try {
      await queueEntry.update({ status: "processing" });

      const template = await EmailTemplate.findByPk(queueEntry.templateId);
      const subject = helpers.parseTemplate(template.subject, queueEntry.placeholderData);
      const body = helpers.parseTemplate(template.body, queueEntry.placeholderData);

      const startTime = Date.now();
      await helpers.simulateEmailSend(queueEntry.recipient, subject, body);
      const deliverTime = Date.now() - startTime;

      await EmailLog.create({
        queueId: queueEntry.id,
        clinicId,
        templateId: queueEntry.templateId,
        recipient: queueEntry.recipient,
        subject,
        status: "success",
        deliverTime,
      });

      await queueEntry.update({
        status: "sent",
        sentAt: new Date(),
        attempts: queueEntry.attempts + 1,
      });

      successCount++;
    } catch (error) {
      const nextRetryAt = helpers.calculateNextRetryTime(
        queueEntry.attempts,
        (await EmailTemplate.findByPk(queueEntry.templateId)).retryStrategy
      );

      await queueEntry.update({
        status: "failed",
        lastError: error.message,
        attempts: queueEntry.attempts + 1,
        nextRetryAt,
      });

      await EmailLog.create({
        queueId: queueEntry.id,
        clinicId,
        templateId: queueEntry.templateId,
        recipient: queueEntry.recipient,
        subject: queueEntry.placeholderData.subject || "Email",
        status: "failure",
        errorMessage: error.message,
        retryCount: queueEntry.attempts + 1,
      });

      failureCount++;
    }
  }

  return { successCount, failureCount, totalProcessed: successCount + failureCount };
};

exports.getEmailStats = async (clinicId, from, to) => {
  const logs = await EmailLog.findAll({
    where: {
      clinicId,
      createdAt: {
        [require("sequelize").Op.between]: [from, to],
      },
    },
  });

  const stats = {
    totalSent: logs.length,
    successful: logs.filter(l => l.status === "success").length,
    failed: logs.filter(l => l.status === "failure").length,
    bounced: logs.filter(l => l.status === "bounce").length,
    averageDeliveryTime: 0,
  };

  const withDeliveryTime = logs.filter(l => l.deliverTime);
  if (withDeliveryTime.length > 0) {
    const totalTime = withDeliveryTime.reduce((sum, l) => sum + l.deliverTime, 0);
    stats.averageDeliveryTime = Math.round(totalTime / withDeliveryTime.length);
  }

  stats.successRate = stats.totalSent > 0 ? Math.round((stats.successful / stats.totalSent) * 100) : 0;

  return stats;
};

exports.getEmailLogs = async (clinicId, filters = {}) => {
  const where = { clinicId };

  if (filters.recipient) where.recipient = filters.recipient;
  if (filters.status) where.status = filters.status;
  if (filters.from && filters.to) {
    where.createdAt = {
      [require("sequelize").Op.between]: [filters.from, filters.to],
    };
  }

  const logs = await EmailLog.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: filters.limit || 50,
  });

  return logs.map(l => helpers.formatLogResponse(l));
};

exports.deleteTemplate = async (templateId, clinicId) => {
  const template = await EmailTemplate.findOne({
    where: { id: templateId, clinicId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  await template.destroy();
  return { success: true };
};
