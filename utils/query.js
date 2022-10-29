const { Op } = require("sequelize");
exports.sqquery = (q) => {
  const excludeFileds = ["page", "sort", "limit", "fields", "sortBy", "day"];
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
        if (e === "gte") {
          where[v] = { [Op.gte]: q[v][e] };
        } else if (e === "lte") {
          where[v] = { [Op.lte]: q[v][e] };
        } else if (e === "gt") {
          where[v] = { [Op.gt]: q[v][e] };
        } else if (e === "lt") {
          where[v] = { [Op.lt]: q[v][e] };
        }
      });
    } else {
      where[v] = q[v];
    }
  });

  return where;
};
