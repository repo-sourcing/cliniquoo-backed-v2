const { Op } = require("sequelize");

/**
 *
 * @param {String} attributes
 * @param {String | Number} value
 * @returns
 */
exports.getOpAttributeValue = (attributes, value) => {
  switch (attributes) {
    case "gt":
      return { [Op.gt]: value };
    case "gte":
      return { [Op.gte]: value };
    case "lt":
      return { [Op.lt]: value };
    case "lte":
      return { [Op.lte]: value };
    case "eq":
      return { [Op.eq]: value };
    case "ne":
      return { [Op.ne]: value };
    case "notBetween": {
      let arr = value;
      if (typeof arr === "string") arr = JSON.parse(arr);
      return { [Op.notBetween]: arr };
    }
    case "between": {
      let arr = value;
      if (typeof arr === "string") arr = JSON.parse(arr);
      return { [Op.between]: arr };
    }
    default:
      return null;
  }
};

/**
 *
 * @param {Object} q
 * @returns
 */
exports.sqquery = (q) => {
  const limit = q.limit * 1 || 100;
  const page = q.page * 1 || 1;
  const skip = (page - 1) * limit;
  const sort = q.sort || "createdAt";
  const sortBy = q.sortBy || "DESC";

  const excludeFileds = ["page", "sort", "limit", "fields", "sortBy"];
  excludeFileds.forEach((el) => delete q[el]);
  let where = {};

  function isJSON(str) {
    const a = JSON.stringify(str);
    try {
      var json = JSON.parse(a);
      return typeof json === "object";
    } catch (e) {
      return false;
    }
  }

  Object.keys(q).map((v) => {
    if (isJSON(q[v])) {
      Object.keys(q[v]).map((e) => {
        let obj = this.getOpAttributeValue(e, q[v][e]);
        if (obj) where[v] = obj;
      });
    } else {
      where[v] = q[v];
    }
  });

  return { where, order: [[sort, sortBy]], limit, offset: skip };
};

/**
 *
 * @param {Object} q
 * @returns
 */
exports.usersqquery = (q) => {
  const limit = q?.limit * 1 || 200;
  const page = q?.page * 1 || 1;
  const skip = (page - 1) * limit;
  const sort = q?.sort || "createdAt";
  const sortBy = q?.sortBy || "DESC";

  if (q?.limit) {
    return { order: [[sort, sortBy]], limit, offset: skip };
  }
  return { order: [[sort, sortBy]] };
};
