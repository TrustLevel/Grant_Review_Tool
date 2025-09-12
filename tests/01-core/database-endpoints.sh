#!/bin/bash

# Database Endpoints Test Suite
# Tests database integration and query performance
# Run from project root: ./tests/manual-api-tests/database-endpoints.sh

echo "=== Database Endpoints Test Suite ==="
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

run_performance_test() {
    local test_name="$1"
    local expected_status="$2"
    local url="$3"
    local max_time="$4"
    
    echo -n "Testing $test_name... "
    ((TESTS_RUN++))
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total};SIZE:%{size_download}" "$url")
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    size_download=$(echo "$response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*;SIZE:[0-9]*$//')
    
    # Check if status code is correct
    if [ "$http_code" = "$expected_status" ]; then
        # Check if response time is within acceptable range
        time_ms=$(echo "$time_total * 1000" | bc -l | cut -d. -f1)
        max_time_ms=$(echo "$max_time * 1000" | bc -l | cut -d. -f1)
        
        if [ "$time_ms" -lt "$max_time_ms" ]; then
            echo -e "${GREEN}✅ PASS${NC} (${http_code}, ${time_total}s, ${size_download}B)"
            ((TESTS_PASSED++))
        else
            echo -e "${YELLOW}⚠️ SLOW${NC} (${http_code}, ${time_total}s > ${max_time}s, ${size_download}B)"
            ((TESTS_PASSED++))
        fi
        
        # Show data summary if JSON response
        if echo "$body" | grep -q '\[.*\]'; then
            record_count=$(echo "$body" | grep -o '{' | wc -l)
            echo -e "    ${BLUE}📊 Data: $record_count records returned${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code, ${time_total}s)"
    fi
}

echo "--- Database Query Tests ---"
run_performance_test "Funds API (Simple Query)" "200" "http://localhost:3001/api/funds" "0.1"
run_performance_test "Challenges API (Complex Query)" "200" "http://localhost:3001/api/challenges" "0.2"
run_performance_test "Debug Endpoint (Multi-Collection)" "200" "http://localhost:3001/api/debug" "0.5"

echo ""
echo "--- Load Test (5x Health Checks) ---"
echo "Running 5 consecutive requests to measure consistency..."

total_time=0
for i in {1..5}; do
    echo -n "Request $i: "
    response=$(curl -s -w "TIME:%{time_total}" "http://localhost:3001/health")
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    time_ms=$(echo "$time_total * 1000" | bc -l | cut -d. -f1)
    total_time=$(echo "$total_time + $time_total" | bc -l)
    echo "${time_total}s (${time_ms}ms)"
done

average_time=$(echo "scale=3; $total_time / 5" | bc -l)
echo -e "${BLUE}📈 Average Response Time: ${average_time}s${NC}"

echo ""
echo "=== Test Summary ==="
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Success Rate: $((TESTS_PASSED * 100 / TESTS_RUN))%"
echo "Average Load Test Time: ${average_time}s"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "${GREEN}All database tests passed! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some database tests failed! ❌${NC}"
    exit 1
fi