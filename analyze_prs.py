#!/usr/bin/env python3
"""
SWE-Bench+ PR Quality Analysis Script

Analyzes each merged PR individually using the Claude CLI.
Each scoring category runs as a separate Claude call with its own
context window, keeping focus tight and results consistent.

Run via the wrapper:  ./analyze [OPTIONS]
Or directly:          python3 analyze_prs.py [OPTIONS]
"""

import argparse
import json
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent
ANALYSES_DIR = REPO_ROOT / "pr_analyses"
MAX_CLAUDE_TIMEOUT = 1200  # 20 minutes per category call (increased from 10)
MAX_RETRIES = 5  # Increased from 3 for better resilience
DOCKER_BUILD_TIMEOUT = 300  # 5 minutes for docker build

CSV_HEADER = (
    '"PR","Title",'
    '"Test to Issue Alignment Score","Test to Issue Alignment Reason",'
    '"Test Discriminative Power Score","Test Discriminative Power Reason",'
    '"Gold Patch Clarity Score","Gold Patch Clarity Reason",'
    '"Gold Patch to Issue Alignment Score","Gold Patch to Issue Alignment Reason",'
    '"Test Clarity Score","Test Clarity Reason"'
)

# ---------------------------------------------------------------------------
# Shared preamble included in every category prompt
# ---------------------------------------------------------------------------

INTEGRITY_RULES = r"""
### Scoring Integrity Rules

1. **Scores must match your findings.** If your analysis identifies a problem;
   the score MUST reflect it. Never describe a problem then give a good score.
2. **Do not rationalize weaknesses away.** If code exists and is untested; that is a gap.
3. **High test count != high quality.** 20 trivial tests < 3 tests on real logic branches.
4. **Import-only F2P is the minimum bar; not a quality signal.** Every new-file PR
   trivially satisfies this. Do not treat it as evidence of good tests.
5. **A score of 0 means ZERO issues found.** Any issue found means score >= 1.
6. **try/catch fallback paths count.** Untested catch paths are untested layers.
"""

# ---------------------------------------------------------------------------
# Per-category rubrics
# ---------------------------------------------------------------------------

RUBRIC_TEST_ISSUE_ALIGNMENT = r"""
### Category: Test to Issue Alignment (0-3)

Does the test suite verify what the ISSUE asks for?

**Key question:** "If I gave this issue to a SWE-Bench agent and it produced a
correct solution; would these tests confirm it solved the right problem?"

**Scoring:**

- 0: Tests cover every single function and requirement mentioned in the issue
     acceptance criteria. Every utility; endpoint; or feature requested has
     extensive test cases for both valid and invalid inputs; including specific
     options/parameters mentioned in the issue. No headline feature is untested.
     The coverage map must show ZERO "UNTESTED" verdicts.
- 1: Tests cover existence and basic functionality of all required modules/functions;
     but miss integration between components (e.g. module A uses module B but no test
     verifies that wiring) or test modules only in isolation. All headline features
     have at least basic testing; gaps are limited to cross-module integration or
     secondary edge cases.
- 2: Tests only partially validate the issue. Core functional requirements are missed
     while tests cover peripheral concerns. Examples: tests validate DTO changes but
     miss testing the actual filtering/query logic; tests check that new controller
     and service are defined but skip CRUD operations; entity relationships; and query
     services; OR the test suite is significantly over-scoped with tests for features
     not mentioned in the issue (analytics; devices; feedback) while missing requested
     features.
- 3: Tests completely fail to validate core functional requirements. They only confirm
     structural aspects like method existence; class instantiation; or property
     assignment. Examples: issue requests a "complete Asset Management system" but tests
     only verify DTO classes exist; issue requires CRUD operations and cascade delete
     but tests only include toBeDefined() checks; issue asks for work entry management
     but tests only verify controller methods exist on the prototype; tests are
     completely unrelated (issue requests logging but tests cover caching); or the test
     diff deletes existing tests rather than adding ones for the requested feature.

**IMPORTANT:** Headline claims (words in the PR title) have extra weight.
If the title names a feature and ZERO tests exercise it; score >= 2.

### Analysis Steps

1. **Extract every claim** from the issue. Number them. Pay special attention
   to the PR TITLE -- words in the title are headline claims.

2. **Read the diff.** For each test function; identify what it actually asserts.

3. **Build a claim-to-test coverage map:**

| # | Claim from issue | Source code feature | Test assertion(s) that validate it | Verdict |
|---|-----------------|--------------------|------------------------------------|---------|
| 1 | ...             | ...                | (quote the assert or "NONE")       | Covered / UNTESTED |

4. **Score.** Count UNTESTED verdicts. If any headline claim is UNTESTED; score >= 2.

### Output

Respond with ONLY valid JSON (no markdown fences):
{"score": <0-3>, "reason": "<one sentence; use semicolons not commas>", "analysis": "<your full analysis>"}
"""

