#!/bin/bash

# Basic Endpoints Test Suite
# Tests fundamental server functionality and health checks
# Run from project root: ./tests/01-core/basic-endpoints.sh

echo "=== Basic Endpoints Test Suite ==="
echo "Testing Date: $(date)"
echo "Server URL: http://localhost:3001"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

run_test() {
    local test_name="$1"
    local expected_status="$2"
    local url="$3"
    local method="${4:-GET}"
    
    echo -n "Testing $test_name... "
    ((TESTS_RUN++))
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$url")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" -X "$method" "$url")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (${http_code}, ${time_total}s)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code, ${time_total}s)"
    fi
}

echo "--- Health & Status Tests ---"
run_test "Health Endpoint" "200" "http://localhost:3001/health"
run_test "Root Endpoint" "200" "http://localhost:3001/"
run_test "API Test Endpoint" "200" "http://localhost:3001/api/test"

echo ""
echo "--- 404 Error Handling ---"
run_test "Non-existent Endpoint" "404" "http://localhost:3001/api/nonexistent"

echo ""
echo "=== Test Summary ==="
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Success Rate: $((TESTS_PASSED * 100 / TESTS_RUN))%"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "${GREEN}All tests passed! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ❌${NC}"
    exit 1
fi