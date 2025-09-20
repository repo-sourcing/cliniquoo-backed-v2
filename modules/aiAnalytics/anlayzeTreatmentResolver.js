// modules/aiAnalytics/analyzeTreatmentResolver.js

const treatmentSynonyms = {
  "root canal treatment": [
    "rct",
    "root canal",
    "root canal therapy",
    "endodontic treatment",
    "endodontic",
    "rct treatment",
    "ract",
  ],

  extraction: ["extract", "tooth extraction", "exo"],
  scaling: [
    "scaling",
    "cleaning",
    "scaling & polishing",
    "prophylaxis",
    "scale",
    "polish",
  ],
  crown: [
    "cap",
    "pfm crown",
    "zirconia crown",
    "metal crown",
    "ceramic crown",
    "caps",
  ],
  bridge: ["fixed partial denture", "fpd", "fixed bridge", "dental bridge"],
  filling: [
    "gic",
    "gic filling",
    "restoration",
    "composite filling",
    "tooth filling",
  ],
  "composite restoration": [
    "composite",
    "composite filling",
    "tooth colored filling",
    "white filling",
  ],
  "post and core": ["post", "post & core", "post core", "post-core"],
  disimpaction: ["impaction removal", "impaction", "disimpaction"],
  "orthodontic treatment": [
    "ortho",
    "braces",
    "aligner",
    "orthodontic",
    "ortho treatment",
  ],
  denture: [
    "complete denture",
    "partial denture",
    "removable denture",
    "false teeth",
  ],
  implant: [
    "dental implant",
    "implant surgery",
    "dental implants",
    "implant surgeries",
    "implants",
  ],
};

