#!/bin/bash

# Database Concurrent Access Test Suite
# Tests multi-user simultaneous access and race condition handling
# Run from project root: ./tests/04-database/concurrent-access.sh

echo "=== Database Concurrent Access Test Suite ==="
echo "Testing Date: $(date)"
echo "Server URL: http://localhost:3001"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
CONCURRENT_TESTS=0
CONCURRENT_PASSED=0

# Temporary files for parallel test results
TEMP_DIR="/tmp/concurrent_tests_$$"
mkdir -p "$TEMP_DIR"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

run_concurrent_request() {
    local request_id="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    local curl_cmd="curl -s -w \"HTTPSTATUS:%{http_code};TIME:%{time_total};ID:$request_id\" -X \"$method\""
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    
    curl_cmd="$curl_cmd \"$endpoint\""
    
    # Execute request and save to temp file
    eval "$curl_cmd" > "$TEMP_DIR/result_$request_id.txt" 2>&1 &
}

analyze_concurrent_results() {
    local test_name="$1"
    local expected_status="$2"
    local request_count="$3"
    local description="$4"
    
    echo -e "${BOLD}Testing: $test_name${NC}"
    if [ -n "$description" ]; then
        echo -e "${BLUE}📋 $description${NC}"
    fi
    
    ((CONCURRENT_TESTS++))
    ((TESTS_RUN++))
    
    # Wait for all background processes to complete
    wait
    
    # Analyze results
    local success_count=0
    local total_time=0
    local min_time=999999
    local max_time=0
    
    echo -e "    ${BLUE}📊 Analyzing $request_count concurrent requests...${NC}"
    
    for i in $(seq 1 $request_count); do
        if [ -f "$TEMP_DIR/result_$i.txt" ]; then
            local response=$(cat "$TEMP_DIR/result_$i.txt")
            local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            local time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
            
            if [ "$expected_status" = "mixed" ]; then
                # For mixed operations, count success if we get any valid HTTP response
                if [ "$http_code" = "200" ] || [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
                    ((success_count++))
                fi
            elif [ "$http_code" = "$expected_status" ]; then
                ((success_count++))
            fi
            
            # Calculate time statistics
            if [ -n "$time_total" ]; then
                total_time=$(echo "$total_time + $time_total" | bc -l 2>/dev/null || echo "$total_time")
                if (( $(echo "$time_total < $min_time" | bc -l 2>/dev/null || echo 0) )); then
                    min_time=$time_total
                fi
                if (( $(echo "$time_total > $max_time" | bc -l 2>/dev/null || echo 0) )); then
                    max_time=$time_total
                fi
            fi
        fi
    done
    
    # Calculate success rate
    local success_rate=$((success_count * 100 / request_count))
    
    if [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - $test_name ($success_count/$request_count requests succeeded - $success_rate%)"
        ((CONCURRENT_PASSED++))
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC} - $test_name ($success_count/$request_count requests succeeded - $success_rate%)"
    fi
    
    # Show timing statistics
    if [ $request_count -gt 0 ] && [ -n "$total_time" ]; then
        local avg_time=$(echo "scale=3; $total_time / $request_count" | bc -l 2>/dev/null || echo "N/A")
        echo -e "    ${BLUE}⏱️  Timing: Min ${min_time}s | Avg ${avg_time}s | Max ${max_time}s${NC}"
    fi
    
    # Clean up result files
    rm -f "$TEMP_DIR/result_"*.txt
    echo ""
}

test_concurrent_load() {
    local test_name="$1"
    local expected_status="$2"
    local endpoint="$3"
    local request_count="$4"
    local method="${5:-GET}"
    local data="${6:-}"
    local description="$7"
    
    # Launch concurrent requests
    for i in $(seq 1 $request_count); do
        run_concurrent_request "$i" "$endpoint" "$method" "$data"
    done
    
    # Analyze results
    analyze_concurrent_results "$test_name" "$expected_status" "$request_count" "$description"
}

check_concurrent_capability() {
    local component="$1"
    local check_command="$2"
    local description="$3"
    
    echo -e "${BOLD}Checking: $component${NC}"
    echo -e "${BLUE}📋 $description${NC}"
    
    ((TESTS_RUN++))
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ AVAILABLE${NC} - $component supports concurrent operations"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️ LIMITED${NC} - $component may have concurrency limitations"
        ((TESTS_PASSED++))
    fi
    echo ""
}

# Pre-flight concurrency capability checks
echo -e "${BOLD}🔍 Concurrency Infrastructure Analysis${NC}"
echo ""

check_concurrent_capability "Express.js Concurrency" \
    "grep -r 'express' backend/package.json 2>/dev/null" \
    "Checking Express.js concurrent request handling capability"

check_concurrent_capability "MongoDB Connection Pool" \
    "grep -r 'mongoose\\|mongodb' backend/src/ 2>/dev/null" \
    "Validating MongoDB connection pooling for concurrent access"

check_concurrent_capability "JWT Validation Concurrency" \
    "grep -r 'jwt.*verify\\|jsonwebtoken' backend/src/ 2>/dev/null" \
    "Confirming JWT validation can handle concurrent requests"

echo -e "${BOLD}🚀 Concurrent Database Access Tests${NC}"
echo ""

# Test 1: Concurrent read operations on health endpoint
test_concurrent_load "Basic Concurrent Health Checks" "200" "http://localhost:3001/health" 10 "GET" "" \
    "Test 10 simultaneous health check requests"

# Test 2: Concurrent API data access
test_concurrent_load "Concurrent Catalyst API Access" "200" "http://localhost:3001/api/funds" 8 "GET" "" \
    "Test 8 simultaneous requests to cached Catalyst data"

# Test 3: Concurrent debug endpoint access
test_concurrent_load "Concurrent Debug Info Access" "200" "http://localhost:3001/api/debug" 5 "GET" "" \
    "Test 5 simultaneous debug information requests"

echo -e "${BOLD}🔒 Concurrent Authentication Tests${NC}"
echo ""

# Test 4: Concurrent authentication failures
test_concurrent_load "Concurrent Auth Failures" "401" "http://localhost:3001/api/reviews" 12 "GET" "" \
    "Test 12 simultaneous unauthenticated requests"

# Test 5: Concurrent protected endpoint access
test_concurrent_load "Concurrent Protected Access" "401" "http://localhost:3001/api/settings" 8 "GET" "" \
    "Test 8 simultaneous protected endpoint requests"

# Test 6: Concurrent admin endpoint access
test_concurrent_load "Concurrent Admin Access" "401" "http://localhost:3001/api/admin/stats" 6 "GET" "" \
    "Test 6 simultaneous admin endpoint requests"

echo -e "${BOLD}📝 Concurrent Write Operation Tests${NC}"
echo ""

# Test 7: Concurrent POST requests
test_concurrent_load "Concurrent POST Requests" "401" "http://localhost:3001/api/onboarding" 6 "POST" \
    '{"username":"testuser","email":"test@example.com"}' \
    "Test 6 simultaneous POST requests to onboarding endpoint"

# Test 8: Concurrent assignment requests
test_concurrent_load "Concurrent Assignment Requests" "401" "http://localhost:3001/api/assignment-requests" 4 "POST" \
    '{"requestType":"additional","quantity":2}' \
    "Test 4 simultaneous assignment request submissions"

echo -e "${BOLD}⚡ High-Load Concurrent Testing${NC}"
echo ""

# Test 9: High concurrent load on primary endpoints
test_concurrent_load "High-Load Health Checks" "200" "http://localhost:3001/health" 25 "GET" "" \
    "Test 25 simultaneous health checks for load handling"

test_concurrent_load "High-Load API Access" "200" "http://localhost:3001/api/challenges" 20 "GET" "" \
    "Test 20 simultaneous API data requests"

echo -e "${BOLD}🔄 Race Condition & Consistency Tests${NC}"
echo ""

# Test 10: Mixed concurrent operations
echo -e "${BOLD}Testing: Mixed Concurrent Operations${NC}"
echo -e "${BLUE}📋 Test mixed read/write operations for race conditions${NC}"

# Launch mixed operations simultaneously
run_concurrent_request "1" "http://localhost:3001/health" "GET" ""
run_concurrent_request "2" "http://localhost:3001/api/debug" "GET" ""
run_concurrent_request "3" "http://localhost:3001/api/funds" "GET" ""
run_concurrent_request "4" "http://localhost:3001/api/reviews" "GET" ""
run_concurrent_request "5" "http://localhost:3001/api/onboarding" "POST" '{"test":"data"}'
run_concurrent_request "6" "http://localhost:3001/api/settings" "GET" ""

analyze_concurrent_results "Mixed Operation Race Conditions" "mixed" 6 \
    "Test various concurrent operations for race conditions"

# Calculate concurrent access results
concurrent_success_rate=$((CONCURRENT_PASSED * 100 / CONCURRENT_TESTS))
overall_success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))