RUBRIC_TEST_DISCRIMINATIVE_POWER = r"""
### Category: Test Discriminative Power (0-3)

Can the tests reject wrong solutions and accept correct ones?

**Scoring:**

- 0: Tests reject all meaningfully wrong implementations. Hard to pass without
     a correct solution. You cannot construct a single wrong implementation that passes.
- 1: Tests reject most wrong implementations for core features; but 1-2 minor
     wrong behaviors slip through (untested parameters; missing edge cases).
- 2: 3+ wrong implementations pass; or an entire code layer is unverified.
     Examples: DB mocked so wrong queries pass; only toBeDefined/assertIsNotNone
     on key return values; whitelist logic never tested for exclusion.
- 3: Tests accept virtually any implementation. A stub returning hardcoded values passes.

### Analysis Steps

1. **For each key function/feature in the diff;** construct a specific
   WRONG implementation and trace it through the test assertions.

2. **Build a wrong-implementation table:**

| Wrong implementation | Which test catches it? | Result |
|---------------------|----------------------|--------|
| e.g. "hardcode return 42" | test_add(2;3) expects 5 | CAUGHT |
| e.g. "skip validation" | (no test checks invalid input) | PASSES |

3. **Check for tautological assertions:**
   - Mock returns value X; test asserts result == X (always passes regardless of logic)
   - Test checks len(x) == 1 against mock returning 1 item
   - Truthy-only checks (assertTrue; assertIsNotNone; toBeDefined) without value validation
   - Inclusion without exclusion checks (filter could be a no-op)

4. **Score.** Count "PASSES" rows. 0 = score 0. 1-2 minor = score 1. 3+ = score 2.

### Output

Respond with ONLY valid JSON (no markdown fences):
{"score": <0-3>, "reason": "<one sentence; use semicolons not commas>", "analysis": "<your full analysis>"}
"""

RUBRIC_GOLD_PATCH_CLARITY = r"""
### Category: Gold Patch Clarity (0-3)

How clear and well-structured is the diff?

**Scoring:**

- 0: Clean; focused; well-structured code with clear separation of concerns
- 1: Mostly clear but minor issues (e.g. small unrelated files included)
- 2: Somewhat confusing -- mixed concerns; unclear scope
- 3: Unclear -- mixed deployment/debug files; abandoned work; hard to understand intent

### Output

Respond with ONLY valid JSON (no markdown fences):
{"score": <0-3>, "reason": "<one sentence; use semicolons not commas>", "analysis": "<your full analysis>"}
"""

RUBRIC_GOLD_PATCH_ALIGNMENT = r"""
### Category: Gold Patch to Issue Alignment (0-3)

Does the diff implement what the issue describes?

**Scoring:**

- 0: Patch perfectly and completely addresses all aspects of the issue. Every
     requested feature; entity; relationship; endpoint; and business logic is
     implemented with no unrelated changes and no functional bugs.
- 1: Patch addresses almost all requirements but includes minor unrelated changes.
     Examples: a config flag like `synchronize: true` is changed when not requested;
     a small extra field is added beyond what was asked for. Core functionality is
     fully implemented.
- 2: Patch implements core features but misses explicitly stated requirements OR
     includes significant unrelated changes making it non-atomic. Examples: issue
     explicitly requires unit tests but patch omits them; issue requests cascade
     delete but it is not implemented; patch adds numerous unrelated modules/entities
     alongside the requested feature (e.g. adding SessionSummary; CourseSummary;
     BookSummary when only SkillTopic was requested).
- 3: Patch significantly deviates from the issue. Examples: search functionality
     misses explicitly requested fields (like "category name") while adding unrequested
     ones (like "purchasePrice"); required features (like "recently added assets") are
     entirely missing; OR the patch is mostly unrelated to the issue description.

### Analysis Steps

1. Extract every requirement from the issue.
2. For each requirement; check whether the diff implements it.
3. Check for unrelated changes not mentioned in the issue.
4. Check for functional bugs in the implementation.

### Output

Respond with ONLY valid JSON (no markdown fences):
{"score": <0-3>, "reason": "<one sentence; use semicolons not commas>", "analysis": "<your full analysis>"}
"""

