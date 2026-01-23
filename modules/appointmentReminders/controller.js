const service = require("./service");
const {
  createReminderSchema,
  updateReminderSchema,
  queryRemindersSchema,
  reminderIdSchema,
} = require("./validation");

/**
 * Create a new appointment reminder
 * POST /appointmentReminders/:clinicId
 */
exports.create = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { error, value } = createReminderSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    // Ensure clinicId in URL matches body
    if (value.clinicId !== parseInt(clinicId)) {
      return res.status(400).json({
        status: "fail",
        message: "clinicId in URL must match clinicId in request body",
      });
    }

    const reminder = await service.create(value);

    res.status(201).json({
      status: "success",
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reminders for a clinic
 * GET /appointmentReminders/:clinicId
 */
exports.getAll = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { limit, offset, isEnabled } = req.query;

    const { error, value } = queryRemindersSchema.validate({
      clinicId: parseInt(clinicId),
      isEnabled: isEnabled !== undefined ? isEnabled === "true" : undefined,
      limit: limit ? parseInt(limit) : 10,
      offset: offset ? parseInt(offset) : 0,
    });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const result = await service.getAllByClinic(value.clinicId, {
      limit: value.limit,
      offset: value.offset,
      isEnabled: value.isEnabled,
    });

    res.status(200).json({
      status: "success",
      data: {
        reminders: result.rows,
        total: result.count,
        limit: value.limit,
        offset: value.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific reminder
 * GET /appointmentReminders/:clinicId/:reminderId
 */
exports.getOne = async (req, res, next) => {
  try {
    const { reminderId } = req.params;

    const { error, value } = reminderIdSchema.validate({ reminderId: parseInt(reminderId) });

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const reminder = await service.getOne(value.reminderId);

    if (!reminder) {
      return res.status(404).json({
        status: "fail",
        message: "Reminder not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update reminder
 * PATCH /appointmentReminders/:clinicId/:reminderId
 */
exports.update = async (req, res, next) => {
  try {
    const { reminderId } = req.params;
    const { error: idError } = reminderIdSchema.validate({ reminderId: parseInt(reminderId) });

    if (idError) {
      return res.status(400).json({
        status: "fail",
        message: idError.details[0].message,
      });
    }

    const { error, value } = updateReminderSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const reminder = await service.update(parseInt(reminderId), value);

    res.status(200).json({
      status: "success",
      data: reminder,
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        status: "fail",
        message: error.message,
      });
    }
    if (error.message.includes("Cannot reassign")) {
      return res.status(400).json({
        status: "fail",
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Delete reminder
 * DELETE /appointmentReminders/:clinicId/:reminderId
 */
exports.delete = async (req, res, next) => {
  try {
    const { reminderId } = req.params;
    const { error: idError } = reminderIdSchema.validate({ reminderId: parseInt(reminderId) });

    if (idError) {
      return res.status(400).json({
        status: "fail",
        message: idError.details[0].message,
      });
    }

    await service.delete(parseInt(reminderId));

    res.status(204).send();
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        status: "fail",
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Send pending reminders (background job trigger)
 * POST /appointmentReminders/trigger/send-pending
 */
exports.sendPendingReminders = async (req, res, next) => {
  try {
    const { clinicId } = req.body;

    if (!clinicId) {
      return res.status(400).json({
        status: "fail",
        message: "clinicId is required",
      });
    }

    const reminders = await service.getEnabledByClinic(clinicId);

    // Mock implementation: in production, this would trigger actual SMS/Email/WhatsApp sends
    const sendResults = reminders.map((reminder) => ({
      id: reminder.id,
      reminderType: reminder.reminderType,
      status: "sent",
      timestamp: new Date(),
    }));

    res.status(200).json({
      status: "success",
      data: {
        remindersSent: sendResults.length,
        results: sendResults,
      },
    });
  } catch (error) {
    next(error);
  }
};
