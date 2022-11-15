const express = require("express");
const router = express.Router();

const { create, getAll, getSearch, edit, remove } = require("./controller");
const{patientValidation,updatePatientValidation}=require("./validation")

router.route("/").get(getAll).post(patientValidation,create);
router.route("/:id").patch(updatePatientValidation,edit).delete(remove);
router.route("/search/:name").get(getSearch);

module.exports = router;
