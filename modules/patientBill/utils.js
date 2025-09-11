const clinicService = require("../clinic/service");
const PatientBill = require("./service");

exports.generateInvoice = async (clinicId, patientId) => {
  const clinicCode = "DENTO";
  const now = new Date();
  const yearMonth = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  // Get the last invoice for this location & month
  const [lastBill] = await PatientBill.get({
    where: {
      clinicId,
    },
    order: [["id", "DESC"]],
  });

  let seq = 1;
  if (lastBill) {
    const lastInvoice = lastBill.invoiceNumber;
    const lastSeq = parseInt(lastInvoice.split("/").pop());
    seq = lastSeq + 1;
  }
  let location = await generateLocationCode(clinicId);

  const seqStr = String(seq).padStart(4, "0");
  const invoiceNumber = `${clinicCode}/${location}/${clinicId}/${yearMonth}/${seqStr}`;

  return invoiceNumber;
};

async function generateLocationCode(clinicId) {
  const [clinicData] = await clinicService.get({
    where: {
      id: clinicId,
    },
    attributes: ["id", "location"],
  });

  let location = clinicData?.location;
  const words = location.trim().split(/\s+/);

  let code;
  if (words.length === 1) {
    code = words[0].substring(0, 3); // first 3 letters of the word
  } else {
    code = words
      .map(word => word[0])
      .join("")
      .substring(0, 3);
  }

  return code.toUpperCase();
}
