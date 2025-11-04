// Helper function to generate summary
const generateAppointmentSummary = (analysisType, results, dateInfo) => {
  switch (analysisType) {
    case "total_count":
      const totalAppointments = results.reduce((sum, r) => sum + r.count, 0);
      return `You have a total of ${totalAppointments} appointments.`;

    case "by_date":
      if (results.length > 0) {
        const total = results.reduce((sum, r) => sum + r.count, 0);
        return `You have ${total} appointment${
          total === 1 ? "" : "s"
        } on ${dateInfo}.`;
      }
      return `No appointments found on ${dateInfo}.`;

    case "by_date_range":
      if (results.length > 0) {
        const total = results.reduce((sum, r) => sum + r.count, 0);
        return `You have ${total} appointment${
          total === 1 ? "" : "s"
        } between ${dateInfo}.`;
      }
      return `No appointments found between ${dateInfo}.`;

    case "by_status":
      if (results.length > 0) {
        const total = results.reduce((sum, r) => sum + r.count, 0);
        return `You have ${total} ${dateInfo} appointment${
          total === 1 ? "" : "s"
        }.`;
      }
      return `No ${dateInfo} appointments found.`;

    case "by_clinic":
      if (results.length > 0) {
        return `Appointment breakdown by clinic.`;
      }
      return "No appointments found for any clinic.";

    case "by_patient":
      if (results.length > 0) {
        const total = results.reduce((sum, r) => sum + r.count, 0);
        return `Patient has ${total} appointment${total === 1 ? "" : "s"}.`;
      }
      return "No appointments found for this patient.";

    default:
      return `Analysis completed for ${results.length} results.`;
  }
};

