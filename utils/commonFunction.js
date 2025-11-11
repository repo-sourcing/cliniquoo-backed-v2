const moment = require("moment");
const visitorService = require("../modules/visitor/service");
const ClinicService = require("../modules/clinic/service");
const { commonData } = require("../modules/user/constant");

exports.createVisitorWithSlot = async function ({
  clinicId,
  patientId,
  planType,
}) {
  // Step 1: Get clinic info
  const [dataClinic] = await ClinicService.get({
    where: { id: clinicId },
  });

  // Current IST time
  const now = moment().utcOffset("+05:30");

  // Step 3: If no timeRanges → simple visitor create
  if (
    !dataClinic.timeRanges ||
    dataClinic.timeRanges.length === 0 ||
    planType == commonData.supscriptionPlanData.BASIC
  ) {
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

  const minute = now.minute();

  //return;

  // Always align to HH:00 - HH+1:00
  //   if (minute > 0) {
  //     hour += 1;
  //   }

  // const start = moment().utcOffset("+05:30").hour(hour).minute(0).second(0);
  // const end = moment(start).add(30, "minutes");
  // console.log("start end", start.format("HH:mm"), end.format("HH:mm"));
  // const timeSlot = [start.format("HH:mm"), end.format("HH:mm")];
  if (minute < 30) {
    // between HH:00 and HH:29 → slot = HH:00 to HH:30
    start = moment().utcOffset("+05:30").hour(hour).minute(0).second(0);
    end = moment(start).add(30, "minutes");
  } else {
    // between HH:30 and HH:59 → slot = HH:30 to HH+1:00
    start = moment().utcOffset("+05:30").hour(hour).minute(30).second(0);
    end = moment(start).add(30, "minutes");
  }

  const timeSlot = [start.format("HH:mm"), end.format("HH:mm")];

  console.log("🕒 Assigned time slot:", timeSlot);

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
