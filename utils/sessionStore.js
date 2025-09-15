// utils/sessionStore.js
const { v4: uuidv4 } = require("uuid");

const redisClient = require("./redis");
const { summarizeConversation } = require("./aiWorkFlow");

const TTL = parseInt(process.env.SESSION_TTL_SECONDS || "86", 10);
const MAX = parseInt(process.env.SESSION_MAX_MESSAGES || "40", 10);
const SUMMARY_EXP = parseInt(process.env.SESSION_EXP || "86", 10);
const SUMMARY_LIMIT = parseInt(process.env.SUMMARY_LIMIT || "6", 10);
const SUMMARY_BUFFER = 4; // how many raw messages we keep after summary
const INITIAL_BUFFER = 4; // first batch before first summary

const keyForList = (userId, sessionId) =>
  `ai:session:${userId}:${sessionId}:msgs`;
function keyForSummary(userId, sessionId) {
  return `ai:session:${userId}:${sessionId}:summary`;
}

async function createSession(userId) {
  const sessionId = uuidv4();
  // initialize meta
  const listKey = keyForList(userId, sessionId);
  await redisClient.expire(listKey, TTL);
  return sessionId;
}

async function sessionExists(userId, sessionId) {
  return (await redisClient.exists(keyForList(userId, sessionId))) === 1;
}

async function appendMessage(userId, sessionId, msg) {
  const listKey = keyForList(userId, sessionId);
  const summaryKey = keyForSummary(userId, sessionId);

  // Save new message
  const payload = JSON.stringify({
    role: msg.role,
    text: msg.text || "",
    ts: msg.ts || Date.now(),
  });
  await redisClient.rPush(listKey, payload);

  const len = await redisClient.lLen(listKey);
  const summaryExists = await redisClient.exists(summaryKey);

  // --- CASE 1: Create FIRST summary ---
  if (!summaryExists && len > INITIAL_BUFFER) {
    console.log("Creating first summary...");
    const oldMsgs = await redisClient.lRange(listKey, 0, INITIAL_BUFFER - 1);
    const summaryText = await summarizeConversation(oldMsgs.map(JSON.parse));

    await redisClient.set(summaryKey, summaryText, "EX", SUMMARY_EXP);

    // Trim → keep only messages after the initial buffer
    await redisClient.lTrim(listKey, INITIAL_BUFFER, -1);

    await redisClient.expire(listKey, TTL);

    return;
  }

  // --- CASE 2: Rolling summaries ---
  if (summaryExists && len > SUMMARY_BUFFER) {
    console.log("Creating rolling summary...");
    const oldMsgs = await redisClient.lRange(listKey, 0, len - 1);
    const summaryText = await summarizeConversation(oldMsgs.map(JSON.parse));

    const prevSummary = (await redisClient.get(summaryKey)) || "";
    const newSummary = prevSummary
      ? prevSummary + "\n" + summaryText
      : summaryText;

    await redisClient.set(summaryKey, newSummary, "EX", SUMMARY_EXP);

    // Trim messages but preserve TTL

    await redisClient.lTrim(listKey, INITIAL_BUFFER, -1);

    await redisClient.expire(listKey, currentTTL);
  }
}

async function getMessages(userId, sessionId) {
  const listKey = keyForList(userId, sessionId);

  const rows = await redisClient.lRange(listKey, 0, -1);

  const msgs = rows
    .map(r => {
      try {
        return JSON.parse(r);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // prepend summary if exists
  const summaryKey = keyForSummary(userId, sessionId);
  const summary = await redisClient.get(summaryKey);
  if (summary) {
    msgs.unshift({
      role: "system",
      text: `Conversation so far (summary):\n${summary}`,
      ts: Date.now(),
    });
  }

  return msgs;
}

module.exports = {
  createSession,
  sessionExists,
  appendMessage,
  getMessages,
};
