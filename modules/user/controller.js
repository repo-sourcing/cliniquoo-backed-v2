"use strict";
const service = require("./service");

const { Op } = require("sequelize");
const firebase = require("../../utils/firebaseConfige");
const Clinic = require("../clinic/model");
const jwt = require("jsonwebtoken");

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(201).json({
      status: 201,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const limit = req.query.limit * 1 || 100;
    const page = req.query.page * 1 || 1;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const sortBy = req.query.sortBy || "DESC";
    delete req.query.limit;
    delete req.query.page;
    delete req.query.sort;
    delete req.query.sortBy;
    const data = await service.get({
      where: req.query,
      order: [[sort, sortBy]],
      limit,
      offset: skip,
    });

    res.status(200).send({
      status: "success",
      message: "get All use successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
exports.getOne = async (req, res, next) => {
  try {
    const [data] = await service.get({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "Get One user successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.requestor.id;
    delete req.body.uid;
    delete req.body.mobile;
    if (req.file) {
      req.body.profilePic = req.file.location;
    }

    const data = await service.update(id, req.body);

    res.status(200).send({
      status: "success",
      message: "Update Me successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.remove(id);

    res.status(200).send({
      status: "success",
      message: "delete user successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Temp
exports.sendOTP = async (req, res, next) => {
  console.log("hello");
  const mobile = req.body.mobile;
  const token = jwt.sign(
    {
      phone_number: req.body.mobile,
      uid: req.body.uid,
    },
    process.env.JWT_SECRETE,
    {
      expiresIn: process.env.JWT_EXPIREIN,
    }
  );

  res.status(200).json({
    message: "Verification is sent",
    phoneNumber: mobile,
    token,
  });
};
exports.verifyUser = async (req, res, next) => {
  firebase
    .auth()
    .verifyIdToken(req.body.firebase_token)
    .then(async (jwtUser) => {
      console.log(jwtUser);
      let token;
      // console.log("user from firebase token\n", jwtUser);
      const [avlUser] = await service.get({
        where: {
          [Op.or]: { mobileUid: jwtUser.uid, emailUid: jwtUser.uid },
        },
        attributes: ["id", "mobile"],
      });
      console.log("available user", avlUser);
      // Sign a JWT Token for login/signup
      if (!avlUser) {
        console.log("Hi");
        token = jwt.sign(
          { id: jwtUser.uid, role: "User" },
          process.env.JWT_SECRETE,
          {
            expiresIn: process.env.JWT_EXPIREIN,
          }
        );
        res.status(200).json({
          status: "success",
          message: "user verified",
          user: "new",
          token,
        });
      } else {
        token = jwt.sign(
          { id: avlUser.id, role: "User" },
          process.env.JWT_SECRETE,
          {
            expiresIn: process.env.JWT_EXPIREIN,
          }
        );
        res.status(200).json({
          status: "success",
          message: "user verified",
          user: "old",
          token,
        });
      }
    })
    .catch(async (err) => {
      console.log(err);
      try {
        let token;
        // const jwtUser = await decodeToken(req);
        const jwtUser = await jwt.verify(
          req.body.firebase_token,
          process.env.JWT_SECRETE
        );
        console.log(jwtUser);
        const [avlUser] = await service.get({
          where: {
            [Op.or]: [{ mobileUid: jwtUser.uid }, { emailUid: jwtUser.uid }],
          },
          attributes: ["id", "mobile"],
        });
        // console.log("available user", avlUser);
        // Sign a JWT Token for login/signup

        if (!avlUser) {
          token = jwt.sign(
            { id: jwtUser.uid, role: "User" },
            process.env.JWT_SECRETE,
            {
              expiresIn: process.env.JWT_EXPIREIN,
            }
          );
          res.status(200).json({
            status: "success",
            message: "user verified",
            user: "new",
            token,
          });
        } else {
          token = jwt.sign(
            { id: avlUser.id, role: "User" },
            process.env.JWT_SECRETE,
            {
              expiresIn: process.env.JWT_EXPIREIN,
            }
          );
          res.status(200).json({
            status: "success",
            message: "user verified",
            user: "old",
            token,
          });
        }
      } catch (err) {
        next(err);
      }

      //  next(err)
    });
};

exports.signup = async (req, res, next) => {
  let token;
  if (req.headers.authorization == null)
    return res.status(401).json({
      status: "fail",
      message: "Not Authorized",
    });

  if (!req.headers.authorization.startsWith("Bearer"))
    return res.status(401).json({
      status: "fail",
      message: "Bearer Token Must Be Required",
    });

  token = req.headers.authorization.split(" ")[1];

  try {
    const jwtUser = await jwt.verify(token, process.env.JWT_SECRETE);
    // console.log(jwtUser);

    req.body.emailUid = jwtUser.id;
    req.body.profilePic = req.file ? req.file.location : null;
    const data = await service.create(req.body);

    token = jwt.sign({ id: data.id, role: "User" }, process.env.JWT_SECRETE, {
      expiresIn: process.env.JWT_EXPIREIN,
    });
    res.status(200).send({
      status: "success",
      message: "User signup Successfully",
      data,
      token,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
exports.getMe = async (req, res, next) => {
  try {
    // console.log(req.requestor.id);
    const data = await service.get({
      where: {
        id: req.requestor.id,
      },
      include: [Clinic],
    });

    res.status(200).send({
      status: "success",
      message: "getMe successfully",
      data: {
        data,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.search = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        name: {
          [Op.like]: `${req.params.name}%`,
        },
      },
      attributes: ["id", "name", "profilePic"],
    });

    res.status(200).send({
      status: "success",
      message: "search user successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.mobileCheck = async (req, res, next) => {
  try {
    const [data] = await service.get({
      where: {
        mobile: req.body.mobile,
      },
    });
    if (data)
      return res.status(200).json({
        status: "success",
        message: "user available",
        available: true,
        email: data.email,
      });

    res.status(200).json({
      status: "success",
      message: "user not available",
      available: false,
    });
  } catch (error) {
    next(error);
  }
};