RUBRIC_TEST_CLARITY = r"""
### Category: Test Clarity (0-3)

How clear and understandable are the tests?

**Scoring:**

- 0: Tests are self-documenting; clear setup-action-assert pattern; easy to verify.
     Even if tests are minimal (e.g. only toBeDefined checks); their limited scope
     and intent is immediately obvious. Well-named describe/test blocks.
- 1: Tests are syntactically clear and readable but their scope is trivially narrow
     in a way that could be initially misleading. Examples: test names suggest
     comprehensive coverage but bodies only check property assignment; slightly
     unusual mocking patterns that are understandable in context.
- 2: Mix of clear and unclear tests. Examples: newly added DTO validation tests are
     well-structured; but existing functional tests in a spec file have been gutted
     and replaced with basic existence checks; making the overall test suite vague
     about what it actually validates for core functionality.
- 3: Tests are confusing or their intent is unclear

### Output

Respond with ONLY valid JSON (no markdown fences):
{"score": <0-3>, "reason": "<one sentence; use semicolons not commas>", "analysis": "<your full analysis>"}
"""

# Ordered list of categories to evaluate
CATEGORIES = [
    {"key": "test_issue_alignment",       "name": "Test to Issue Alignment",       "rubric": RUBRIC_TEST_ISSUE_ALIGNMENT},
    {"key": "test_discriminative_power",  "name": "Test Discriminative Power",     "rubric": RUBRIC_TEST_DISCRIMINATIVE_POWER},
    {"key": "gold_patch_clarity",         "name": "Gold Patch Clarity",            "rubric": RUBRIC_GOLD_PATCH_CLARITY},
    {"key": "gold_patch_alignment",       "name": "Gold Patch to Issue Alignment", "rubric": RUBRIC_GOLD_PATCH_ALIGNMENT},
    {"key": "test_clarity",               "name": "Test Clarity",                  "rubric": RUBRIC_TEST_CLARITY},
]


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def get_merged_prs() -> list[dict]:
    """Fetch all merged PRs from the repo."""
    result = subprocess.run(
        ["gh", "pr", "list", "--state", "closed",
         "--json", "number,title,body,mergedAt,headRefName,mergeCommit"],
        capture_output=True, text=True, check=True,
    )
    prs = json.loads(result.stdout)
    merged = [pr for pr in prs if pr["mergedAt"] is not None]
    merged.sort(key=lambda x: x["number"])
    return merged


def fetch_pr_diff(pr_number: int) -> str:
    """Fetch the full diff for a PR via gh CLI."""
    result = subprocess.run(
        ["gh", "pr", "diff", str(pr_number)],
        capture_output=True, text=True, check=True,
        cwd=str(REPO_ROOT),
    )
    return result.stdout


def fetch_pr_files(pr_number: int) -> list[dict]:
    """Fetch the list of changed files with their status (added/modified/removed)."""
    result = subprocess.run(
        ["gh", "pr", "view", str(pr_number),
         "--json", "files"],
        capture_output=True, text=True, check=True,
        cwd=str(REPO_ROOT),
    )
    data = json.loads(result.stdout)
    return data.get("files", [])


def get_file_list(files: list[dict]) -> list[str]:
    """Extract file paths from the gh file list."""
    return [f.get("path", "") for f in files]


# ---------------------------------------------------------------------------
# Docker build check
# ---------------------------------------------------------------------------

def _get_current_branch() -> str:
    """Return current branch name or HEAD commit if detached."""
    result = subprocess.run(
        ["git", "symbolic-ref", "--short", "HEAD"],
        capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    if result.returncode == 0:
        return result.stdout.strip()
    # Detached HEAD — return the commit hash
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        capture_output=True, text=True, check=True, cwd=str(REPO_ROOT),
    )
    return result.stdout.strip()


def _restore_branch(original_branch: str) -> None:
    """Force-checkout back to the original branch.

    Uses -f because the docker check may leave behind files pulled from
    main (Dockerfile, deps) that make the tree dirty. Untracked files
    (analyze_prs.py, etc.) are untouched by checkout.
    """
    subprocess.run(
        ["git", "checkout", "-f", original_branch],
        capture_output=True, text=True, check=True, cwd=str(REPO_ROOT),
    )


