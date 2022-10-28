const { sqquery } = require("../../utils/query");

exports.getAll = async (req, res, next) => {
  try {
    const limit = req.query.limit * 1 || 100;
    const page = req.query.page * 1 || 1;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const sortBy = req.query.sortBy || "DESC";

    const data = await service.get({
      where: sqquery(req.query),

      include: [
        {
          model: Patient,
          include: [
            {
              model: Treatment,

              include: [
                {
                  model: Procedure,
                },
              ],
            },
          ],
        },
      ],
      order: [[sort, sortBy]],
      limit,
      offset: skip,
    });

    res.status(200).send({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};
