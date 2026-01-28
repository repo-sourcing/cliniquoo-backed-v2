exports.extractPlaceholders = (templateString) => {
  const regex = /{{(\w+)}}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(templateString)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)];
};

exports.parseTemplate = (templateString, data = {}) => {
  let result = templateString;
  const regex = /{{(\w+)}}/g;

  result = result.replace(regex, (match, placeholder) => {
    return data[placeholder] || match;
  });

  return result;
};

exports.formatTemplateResponse = (template) => {
  return {
    id: template.id,
    eventType: template.eventType,
    templateKey: template.templateKey,
    subject: template.subject,
    bodyLength: template.body.length,
    placeholders: template.placeholders,
    isActive: template.isActive,
    maxRetries: template.maxRetries,
    retryStrategy: template.retryStrategy,
    createdAt: template.createdAt,
  };
};

exports.formatQueueResponse = (queueEntry) => {
  return {
    id: queueEntry.id,
    templateId: queueEntry.templateId,
    recipient: queueEntry.recipient,
    recipientName: queueEntry.recipientName,
    status: queueEntry.status,
    attempts: queueEntry.attempts,
    priority: queueEntry.priority,
    nextRetryAt: queueEntry.nextRetryAt,
    lastError: queueEntry.lastError,
    createdAt: queueEntry.createdAt,
  };
};

exports.formatLogResponse = (log) => {
  return {
    id: log.id,
    recipient: log.recipient,
    subject: log.subject,
    status: log.status,
    deliverTime: log.deliverTime,
    retryCount: log.retryCount,
    errorMessage: log.errorMessage,
    sentAt: log.sentAt,
  };
};

exports.simulateEmailSend = async (recipient, subject, body) => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve({
        messageId: `msg_${Date.now()}`,
        recipient,
        subject,
      });
    }, 10);
  });
};

exports.calculateNextRetryTime = (attemptNumber, retryStrategy) => {
  const baseDelay = 60000; // 1 minute

  if (retryStrategy === "none") {
    return null;
  }

  let delay = baseDelay;

  if (retryStrategy === "exponential") {
    delay = baseDelay * Math.pow(2, attemptNumber);
  } else if (retryStrategy === "linear") {
    delay = baseDelay * (attemptNumber + 1);
  }

  return new Date(Date.now() + delay);
};

exports.validateEmailAddress = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

exports.validatePlaceholderData = (required = [], provided = {}) => {
  const missing = required.filter(placeholder => !(placeholder in provided));
  return {
    valid: missing.length === 0,
    missing,
  };
};

exports.groupTemplatesByEventType = (templates) => {
  const grouped = {};
  templates.forEach(template => {
    if (!grouped[template.eventType]) {
      grouped[template.eventType] = [];
    }
    grouped[template.eventType].push(template);
  });
  return grouped;
};

exports.calculateRetryBackoff = (attempt, maxAttempts) => {
  const maxBackoff = 86400000; // 24 hours
  const backoff = Math.min(Math.pow(2, attempt - 1) * 60000, maxBackoff);
  return {
    backoffMs: backoff,
    nextAttemptTime: new Date(Date.now() + backoff),
    isMaxAttemptsReached: attempt >= maxAttempts,
  };
};

exports.generateEmailReport = (stats) => {
  return {
    summary: {
      totalEmails: stats.totalSent,
      successful: stats.successful,
      failed: stats.failed,
      successRate: `${stats.successRate}%`,
    },
    performance: {
      averageDeliveryTimeMs: stats.averageDeliveryTime,
      averageDeliveryTimeSec: Math.round(stats.averageDeliveryTime / 1000),
    },
    failureCount: stats.failed,
    bounceCount: stats.bounced,
  };
};

exports.createAuditLog = (clinicId, action, templateId, changedBy) => {
  return {
    clinicId,
    action,
    templateId,
    changedBy,
    timestamp: new Date(),
    details: {
      actionType: action,
      entityId: templateId,
    },
  };
};
