const Admin = require("./model");

exports.create = async (data) => {
  return Admin.create(data);
};

// exports.getAll = async () => {
//   return User.findAll();
// };

exports.get = async (conditions) => {
  return Admin.findAll(conditions);
};
