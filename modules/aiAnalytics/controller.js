const {
  runAIControlledWorkflow,
  executeSQLQuery,
} = require("../../utils/aiWorkFlow");
const {
  createSession,
  sessionExists,
  getMessages,
  appendMessage,
} = require("../../utils/sessionStore");
const { commonData } = require("../user/constant");
const {
  otherDetailsPrompt,
  analyticsData,
  calculateDateContext, // ✅ NEW: Import the date calculator
} = require("./systemPrompt");

exports.getqueryAnalyticsByAI = async (req, res, next) => {
  try {
    let userId = req.requestor.id;

    let subscriptionData = req.requestor.subscription;

    if (!subscriptionData) {
      return next(
        createError(404, "Something went wrong please try again later")
      );
    }
    if (
      subscriptionData &&
      subscriptionData.planType === commonData.supscriptionPlanData.BASIC
    ) {
      return next(
        createError(404, `Please upgrade a plan to use this feature`)
      );
    }

    const { userQuery, sessionId: incomingSessionId } = req.body;
    if (!userQuery) {
      return res.status(400).send({
        status: "error",
        message: "User query is required",
      });
    }

    // ✅ NEW: Calculate fresh dates for this request
    const dateContext = calculateDateContext();

    console.log(
      `[AI Query] Current date being used: ${dateContext.currentDate}`
    ); // ✅ Debug log

    // 1) establish session
    let sessionId = incomingSessionId;
    if (!sessionId || !(await sessionExists(userId, sessionId))) {
      sessionId = await createSession(userId);
    }

    // 3) append current user message to Redis BEFORE calling model
    await appendMessage(userId, sessionId, {
      role: "user",
      text: userQuery,
    });

    // 2) load prior context (last N messages)
    const prior = await getMessages(userId, sessionId);

    // ✅ MODIFIED: Pass dateContext to the AI workflow
    const aiResponse = await runAIControlledWorkflow({
      userQuery,
      dbType: "MySQL",
      otherDetails: otherDetailsPrompt,
      executeSQLQuery: executeSQLQuery,
      modelName: analyticsData.modelName,
      authKey: process.env.GOOGLE_API_KEY,
      contextMessages: prior,
      userId: req.requestor.id,
      dateContext: dateContext, // ✅ NEW: Pass fresh dates
    });

    // 5) persist assistant final message to Redis
    const finalText =
      typeof aiResponse?.message === "string"
        ? aiResponse.message.text
        : JSON.stringify(aiResponse.message.text);

    await appendMessage(userId, sessionId, {
      role: "model",
      text: finalText,
    });

    res.status(200).send({
      status: "success",
      data: {
        aiResponse: {
          data: aiResponse.message.message.content,
          type: aiResponse.message.message.type,
        },
        sessionId,
      },
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

// Keep getSessionData unchanged
exports.getSessionData = async (req, res, next) => {
  try {
    let userId = req.requestor.id;

    let sessionId = req.params.sessionId;
    if (!(await sessionExists(userId, sessionId))) {
      return res.status(201).send({
        status: "success",
        message: "Your session is Expired!",
      });
    }
    const prior = await getMessages(userId, sessionId);
    res.status(200).send({
      status: "success",
      data: prior,
    });
  } catch (err) {
    next(err);
  }
};
