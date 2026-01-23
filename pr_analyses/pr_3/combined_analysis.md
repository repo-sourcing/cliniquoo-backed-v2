# PR #3: feat: Bulk Patient Import - CSV parsing with job tracking and clinic isolation

## Test to Issue Alignment

**Score: 2**

Claim-to-test coverage map:

1. CSV parsing (headline feature) - Source: helpers.js parseCSV - Test assertion: 'jest.mock('../helpers.js')' mocks parseCSV - Verdict: UNTESTED
2. Data transformation - Source: helpers.js transformPatientData - Test assertion: Mocked in all tests - Verdict: UNTESTED
3. Row validation - Source: helpers.js validatePatientRow - Test assertion: Mocked - Verdict: UNTESTED
4. Transaction handling in importPatients - Source: service.js importPatients with sequelize.transaction - Test assertion: 'jest.mock('../service.js')' mocks importPatients - Verdict: UNTESTED
5. Clinic isolation logic - Source: service.js findOne with clinicId where clause - Test assertion: Test checks 'expect(service.createImportJob).toHaveBeenCalledWith(1, ...)' but actual isolation logic in getJobById, importPatients duplicate check is mocked - Verdict: PARTIALLY TESTED
6. Job status tracking - Source: service.js updateJobStatus - Test assertion: 'expect(service.updateJobStatus).toHaveBeenCalledWith(1, 'processing')' - Verdict: PARTIALLY TESTED (mocked, not actual state machine)
7. Controller 6 handlers - Source: controller.js - Test assertion: All 6 handlers tested with mocked services - Verdict: TESTED

The 26 behavioral tests validate HTTP layer concerns (file size limits, status codes, pagination) but the core functional requirements from the issue headline (CSV parsing with transactions and clinic isolation) are only tested via mocks, not actual implementation. This matches rubric score 2: 'Core functional requirements are missed while tests cover peripheral concerns.'

---

## Test Discriminative Power

**Score: 2**

The test file contains 26 tests that exclusively test the controller layer with all dependencies (service, helpers, database) fully mocked. This creates significant gaps in discriminative power:

**Unverified Layers:**
1. **Service Layer**: Complex transaction logic (`importPatients`), clinic isolation enforcement, duplicate detection, error log truncation (first 100 errors), and job status transitions are completely untested. A service implementation that ignores transactions, fails to enforce clinic isolation, or doesn't check for duplicates would pass all tests.

2. **Helper Layer**: CSV parsing (`parseCSV`), data transformation (`transformPatientData`), validation (`validatePatientRow`), and success rate calculation are entirely mocked. A helper that parses CSV incorrectly, fails to validate email formats, or miscalculates success rates would pass all tests.

3. **Model Layer**: Database indexes, constraints, and schema definitions are untested.

**Specific Wrong Implementations That Pass:**
- Service that doesn't use database transactions (removes `sequelize.transaction()`)
- Service that queries without clinic isolation (removes `clinicId` from WHERE clauses)
- Service that doesn't check for duplicate patients
- Helper that returns empty array for any CSV input
- Helper validation that always returns `{isValid: true}`
- Helper that miscalculates success rates

**Tautological Assertions:**
Tests mock return values (e.g., `service.getJobStats.mockResolvedValue({successRate: '95.00'})`) then assert the response contains those exact values, creating tautological tests that verify mock wiring rather than actual logic.

**What Is Tested:**
Only controller HTTP status codes, parameter passing to mocks, and response structure formatting are verified. While this catches gross controller errors, it allows the core business logic (the complex parts of the PR) to be completely broken without detection.

---

## Gold Patch Clarity

**Score: 1**

The PR demonstrates excellent structural organization with clear separation of concerns: model.js handles data structure, service.js contains business logic with transactions, controller.js manages HTTP handlers, helpers.js provides utility functions, and validation.js defines schemas. The test file is comprehensive with 26 behavioral tests. However, the .env.example file includes configuration for unrelated features (REMINDER_SERVICE_ENABLED, REVENUE_CACHE_TTL) alongside the import-related settings, indicating minor scope creep. Additionally, routes/v1.js contains formatting changes (added trailing commas) unrelated to the feature functionality. The core implementation is clean and focused, but these extraneous changes prevent a perfect score.

---

## Gold Patch to Issue Alignment

**Score: 1**

The diff fully implements the requested bulk patient import feature: ImportJob model with status tracking, service methods (createImportJob, importPatients with transactions, getJobStats), helpers (parseCSV, transformPatientData, validatePatientRow), controller with 5 handlers (createImport, getImportJob, getImportJobs, getImportStats, deleteImport), csv-parse dependency, and approximately 26 behavioral tests covering validation, file handling, pagination, and business logic. Clinic isolation is properly enforced throughout. However, the patch includes unrelated configuration flags in .env.example for reminder and revenue features not mentioned in the issue, and adds trailing comma formatting changes to existing routes. Additionally, while IMPORT_CHUNK_SIZE and MAX_IMPORT_ROWS are defined in .env.example, the service does not actually implement chunking logic (rows are processed individually). The controller implements 5 handlers rather than the 6 mentioned in the issue description, though all required functionality appears covered.

---

## Test Clarity

**Score: 1**

The test file demonstrates good syntactic clarity with consistent Jest patterns, organized describe blocks for each controller method, and readable setup-action-assert structure. However, the 'Business Logic' describe block contains tests with ambitious names that imply validation of actual business rules (clinic isolation, row tracking, lifecycle transitions) but merely verify that mocked services receive correct parameters or return mocked values. For example, 'should enforce clinic isolation during import' only asserts that clinicId is passed to service.createImportJob, not that isolation is actually enforced. Similarly, 'should track total rows' validates that a mocked service response is formatted correctly, not that row counting logic works. This creates a gap between test name intent and actual validation scope that could mislead readers about true coverage. The heavy mocking strategy (services and helpers fully mocked) is clear in context but means tests validate controller delegation rather than end-to-end behavior.
