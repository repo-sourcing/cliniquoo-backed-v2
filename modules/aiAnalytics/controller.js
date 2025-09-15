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
const { otherDetailsPrompt, analyticsData } = require("./systemPrompt");

exports.getqueryAnalyticsByAI = async (req, res, next) => {
  try {
    let userId = req.requestor.id;
    const { userQuery, sessionId: incomingSessionId } = req.body;
    if (!userQuery) {
      return res.status(400).send({
        status: "error",
        message: "User query is required",
      });
    }
    // 1) establish session
    let sessionId = incomingSessionId;
    if (!sessionId || !(await sessionExists(userId, sessionId))) {
      sessionId = await createSession(userId);
    }

    // 3) append current user message to Redis BEFORE calling model (so it’s part of context)
    await appendMessage(userId, sessionId, {
      role: "user",
      text: userQuery,
    });
    // 2) load prior context (last N messages)
    const prior = await getMessages(userId, sessionId);

    // // Call the AI workflow function with the user query
    const aiResponse = await runAIControlledWorkflow({
      userQuery,
      dbType: "MySQL",
      otherDetails: otherDetailsPrompt,
      executeSQLQuery: executeSQLQuery,
      modelName: analyticsData.modelNale,
      authKey: process.env.GOOGLE_API_KEY,
      contextMessages: prior, // ✅ send context
      userId: req.requestor.id,
    });

    // 5) persist assistant final message to Redis (shortened if needed)

    const finalText =
      typeof aiResponse?.message === "string"
        ? aiResponse.message.text
        : JSON.stringify(aiResponse.message.text);

    const appendMsg = await appendMessage(userId, sessionId, {
      role: "model",
      text: finalText, // keep it sane; HTML can be long
    });

    res.status(200).send({
      status: "success",
      data: {
        aiResponse: {
          data: aiResponse.message.message,
          type: aiResponse.message.type,
        },
        sessionId,
      },
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
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
