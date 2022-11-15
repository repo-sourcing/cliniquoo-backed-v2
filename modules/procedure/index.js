const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove } = require("./controller");
const {procedureValidation,updateProcedureValidation}=require("./validation")

router.route("/").get(getAll).post(procedureValidation,create);
router.route("/:id").patch(updateProcedureValidation,edit).delete(remove);

module.exports = router;
