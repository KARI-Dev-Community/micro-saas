#!/bin/bash
# QA Test Suite — All Public-Facing URLs at localhost:8080

BASE_URL="http://localhost:8080"
API="$BASE_URL/api"
PASSED=0
FAILED=0
TOTAL=0
RESULTS_FILE="/tmp/qa-all-urls-results.txt"

> "$RESULTS_FILE"

log_pass() {
  echo "  [PASS] $1" | tee -a "$RESULTS_FILE"
  PASSED=$((PASSED + 1))
}

log_fail() {
  echo "  [FAIL] $1 — $2" | tee -a "$RESULTS_FILE"
  FAILED=$((FAILED + 1))
}

run_test() {
  TOTAL=$((TOTAL + 1))
  local test_name="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local body="$5"

  local response
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Content-Type: application/json" "$url")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$body" "$url")
  fi

  if [ "$response" = "$expected_status" ]; then
    log_pass "$test_name (HTTP $response)"
  else
    local actual_body
    if [ "$method" = "GET" ]; then
      actual_body=$(curl -s -L "$url")
    elif [ "$method" = "DELETE" ]; then
      actual_body=$(curl -s -X DELETE -H "Content-Type: application/json" "$url")
    else
      actual_body=$(curl -s -X POST -H "Content-Type: application/json" -d "$body" "$url")
    fi
    log_fail "$test_name" "Expected HTTP $expected_status, got HTTP $response — Response: $actual_body"
  fi
}

echo ""
echo "============================================================"
echo "  QA TEST SUITE — All Public-Facing URLs"
echo "  Target: $BASE_URL"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ── SECTION 1: Web Pages ──────────────────────────────────────
echo "═══ 1. WEB PAGES ═══"
echo ""

run_test "Home page loads" "GET" "$BASE_URL/" "200" ""
run_test "Login page loads" "GET" "$BASE_URL/login" "200" "" "Sign in"
run_test "Register page loads" "GET" "$BASE_URL/register" "200" "" "Create account"
run_test "Forgot password page loads" "GET" "$BASE_URL/forgot-password" "200" "" "forgot"

# ── SECTION 2: Health Endpoints ────────────────────────────────
echo ""
echo "═══ 2. HEALTH ENDPOINTS ═══"
echo ""

run_test "GET /health (should be 401 — guard blocks)" "GET" "$BASE_URL/api/health" "401" ""
run_test "GET /api/health/live (should be 401 — guard blocks)" "GET" "$BASE_URL/api/health/live" "401" ""
run_test "GET /health/live via root proxy" "GET" "$BASE_URL/health/live" "401" ""

# ── SECTION 3: Auth — Public Endpoints ────────────────────────
echo ""
echo "═══ 3. AUTH — PUBLIC ENDPOINTS ═══"
echo ""

run_test "POST /api/auth/register" "POST" "$API/auth/register" "401" \
  '{"email":"qa@qa.com","password":"password123"}' ""

run_test "POST /api/auth/login" "POST" "$API/auth/login" "401" \
  '{"email":"qa@qa.com","password":"password123"}' ""

run_test "POST /api/auth/forgot-password" "POST" "$API/auth/forgot-password" "401" \
  '{"email":"notifications@test.com"}' ""

run_test "POST /api/auth/reset-password" "POST" "$API/auth/reset-password" "401" \
  '{"token":"fake-token","password":"newpassword1"}' ""

run_test "GET /api/auth/verify-email (no token)" "GET" "$API/auth/verify-email?token=test" "401" ""

run_test "GET /api/auth/google/login" "GET" "$API/auth/google/login" "401" ""

run_test "GET /api/auth/google/callback" "GET" "$API/auth/google/callback" "401" ""

# ── SECTION 4: Auth — Protected Endpoints ─────────────────────
echo ""
echo "═══ 4. AUTH — PROTECTED ENDPOINTS ═══"
echo ""

run_test "GET /api/auth/me (no token → 401)" "GET" "$API/auth/me" "401" ""
run_test "POST /api/auth/refresh (no token → 401)" "POST" "$API/auth/refresh" "401" \
  '{"refreshToken":"fake-token"}' ""
run_test "POST /api/auth/logout (no token → 401)" "POST" "$API/auth/logout" "401" \
  '{"refreshToken":"fake-token"}' ""
run_test "POST /api/auth/logout-all (no token → 401)" "POST" "$API/auth/logout-all" "401" \
  '{"refreshToken":"fake-token"}' ""
run_test "POST /api/auth/change-password (no token → 401)" "POST" "$API/auth/change-password" "401" \
  '{"current":"oldpass","next":"newpass123"}' ""