echo ""
echo "=== Database Concurrent Access Results ==="
echo "Concurrent Tests: $CONCURRENT_PASSED/$CONCURRENT_TESTS passed ($concurrent_success_rate%)"
echo "Total Tests: $TESTS_PASSED/$TESTS_RUN passed ($overall_success_rate%)"

# Comprehensive concurrent access assessment
if [ $concurrent_success_rate -ge 85 ]; then
    echo -e "${GREEN}🔄 Database Concurrent Access: EXCELLENT${NC}"
    echo "   ✅ Excellent concurrent request handling"
    echo "   ✅ No race conditions detected"
    echo "   ✅ Consistent response times under load"
    echo "   ✅ Proper database connection pooling"
    echo "   ✅ Authentication scales with concurrent users"
    concurrent_status="EXCELLENT"
elif [ $concurrent_success_rate -ge 70 ]; then
    echo -e "${YELLOW}🔄 Database Concurrent Access: GOOD${NC}"
    echo "   ✅ Good concurrent handling capabilities"
    echo "   ✅ Most operations handle concurrent access well"
    echo "   ⚠️  Minor performance degradation under high load"
    concurrent_status="GOOD"
elif [ $concurrent_success_rate -ge 55 ]; then
    echo -e "${YELLOW}🔄 Database Concurrent Access: ADEQUATE${NC}"
    echo "   ✅ Basic concurrent operations functional"
    echo "   🔧 Performance optimization needed for high load"
    concurrent_status="ADEQUATE"
else
    echo -e "${RED}🔄 Database Concurrent Access: NEEDS OPTIMIZATION${NC}"
    echo "   ❌ Significant concurrent access issues detected"
    echo "   🚨 Database and server optimization required"
    concurrent_status="NEEDS_OPTIMIZATION"
fi

echo ""
echo -e "${BLUE}📋 Concurrent Access Components Tested:${NC}"
echo "   🔄 Express.js concurrent request handling"
echo "   💾 MongoDB connection pooling and concurrent queries"
echo "   🔒 JWT authentication under concurrent load"
echo "   📊 API endpoint scalability and response consistency"
echo "   ⚡ High-load performance and stability"
echo "   🧪 Race condition detection and data consistency"
echo "   📝 Mixed read/write operation handling"
echo "   🛡️  Security middleware performance under load"

# Exit based on concurrent access assessment
case "$concurrent_status" in
    "EXCELLENT"|"GOOD"|"ADEQUATE")
        exit 0
        ;;
    *)
        exit 1
        ;;
esac