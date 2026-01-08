const service = require("./service");
const userModel = require("../user/model");
// let crypto = require("crypto");
const { sqquery, usersqquery } = require("../../utils/query");
const Treatment = require("../treatment/model");
const TreatmentPlan = require("../treatmentPlan/model");
const Transaction = require("../transaction/model");
const Visitor = require("../visitor/model");
const PatientBill = require("../patientBill/model");
const { commonData } = require("../user/constant");
const { assignTimeSlotsAfterUpgrade } = require("../razorpay/utils");

function normalizeTimeRangesInput(input) {
  if (!input) return undefined; // don't set if absent
  const str = Array.isArray(input) ? input : String(input);
  return str; // model will normalize; validation already checks
}

exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.requestor.id;

    let subscriptionData = req.requestor.subscription;

    const noOfClinic = await service.count({
      where: {
        userId: req.requestor.id,
      },
    });

    if (noOfClinic && subscriptionData) {
      if (
        subscriptionData.planType === commonData.supscriptionPlanData.BASIC &&
        noOfClinic >= 1
      ) {
        return next(
          createError(
            200,
            "You Can Add max 1 clinic,Please upgrade your plan for add more clinic!"
          )
        );
      }
    }

    if (noOfClinic >= 3)
      return next(createError(200, "You Can Add max 3 clinic"));

    // Convert mobile to string before saving
    if (req.body.mobile != null) req.body.mobile = req.body.mobile.toString();

    // Normalize optional time fields
    if ("timeRanges" in req.body) {
      req.body.timeRanges = normalizeTimeRangesInput(req.body.timeRanges);
    }

    const data = await service.create(req.body);

    res.status(200).json({
      status: "success",
      message: "Add Clinic successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getAllByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: { userId: req.requestor.id },
    });

    res.status(200).send({
      status: "success",
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

      include: [
        {
          model: userModel,
          attributes: ["name", "profilePic", "mobile", "about", "email"],
        },
      ],
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

    if (req.body.mobile != null) req.body.mobile = req.body.mobile.toString();
    if ("timeRanges" in req.body) {
      req.body.timeRanges = normalizeTimeRangesInput(req.body.timeRanges);
    }

    const data = await service.update(req.body, {
      where: {
        id,
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit clinic successfully",
      data,
    });

    //for update a time slot when clinic is edites by time

    if (req?.body?.scheduleByTime) {
      assignTimeSlotsAfterUpgrade([req.requestor.id], id);
    }
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const noOfClinic = await service.count({
      where: {
        userId: req.requestor.id,
      },
    });

    if (noOfClinic <= 1)
      return next(createError(200, "Minimum 1 clinic is required"));

    const data = await service.count({
      where: {
        id,
        userId: req.requestor.id,
      },
    });
    if (!data) {
      return res.status(404).send({
        status: "error",
        message: "Clinic not found or you don't have permission to delete",
      });
    }
    let deletedData = await this.deleteClinicAndClinicRelation(
      req.requestor.id,
      id
    );

    res.status(200).send({
      status: "success",
      message: "delete Clinic successfully",
      data: deletedData.data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.deleteClinicAndClinicRelation = async (userId, clinicId) => {
  try {
    const treatments = await Treatment.findAll({
      include: [
        {
          model: TreatmentPlan,
          where: { clinicId },
          attributes: [], // we only need the treatment IDs
        },
      ],
      attributes: ["id"],
    });

    // Step 2: Extract treatment IDs
    const treatmentIds = treatments.map(t => t.id);
    // Run independent deletes in parallel
    // Run independent deletes in parallel
    await Promise.all([
      Treatment.destroy({ where: { id: treatmentIds } }),

      Transaction.destroy({ where: { clinicId } }),

      Visitor.destroy({ where: { clinicId } }),

      TreatmentPlan.destroy({ where: { clinicId } }),
      PatientBill.destroy({ where: { clinicId } }),
    ]);

    let data = await service.remove({ where: { id: clinicId } });

    return { success: true, data };
  } catch (error) {
    throw error;
  }
};
