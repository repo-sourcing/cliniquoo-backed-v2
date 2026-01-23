const AppointmentReminder = require("./model");

class AppointmentReminderService {
  /**
   * Create a new appointment reminder
   * @param {Object} data - { userId, clinicId, reminderType, timeBeforeAppointment }
   * @returns {Promise<Object>} Created reminder
   */
  async create(data) {
    try {
      const reminder = await AppointmentReminder.create({
        userId: data.userId,
        clinicId: data.clinicId,
        reminderType: data.reminderType,
        timeBeforeAppointment: data.timeBeforeAppointment,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        isActive: true,
      });
      return reminder;
    } catch (error) {
      throw new Error(`Failed to create reminder: ${error.message}`);
    }
  }

  /**
   * Get reminder by ID
   * @param {Number} reminderId
   * @returns {Promise<Object|null>}
   */
  async getOne(reminderId) {
    try {
      return await AppointmentReminder.findByPk(reminderId);
    } catch (error) {
      throw new Error(`Failed to fetch reminder: ${error.message}`);
    }
  }

  /**
   * Get all reminders for a clinic (paginated)
   * @param {Number} clinicId
   * @param {Object} options - { limit, offset, isEnabled }
   * @returns {Promise<Object>} { rows, count }
   */
  async getAllByClinic(clinicId, options = {}) {
    try {
      const { limit = 10, offset = 0, isEnabled } = options;
      const where = { clinicId };
      if (isEnabled !== undefined) where.isEnabled = isEnabled;

      const result = await AppointmentReminder.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`);
    }
  }

  /**
   * Get all enabled reminders for a clinic
   * @param {Number} clinicId
   * @returns {Promise<Array>}
   */
  async getEnabledByClinic(clinicId) {
    try {
      return await AppointmentReminder.findAll({
        where: { clinicId, isEnabled: true, isActive: true },
        order: [["timeBeforeAppointment", "ASC"]],
      });
    } catch (error) {
      throw new Error(`Failed to fetch enabled reminders: ${error.message}`);
    }
  }

  /**
   * Update reminder
   * @param {Number} reminderId
   * @param {Object} updates
   * @returns {Promise<Object>} Updated reminder
   */
  async update(reminderId, updates) {
    try {
      const reminder = await AppointmentReminder.findByPk(reminderId);
      if (!reminder) throw new Error("Reminder not found");

      // Prevent reassignment of clinic/user
      if (updates.clinicId || updates.userId) {
        throw new Error("Cannot reassign clinic or user");
      }

      const updated = await reminder.update({
        reminderType: updates.reminderType || reminder.reminderType,
        timeBeforeAppointment:
          updates.timeBeforeAppointment || reminder.timeBeforeAppointment,
        isEnabled:
          updates.isEnabled !== undefined
            ? updates.isEnabled
            : reminder.isEnabled,
        isActive:
          updates.isActive !== undefined ? updates.isActive : reminder.isActive,
      });

      return updated;
    } catch (error) {
      throw new Error(`Failed to update reminder: ${error.message}`);
    }
  }

  /**
   * Delete reminder (soft delete)
   * @param {Number} reminderId
   * @returns {Promise<Boolean>}
   */
  async delete(reminderId) {
    try {
      const reminder = await AppointmentReminder.findByPk(reminderId);
      if (!reminder) throw new Error("Reminder not found");

      await reminder.update({ isActive: false });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete reminder: ${error.message}`);
    }
  }

  /**
   * Get all reminders for a user across clinics
   * @param {Number} userId
   * @returns {Promise<Array>}
   */
  async getAllByUser(userId) {
    try {
      return await AppointmentReminder.findAll({
        where: { userId, isActive: true },
        order: [["clinicId", "ASC"]],
      });
    } catch (error) {
      throw new Error(`Failed to fetch user reminders: ${error.message}`);
    }
  }
}

module.exports = new AppointmentReminderService();