// Main appointment analysis function
exports.analyzeAppointmentsResolver = async ({
  analysisType,
  date,
  startDate,
  endDate,
  status, // 'scheduled', 'completed', 'canceled', 'missed', 'upcoming'
  patientId,
  clinicId,
  limit = 100,
  userId,
  executeSQLQuery,
}) => {
  try {
    // Build WHERE conditions
    let whereConditions = [`p.userId = ${userId}`];
    let dateInfo = "";

    // Add date filters
    if (analysisType === "by_date" && date) {
      whereConditions.push(`DATE(v.date) = '${date}'`);
      dateInfo = date;
    } else if (analysisType === "by_date_range" && startDate && endDate) {
      whereConditions.push(`DATE(v.date) >= '${startDate}'`);
      whereConditions.push(`DATE(v.date) <= '${endDate}'`);
      dateInfo = `${startDate} and ${endDate}`;
    } else if (startDate && endDate) {
      whereConditions.push(`DATE(v.date) >= '${startDate}'`);
      whereConditions.push(`DATE(v.date) <= '${endDate}'`);
      dateInfo = `${startDate} to ${endDate}`;
    } else if (date) {
      whereConditions.push(`DATE(v.date) = '${date}'`);
      dateInfo = date;
    }

    // Add status filters
    if (status) {
      switch (status.toLowerCase()) {
        case "scheduled":
        case "upcoming":
          whereConditions.push("v.isCanceled = FALSE");
          whereConditions.push("v.isVisited = FALSE");
          whereConditions.push("v.date >= CURDATE()");
          dateInfo = status;
          break;
        case "completed":
        case "visited":
          whereConditions.push("v.isVisited = TRUE");
          whereConditions.push("v.isCanceled = FALSE");
          dateInfo = "completed";
          break;
        case "canceled":
        case "cancelled":
          whereConditions.push("v.isCanceled = TRUE");
          dateInfo = "canceled";
          break;
        case "missed":
          whereConditions.push("v.date < CURDATE()");
          whereConditions.push("v.isVisited = FALSE");
          whereConditions.push("v.isCanceled = FALSE");
          dateInfo = "missed";
          break;
        default:
          whereConditions.push("v.isCanceled = FALSE");
      }
    } else {
      // Default: only non-canceled appointments
      whereConditions.push("v.isCanceled = FALSE");
    }

    // Add patient filter
    if (patientId) {
      whereConditions.push(`v.patientId = ${patientId}`);
    }

    // Add clinic filter
    if (clinicId) {
      if (clinicId.includes(",")) {
        whereConditions.push(`v.clinicId IN (${clinicId})`);
      } else {
        whereConditions.push(`v.clinicId = ${clinicId}`);
      }
    }

    // Add soft delete conditions
    whereConditions.push("p.deletedAt IS NULL");
    whereConditions.push("c.deletedAt IS NULL");

    // Build the query based on analysis type
    let query = "";

    switch (analysisType) {
      case "total_count":
        query = `
          SELECT 
            COUNT(*) as count
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
        `;
        break;

      case "by_date":
      case "by_date_range":
        query = `
          SELECT 
            DATE_FORMAT(v.date, '%Y-%m-%d') as appointment_date,
            COUNT(*) as count,
            SUM(CASE WHEN v.isVisited = TRUE THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN v.isCanceled = TRUE THEN 1 ELSE 0 END) as canceled,
            SUM(CASE WHEN v.date >= CURDATE() AND v.isVisited = FALSE AND v.isCanceled = FALSE THEN 1 ELSE 0 END) as upcoming
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY DATE(v.date)
          ORDER BY v.date DESC
          LIMIT ${limit}
        `;
        break;

      case "by_status":
        query = `
          SELECT 
            CASE 
              WHEN v.isCanceled = TRUE THEN 'Canceled'
              WHEN v.isVisited = TRUE THEN 'Completed'
              WHEN v.date >= CURDATE() THEN 'Upcoming'
              WHEN v.date < CURDATE() AND v.isVisited = FALSE THEN 'Missed'
              ELSE 'Unknown'
            END as status,
            COUNT(*) as count
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY status
          ORDER BY count DESC
        `;
        break;

      case "by_clinic":
        query = `
          SELECT 
            c.name as clinic_name,
            COUNT(*) as total_appointments,
            SUM(CASE WHEN v.isVisited = TRUE THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN v.isCanceled = TRUE THEN 1 ELSE 0 END) as canceled,
            SUM(CASE WHEN v.date >= CURDATE() AND v.isVisited = FALSE AND v.isCanceled = FALSE THEN 1 ELSE 0 END) as upcoming
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY c.id, c.name
          ORDER BY total_appointments DESC
          LIMIT ${limit}
        `;
        break;

      case "by_patient":
        query = `
          SELECT 
            p.name as patient_name,
            COUNT(*) as total_appointments,
            SUM(CASE WHEN v.isVisited = TRUE THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN v.isCanceled = TRUE THEN 1 ELSE 0 END) as canceled,
            MAX(DATE_FORMAT(v.date, '%Y-%m-%d')) as last_appointment_date
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY p.id, p.name
          ORDER BY total_appointments DESC
          LIMIT ${limit}
        `;
        break;

      case "list_appointments":
        query = `
          SELECT 
            DATE_FORMAT(v.date, '%Y-%m-%d') as appointment_date,
            p.name as patient_name,
            c.name as clinic_name,
            CASE 
              WHEN v.isCanceled = TRUE THEN 'Canceled'
              WHEN v.isVisited = TRUE THEN 'Completed'
              WHEN v.date >= CURDATE() THEN 'Upcoming'
              WHEN v.date < CURDATE() AND v.isVisited = FALSE THEN 'Missed'
              ELSE 'Unknown'
            END as status
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
          ORDER BY v.date DESC
          LIMIT ${limit}
        `;
        break;

      default:
        // Default to total count
        query = `
          SELECT 
            COUNT(*) as count
          FROM visitors v
          JOIN patients p ON v.patientId = p.id
          JOIN clinics c ON v.clinicId = c.id
          WHERE ${whereConditions.join(" AND ")}
        `;
    }

    const queryResult = await executeSQLQuery(query);

    if (!queryResult.success) {
      throw new Error(`Query failed: ${queryResult.error}`);
    }

    const results = queryResult.data[0] || [];

    // Format response based on analysis type
    if (analysisType === "total_count") {
      const count = results[0]?.count || 0;
      return {
        success: true,
        analysisType,
        totalCount: count,
        data: [],
        summary: `You have a total of ${count} appointment${
          count === 1 ? "" : "s"
        }.`,
        simpleResponse: true,
      };
    }

    return {
      success: true,
      analysisType,
      totalResults: results.length,
      data: results,
      summary: generateAppointmentSummary(analysisType, results, dateInfo),
      tableFormat: analysisType !== "total_count",
    };
  } catch (error) {
    console.error("Appointment analysis error:", error);
    return {
      success: false,
      error: error.message,
      analysisType,
    };
  }
};
