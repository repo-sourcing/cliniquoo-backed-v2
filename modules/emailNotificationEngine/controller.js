const service = require("./service");
const validation = require("./validation");

exports.createTemplate = async (req, res) => {
  try {
    const { error, value } = validation.createTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const template = await service.createTemplate(req.user.clinicId, value);
    return res.status(201).json(template);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { error, value } = validation.updateTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!req.params.templateId) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    const template = await service.updateTemplate(req.params.templateId, req.user.clinicId, value);
    return res.status(200).json(template);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    if (!req.params.templateId) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    await service.deleteTemplate(req.params.templateId, req.user.clinicId);
    return res.status(204).send();
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
};

exports.getTemplatesByEventType = async (req, res) => {
  try {
    const { error, value } = validation.getTemplatesByEventTypeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const templates = await service.getTemplatesByEventType(req.user.clinicId, value.eventType);
    return res.status(200).json({
      count: templates.length,
      templates,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.queueEmail = async (req, res) => {
  try {
    const { error, value } = validation.queueEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const queueEntry = await service.queueEmail(req.user.clinicId, value);
    return res.status(201).json(queueEntry);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.sendEmailNow = async (req, res) => {
  try {
    const { error, value } = validation.sendEmailNowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await service.sendEmailNow(req.user.clinicId, value);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getPendingEmails = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const pending = await service.getPendingEmails(req.user.clinicId, limit);
    return res.status(200).json({
      count: pending.length,
      emails: pending,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getFailedEmails = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const failed = await service.getFailedEmails(req.user.clinicId, limit);
    return res.status(200).json({
      count: failed.length,
      emails: failed,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.retryFailedEmails = async (req, res) => {
  try {
    const result = await service.retryFailedEmails(req.user.clinicId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.processQueue = async (req, res) => {
  try {
    const result = await service.processQueue(req.user.clinicId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getEmailStats = async (req, res) => {
  try {
    const { error, value } = validation.getEmailStatsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const from = new Date(value.from);
    const to = new Date(value.to);

    const stats = await service.getEmailStats(req.user.clinicId, from, to);
    return res.status(200).json(stats);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.getEmailLogs = async (req, res) => {
  try {
    const { error, value } = validation.getEmailLogsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const filters = {
      recipient: value.recipient,
      status: value.status,
      limit: value.limit,
    };

    if (value.from && value.to) {
      filters.from = new Date(value.from);
      filters.to = new Date(value.to);
    }

    const logs = await service.getEmailLogs(req.user.clinicId, filters);
    return res.status(200).json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