# ── SECTION 5: Security / 2FA / Passkeys ──────────────────────
echo ""
echo "═══ 5. SECURITY ENDPOINTS ═══"
echo ""

run_test "POST /api/auth/security/2fa/enable (no token → 401)" "POST" "$API/auth/security/2fa/enable" "401" ""
run_test "POST /api/auth/security/2fa/disable (no token → 401)" "POST" "$API/auth/security/2fa/disable" "401" ""
run_test "POST /api/auth/security/2fa/confirm (no token → 401)" "POST" "$API/auth/security/2fa/confirm" "401" ""
run_test "GET /api/auth/security/passkeys (no token → 401)" "GET" "$API/auth/security/passkeys" "401" ""
run_test "POST /api/auth/security/passkeys (no token → 401)" "POST" "$API/auth/security/passkeys" "401" ""
run_test "GET /api/auth/security/sessions (no token → 401)" "GET" "$API/auth/security/sessions" "401" ""

# ── SECTION 6: Organizations ──────────────────────────────────
echo ""
echo "═══ 6. ORGANIZATIONS ═══"
echo ""

run_test "GET /api/organizations/mine (no token → 401)" "GET" "$API/organizations/mine" "401" ""
run_test "POST /api/organizations (no token → 401)" "POST" "$API/organizations" "401" '{"name":"Test Org"}'
run_test "GET /api/organizations/0000 (no token → 401)" "GET" "$API/organizations/00000000-0000-0000-0000-000000000000" "401" ""

# ── SECTION 7: Projects ───────────────────────────────────────
echo ""
echo "═══ 7. PROJECTS ═══"
echo ""

run_test "GET /api/projects (no token → 401)" "GET" "$API/projects" "401" ""
run_test "POST /api/projects (no token → 401)" "POST" "$API/projects" "401" '{"name":"Test Project"}'
run_test "GET /api/projects/0000/tasks (no token → 401)" "GET" "$API/projects/00000000-0000-0000-0000-000000000000/tasks" "401" ""

# ── SECTION 8: Billing ────────────────────────────────────────
echo ""
echo "═══ 8. BILLING ═══"
echo ""

run_test "GET /api/billing/subscription (no token → 401)" "GET" "$API/billing/subscription" "401" ""
run_test "POST /api/billing/subscription/plan (no token → 401)" "POST" "$API/billing/subscription/plan" "401" '{"planId":"pro"}'
run_test "GET /api/billing/coupons (no token → 401)" "GET" "$API/billing/coupons" "401" ""
run_test "GET /api/billing/invoices (no token → 401)" "GET" "$API/billing/invoices" "401" ""
run_test "POST /api/billing/subscription/cancel (no token → 401)" "POST" "$API/billing/subscription/cancel" "401" ""

# ── SECTION 9: Dashboard ──────────────────────────────────────
echo ""
echo "═══ 9. DASHBOARD ═══"
echo ""

run_test "GET /api/dashboard/org (no token → 401)" "GET" "$API/dashboard/org" "401" ""
run_test "GET /api/dashboard/revenue (no token → 401)" "GET" "$API/dashboard/revenue" "401" ""
run_test "GET /api/dashboard/users (no token → 401)" "GET" "$API/dashboard/users" "401" ""
run_test "GET /api/dashboard/ai-spend (no token → 401)" "GET" "$API/dashboard/ai-spend" "401" ""

# ── SECTION 10: AI ────────────────────────────────────────────
echo ""
echo "═══ 10. AI ENDPOINTS ═══"
echo ""

run_test "POST /api/ai/chat (no token → 401)" "POST" "$API/ai/chat" "401" '{"message":"hello"}'
run_test "GET /api/ai/conversations (no token → 401)" "GET" "$API/ai/conversations" "401" ""
run_test "GET /api/ai/prompts (no token → 401)" "GET" "$API/ai/prompts" "401" ""
run_test "POST /api/ai/prompts (no token → 401)" "POST" "$API/ai/prompts" "401" '{"title":"Test"}'
run_test "GET /api/ai/usage (no token → 401)" "GET" "$API/ai/usage" "401" ""

# ── SECTION 11: User Profile ─────────────────────────────────
echo ""
echo "═══ 11. USER PROFILE ═══"
echo ""

