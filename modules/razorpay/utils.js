const userSubscriptionService = require("../userSubscription/service");
const subscriptionService = require("../subscription/service");
const moment = require("moment-timezone");
const { commonData } = require("../user/constant");
const { Op } = require("sequelize");
const Subscription = require("../subscription/model");
const visitorService = require("../visitor/service");
const clinicService = require("../clinic/service");
exports.subscriptionActivationCron = async () => {
  try {
    // const today = moment().startOf("day").format("YYYY-MM-DD");
    // let previousDay = moment()
    //   .subtract(1, "day")
    //   .startOf("day")
    //   .format("YYYY-MM-DD");
    const today = moment()
      .tz("Asia/Kolkata")
      .startOf("day")
      .format("YYYY-MM-DD");
    const previousDay = moment()
      .tz("Asia/Kolkata")
      .subtract(1, "day")
      .startOf("day")
      .format("YYYY-MM-DD");

    const processedProUserIds = new Set(); // ✅ only for Pro activations
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
          processedProUserIds.add(plan.userId);
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
      include: [{ model: Subscription }],
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
      // ✅ Track only if the new plan is a Pro Plan
      if (p.subscription?.planType === "Pro Plan") {
        processedProUserIds.add(p.userId);
      }
    }

    await this.assignTimeSlotsAfterUpgrade([...processedProUserIds]);
    console.log("✅ Subscription status cron completed successfully.");
  } catch (error) {
    console.error("❌ Error running subscription status cron:", error);
  }
};
exports.assignTimeSlotsAfterUpgrade = async usersArray => {
  try {
    for (const userId of usersArray) {
      console.log(`🎯 Running time slot assignment for user ${userId}`);

      // 1️⃣ Get all clinics for this user
      const clinics = await clinicService.get({
        where: { userId },
        attributes: ["id", "timeRanges"],
      });

      for (const clinic of clinics) {
        const timeRanges = clinic.timeRanges || [];

        // Skip if no time slots defined
        if (!timeRanges.length) continue;

        // 2️⃣ Fetch all future visits without timeSlot (date-wise)
        const futureVisits = await visitorService.get({
          where: {
            clinicId: clinic.id,
            date: { [Op.gte]: moment().startOf("day").toDate() },
            timeSlot: null,
          },
          order: [["createdAt", "ASC"]],
        });

        if (!futureVisits.length) continue;

        // 3️⃣ Group visits by date
        const visitsByDate = futureVisits.reduce((acc, visit) => {
          const dateKey = moment(visit.date).format("YYYY-MM-DD");
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(visit);
          return acc;
        }, {});

        // 4️⃣ Generate all available 1-hour slots from timeRanges
        const generateSlots = () => {
          const allSlots = [];
          for (const range of timeRanges) {
            let start = moment(range.start, "HH:mm");
            const end = moment(range.end, "HH:mm");
            console.log(
              `⏰ Generating slots from ${range.start} to ${range.end}`
            );

            while (start.add(30, "minutes").isSameOrBefore(end)) {
              const slotStart = start
                .clone()
                .subtract(30, "minutes")
                .format("HH:mm");

              const slotEnd = start.format("HH:mm");
              console.log(`⏰ Generated slot from ${slotStart} to ${slotEnd}`);
              allSlots.push({ start: slotStart, end: slotEnd });
            }
          }
          return allSlots;
        };

        const allSlots = generateSlots();
        const totalSlots = allSlots.length;

        // 5️⃣ Assign slots date-wise
        for (const [dateKey, visits] of Object.entries(visitsByDate)) {
          const totalVisits = visits.length;
          console.log(
            `📅 Assigning ${totalVisits} visits on ${dateKey} for clinic ${clinic.id}`
          );

          for (let i = 0; i < totalVisits; i++) {
            const assignedSlot = allSlots[i % totalSlots]; // loop if more patients than slots
            await visitorService.update(
              { timeSlot: [assignedSlot.start, assignedSlot.end] },
              { where: { id: visits[i].id } }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Error in assignTimeSlotsAfterUpgrade:", error);
  }
};
