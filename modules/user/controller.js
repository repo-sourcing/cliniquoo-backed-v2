"use strict";
const service = require("./service");
const { Op } = require("sequelize");

const auth = require("../../middleware/auth");
const firebase = require("../../utils/firebaseConfige");
const Clinic = require("../clinic/model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");
const DailyActivityService = require("../dailyActivity/service");
const { sqquery } = require("../../utils/query");
const redisClient = require("../../utils/redis");
const { encrypt } = require("../../utils/encryption");

exports.create = async (req, res, next) => {
  try {
    // Find user with same phone number and email
    // If user found with this  phone number or email. Then throw error
    // otherwise add new data
    const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
    let encryptedMobile = cipher.update(
      req.body.mobile.toString(),
      "utf8",
      "hex"
    );
    encryptedMobile += cipher.final("hex");
    const cipherEmail = crypto.createCipher("aes128", process.env.CYPHERKEY);
    let encryptedEmail = cipherEmail.update(
      req.body.email.toString(),
      "utf8",
      "hex"
    );
    encrypteEmail += cipherEmail.final("hex");

    const [userWithSamePhoneNo] = await service.get({
      where: { mobile: encryptedMobile.toString() },
    });

    // user with same phone number is  found.
    if (userWithSamePhoneNo) {
      return res.status(400).json({
        message: "This Phone Number is already register,try with another one",
      });
    }

    const [userWithSameEmail] = await service.get({
      where: { mobile: encryptedEmail.toString() },
    });

    // user with same phone number is  found.
    if (userWithSameEmail) {
      return res.status(400).json({
        message: "This Email is already register,try with another one",
      });
    }
    const data = await service.create(req.body);

    res.status(201).json({
      status: 201,
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
      message: "get All use successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getDeleteRequestUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        deletedAt: { [Op.not]: null },
      },
      paranoid: false,
    });

    res.status(200).send({
      status: "success",
      message: "get All delete request use successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.restoreDeleteUser = async (req, res, next) => {
  try {
    console.log(req.body.id);

    const data = await service.restore(req.body.id);
    console.log(data);

    res.status(200).send({
      status: "success",
      message: "restore user successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.approveDeleteUser = async (req, res, next) => {
  try {
    const userId = req.body.id;

    await service.hardRemove(userId);
    await Clinic.destroy({
      where: {
        userId,
      },
      force: true,
    });

    res.status(200).send({
      status: "success",
      message: "restore user successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
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
    next(error || createError(404, "Data not found"));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.requestor.id;
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
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.remove(id);
    // await redisClient.DEL(`patient?userId=${req.requestor.id}`);

    res.status(200).send({
      status: "success",
      message: "delete user successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

// Temp
// exports.sendOTP = async (req, res, next) => {
//   const mobile = req.body.mobile;
//   const token = jwt.sign(
//     {
//       phone_number: req.body.mobile,
//       uid: req.body.uid,
//     },
//     process.env.JWT_SECRETE,
//     {
//       expiresIn: process.env.JWT_EXPIREIN,
//     }
//   );

//   res.status(200).json({
//     message: "Verification is sent",
//     phoneNumber: mobile,
//     token,
//   });
// };

// exports.sendOTP = async (req, res, next) => {
//   try {
//     let mobileNo = `+91${req.body.mobile}`;
//     const OTP = Math.floor(100000 + Math.random() * 900000);
//     console.log(OTP);
//     const token = jwt.sign(
//       {
//         mobile: req.body.mobile,
//         OTP: OTP,
//       },
//       process.env.JWT_SECRETE,
//       {
//         expiresIn: 80,
//       }
//     );
//     let params = {
//       Message: `${OTP} is the OTP to login to your Dento account. Do Not Disclose it to anyone.`,
//       PhoneNumber: mobileNo,
//       //       EntityId :1101782810000058028,
//       //       TemplateId :1107165124279967724
//     };
//     return new AWS.SNS({
//       apiVersion: "2010–03–31",
//     })
//       .publish(params)
//       .promise()
//       .then((message) => {
//         console.log("OTP send successfully");

//         res.status(200).json({
//           status: "success",
//           message: "OTP send successfully",
//           token,
//         });
//       })
//       .catch((err) => {
//         console.log("Error" + err);
//         return err;
//       });
//   } catch (error) {
//     next(error || createError(404, "Data not found"));
//   }
// };

exports.sendOTP = async (req, res, next) => {
  try {
    // Use the utility function for encryption
    const encryptedMobile = encrypt(
      req.body.mobile.toString(),
      process.env.CYPHERKEY
    );

    const deletedUser = await service.count({
      where: {
        deletedAt: { [Op.not]: null },
        mobile: encryptedMobile,
      },
      paranoid: false,
    });

    // user with same phone number is found.
    if (deletedUser > 0) {
      return res.status(200).json({
        status: "fail",
        message: "please wait for admin approve ",
      });
    }

    let mobile = `+91${req.body.mobile * 1}`;

    const token = await auth.singMobileToken(req.body.mobile * 1, false);
    const Services = axios.create({
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.API_KEY,
      },
    });

    const body = {
      flow_id: process.env.FLOW_ID,
      to: {
        mobile,
      },
    };

    Services.post(`https://api.kaleyra.io/v1/${process.env.SID}/verify`, body)
      .then((el) => {
        res.status(200).json({
          status: "success",
          message: "OTP send successfully",
          data: el.data.data,
          token,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(200).json({
          status: "fail",
          message: "OTP send failed",
        });
      });
  } catch (error) {
    console.log(error);
    next(error || createError(404, "Data not found"));
  }
};

// exports.verifyOTP = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization.split(" ")[1];
//     const jwtUser = await jwt.verify(token, process.env.JWT_SECRETE);
//     if (jwtUser.OTP == req.body.OTP) {
//       // const token = singMobileToken(jwtUser.mobile, true);
//       res.status(200).json({
//         status: "success",
//         message: "User Verified",
//         token,
//       });
//     } else {
//       res.status(401).json({
//         status: "fail",
//         message: "Incorrect OTP",
//       });
//     }
//   } catch (error) {
//     next(error || createError(404, "Data not found"));
//   }
// };

exports.verifyOTP = async (req, res, next) => {
  try {
    if (req.requestor.mobile == "8128220770" && req.body.otp == "1234") {
      console.log("this is dummy mobile number");

      const token = jwt.sign({ id: 2, role: "User" }, process.env.JWT_SECRETE, {
        expiresIn: process.env.JWT_EXPIREIN,
      });
      res.status(200).json({
        status: "success",
        message: "OTP verify successfully",
        user: "old",
        token,
      });
    } else {
      const { verify_id, otp } = req.body;
      const Services = axios.create({
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.API_KEY,
        },
      });

      const body = {
        verify_id,
        otp,
      };

      Services.post(
        `https://api.kaleyra.io/v1/${process.env.SID}/verify/validate`,
        body
      )
        .then(async (el) => {
          // Use the new encrypt function instead of deprecated createCipher
          const encryptedMobile = encrypt(
            req.requestor.mobile.toString(),
            process.env.CYPHERKEY
          );

          const [user] = await service.get({
            where: {
              mobile: encryptedMobile,
            },
          });

          if (!user) {
            const token = await auth.singMobileToken(
              req.requestor.mobile,
              true
            );
            res.status(200).json({
              status: "success",
              message: "OTP verify successfully",
              data: el.data.data,
              user: "new",
              token,
            });
          } else {
            // Added 'else' here to prevent both conditions from running
            const token = jwt.sign(
              { id: user.id, role: "User" },
              process.env.JWT_SECRETE,
              {
                expiresIn: process.env.JWT_EXPIREIN,
              }
            );
            res.status(200).json({
              status: "success",
              message: "OTP verify successfully",
              user: "old",
              token,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          res.status(200).json({
            status: "fail",
            message: "OTP verification failed",
          });
        });
    }
  } catch (error) {
    console.log(error);
    next(error || createError(404, "Data not found"));
  }
};
// exports.verifyUser = async (req, res, next) => {
//   firebase
//     .auth()
//     .verifyIdToken(req.body.firebase_token)
//     .then(async (jwtUser) => {
//       let token;
//       const [avlUser] = await service.get({
//         where: {
//           [Op.or]: { mobileUid: jwtUser.uid, emailUid: jwtUser.uid },
//         },
//         attributes: ["id", "mobile"],
//       });
//       console.log("available user", avlUser);
//       // Sign a JWT Token for login/signup
//       if (!avlUser) {
//         token = jwt.sign(
//           { id: jwtUser.uid, role: "User" },
//           process.env.JWT_SECRETE,
//           {
//             expiresIn: process.env.JWT_EXPIREIN,
//           }
//         );
//         res.status(200).json({
//           status: "success",
//           message: "user verified",
//           user: "new",
//           token,
//         });
//       } else {
//         token = jwt.sign(
//           { id: avlUser.id, role: "User" },
//           process.env.JWT_SECRETE,
//           {
//             expiresIn: process.env.JWT_EXPIREIN,
//           }
//         );
//         res.status(200).json({
//           status: "success",
//           message: "user verified",
//           user: "old",
//           token,
//         });
//       }
//     })
//     .catch(async (err) => {
//       try {
//         let token;
//         // const jwtUser = await decodeToken(req);
//         const jwtUser = await jwt.verify(
//           req.body.firebase_token,
//           process.env.JWT_SECRETE
//         );
//         console.log(jwtUser);
//         const [avlUser] = await service.get({
//           where: {
//             [Op.or]: [{ mobileUid: jwtUser.uid }, { emailUid: jwtUser.uid }],
//           },
//           attributes: ["id", "mobile"],
//         });
//         // console.log("available user", avlUser);
//         // Sign a JWT Token for login/signup

//         if (!avlUser) {
//           token = jwt.sign(
//             { id: jwtUser.uid, role: "User" },
//             process.env.JWT_SECRETE,
//             {
//               expiresIn: process.env.JWT_EXPIREIN,
//             }
//           );
//           res.status(200).json({
//             status: "success",
//             message: "user verified",
//             user: "new",
//             token,
//           });
//         } else {
//           token = jwt.sign(
//             { id: avlUser.id, role: "User" },
//             process.env.JWT_SECRETE,
//             {
//               expiresIn: process.env.JWT_EXPIREIN,
//             }
//           );

//           res.status(200).json({
//             status: "success",
//             message: "user verified",
//             user: "old",
//             token,
//           });
//         }
//       } catch (err) {
//         next(err);
//       }

//       //  next(err)
//     });
// };

exports.signup = async (req, res, next) => {
  const mobile = "8128220770";

  try {
    const [user] = await service.get({
      where: {
        [Op.or]: [{ email: req.body.email }, { mobile }],
      },
    });

    if (user) return next(createError(200, "user already exist"));

    // req.body.emailUid = jwtUser.id;
    req.body.profilePic = req.file ? req.file.location : null;
    req.body.mobile = mobile;
    const data = await service.create(req.body);

    const token = jwt.sign(
      { id: data.id, role: "User" },
      process.env.JWT_SECRETE,
      {
        expiresIn: process.env.JWT_EXPIREIN,
      }
    );

    res.status(200).send({
      status: "success",
      message: "User signup Successfully",
      data,
      token,
    });
  } catch (err) {
    console.log("error", err);
    next(err);
  }
};
exports.getMe = async (req, res, next) => {
  try {
    const [data] = await service.get({
      where: {
        id: req.requestor.id,
      },
      include: [Clinic],
    });

    res.status(200).send({
      status: "success",
      message: "getMe successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
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
    next(error || createError(404, "Data not found"));
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
    next(error || createError(404, "Data not found"));
  }
};