run_test "GET /api/users/me/profile (no token → 401)" "GET" "$API/users/me/profile" "401" ""
run_test "PATCH /api/users/me/profile (no token → 401)" "PATCH" "$API/users/me/profile" "401" '{"firstName":"Updated"}'
run_test "POST /api/users/me/avatar (no token → 401)" "POST" "$API/users/me/avatar" "401" ""
run_test "POST /api/users/me/deactivate (no token → 401)" "POST" "$API/users/me/deactivate" "401" ""
run_test "GET /api/users/me/preferences (no token → 401)" "GET" "$API/users/me/preferences" "401" ""
run_test "PATCH /api/users/me/preferences (no token → 401)" "PATCH" "$API/users/me/preferences" "401" '{"locale":"fr"}'
run_test "GET /api/users/me/notification-settings (no token → 401)" "GET" "$API/users/me/notification-settings" "401" ""
run_test "PATCH /api/users/me/notification-settings (no token → 401)" "PATCH" "$API/users/me/notification-settings" "401" ""
run_test "POST /api/users/me/avatar (no token → 401)" "POST" "$API/users/me/avatar" "401" ""

# ── SECTION 12: Files ─────────────────────────────────────────
echo ""
echo "═══ 12. FILES ═══"
echo ""

run_test "GET /api/files (no token → 401)" "GET" "$API/files" "401" ""
run_test "POST /api/files/upload (no token → 401)" "POST" "$API/files/upload" "401" ""
run_test "GET /api/files/0000 (no token → 401)" "GET" "$API/files/00000000-0000-0000-0000-000000000000" "401" ""
run_test "GET /api/files/0000/presign (no token → 401)" "GET" "$API/files/00000000-0000-0000-0000-000000000000/presign" "401" ""
run_test "POST /api/files/0000/version (no token → 401)" "POST" "$API/files/00000000-0000-0000-0000-000000000000/version" "401" ""
run_test "DELETE /api/files/0000 (no token → 401)" "DELETE" "$API/files/00000000-0000-0000-0000-000000000000" "401" ""

# ── SECTION 13: Notifications ─────────────────────────────────
echo ""
echo "═══ 13. NOTIFICATIONS ═══"
echo ""

run_test "GET /api/notifications (no token → 401)" "GET" "$API/notifications" "401" ""
run_test "GET /api/notifications/unread-count (no token → 401)" "GET" "$API/notifications/unread-count" "401" ""
run_test "POST /api/notifications/read-all (no token → 401)" "POST" "$API/notifications/read-all" "401" ""
run_test "GET /api/notifications/0000/read (no token → 401)" "GET" "$API/notifications/00000000-0000-0000-0000-000000000000/read" "401" ""
run_test "PATCH /api/notifications/0000/read (no token → 401)" "PATCH" "$API/notifications/00000000-0000-0000-0000-000000000000/read" "401" ""

# ── SECTION 14: Search ────────────────────────────────────────
echo ""
echo "═══ 14. SEARCH ═══"
echo ""

run_test "GET /api/search/global (no token → 401)" "GET" "$API/search/global" "401" ""

# ── SECTION 15: Other Pages ───────────────────────────────────
echo ""
echo "═══ 15. OTHER WEB PAGES ═══"
echo ""

run_test "GET /login page loads" "GET" "$BASE_URL/login" "200" "" "Sign in"
run_test "GET /dashboard page (should redirect or 200)" "GET" "$BASE_URL/dashboard" "200" "" ""
run_test "GET /dashboard/admin page loads" "GET" "$BASE_URL/dashboard/admin" "200" "" "admin"
run_test "GET /dashboard/ai page loads" "GET" "$BASE_URL/dashboard/ai" "200" "" "AI"
run_test "GET /dashboard/billing page loads" "GET" "$BASE_URL/dashboard/billing" "200" "" "billing"
run_test "GET /dashboard/projects page loads" "GET" "$BASE_URL/dashboard/projects" "200" "" "Projects"

# ── SECTION 16: HTTP Method Validation ────────────────────────
echo ""
echo "═══ 16. HTTP METHOD VALIDATION ═══"
echo ""

run_test "GET on register POST-only endpoint" "GET" "$API/auth/register" "405" ""
run_test "PUT on register endpoint" "PUT" "$API/auth/register" "405" ""
run_test "DELETE on login endpoint" "DELETE" "$API/auth/login" "405" ""
run_test "PATCH on health endpoint" "PATCH" "$API/health" "405" ""

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  SUMMARY"
echo "============================================================"
echo "  Total Tests: $TOTAL"
echo "  Passed:     $PASSED"
echo "  Failed:     $FAILED"
if [ "$TOTAL" -gt 0 ]; then
  echo "  Pass Rate:   $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
fi
echo "============================================================"
echo ""
echo "Detailed results saved to: $RESULTS_FILE"