def check_docker_build(pr: dict) -> dict:
    """
    Check out the repo at the PR's merge commit and attempt a docker build.

    Since these are already-merged PRs, their merge commit is in the history
    of main. Checking it out gives us the exact repo state right after the PR
    landed — Dockerfile, local deps, and all.

    Returns a dict with:
      - "status": "pass" | "fail" | "missing_dockerfile" | "error"
      - "message": human-readable explanation
    """
    pr_number = pr["number"]
    label = f"PR #{pr_number}"
    merge_commit = (pr.get("mergeCommit") or {}).get("oid", "")

    print(f"  [{label}] Checking Docker build...")

    if not merge_commit:
        msg = "No merge commit SHA available for this PR"
        print(f"  [{label}] ERROR: {msg}")
        return {"status": "error", "message": msg}

    print(f"  [{label}] Fetching merge commit {merge_commit[:8]}...")
    fetch_result = subprocess.run(
        ["git", "fetch", "origin", merge_commit],
        capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    if fetch_result.returncode != 0:
        msg = f"Could not fetch merge commit: {fetch_result.stderr.strip()}"
        print(f"  [{label}] ERROR: {msg}")
        return {"status": "error", "message": msg}

    original_branch = _get_current_branch()

    try:
        print(f"  [{label}] Checking out merge commit {merge_commit[:8]}...")
        checkout_result = subprocess.run(
            ["git", "checkout", merge_commit],
            capture_output=True, text=True, cwd=str(REPO_ROOT),
        )
        if checkout_result.returncode != 0:
            msg = f"Could not checkout merge commit: {checkout_result.stderr.strip()}"
            print(f"  [{label}] ERROR: {msg}")
            return {"status": "error", "message": msg}

        # Pull Dockerfile and any COPY/ADD targets from main if missing
        dockerfile_path = REPO_ROOT / "Dockerfile"
        pulled_from_main: list[str] = []

        # Ensure Dockerfile is present
        if not dockerfile_path.exists():
            result = subprocess.run(
                ["git", "checkout", original_branch, "--", "Dockerfile"],
                capture_output=True, text=True, cwd=str(REPO_ROOT),
            )
            if result.returncode != 0:
                print(f"  [{label}] MISSING: No Dockerfile in repo at all")
                return {"status": "missing_dockerfile",
                        "message": "No Dockerfile found in repo"}
            pulled_from_main.append("Dockerfile")
            print(f"  [{label}] No Dockerfile at this commit — pulled from {original_branch}")

        # Parse COPY/ADD sources from the Dockerfile and pull missing ones
        dockerfile_text = dockerfile_path.read_text()
        for line in dockerfile_text.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            # Match COPY/ADD <src> [<src>...] <dest> (ignore --from=... stages)
            match = re.match(r"^(?:COPY|ADD)\s+(?!--from)", stripped, re.IGNORECASE)
            if not match:
                continue
            parts = stripped.split()
            # sources are all parts except the command and the last (dest)
            sources = parts[1:-1]
            for src in sources:
                # Skip wildcards and relative current-dir refs
                if "*" in src or src in (".", "./"):
                    continue
                src_path = REPO_ROOT / src
                if not src_path.exists():
                    checkout_result = subprocess.run(
                        ["git", "checkout", original_branch, "--", src],
                        capture_output=True, text=True, cwd=str(REPO_ROOT),
                    )
                    if checkout_result.returncode == 0:
                        pulled_from_main.append(src)
                        print(f"  [{label}] {src} missing at this commit — pulled from {original_branch}")

        # Patch package.json to use local dependency if it still points
        # at the private GitHub registry (older commits before the switch)
        pkg_path = REPO_ROOT / "package.json"
        if pkg_path.exists():
            pkg_text = pkg_path.read_text()
            # Match any registry URL for the package and replace with local path
            patched, count = re.subn(
                r'"@tst-technology/wooffer-model-package"\s*:\s*"(?!file:)[^"]*"',
                '"@tst-technology/wooffer-model-package": "file:./TST-Technology/wooffer-model-package"',
                pkg_text,
            )
            if count > 0:
                pkg_path.write_text(patched)
                pulled_from_main.append("package.json (patched registry → local dep)")
                print(f"  [{label}] package.json patched: registry ref → file:./TST-Technology/wooffer-model-package")

        # Attempt docker build
        print(f"  [{label}] Running docker build...")
        build_result = subprocess.run(
            ["docker", "build", "--no-cache", "-t", f"pr-check-{pr_number}", "."],
            capture_output=True, text=True, cwd=str(REPO_ROOT),
            timeout=DOCKER_BUILD_TIMEOUT,
        )

        if build_result.returncode == 0:
            print(f"  [{label}] Docker build PASSED")
            # Clean up the image
            subprocess.run(
                ["docker", "rmi", f"pr-check-{pr_number}"],
                capture_output=True, text=True,
            )
            msg = "Docker build succeeded"
            if pulled_from_main:
                msg += f" (pulled from {original_branch}: {', '.join(pulled_from_main)})"
            return {"status": "pass", "message": msg,
                    "pulled_from_main": pulled_from_main}
        else:
            # Collect the last 30 lines from both streams for diagnosis
            all_output = (build_result.stdout + "\n" + build_result.stderr).strip()
            tail_lines = all_output.split("\n")[-30:]
            failure_log = "\n".join(tail_lines)
            print(f"  [{label}] Docker build FAILED")
            print(f"  [{label}] ---- failure output (last 30 lines) ----")
            for line in tail_lines:
                print(f"  [{label}]   {line}")
            print(f"  [{label}] ---- end failure output ----")
            return {"status": "fail", "message": failure_log}

    except subprocess.TimeoutExpired:
        print(f"  [{label}] Docker build TIMEOUT ({DOCKER_BUILD_TIMEOUT}s)")
        return {"status": "fail", "message": f"Docker build timed out after {DOCKER_BUILD_TIMEOUT}s"}
    finally:
        # Force-checkout back to original branch — discards any files
        # we pulled from main or patched during the docker check
        _restore_branch(original_branch)


# ---------------------------------------------------------------------------
# PR data container (fetched once, reused across categories)
# ---------------------------------------------------------------------------

class PRData:
    """Pre-fetched PR data shared across all category evaluations."""

    def __init__(self, pr: dict):
        self.pr = pr
        self.number = pr["number"]
        self.title = pr["title"]
        self.body = pr.get("body") or "(no description)"

        print(f"  [PR #{self.number}] Fetching diff and file list...")
        self.diff = fetch_pr_diff(self.number)
        files = fetch_pr_files(self.number)
        self.files = get_file_list(files)

    @property
    def file_list(self) -> str:
        return "\n".join(f"  - {f}" for f in self.files) or "  (none)"


# ---------------------------------------------------------------------------
# Todo file for tracking progress
# ---------------------------------------------------------------------------

def write_todo(pr_data: PRData, pr_dir: Path) -> Path:
    """Write a todo.md tracking file for the PR analysis."""
    todo_path = pr_dir / "todo.md"
    lines = [
        f"# PR #{pr_data.number}: {pr_data.title}",
        "",
        "## Categories to evaluate",
        "",
    ]
    for cat in CATEGORIES:
        lines.append(f"- [ ] {cat['name']}")
    lines += [
        "",
        "## Files",
        "",
        f"- Changed files: {len(pr_data.files)}",
        "",
        "## Results",
        "",
        "| Category | Score | Status |",
        "|----------|-------|--------|",
    ]
    for cat in CATEGORIES:
        lines.append(f"| {cat['name']} | - | pending |")
    lines.append("")
    todo_path.write_text("\n".join(lines))
    return todo_path


def update_todo(
    pr_data: PRData,
    pr_dir: Path,
    completed_key: str,
    score: int,
):
    """Update todo.md after a category completes."""
    todo_path = pr_dir / "todo.md"
    if not todo_path.exists():
        return
    text = todo_path.read_text()

    # Find the category name for this key
    cat_name = next(
        (c["name"] for c in CATEGORIES if c["key"] == completed_key), None
    )
    if not cat_name:
        return

    # Mark checkbox
    text = text.replace(f"- [ ] {cat_name}", f"- [x] {cat_name}")
    # Update results table
    text = text.replace(
        f"| {cat_name} | - | pending |",
        f"| {cat_name} | {score} | done |",
    )
    todo_path.write_text(text)


# ---------------------------------------------------------------------------
# Prompt building (per category)
# ---------------------------------------------------------------------------

def build_category_prompt(
    pr_data: PRData,
    category: dict,
) -> str:
    """Build a focused prompt for a single scoring category."""
    diff = pr_data.diff.strip() or "(no changes)"

    return f"""Score PR #{pr_data.number} on: **{category['name']}**

All data is provided below. Do NOT run any commands.

═══════════════════════════════════════════════════════════════════
THE ISSUE (what a SWE-Bench agent would receive as its task)
═══════════════════════════════════════════════════════════════════

**PR #{pr_data.number}: {pr_data.title}**

{pr_data.body}

═══════════════════════════════════════════════════════════════════
FILES CHANGED
═══════════════════════════════════════════════════════════════════

{pr_data.file_list}

NOTE: The list above includes ALL changed files. Files in directories like
tests/, test/, __tests__/ or with names like *.test.*, *.spec.* are LIKELY
test files — but use your own judgement. Some repos put tests in unexpected
places; and some files in test directories may be fixtures or helpers rather
than test files. Read the diff to determine what is actually a test.

═══════════════════════════════════════════════════════════════════
FULL DIFF
═══════════════════════════════════════════════════════════════════

```diff
{diff}
```

═══════════════════════════════════════════════════════════════════
SCORING RUBRIC
═══════════════════════════════════════════════════════════════════

{INTEGRITY_RULES}

{category['rubric']}"""


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def extract_json_result(text: str) -> dict | None:
    """Extract the JSON result from API response."""
    if not text or not isinstance(text, str):
        return None
        
    # Clean up the text first
    text = text.strip()
    
    # Skip if response looks like an error or is too short
    if len(text) < 10:
        return None
    
    # Try to find JSON in markdown code blocks
    code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()
    
    # First try: the whole response is JSON
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # Second try: find JSON object with nested structures (non-greedy for nested braces)
    # Match balanced braces to handle nested JSON
    match = re.search(r'\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*"score"[^}]*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    
    # Third try: more aggressive pattern matching for malformed JSON
    score_match = re.search(r'"score"\s*:\s*(\d+)', text)
    if score_match:
        # Try to extract reason with multiline support
        reason_match = re.search(r'"reason"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text)
        # Try to extract analysis with multiline support
        analysis_match = re.search(r'"analysis"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text, re.DOTALL)
        
        return {
            "score": int(score_match.group(1)),
            "reason": reason_match.group(1).replace('\\"', '"').replace('\\\\', '\\') if reason_match else "",
            "analysis": analysis_match.group(1).replace('\\"', '"').replace('\\\\', '\\') if analysis_match else ""
        }

    return None


def extract_csv_row(text: str) -> str | None:
    """Extract CSV row from between CSV_START / CSV_END markers (legacy compat)."""
    match = re.search(r"CSV_START\s*\n(.*?)\n\s*CSV_END", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None


# ---------------------------------------------------------------------------
# OpenAI API calls (using kimi-k2.5 via woffer.io) with retry logic
# ---------------------------------------------------------------------------

def run_category_review(
    pr_data: PRData,
    category: dict,
    pr_dir: Path,
    max_retries: int = MAX_RETRIES
) -> dict | None:
    """
    Call OpenAI-compatible API to score a single category for a PR.
    Includes retry logic with exponential backoff for timeouts.
    Returns {"score": int, "reason": str, "analysis": str} or None.
    """
    import os
    import requests
    
    label = f"PR #{pr_data.number}/{category['key']}"
    
    # Check for new environment variables first, fallback to original ones
    api_key = os.environ.get("OPENAI_API_KEY2") or os.environ.get("OPENAI_API_KEY", "sk-a8DeKPz3j1H2WKejacyXPA")
    base_url = os.environ.get("OPENAI_BASE_URL2") or os.environ.get("OPENAI_BASE_URL", "https://ai.pratikn.com/v1")
    
    if not api_key:
        print(f"    [{label}] ERROR: Neither OPENAI_API_KEY2 nor OPENAI_API_KEY is set")
        return None
    
    # Build the prompt
    prompt = build_category_prompt(pr_data, category)
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "kimi-k2.5",
        "messages": [
            {"role": "system", "content": "You are a PR quality evaluator. Respond only with valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4000
    }
    
    # Retry loop with exponential backoff
    last_error = None
    for attempt in range(max_retries):
        print(f"    [{label}] Starting OpenAI API call (attempt {attempt + 1}/{max_retries})...")
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
                timeout=MAX_CLAUDE_TIMEOUT
            )
            response.raise_for_status()
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            elapsed = time.time() - start_time
            print(f"    [{label}] Done in {elapsed:.1f}s")
            
            # Validate response - if too short or empty, treat as failure and retry
            if not content or len(content.strip()) < 20:
                print(f"    [{label}] WARNING: Empty or very short response ({len(content) if content else 0} chars)")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"    [{label}] Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                return None
            
            # Parse the JSON response
            output = extract_json_result(content)
            if not output:
                print(f"    [{label}] WARNING: Could not parse JSON from response")
                # Debug: show first 200 chars of response
                preview = content[:200].replace('\n', ' ')
                print(f"    [{label}] Response preview: {preview}...")
                # Try to extract just the JSON part
                json_match = re.search(r'\{[^}]*"score"[^}]*\}', content, re.DOTALL)
                if json_match:
                    try:
                        output = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
            
            if output:
                # Save per-category analysis
                cat_file = pr_dir / f"{category['key']}.md"
                cat_file.write_text(content)
                return output
            else:
                print(f"    [{label}] ERROR: No valid JSON found in response")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"    [{label}] Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                return None
                
        except requests.exceptions.Timeout as e:
            last_error = e
            print(f"    [{label}] TIMEOUT: {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt * 5  # Longer wait for timeouts
                print(f"    [{label}] Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"    [{label}] Max retries reached. Giving up.")
                return None
                
        except requests.exceptions.HTTPError as e:
            last_error = e
            # NOTE: Response.__bool__ returns False for non-2xx, so use `is not None`
            status_code = e.response.status_code if e.response is not None else 0
            # Fallback: parse status from error message
            if status_code == 0:
                m = re.search(r'(\d{3}) ', str(e))
                if m:
                    status_code = int(m.group(1))
            print(f"    [{label}] HTTP Error {status_code}: {e}")
            
            # Retry on 5xx and rate-limit errors
            if status_code in (429, 500, 502, 503, 504) or status_code == 0:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt * 10
                    print(f"    [{label}] Retryable error ({status_code}) - retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
            
            # Other HTTP errors - don't retry
            print(f"    [{label}] Non-retryable HTTP error ({status_code}). Giving up.")
            return None
            
        except requests.exceptions.RequestException as e:
            last_error = e
            print(f"    [{label}] ERROR: API request failed: {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"    [{label}] Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"    [{label}] Max retries reached. Giving up.")
                return None
                
        except Exception as e:
            print(f"    [{label}] ERROR: Unexpected error: {e}")
            return None
    
    # All retries exhausted
    print(f"    [{label}] ERROR: All {max_retries} attempts failed")
    return None


def review_pr(pr: dict) -> tuple[int, str | None, str]:
    """
    Run all category reviews for a single PR.
    Returns (pr_number, csv_row_or_none, combined_analysis_text).
    """
    pr_data = PRData(pr)
    pr_dir = ANALYSES_DIR / f"pr_{pr_data.number}"
    pr_dir.mkdir(parents=True, exist_ok=True)

    # Write todo tracker
    write_todo(pr_data, pr_dir)

    results: dict[str, dict] = {}
    combined_analysis_parts: list[str] = []

    for cat in CATEGORIES:
        parsed = run_category_review(pr_data, cat, pr_dir)
        if parsed:
            results[cat["key"]] = parsed
            update_todo(pr_data, pr_dir, cat["key"], parsed.get("score", -1))
            combined_analysis_parts.append(
                f"## {cat['name']}\n\n"
                f"**Score: {parsed.get('score', '?')}**\n\n"
                f"{parsed.get('analysis', parsed.get('reason', ''))}\n"
            )
        else:
            combined_analysis_parts.append(
                f"## {cat['name']}\n\n**ERROR: Could not evaluate**\n"
            )

    # Build CSV row
    csv_row = build_csv_row(pr_data, results)

    # Save combined analysis
    combined_text = (
        f"# PR #{pr_data.number}: {pr_data.title}\n\n"
        + "\n---\n\n".join(combined_analysis_parts)
    )
    (pr_dir / "combined_analysis.md").write_text(combined_text)

    return pr_data.number, csv_row, combined_text


def build_csv_row(pr_data: PRData, results: dict[str, dict]) -> str | None:
    """Build a CSV row from the per-category results."""
    fields = [str(pr_data.number), pr_data.title]

    for cat in CATEGORIES:
        r = results.get(cat["key"])
        if r:
            fields.append(str(r.get("score", "?")))
            fields.append(str(r.get("reason", "")))
        else:
            fields.append("?")
            fields.append("ERROR: could not evaluate")

    # Check we got all categories
    if "?" in [fields[i] for i in range(2, len(fields), 2)]:
        return None

    return ",".join(f'"{f}"' for f in fields)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze merged PRs for SWE-Bench+ quality using Claude CLI"
    )
    parser.add_argument(
        "--pr", type=int, default=None,
        help="Analyze a single PR by number (default: all merged PRs)",
    )
    parser.add_argument(
        "--output", type=str, default="pr_analysis_results.csv",
        help="Output CSV file path (default: pr_analysis_results.csv)",
    )
    parser.add_argument(
        "--parallel", type=int, default=1,
        help="Number of parallel PR reviews (default: 1)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch and list PRs without running Claude review",
    )
    parser.add_argument(
        "--force-ai-check", action="store_true",
        help="Run AI analysis even if Docker build fails",
    )
    args = parser.parse_args()

    # --- Gather PRs ---------------------------------------------------------
    all_prs = get_merged_prs()

    if args.pr is not None:
        prs = [pr for pr in all_prs if pr["number"] == args.pr]
        if not prs:
            print(f"Error: PR #{args.pr} not found or not merged.", file=sys.stderr)
            sys.exit(1)
    else:
        prs = all_prs

    print(f"Found {len(prs)} merged PR(s) to analyze:\n")
    for pr in prs:
        print(f"  #{pr['number']}: {pr['title']}")
    print()

    if args.dry_run:
        print("[dry-run] Exiting without running reviews.")
        return

    # --- Docker build check (SKIPPED - always succeeds) ---------------------
    # Docker build check is skipped as requested - all PRs always pass
    ANALYSES_DIR.mkdir(exist_ok=True)
    original_branch = _get_current_branch()

    # Skip docker check and proceed with all PRs to AI analysis
    prs_to_analyze = prs
    print(f"\n  Docker build check SKIPPED - proceeding with all {len(prs_to_analyze)} PRs to AI analysis")

    # --- Analyze PRs --------------------------------------------------------
    print(f"\n{'='*60}")
    print("AI ANALYSIS")
    print(f"{'='*60}")

    csv_rows: list[str] = []
    num_parallel = min(args.parallel, len(prs_to_analyze))

    if num_parallel <= 1:
        # Sequential: cleaner output
        pr_results: dict[int, tuple[str | None, str]] = {}
        for pr in prs_to_analyze:
            print(f"\n  [PR #{pr['number']}] Starting analysis ({len(CATEGORIES)} categories)...")
            pr_num, csv_row, combined = review_pr(pr)
            pr_results[pr_num] = (csv_row, combined)
            if csv_row:
                print(f"  [PR #{pr_num}] All categories complete")
            else:
                print(f"  [PR #{pr_num}] WARNING: incomplete results", file=sys.stderr)
    else:
        pr_results = {}
        with ThreadPoolExecutor(max_workers=num_parallel) as executor:
            futures = {
                executor.submit(review_pr, pr): pr["number"]
                for pr in prs_to_analyze
            }
            for future in as_completed(futures):
                pr_num, csv_row, combined = future.result()
                pr_results[pr_num] = (csv_row, combined)
                if csv_row:
                    print(f"  [PR #{pr_num}] All categories complete")
                else:
                    print(f"  [PR #{pr_num}] WARNING: incomplete results",
                          file=sys.stderr)

    # Collect CSV rows in PR number order
    for pr in prs_to_analyze:
        row = pr_results.get(pr["number"], (None, ""))[0]
        if row:
            csv_rows.append(row)

    # --- Write CSV ----------------------------------------------------------
    output_path = Path(args.output)
    with open(output_path, "w") as f:
        f.write(CSV_HEADER + "\n")
        for row in csv_rows:
            f.write(row + "\n")

    print(f"\nCSV written to {output_path}")
    print(f"Full analyses saved to {ANALYSES_DIR}/")

    # --- Summary ------------------------------------------------------------
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}\n")

    for row in csv_rows:
        fields = re.findall(r'"([^"]*)"', row)
        if len(fields) >= 12:
            pr_num = fields[0]
            title = fields[1][:50]
            scores = []
            for i in (2, 4, 6, 8, 10):
                scores.append(int(fields[i]) if fields[i].isdigit() else -1)
            verdict = "PASS" if all(0 <= s <= 1 for s in scores) else "FAIL"
            score_str = " | ".join(str(s) for s in scores)
            print(f"  PR #{pr_num}: [{score_str}] -> {verdict}  {title}")

    print()


if __name__ == "__main__":
    main()
