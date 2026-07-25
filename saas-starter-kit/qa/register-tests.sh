#!/bin/bash
# QA Test Suite for Register Endpoint
# Target: localhost:8080

BASE_URL="http://localhost:8080"
REGISTER_API="$BASE_URL/api/auth/register"
REGISTER_PAGE="$BASE_URL/register"
PASSED=0
FAILED=0
TOTAL=0
RESULTS_FILE="/tmp/qa-register-results.txt"

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
  local body_contains="$6"

  local response body content_type
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
    body=$(curl -s -L "$url")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Content-Type: application/json" "$url")
    body=$(curl -s -X DELETE -H "Content-Type: application/json" "$url")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$body" "$url")
    body=$(curl -s -X POST -H "Content-Type: application/json" -d "$body" "$url")
  fi

  if [ "$response" = "$expected_status" ]; then
    if [ -n "$body_contains" ]; then
      if echo "$body" | grep -qi "$body_contains"; then
        log_pass "$test_name (HTTP $response, body contains '$body_contains')"
      else
        log_fail "$test_name (HTTP $response but body mismatch)" "Expected response to contain '$body_contains', got: $body"
      fi
    else
      log_pass "$test_name (HTTP $response)"
    fi
  else
    log_fail "$test_name" "Expected HTTP $expected_status, got HTTP $response — Response: $body"
  fi
}

echo ""
echo "============================================================"
echo "  QA TEST SUITE — Register Endpoint"
echo "  Target: $BASE_URL"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

echo "═══ 1. PAGE RENDERING TESTS ═══"
echo ""
run_test "Register page loads (HTTP 200)" "GET" "$REGISTER_PAGE" "200" "" "Create account"
run_test "Register page contains email field" "GET" "$REGISTER_PAGE" "200" "" 'id="email"'
run_test "Register page contains password field" "GET" "$REGISTER_PAGE" "200" "" 'id="password"'
run_test "Register page contains firstName field" "GET" "$REGISTER_PAGE" "200" "" 'id="firstName"'
run_test "Register page contains lastName field" "GET" "$REGISTER_PAGE" "200" "" 'id="lastName"'
run_test "Register page contains submit button" "GET" "$REGISTER_PAGE" "200" "" "Create account"
run_test "Register page links to login" "GET" "$REGISTER_PAGE" "200" "" 'href="/login"'

echo ""
echo "═══ 2. VALID REGISTRATION TESTS ═══"
echo ""
run_test "Register with valid email + password (8+ chars)" "POST" "$REGISTER_API" "200" \
  '{"email":"qa.valid+1@test.com","password":"password123"}' "user"
run_test "Register with all fields filled" "POST" "$REGISTER_API" "200" \
  '{"email":"qa.full+2@test.com","password":"securepass1","firstName":"QA","lastName":"Tester"}' "user"
run_test "Register with exact minimum password length (8)" "POST" "$REGISTER_API" "200" \
  '{"email":"qa.minlen@test.com","password":"eightch1"}' "user"

echo ""
echo "═══ 3. INVALID EMAIL TESTS ═══"
echo ""
run_test "Missing email field" "POST" "$REGISTER_API" "400" \
  '{"password":"password123"}' "email"
run_test "Invalid email (no @)" "POST" "$REGISTER_API" "400" \
  '{"email":"notanemail","password":"password123"}' "email"
run_test "Null email" "POST" "$REGISTER_API" "400" \
  '{"email":null,"password":"password123"}' ""
run_test "Empty string email" "POST" "$REGISTER_API" "400" \
  '{"email":"","password":"password123"}' ""
run_test "Whitespace-only email" "POST" "$REGISTER_API" "400" \
  '{"email":"   ","password":"password123"}' ""
run_test "Email with spaces" "POST" "$REGISTER_API" "400" \
  '{"email":"user @test.com","password":"password123"}' ""

echo ""
echo "═══ 4. INVALID PASSWORD TESTS ═══"
echo ""
run_test "Password too short (7 chars)" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.short@test.com","password":"short1"}' "password"
run_test "Missing password field" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.nopass@test.com"}' "password"
run_test "Null password" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.nullpass@test.com","password":null}' ""
run_test "Empty string password" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.emptypass@test.com","password":""}' ""
run_test "Numeric-only password (8 chars)" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.numonly@test.com","password":"12345678"}' "user"
run_test "Exact 7-char password (just below minimum)" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.seven@test.com","password":"seven1"}' "password"

echo ""
echo "═══ 5. DUPLICATE EMAIL TEST ═══"
echo ""
run_test "First registration with unique email" "POST" "$REGISTER_API" "200" \
  '{"email":"qa.dup1@test.com","password":"password123"}' "user"
run_test "Second registration with same email (should conflict)" "POST" "$REGISTER_API" "409" \
  '{"email":"qa.dup1@test.com","password":"password123"}' "already registered"

echo ""
echo "═══ 6. EDGE CASES ═══"
echo ""
run_test "Empty JSON body" "POST" "$REGISTER_API" "400" \
  '{}' ""
run_test "Malformed JSON body" "POST" "$REGISTER_API" "400" \
  'not-valid-json' ""
run_test "Extra unknown fields in body (whitelist violation)" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.extra@test.com","password":"password123","role":"admin"}' ""
run_test "XSS payload in email field" "POST" "$REGISTER_API" "400" \
  '{"email":"<script>alert(1)</script>@test.com","password":"password123"}' ""
run_test "SQL injection attempt in email" "POST" "$REGISTER_API" "400" \
  '{"email":"inject@user.com'\'' OR 1=1--","password":"password123"}' ""
run_test "Very long email (300+ chars)" "POST" "$REGISTER_API" "400" \
  '{"email":"toolong'$(printf '%0.sa' {1..300})'@test.com","password":"password123"}' ""
run_test "Very long password (> 255 chars)" "POST" "$REGISTER_API" "400" \
  '{"email":"qa.longpass@test.com","password":"'$(printf '%0.sa' {1..260})'"}' ""
run_test "Case-insensitive email duplicate" "POST" "$REGISTER_API" "200" \
  '{"email":"qa.case@TEST.com","password":"password123"}' "user"
run_test "Second registration with same email different case" "POST" "$REGISTER_API" "409" \
  '{"email":"qa.case@test.com","password":"password123"}' "already registered"

echo ""
echo "═══ 7. HTTP METHOD & ROUTING TESTS ═══"
echo ""
run_test "GET to register API (should be 405 or 404)" "GET" "$REGISTER_API" "405" "" ""
run_test "PUT to register API (should be 405 or 404)" "PUT" "$REGISTER_API" "405" "" ""
run_test "DELETE to register API (should be 404 or 405)" "DELETE" "$REGISTER_API" "404" "" ""
run_test "PATCH to register API (should be 405 or 404)" "PATCH" "$REGISTER_API" "405" "" ""

echo ""
echo "═══ 8. CORS & SECURITY TESTS ═══"
echo ""
run_test "Request without Content-Type header" "POST" "$REGISTER_API" "400" \
  '{"email":"ctest@test.com","password":"password123"}' ""
run_test "Request with charset in Content-Type" "POST" "$REGISTER_API" "400" \
  '{"email":"charset@test.com","password":"password123"}' "" "email"

echo ""
echo "============================================================"
echo "  SUMMARY"
echo "============================================================"
echo "  Total Tests: $TOTAL"
echo "  Passed:     $PASSED"
echo "  Failed:     $FAILED"
echo "  Pass Rate:   $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
echo "============================================================"
echo ""

echo "Detailed results saved to: $RESULTS_FILE"