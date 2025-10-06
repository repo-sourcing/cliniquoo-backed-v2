const moment = require("moment");
const visitorService = require("../modules/visitor/service");
const ClinicService = require("../modules/clinic/service");

exports.createVisitorWithSlot = async function ({ clinicId, patientId }) {
  // Step 1: Get clinic info
  const [dataClinic] = await ClinicService.get({
    where: { id: clinicId },
  });

  // Current IST time
  const now = moment().utcOffset("+05:30");

  // Step 3: If no timeRanges → simple visitor create
  if (!dataClinic.timeRanges || dataClinic.timeRanges.length === 0) {
    return visitorService.findOrCreate({
      where: {
        date: now.startOf("day"), // date only
        clinicId,
        patientId,
      },
      defaults: { isVisited: true },
    });
  }

  // Step 4: If timeRanges exist → calculate slot
  let hour = now.hour();
  console.log("Current hour:", hour);
  const minute = now.minute();
  console.log("Current minute:", minute);
  //return;

  // Always align to HH:00 - HH+1:00
  //   if (minute > 0) {
  //     hour += 1;
  //   }

  const start = moment().utcOffset("+05:30").hour(hour).minute(0).second(0);
  const end = moment(start).add(1, "hour");
  const timeSlot = [start.format("HH:mm"), end.format("HH:mm")];

  return visitorService.findOrCreate({
    where: {
      date: now.startOf("day"),
      clinicId,
      patientId,
    },
    defaults: {
      isVisited: true,
      timeSlot,
    },
  });
};
