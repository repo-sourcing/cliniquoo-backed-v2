const service = require("./service");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const visitorService = require("../visitor/service");
const moment = require("moment");
const { sqquery } = require("../../utils/query");
const treatmentPlanService = require("../treatmentPlan/service");
const Clinic = require("../clinic/model");
const User = require("../user/model");
const patientService = require("../patient/service");
const { sendWhatsAppBill } = require("../../utils/msg91");
const { generateBillPDF } = require("./utils");
const { generateInvoice } = require("../patientBill/utils");
const PatientBill = require("../patientBill/model");
const { createVisitorWithSlot } = require("../../utils/commonFunction");
exports.create = async (req, res, next) => {
  try {
    const { treatmentPlanId } = req.body;
    const data = await service.create(req.body);

    const [treatmentPlan] = await treatmentPlanService.get({
      where: {
        id: treatmentPlanId,
      },
    });
    if (!treatmentPlan)
      return next(createError(404, "Treatment Plan not found"));
    const clinicId = treatmentPlan.clinicId;
    const patientId = treatmentPlan.patientId;

    //create visitor slot
    await createVisitorWithSlot({
      clinicId,
      patientId,
    });

    await Patient.increment("remainBill", {
      by: req.body.amount,
      where: { id: patientId },
    });

    await visitorService.update(
      {
        isVisited: true,
      },
      {
        where: {
          patientId,
          clinicId,
          date: moment().utcOffset("+05:30"),
          isVisited: false,
        },
      }
    );
    await Patient.update(
      {
        lastVisitedDate: moment().utcOffset("+05:30"),
      },
      {
        where: {
          id: patientId,
        },
      }
    );

    res.status(200).json({
      status: "success",
      message: "Treatment added successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const data = await service.get({
      ...sqquery(req.query),
    });
    res.status(200).send({
      status: "success",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await service.update(req.body, {
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit treatment successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.remove({
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete treatment successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.sendBilling = async (req, res, next) => {
  try {
    const [patientData] = await patientService.get({
      where: {
        id: req.params.patientId,
      },
      attributes: ["id", "name", "age", "gender", "mobile"],
      include: [
        {
          model: User,
          where: {
            id: req.requestor.id,
          },
          attributes: [
            "id",
            "name",
            "degree",
            "specialization",
            "registrationNumber",
            "signature",
          ],
          include: [
            {
              model: Clinic,
              where: {
                id: req.body.clinicId,
              },
              attributes: ["id", "name", "location", "mobile", "location"],
            },
          ],
        },
      ],
    });
    if (!patientData) return next(createError(404, "Patient not found"));

    const {
      user: doctor,
      name: patientName,
      age: patientAge,
      gender: patientGender,
      mobile: patientMobile,
    } = patientData;
    let treatment = req.body.treatmentJson;
    //add one key no in index+!
    //also add price symbol in treatment
    treatment.map((data, i) => {
      data.no = i + 1;
      data.price = `${data.price}`;
    });

    let degree =
      doctor.degree == "MDS" && doctor.specialization !== null
        ? `${doctor.degree} (${doctor.specialization})`
        : doctor.degree;

    const clinic = doctor.clinics[0];
    let billingData = {
      clinic_name: clinic.name,
      clinic_address: clinic.location,
      clinic_phone_number: clinic.mobile,

      dr_name: doctor.name,
      degree: degree,
      registration_no: doctor.registrationNumber,
      signature: doctor.signature || null,
      treatmentData: treatment,

      patient_name: patientName,
      patient_age: patientAge,
      patient_gender: patientGender,
      patient_phone_number: patientMobile,
      billing_date: req.body.date, // e.g. 25/08/2025
      invoice_number: req.body.invoiceNumber,
      subtotal_amount: `${req.body.subTotal}`,
      discount: `${req.body.discount}`,
      total_amount: `${req.body.subTotal - req.body.discount}`,
    };

    // Save to DB
    await PatientBill.create({
      invoiceNumber: req.body.invoiceNumber,
      treatment,
      clinicId: req.body.clinicId,
      patientId: req.params.patientId,
    });
    const url = await generateBillPDF(billingData);
    let toNumber = `91${patientMobile}`;

    try {
      sendWhatsAppBill({
        to: [toNumber],
        header: {
          filename: "bill.pdf",
          value: url,
        },
        bodyValues: [
          billingData.patient_name,
          billingData.clinic_name,
          billingData.clinic_phone_number,
          `"Dr. ${billingData.dr_name}"`,
        ],
      });
    } catch (error) {
      console.log("error in prescription send", error);
    }

    res.status(200).send({
      status: "success",
      message: "Bill send successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getInvoiceNumber = async (req, res, next) => {
  try {
    const invoiceNumber = await generateInvoice(
      req.params.clinicId,
      req.params.patientId
    );
    res.status(200).send({
      status: "success",
      message: "Invoice Number",
      data: { invoiceNumber },
    });
  } catch (error) {
    next(error);
  }
};
