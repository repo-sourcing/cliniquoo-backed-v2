const jwt = require("jsonwebtoken");
const userService = require("./../modules/user/service");
const adminService = require("./../modules/admin/service");

exports.authMiddleware = async (req, res, next) => {
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

  const token = req.headers.authorization.split(" ")[1];

  try {
    const jwtUser = await jwt.verify(token, process.env.JWT_SECRETE);
    let requestor;
    if (jwtUser.role === "Admin") {
      requestor = await adminService.get({
        where: {
          id: jwtUser.id,
        },
      });
      requestor.role = "Admin";
    } else {
      // console.log(jwtUser);
      requestor = await userService.get({
        where: {
          id: jwtUser.id,
        },
      });
      requestor.role = "User";
    }

    if (!requestor) {
      res.status(401).json({
        status: "fail",
        message: "User not found",
      });
    } else {
      // console.log(requestor);
      req.requestor = requestor[0];
      next();
    }
  } catch (error) {
    res.status(401).json({
      status: "fail",
      message: "User not authorized",
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.requestor.role)) {
      res.status(403).json({
        status: "fail",
        message: ` ${req.requestor.role}  are not authorized for  this portion`,
      });
    } else {
      next();
    }
  };
};