// Enhanced normalization function with better matching
const normalizeTreatmentName = treatmentName => {
  if (!treatmentName) return "Unknown Treatment";

  const name = treatmentName.toLowerCase().trim();

  // Check against synonyms with more flexible matching
  for (const [canonical, synonyms] of Object.entries(treatmentSynonyms)) {
    // Check if the treatment name contains the canonical name
    if (name.includes(canonical.toLowerCase().replace(" ", ""))) {
      return canonical
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    // Check against all synonyms
    for (const synonym of synonyms) {
      if (name.includes(synonym.toLowerCase())) {
        return canonical
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }
  }

  // Special handling for specific patterns
  if (name.includes("ract") || name.includes("rct") || name.includes("root")) {
    return "Root Canal Treatment";
  }

  // Check for wisdom tooth patterns - should be extraction
  if (name.includes("impaction") || name.includes("disimpaction")) {
    return "Extraction";
  }

  // Check for implant patterns - normalize all implant variations
  if (name.includes("implant")) {
    return "Implant";
  }

  // If no match found, return title case
  return treatmentName
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Function to extract tooth numbers and count multiplicity
const extractToothCount = treatmentName => {
  if (!treatmentName) return 1;

  // FDI tooth numbering pattern (11-48)
  const toothPattern = /\b([1-4][1-8])\b/g;
  const matches = treatmentName.match(toothPattern);

  if (matches) {
    const uniqueTeeth = [...new Set(matches)];
    return uniqueTeeth.length;
  }

  // Check for comma-separated numbers (like RCT-32,33)
  const commaPattern = /[-\s](\d+(?:[,\s]+\d+)+)/;
  const commaMatch = treatmentName.match(commaPattern);
  if (commaMatch) {
    const numbers = commaMatch[1].split(/[,\s]+/).filter(n => n.trim());
    return numbers.length;
  }

  // Check for single tooth number after dash/space
  const singleToothPattern = /[-\s](\d+)$/;
  const singleMatch = treatmentName.match(singleToothPattern);
  if (singleMatch) {
    return 1; // Single tooth
  }

  return 1; // Default to 1 if no tooth numbers found
};

// Enhanced search function for by_treatment_name
const findMatchingTreatments = (treatments, searchTerm) => {
  const searchLower = searchTerm.toLowerCase();

  return treatments.filter(treatment => {
    const originalName = treatment.treatment_name.toLowerCase();
    const normalizedName = treatment.normalized_treatment_name.toLowerCase();

    // Direct name match
    if (
      originalName.includes(searchLower) ||
      normalizedName.includes(searchLower)
    ) {
      return true;
    }

    // Check if search term matches any synonyms that would normalize to this treatment
    for (const [canonical, synonyms] of Object.entries(treatmentSynonyms)) {
      const canonicalLower = canonical.toLowerCase();

      // If search term matches canonical or synonyms
      if (
        searchLower.includes(canonicalLower) ||
        synonyms.some(syn => searchLower.includes(syn.toLowerCase()))
      ) {
        // And this treatment normalizes to the same canonical
        if (normalizedName.includes(canonicalLower)) {
          return true;
        }
      }

      // Reverse check: if treatment matches canonical/synonyms and search term is related
      if (
        originalName.includes(canonicalLower) ||
        synonyms.some(syn => originalName.includes(syn.toLowerCase()))
      ) {
        if (
          searchLower.includes(canonicalLower) ||
          synonyms.some(syn => searchLower.includes(syn.toLowerCase()))
        ) {
          return true;
        }
      }
    }

    return false;
  });
};

// User-friendly summary function
const generateUserFriendlySearchSummary = (searchTerm, totalCount) => {
  if (totalCount === 0) {
    return `No ${searchTerm} treatments found in your records.`;
  }

  if (totalCount === 1) {
    return `You have performed 1 ${searchTerm} treatment.`;
  }

  return `You have performed ${totalCount} ${searchTerm} treatments.`;
};

// Helper function to generate summary
const generateAnalysisSummary = (analysisType, results, treatmentName) => {
  switch (analysisType) {
    case "total_count":
      const totalTreatments = results.reduce(
        (sum, r) => sum + r.total_actual_count,
        0
      );
      return `You have performed a total of ${totalTreatments} treatments across ${results.length} different treatment types.`;

    case "by_treatment_name":
      if (results.length > 0) {
        const treatmentTotal = results.reduce(
          (sum, r) => sum + r.total_actual_count,
          0
        );
        return generateUserFriendlySearchSummary(treatmentName, treatmentTotal);
      }
      return `No ${treatmentName} treatments found in your records.`;

    case "most_common":
      if (results.length > 0) {
        return `The most commonly performed treatment is ${results[0].normalized_treatment_name}, with a total of ${results[0].total_actual_count} treatments.`;
      }
      return "No treatments found in your records.";

    case "least_common":
      if (results.length > 0) {
        return `The least commonly performed treatment is ${
          results[0].normalized_treatment_name
        }, with ${results[0].total_actual_count} treatment${
          results[0].total_actual_count === 1 ? "" : "s"
        }.`;
      }
      return "No treatments found in your records.";

    default:
      return `Analysis completed for ${results.length} results.`;
  }
};

// Main analysis function
exports.analyzeTreatmentsResolver = async ({
  analysisType,
  treatmentName,
  patientId,
  clinicId,
  startDate,
  endDate,
  limit = 10,
  userId,
  executeSQLQuery,
}) => {
  try {
    // Get all treatments
    const baseQuery = `
      SELECT 
        t.id,
        t.name as treatment_name,
        t.createdAt,
        p.name as patient_name,
        c.name as clinic_name
      FROM treatments t
      JOIN treatmentPlans tp ON t.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      JOIN clinics c ON tp.clinicId = c.id
      WHERE p.userId = ${userId}
        AND t.deletedAt IS NULL
        AND tp.deletedAt IS NULL
        AND p.deletedAt IS NULL
        AND c.deletedAt IS NULL
      ${startDate ? `AND DATE(t.createdAt) >= '${startDate}'` : ""}
      ${endDate ? `AND DATE(t.createdAt) <= '${endDate}'` : ""}
      ${patientId ? `AND p.id = ${patientId}` : ""}
      ${clinicId ? `AND c.id = ${clinicId}` : ""}
      ORDER BY t.createdAt DESC
    `;

    const queryResult = await executeSQLQuery(baseQuery);

    if (!queryResult.success) {
      throw new Error(`Query failed: ${queryResult.error}`);
    }

    const allTreatments = queryResult.data[0] || [];

    // Process each treatment with normalization and tooth counting
    const processedTreatments = allTreatments.map(treatment => {
      const normalizedName = normalizeTreatmentName(treatment.treatment_name);
      const toothCount = extractToothCount(treatment.treatment_name);

      return {
        ...treatment,
        normalized_treatment_name: normalizedName,
        tooth_count: toothCount,
        original_name: treatment.treatment_name,
      };
    });

    // Apply specific analysis type filtering BEFORE grouping
    let filteredTreatments = processedTreatments;

    if (analysisType === "by_treatment_name" && treatmentName) {
      filteredTreatments = findMatchingTreatments(
        processedTreatments,
        treatmentName
      );
    }

    // Group by normalized names and calculate counts
    const groupedResults = {};
    filteredTreatments.forEach(treatment => {
      const key = treatment.normalized_treatment_name;
      if (!groupedResults[key]) {
        groupedResults[key] = {
          normalized_treatment_name: key,
          total_actual_count: 0,
          total_raw_count: 0,
          variations: [],
          treatments: [],
        };
      }

      groupedResults[key].total_actual_count += treatment.tooth_count;
      groupedResults[key].total_raw_count += 1;
      groupedResults[key].treatments.push(treatment);

      // Track variations for debugging (not shown to user)
      if (
        !groupedResults[key].variations.some(
          v => v.name === treatment.original_name
        )
      ) {
        groupedResults[key].variations.push({
          name: treatment.original_name,
          count: treatment.tooth_count,
        });
      }
    });

    // Convert to array and apply sorting
    let finalResults = Object.values(groupedResults);

    switch (analysisType) {
      case "by_treatment_name":
        // For specific treatment search, return simple count only
        if (finalResults.length > 0) {
          const totalCount = finalResults.reduce(
            (sum, r) => sum + r.total_actual_count,
            0
          );

          return {
            success: true,
            analysisType,
            searchTerm: treatmentName,
            totalCount: totalCount,
            data: [],
            summary: generateUserFriendlySearchSummary(
              treatmentName,
              totalCount
            ),
            userFriendlyResponse: true,
            simpleResponse: true,
          };
        } else {
          return {
            success: true,
            analysisType,
            searchTerm: treatmentName,
            totalCount: 0,
            data: [],
            summary: `No ${treatmentName} treatments found in your records.`,
            userFriendlyResponse: true,
            simpleResponse: true,
            suggestion: getSuggestionForNoResults(treatmentName),
          };
        }

      case "most_common":
      case "least_common":
      case "total_count":
        finalResults.sort((a, b) =>
          analysisType === "least_common"
            ? a.total_actual_count - b.total_actual_count
            : b.total_actual_count - a.total_actual_count
        );

        // Return clean table data for listing - USER FRIENDLY COLUMNS
        const cleanResults = finalResults.slice(0, limit).map(result => ({
          treatment_name: result.normalized_treatment_name,
          total_treatments: result.total_actual_count,
          procedures_done: result.total_raw_count,
        }));

        return {
          success: true,
          analysisType,
          totalResults: finalResults.length,
          data: cleanResults,
          summary: generateAnalysisSummary(
            analysisType,
            finalResults,
            treatmentName
          ),
          tableFormat: true,
          userFriendlyTable: true,
        };
    }

    return {
      success: true,
      analysisType,
      totalResults: finalResults.length,
      data: finalResults.slice(0, limit),
      summary: generateAnalysisSummary(
        analysisType,
        finalResults,
        treatmentName
      ),
    };
  } catch (error) {
    console.error("Treatment analysis error:", error);
    return {
      success: false,
      error: error.message,
      analysisType,
    };
  }
};

// Helper function to suggest alternatives when no results found
const getSuggestionForNoResults = searchTerm => {
  const searchLower = searchTerm.toLowerCase();

  if (searchLower.includes("wisdom") || searchLower.includes("impaction")) {
    return "You may want to check for 'extraction' treatments.";
  }

  if (searchLower.includes("rct") || searchLower.includes("root canal")) {
    return "You may want to check for 'endodontic' treatments.";
  }

  if (searchLower.includes("crown") || searchLower.includes("cap")) {
    return "You may want to check for 'restoration' treatments.";
  }

  if (searchLower.includes("filling") || searchLower.includes("restoration")) {
    return "You may want to check for 'composite' or 'GIC' treatments.";
  }

  return "Try searching for similar treatment names or check your treatment list.";
};
