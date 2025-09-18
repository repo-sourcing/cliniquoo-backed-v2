//const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sequelize = require("../config/db");
const {
  generateSystemInstructionPrompt,
  analyticsData,
} = require("../modules/aiAnalytics/systemPrompt");

// Logging function that only prints when this.agentLog=1
exports.agentLog = (message, ...args) => {
  //if (process.env.this.agentLog === "1") {
  console.log(message, ...args);
  //  }
};

// Function declaration for the Gemini API
const sqlQueryFunctionDeclaration = {
  name: "execute_sql_query",
  description:
    "Execute a SELECT SQL query to retrieve data from the database. Only SELECT queries are allowed for security reasons.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "The SQL SELECT query to execute. Must be properly formatted for the database type being used.",
      },
      reason: {
        type: "string",
        description:
          "Brief explanation of why this query is needed to answer the user's question.",
      },
    },
    required: ["query", "reason"],
  },
};

// Generate system instruction based on database type
const generateSystemInstruction = (dbType, otherDetails, userId) => {
  return generateSystemInstructionPrompt(dbType, otherDetails, userId);
};

// Get model and system instruction (simplified approach)
const getModelAndSystemInstruction = ({
  dbType,
  otherDetails,
  modelName,
  authKey,
  userId,
}) => {
  this.agentLog("modelName", modelName);
  const genAI = new GoogleGenerativeAI(authKey);
  const model = genAI.getGenerativeModel({
    model: modelName, // Using the updated model
    tools: [
      {
        functionDeclarations: [sqlQueryFunctionDeclaration],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  });

  const systemInstruction = generateSystemInstruction(
    dbType,
    otherDetails,
    userId
  );

  return {
    model,
    instruction: systemInstruction,
  };
};

// Process function calls and execute SQL queries
const processFunctionCall = async (
  functionCall,
  executeSQLQuery,
  toolCallId
) => {
  const { name, args } = functionCall;

  if (name === "execute_sql_query") {
    this.agentLog(`🔍 Executing SQL query: ${args.query}`);
    this.agentLog(`💭 Reason: ${args.reason}`);

    const result = await executeSQLQuery(args.query);
    this.agentLog(`📊 Query result:`, {
      success: result.success,
      rowCount: result.rowCount || 0,
      hasError: !!result.error,
      dataPreview:
        result.success && result.data
          ? `${result.data.length} rows`
          : result.error || "No data",
    });

    return {
      tool_call_id: toolCallId,
      name: name,
      response: {
        result: result,
      },
    };
  }

  throw new Error(`Unknown function: ${name}`);
};

// Helper function to clean text from context messages
const cleanContextText = text => {
  if (!text) return "";

  // Remove excessive quotes and escape characters
  let cleaned = text.replace(/^["']+|["']+$/g, ""); // Remove leading/trailing quotes
  cleaned = cleaned.replace(/\\n/g, "\n"); // Convert \\n to actual newlines
  cleaned = cleaned.replace(/\\"/g, '"'); // Convert \" to "
  cleaned = cleaned.replace(/\\\\/g, "\\"); // Convert \\\\ to \\

  return cleaned.trim();
};

// Main workflow function with context caching optimization
exports.runAIControlledWorkflow = async ({
  userQuery,
  dbType = "MySQL",
  otherDetails = "",
  executeSQLQuery,
  modelName,
  authKey,
  contextMessages = [], // ✅ NEW
  userId,
}) => {
  if (!userQuery) {
    queryAgentNamespace.to(socketId).emit("response", {
      status: "failed",
      message: "User query is required",
    });
    return;
  }

  try {
    // Get model and system instruction
    const { model, instruction } = getModelAndSystemInstruction({
      dbType,
      otherDetails,
      modelName,
      authKey,
      userId,
    });

    // Start conversation with system instruction
    let contents = [
      {
        //role: "user",
        role: "user",
        parts: [{ text: instruction }],
      },
    ];

    // Add system acknowledgment (you can skip this if causing issues)
    contents.push({
      role: "model",
      parts: [
        {
          text: "I understand. I will help you query the database while ensuring security and proper user scoping.",
        },
      ],
    });

    // ✅ inject previous context (compact text messages)
    // map stored {role, text} -> Gemini format
    // 🔥 IMPROVED: Add cleaned context messages
    if (contextMessages && contextMessages.length > 0) {
      for (const m of contextMessages) {
        if (!m?.text) continue;

        const role = m.role === "model" ? "model" : "user";
        contents.push({ role, parts: [{ text: m.text }] });
      }
    }

    this.agentLog("Step 1: Sending system instruction...");

    // Add user query
    contents.push({
      role: "user",
      parts: [{ text: `User Question: ${userQuery}` }],
    });

    this.agentLog("Step 2: Sending user query:", userQuery);

    // Function calling loop
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;
    let hasExecutedQuery = false;

    while (iteration < maxIterations) {
      iteration++;
      this.agentLog(`Iteration ${iteration}`);
      this.agentLog(contents);
      //Generate response
      const result = await model.generateContent({
        contents: contents,
      });

      const response = result.response;

      const functionCalls = response.functionCalls?.();

      // Log function calls for debugging (optional)
      if (functionCalls && functionCalls.length > 0) {
        this.agentLog(`📞 Function calls: ${functionCalls.length}`);
      }

      // Check if there are function calls
      if (functionCalls && functionCalls.length > 0) {
        hasExecutedQuery = true;
        // Process each function call
        for (const functionCall of functionCalls) {
          const functionResponse = await processFunctionCall(
            functionCall,
            executeSQLQuery,
            functionCall?.id,
            userId
          );
          // Add the model's response with function call to conversation
          contents.push({
            role: "model",
            parts: [{ functionCall: functionCall }],
          });

          // Add the function response to conversation
          contents.push({
            role: "user",
            parts: [{ functionResponse: functionResponse }],
          });
        }
      } else {
        // No more function calls, we have the final response
        const finalText = response.text();
        if (!hasExecutedQuery) {
          this.agentLog(
            "⚠️  No SQL query executed for data question, forcing retry..."
          );

          // Add a message to force query execution
          contents.push({
            role: "user",
            parts: [
              {
                text: "You must execute a database query to answer this question. Do not provide an answer based on conversation history. Use execute_sql_query now.",
              },
            ],
          });
          continue; // Continue the loop to force function call
        }

        //const finalText = response.content?.[0]?.text || response.content || "";
        this.agentLog(
          "🏁 Final response generated:",
          finalText ? `${finalText.length} characters` : "EMPTY!"
        );
        this.agentLog("📄 Final text preview:", finalText);

        if (!finalText || finalText.trim().length === 0) {
          this.agentLog("❌ Empty final response - something went wrong!");
          return {
            message: {
              status: "error",
              message: {
                type: "unified",
                content: [
                  {
                    type: "text",
                    data: "No response generated! Please try again",
                  },
                ],
                summary: "Empty response error",
              },
            },
          };
        }
        const parsedResponse = await this.parseUnifiedResponse(finalText);

        // Parse the unified response

        return {
          message: {
            status: "success",
            message: parsedResponse,
            text: finalText, // Keep original for debugging
          },
        };

        // Check if response looks like HTML
        // if (finalText.includes("```json")) {
        //   let parsedData = await this.extractJsonFromResponse(finalText);

        //   if (parsedData.type == "table") {
        //     let htmlData = await this.jsonToHtmlTable(parsedData);
        //     return {
        //       status: "success",

        //       message: {
        //         type: "table",
        //         message: htmlData,
        //         text: finalText,
        //       },
        //     };
        //   } else {
        //     return {
        //       status: "success",
        //       message: {
        //         type: parsedData.type,
        //         message: parsedData,
        //         text: finalText,
        //       },
        //     };
        //   }
        // } else if (finalText.includes("<") && finalText.includes(">")) {
        //   return {
        //     status: "success",
        //     message: { type: "html", message: finalText, text: finalText },
        //   };
        // } else {
        //   // Wrap in basic HTML structure
        //   //const htmlResponse = finalText.replace(/\n/g, "<br>");
        //   let htmlResponse = finalText;

        //   return {
        //     status: "success",
        //     message: {
        //       type: "plainText",
        //       message: htmlResponse,
        //       text: finalText,
        //     },
        //   };
        // }
      }
    }

    // If we reach max iterations, return what we have
    return {
      message: {
        status: "error",
        message: {
          type: "unified",
          content: [
            {
              type: "text",
              data:
                error?.message ||
                "Reached maximum iterations without final response",
            },
          ],
          summary: "Processing error",
        },
      },
    };
  } catch (error) {
    this.agentLog("Error in AI workflow:", error);

    return {
      message: {
        status: "error",
        message: {
          type: "unified",
          content: [
            {
              type: "text",
              data: error?.message || "No Data found! Please try again",
            },
          ],
          summary: "Processing error",
        },
      },
    };
  }
};

exports.executeSQLQuery = async query => {
  try {
    // Security check: Only allow read operations (using regex for whole word matching)
    const dangerousKeywords = [
      "update",
      "delete",
      "insert",
      "drop",
      "create",
      "alter",
      "truncate",
      "grant",
      "revoke",
      "execute",
      "call",
    ];
    // Use regex with word boundaries to match whole words only
    const dangerousPattern = new RegExp(
      `\\b(${dangerousKeywords.join("|")})\\b`,
      "i"
    );
    if (dangerousPattern.test(query)) {
      const match = query.match(dangerousPattern);
      throw new Error(
        `Only SELECT queries are allowed for security reasons. Found prohibited keyword: "${match[0]}"`
      );
    }
    //apply the query

    const results = await sequelize.query(query);
    let finalResults = "";
    if (
      query.includes("SELECT table_name FROM information_schema.tables WHERE")
    ) {
      finalResults = results;
    } else {
      finalResults = results;
      //finalResults = simplifySQLResult(results);
    }

    return {
      success: true,
      data: finalResults,
      rowCount: Array.isArray(finalResults) ? finalResults.length : 0,
      query: query,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    return {
      success: false,
      error: error.message,
      query: query,
    };
  }
};

exports.summarizeConversation = async messages => {
  // You can use Gemini itself to create summaries

  const formatted = messages
    .filter(m => m && (m.role === "user" || m.role === "model"))
    .map(m => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n");
  const prompt = `
Summarize the following conversation between user and assistant.
- Only include the user's key questions and the assistant's key answers.
- Keep it under 5 sentences.
- Do not include formatting like **bold** or bullet points.
Conversation:
${formatted}
  `;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: analyticsData.modelNale, // Using the updated model

    generationConfig: {
      temperature: 0.1,
    },
  });

  const resp = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  return resp.response.candidates[0].content.parts[0].text;
};

exports.extractJsonFromResponse = async aiResponse => {
  if (!aiResponse || typeof aiResponse !== "string") {
    return null;
  }

  // Match JSON inside ```json ... ```
  const match = aiResponse.match(/```json([\s\S]*?)```/);
  let jsonText = match ? match[1].trim() : aiResponse.trim();

  try {
    // Parse clean JSON
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (err) {
    console.error("❌ Failed to parse JSON from AI response:", err);
    return null;
  }
};

exports.jsonToHtmlTable = async jsonStr => {
  try {
    // Parse JSON string into an object
    // const data = JSON.parse(jsonStr);
    let data = jsonStr;
    if (!data.type || data.type !== "table") {
      throw new Error("Invalid JSON: type must be 'table'");
    }
    const { columns, rows } = data;
    // Start building HTML table
    let html = "<table border='1' cellspacing='0' cellpadding='5'>";
    // Add table header
    html += "<thead><tr>";
    columns.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += "</tr></thead>";
    // Add table rows
    html += "<tbody>";
    rows.forEach(row => {
      html += "<tr>";
      row.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody>";
    html += "</table>";
    return html;
  } catch (error) {
    console.error("Error parsing JSON:", error.message);
    return "<p>Invalid table data</p>";
  }
};

exports.parseUnifiedResponse = async aiResponse => {
  if (!aiResponse || typeof aiResponse !== "string") {
    return {
      type: "unified",
      content: [{ type: "text", data: "No response received" }],
      summary: "Empty response",
    };
  }

  const contentBlocks = [];
  let workingText = aiResponse;

  // 1. Extract and parse JSON blocks (tables/charts)
  const jsonMatches = workingText.matchAll(/```json([\s\S]*?)```/g);
  for (const match of jsonMatches) {
    try {
      const jsonData = JSON.parse(match[1].trim());

      if (jsonData.type === "table") {
        let htmlData = await this.jsonToHtmlTable(jsonData);

        contentBlocks.push({
          type: "table",
          data: htmlData,
        });
      } else if (jsonData.type === "chart") {
        contentBlocks.push({
          type: "chart",
          data: jsonData,
        });
      } else {
        contentBlocks.push({
          type: "data",
          data: jsonData,
        });
      }

      // Remove processed JSON from working text
      workingText = workingText.replace(match[0], "");
    } catch (err) {
      console.error("Failed to parse JSON block:", err);
      // Keep as text if JSON parsing fails
      contentBlocks.push({
        type: "text",
        data: `\`\`\`json\n${match[1].trim()}\n\`\`\``,
      });
      workingText = workingText.replace(match[0], "");
    }
  }

  // 2. Extract HTML blocks
  const htmlMatches = workingText.matchAll(/```html([\s\S]*?)```/g);
  for (const match of htmlMatches) {
    contentBlocks.push({
      type: "html",
      data: match[1].trim(),
    });
    workingText = workingText.replace(match[0], "");
  }

  // 3. Extract remaining text content
  const cleanText = workingText
    .replace(/```[\s\S]*?```/g, "") // Remove any remaining code blocks
    .trim();

  if (cleanText && cleanText.length > 0) {
    // Split by double newlines to create paragraphs
    const paragraphs = cleanText
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0)
      .map(p => p.trim());

    if (paragraphs.length > 0) {
      contentBlocks.unshift({
        type: "text",
        data: paragraphs.join("\n\n"),
      });
    }
  }

  // 4. Generate summary
  const summary = generateResponseSummary(contentBlocks);

  return {
    type: "unified",
    content:
      contentBlocks.length > 0
        ? contentBlocks
        : [{ type: "text", data: "No content could be parsed" }],
    summary,
  };
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const generateResponseSummary = contentBlocks => {
  const types = contentBlocks.map(block => block.type);
  const uniqueTypes = [...new Set(types)];

  if (uniqueTypes.length === 1 && uniqueTypes[0] === "text") {
    return "Text response";
  } else if (uniqueTypes.includes("table") && uniqueTypes.includes("text")) {
    return "Analysis with data table";
  } else if (uniqueTypes.includes("chart") && uniqueTypes.includes("text")) {
    return "Analysis with chart visualization";
  } else if (uniqueTypes.includes("table") && uniqueTypes.includes("chart")) {
    return "Data analysis with table and chart";
  } else if (uniqueTypes.includes("table")) {
    return "Data table";
  } else if (uniqueTypes.includes("chart")) {
    return "Chart visualization";
  } else {
    return `Mixed content: ${uniqueTypes.join(", ")}`;
  }
};
