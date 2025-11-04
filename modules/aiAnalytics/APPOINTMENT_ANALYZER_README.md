# Appointment Analyzer Function - Implementation Guide

## Overview

The appointment analyzer function has been created following the same pattern as the treatment analyzer. It provides comprehensive appointment analysis capabilities with proper date handling and status filtering.

## Files Created/Modified

### 1. **New File: `modules/aiAnalytics/analyzeAppointmentResolver.js`**

- Main appointment analysis logic
- Handles different analysis types
- Generates user-friendly summaries
- Supports date filtering and status filtering

### 2. **Modified: `modules/aiAnalytics/systemPrompt.js`**

- Added `appointmentAnalysisFunctionDeclaration` export
- Defines the function schema for AI to use

### 3. **Modified: `utils/aiWorkFlow.js`**

- Imported `analyzeAppointmentsResolver`
- Imported `appointmentAnalysisFunctionDeclaration`
- Added appointment function to tools array
- Added handler for `analyze_appointments` function calls

### 4. **Modified: `modules/aiAnalytics/systemPrompt.md`**

- Added appointment analysis rules
- Added date handling examples
- Added status mapping documentation

## Analysis Types Supported

### 1. `total_count`

Get total number of appointments

```javascript
{
  analysisType: "total_count";
}
```

### 2. `by_date`

Get appointments for a specific date

```javascript
{
  analysisType: "by_date",
  date: "2025-10-31"
}
```

### 3. `by_date_range`

Get appointments within a date range

```javascript
{
  analysisType: "by_date_range",
  startDate: "2025-10-01",
  endDate: "2025-10-31"
}
```

### 4. `by_status`

Get appointments by status

```javascript
{
  analysisType: "by_status",
  status: "upcoming" // or "completed", "canceled", "missed"
}
```

### 5. `by_clinic`

Get appointment breakdown by clinic

```javascript
{
  analysisType: "by_clinic";
}
```

### 6. `by_patient`

Get appointments for a specific patient

```javascript
{
  analysisType: "by_patient",
  patientId: 123
}
```

### 7. `list_appointments`

Get detailed list of appointments

```javascript
{
  analysisType: "list_appointments",
  limit: 50
}
```

## Status Types

- **scheduled/upcoming**: Future appointments (not canceled, not visited)
- **completed/visited**: Past appointments that were visited
- **canceled/cancelled**: Canceled appointments
- **missed**: Past appointments not visited and not canceled

## Example User Queries

### Simple Count Queries

- "How many appointments do I have today?"
- "Total appointments this month"
- "Appointments yesterday"

### Date Range Queries

- "Show me appointments this week"
- "Appointments in January 2025"
- "Appointments last month"

### Status Queries

- "How many upcoming appointments?"
- "Show completed appointments"
- "List all canceled appointments"
- "How many missed appointments this month?"

### Clinic-Based Queries

- "Which clinic has the most appointments?"
- "Appointment breakdown by clinic"

### Patient-Based Queries

- "How many appointments does patient ID 123 have?"
- "Show appointments for this patient"

## Date Handling

The AI automatically converts natural language date references to proper date parameters:

- **"today"** → `date: "2025-10-31"`
- **"yesterday"** → `date: "2025-10-30"`
- **"this month"** → `startDate: "2025-10-01"`, `endDate: "2025-10-31"`
- **"last month"** → `startDate: "2025-09-01"`, `endDate: "2025-09-30"`
- **"this year"** → `startDate: "2025-01-01"`, `endDate: "2025-12-31"`

## Security Features

All queries automatically include:

- User ID filtering (`userId = {{userId}}`)
- Clinic ID filtering when provided (`clinicId IN ({{clinicIdArray}})`)
- Soft delete filtering (`deletedAt IS NULL`)

## Response Format

The function returns structured data with:

- `success`: Boolean indicating if query succeeded
- `analysisType`: The type of analysis performed
- `data`: Array of results
- `summary`: User-friendly summary text
- `tableFormat`: Boolean indicating if data should be displayed as table

## Testing the Implementation

You can test with queries like:

1. **Simple count**: "How many appointments today?"
2. **Date range**: "Show appointments this month"
3. **Status filter**: "How many upcoming appointments?"
4. **Clinic breakdown**: "Appointments by clinic this year"
5. **Combined filters**: "Completed appointments this month at clinic 1"

## Integration with Existing System

The appointment analyzer integrates seamlessly with:

- Existing AI workflow
- Treatment analyzer (similar pattern)
- Database security (userId and clinicId filtering)
- Date context system (current date, month, year)

## Notes

- All date parameters use YYYY-MM-DD format
- The function automatically handles soft deletes
- Results are limited by default (100 for appointments vs 10 for treatments)
- User-friendly column names are used in output (no IDs, timestamps, etc.)
