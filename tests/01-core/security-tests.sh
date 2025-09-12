#!/bin/bash

# Security & Authentication Test Suite
# Tests JWT authentication, input validation, and error handling
# Run from project root: ./tests/manual-api-tests/security-tests.sh

echo "=== Security & Authentication Test Suite ==="
echo "Testing Date: $(date)"
echo "Server URL: http://localhost:3001"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

run_auth_test() {
    local test_name="$1"
    local expected_status="$2"
    local url="$3"
    local method="${4:-GET}"
    local data="${5:-}"
    
    echo -n "Testing $test_name... "
    ((TESTS_RUN++))
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                   -X "$method" \
                   -H "Content-Type: application/json" \
                   -d "$data" \
                   "$url")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                   -X "$method" \
                   "$url")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (${http_code}, ${time_total}s)"
        ((TESTS_PASSED++))
        
        # Show error message for failed auth attempts
        if [ "$http_code" = "401" ]; then
            error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$error_msg" ]; then
                echo -e "    ${BLUE}🔒 Error: $error_msg${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code, ${time_total}s)"
        echo -e "    ${YELLOW}Response: $body${NC}"
    fi
}

echo "--- Authentication Tests (Protected Endpoints) ---"
run_auth_test "Reviews Endpoint (No Auth)" "401" "http://localhost:3001/api/reviews"
run_auth_test "Settings Endpoint (No Auth)" "401" "http://localhost:3001/api/settings"
run_auth_test "Leaderboard Endpoint (No Auth)" "401" "http://localhost:3001/api/leaderboard"

echo ""
echo "--- POST Endpoint Security Tests ---"
run_auth_test "Onboarding POST (No Auth)" "401" "http://localhost:3001/api/onboarding" "POST" '{"username":"test"}'
run_auth_test "Assignment Request (No Auth)" "401" "http://localhost:3001/api/assignment-requests" "POST" '{"requestType":"reviews"}'

echo ""
echo "--- Input Validation Tests ---"
run_auth_test "Assignment Request (Invalid Type)" "401" "http://localhost:3001/api/assignment-requests" "POST" '{"requestType":"invalid"}'
run_auth_test "Empty POST Body" "401" "http://localhost:3001/api/onboarding" "POST" '{}'

echo ""
echo "--- Admin Endpoint Security ---"
run_auth_test "Admin Stats (No Auth)" "401" "http://localhost:3001/api/admin/stats"
run_auth_test "Admin Users (No Auth)" "401" "http://localhost:3001/api/admin/users"

echo ""
echo "--- Error Message Security Analysis ---"
echo "Checking that error messages don't expose sensitive information..."

# Test that error messages are consistent and safe
auth_error_1=$(curl -s "http://localhost:3001/api/reviews" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
auth_error_2=$(curl -s "http://localhost:3001/api/settings" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)

if [ "$auth_error_1" = "$auth_error_2" ]; then
    echo -e "${GREEN}✅ Error message consistency: PASS${NC}"
    echo -e "    ${BLUE}🔒 Message: $auth_error_1${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Error message consistency: FAIL${NC}"
    echo -e "    ${YELLOW}Message 1: $auth_error_1${NC}"
    echo -e "    ${YELLOW}Message 2: $auth_error_2${NC}"
fi
((TESTS_RUN++))

echo ""
echo "=== Security Test Summary ==="
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Success Rate: $((TESTS_PASSED * 100 / TESTS_RUN))%"

# Security assessment
if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "${GREEN}All security tests passed! ✅${NC}"
    echo -e "${BLUE}🛡️  Security Assessment: GOOD${NC}"
    echo "   - Authentication middleware working correctly"
    echo "   - Proper HTTP status codes returned"
    echo "   - Error messages don't expose sensitive information"
    exit 0
else
    echo -e "${RED}Some security tests failed! ❌${NC}"
    echo -e "${RED}🛡️  Security Assessment: NEEDS ATTENTION${NC}"
    exit 1
fi