const LogModel = require("./model");

exports.create = async (data) => {
  return await LogModel.create(data);
};

exports.update = async (data, query) => {
  return await LogModel.update(data, query);
};

exports.findOne = async (data) => {
  return await LogModel.findOne(data);
};

exports.findAll = async (data) => {
  return await LogModel.findAll(data);
};

exports.findAndCountAll = async (data) => {
  return await LogModel.findAndCountAll(data);
};

exports.destroy = async (data) => {
  return await LogModel.destroy(data);
};

exports.count = async (data) => {
  return await LogModel.count(data);
};
