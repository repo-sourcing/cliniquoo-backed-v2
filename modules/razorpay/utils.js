const userSubscriptionService = require("../userSubscription/service");
const subscriptionService = require("../subscription/service");
const moment = require("moment");
const { commonData } = require("../user/constant");
const { Op } = require("sequelize");
const Subscription = require("../subscription/model");
exports.subscriptionActivationCron = async () => {
  try {
    const today = moment().startOf("day").format("YYYY-MM-DD");
    let previousDay = moment()
      .subtract(1, "day")
      .startOf("day")
      .format("YYYY-MM-DD");

    // 1️⃣ Expire all active plans where expiryDate <= today
    const expiredPlans = await userSubscriptionService.get({
      where: {
        status: commonData.SubscriptionStatus.ACTIVE,
        expiryDate: { [Op.lt]: today },
      },
    });

    for (const plan of expiredPlans) {
      await userSubscriptionService.update(
        {
          status: commonData.SubscriptionStatus.EXPIRE,
          endDate: previousDay,
        },
        { where: { id: plan.id } }
      );

      // 2️⃣ If expired plan is PRO, check for pending PRO plan
      const planDetails = await subscriptionService.get({
        where: { id: plan.subscriptionId },
      });
      if (planDetails[0].planType === "Pro Plan") {
        const pendingPro = await userSubscriptionService.get({
          where: {
            userId: plan.userId,
            status: commonData.SubscriptionStatus.PENDING,
          },
          include: [{ model: Subscription }],
          order: [["startDate", "ASC"]],
        });

        if (
          pendingPro.length > 0 &&
          moment(pendingPro[0].startDate).isSameOrBefore(today)
        ) {
          // Activate pending PRO plan
          await userSubscriptionService.update(
            { status: commonData.SubscriptionStatus.ACTIVE },
            { where: { id: pendingPro[0].id } }
          );
        } else {
          // No pending PRO → Activate basic plan
          const basicPlan = await subscriptionService.get({
            where: { planType: "Basic Plan" },
          });
          if (basicPlan.length > 0) {
            await userSubscriptionService.update(
              {
                status: commonData.SubscriptionStatus.ACTIVE,
                startDate: today,
              },
              {
                where: {
                  userId: plan.userId,
                  subscriptionId: basicPlan[0].id,
                  status: commonData.SubscriptionStatus.INACTIVE,
                },
              }
            );
          }
        }
      }
    }

    // 3️⃣ Activate any pending plan whose startDate <= today
    const pendingPlans = await userSubscriptionService.get({
      where: {
        status: commonData.SubscriptionStatus.PENDING,
        startDate: { [Op.lte]: today },
      },
    });

    for (const p of pendingPlans) {
      // Expire current active plan of user
      await userSubscriptionService.update(
        { status: commonData.SubscriptionStatus.EXPIRE, endDate: previousDay },
        {
          where: {
            userId: p.userId,
            status: commonData.SubscriptionStatus.ACTIVE,
          },
        }
      );

      // Activate the pending plan
      await userSubscriptionService.update(
        { status: commonData.SubscriptionStatus.ACTIVE },
        { where: { id: p.id } }
      );
    }

    console.log("✅ Subscription status cron completed successfully.");
  } catch (error) {
    console.error("❌ Error running subscription status cron:", error);
  }
};
