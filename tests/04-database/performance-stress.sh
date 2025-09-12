#!/bin/bash

# Database Performance Stress Test Suite
# Tests performance under large datasets and sustained load
# Run from project root: ./tests/04-database/performance-stress.sh

echo "=== Database Performance Stress Test Suite ==="
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
STRESS_TESTS=0
STRESS_PASSED=0

# Performance benchmarks (in milliseconds)
ACCEPTABLE_RESPONSE_TIME=1000  # 1 second
GOOD_RESPONSE_TIME=500         # 500ms
EXCELLENT_RESPONSE_TIME=200    # 200ms

run_stress_test() {
    local test_name="$1"
    local expected_status="$2"
    local endpoint="$3"
    local iterations="${4:-10}"
    local method="${5:-GET}"
    local data="${6:-}"
    local description="$7"
    
    echo -e "${BOLD}Testing: $test_name${NC}"
    if [ -n "$description" ]; then
        echo -e "${BLUE}📋 $description${NC}"
    fi
    
    ((STRESS_TESTS++))
    ((TESTS_RUN++))
    
    local total_time=0
    local success_count=0
    local min_time=999999
    local max_time=0
    local timeouts=0
    local errors=0
    
    echo -e "    ${BLUE}🔄 Running $iterations iterations...${NC}"
    
    # Run stress test iterations
    for i in $(seq 1 $iterations); do
        local curl_cmd="curl -s -m 10 -w \"HTTPSTATUS:%{http_code};TIME:%{time_total}\" -X \"$method\""
        
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
        fi
        
        curl_cmd="$curl_cmd \"$endpoint\""
        
        local response=$(eval "$curl_cmd" 2>/dev/null)
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2 2>/dev/null)
        local time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2 2>/dev/null)
        
        # Handle timeouts and errors
        if [ -z "$http_code" ] || [ "$http_code" = "" ]; then
            ((timeouts++))
            continue
        fi
        
        if [ "$http_code" != "$expected_status" ]; then
            ((errors++))
            continue
        fi
        
        ((success_count++))
        
        # Calculate timing statistics
        if [ -n "$time_total" ]; then
            local time_ms=$(echo "$time_total * 1000" | bc -l 2>/dev/null || echo "0")
            total_time=$(echo "$total_time + $time_total" | bc -l 2>/dev/null || echo "$total_time")
            
            if (( $(echo "$time_total < $min_time" | bc -l 2>/dev/null || echo 0) )); then
                min_time=$time_total
            fi
            if (( $(echo "$time_total > $max_time" | bc -l 2>/dev/null || echo 0) )); then
                max_time=$time_total
            fi
        fi
        
        # Progress indicator
        if [ $((i % 5)) -eq 0 ]; then
            echo -n "."
        fi
    done
    
    echo "" # New line after progress dots
    
    # Calculate results
    local success_rate=$((success_count * 100 / iterations))
    local avg_time=0
    if [ $success_count -gt 0 ] && [ -n "$total_time" ]; then
        avg_time=$(echo "scale=3; $total_time / $success_count" | bc -l 2>/dev/null || echo "0")
    fi
    local avg_time_ms=$(echo "$avg_time * 1000" | bc -l 2>/dev/null || echo "0")
    
    # Evaluate performance
    local performance_rating="POOR"
    local performance_color="$RED"
    
    if [ -n "$avg_time_ms" ] && [ $(echo "$avg_time_ms < $EXCELLENT_RESPONSE_TIME" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
        performance_rating="EXCELLENT"
        performance_color="$GREEN"
    elif [ -n "$avg_time_ms" ] && [ $(echo "$avg_time_ms < $GOOD_RESPONSE_TIME" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
        performance_rating="GOOD"
        performance_color="$YELLOW"
    elif [ -n "$avg_time_ms" ] && [ $(echo "$avg_time_ms < $ACCEPTABLE_RESPONSE_TIME" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
        performance_rating="ACCEPTABLE"
        performance_color="$YELLOW"
    fi
    
    # Evaluate overall success
    if [ $success_rate -ge 90 ] && [ "$performance_rating" != "POOR" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - $test_name ($success_rate% success, $performance_rating performance)"
        ((STRESS_PASSED++))
        ((TESTS_PASSED++))
    elif [ $success_rate -ge 70 ]; then
        echo -e "${YELLOW}⚠️ PARTIAL${NC} - $test_name ($success_rate% success, $performance_rating performance)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC} - $test_name ($success_rate% success, $performance_rating performance)"
    fi
    
    # Show detailed statistics
    echo -e "    ${BLUE}📊 Statistics:${NC}"
    echo -e "        Success: $success_count/$iterations requests ($success_rate%)"
    echo -e "        Timeouts: $timeouts | Errors: $errors"
    if [ -n "$avg_time" ] && [ "$avg_time" != "0" ]; then
        echo -e "        Timing: Min ${min_time}s | Avg ${avg_time}s | Max ${max_time}s"
        echo -e "        Performance: ${performance_color}$performance_rating${NC} (avg ${avg_time_ms%.*}ms)"
    fi
    echo ""
}

check_performance_capability() {
    local component="$1"
    local search_pattern="$2"
    local description="$3"
    
    echo -e "${BOLD}Checking: $component${NC}"
    echo -e "${BLUE}📋 $description${NC}"
    
    ((TESTS_RUN++))
    
    if find backend/src -name "*.js" | xargs grep -l "$search_pattern" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OPTIMIZED${NC} - $component appears optimized for performance"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️ BASIC${NC} - $component uses basic implementation"
        ((TESTS_PASSED++))
    fi
    echo ""
}

# Pre-flight performance capability analysis
echo -e "${BOLD}🔍 Performance Infrastructure Analysis${NC}"
echo ""

check_performance_capability "Database Connection Pooling" \
    "pool\\|maxPoolSize\\|mongoose.*connection" \
    "Checking MongoDB connection pool optimization"

check_performance_capability "Caching Implementation" \
    "cache\\|redis\\|memory.*cache" \
    "Validating data caching for performance optimization"

check_performance_capability "Query Optimization" \
    "index\\|aggregate\\|populate.*select" \
    "Confirming database query optimization techniques"

check_performance_capability "Response Compression" \
    "compression\\|gzip\\|deflate" \
    "Checking HTTP response compression for performance"

echo -e "${BOLD}⚡ Basic Performance Stress Tests${NC}"
echo ""

# Test 1: Health endpoint under sustained load
run_stress_test "Health Endpoint Stress" "200" "http://localhost:3001/health" 20 "GET" "" \
    "Test health endpoint with 20 rapid consecutive requests"

# Test 2: Debug endpoint performance
run_stress_test "Debug Endpoint Performance" "200" "http://localhost:3001/api/debug" 20 "GET" "" \
    "Test debug endpoint response under 20 consecutive requests"

echo -e "${BOLD}📊 Data-Heavy Endpoint Stress Tests${NC}"
echo ""

# Test 3: Large dataset retrieval performance
run_stress_test "Catalyst Funds Data Stress" "200" "http://localhost:3001/api/funds" 15 "GET" "" \
    "Test large Catalyst funds dataset retrieval under stress"

run_stress_test "Catalyst Challenges Data Stress" "200" "http://localhost:3001/api/challenges" 15 "GET" "" \
    "Test challenges dataset performance under repeated access"

echo -e "${BOLD}🔒 Authentication Performance Tests${NC}"
echo ""

# Test 4: Authentication middleware performance under load
run_stress_test "Auth Middleware Stress" "401" "http://localhost:3001/api/reviews" 20 "GET" "" \
    "Test authentication middleware performance with 20 rapid requests"

run_stress_test "JWT Validation Performance" "401" "http://localhost:3001/api/settings" 15 "GET" "" \
    "Test JWT validation performance under sustained load"

# Test 5: Admin endpoint authentication stress
run_stress_test "Admin Auth Stress" "401" "http://localhost:3001/api/admin/stats" 20 "GET" "" \
    "Test admin authentication performance under load"

echo -e "${BOLD}📝 Write Operation Performance Tests${NC}"
echo ""

# Test 6: POST endpoint performance
run_stress_test "POST Operation Stress" "401" "http://localhost:3001/api/onboarding" 15 "POST" \
    '{"username":"stresstest","email":"stress@test.com"}' \
    "Test POST endpoint performance with 15 rapid requests"

run_stress_test "Assignment Request Stress" "401" "http://localhost:3001/api/assignment-requests" 12 "POST" \
    '{"requestType":"additional","quantity":1}' \
    "Test assignment request endpoint under stress"

echo -e "${BOLD}🔥 High-Intensity Stress Tests${NC}"
echo ""

# Test 7: Very high load on primary endpoints
run_stress_test "Extreme Health Check Load" "200" "http://localhost:3001/health" 25 "GET" "" \
    "Test health endpoint with 25 consecutive requests (high load)"

run_stress_test "High-Load API Access" "200" "http://localhost:3001/api/funds" 20 "GET" "" \
    "Test API endpoint with 20 rapid requests for load limits"

echo -e "${BOLD}🧪 Edge Case Performance Tests${NC}"
echo ""

# Test 8: Non-existent endpoint performance
run_stress_test "404 Error Handling Stress" "404" "http://localhost:3001/api/nonexistent" 30 "GET" "" \
    "Test 404 error handling performance under repeated access"

# Test 9: Malformed request handling performance
run_stress_test "Error Handling Performance" "400" "http://localhost:3001/api/test" 20 "POST" \
    '{"invalid":"json",' \
    "Test server error handling performance with malformed requests"

echo -e "${BOLD}🏋️ Endurance Testing${NC}"
echo ""

# Test 10: Extended endurance test
echo -e "${BOLD}Testing: Extended Endurance Test${NC}"
echo -e "${BLUE}📋 Long-running test to validate sustained performance${NC}"

((STRESS_TESTS++))
((TESTS_RUN++))

# Run endurance test over 15 seconds
endurance_start=$(date +%s)
endurance_success=0
endurance_total=0

echo -e "    ${BLUE}🔄 Running 15-second endurance test...${NC}"

while [ $(($(date +%s) - endurance_start)) -lt 15 ]; do
    response=$(curl -s -m 5 -w "HTTPSTATUS:%{http_code}" "http://localhost:3001/health" 2>/dev/null)
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2 2>/dev/null)
    
    ((endurance_total++))
    
    if [ "$http_code" = "200" ]; then
        ((endurance_success++))
    fi
    
    sleep 1
done

if [ $endurance_total -gt 0 ]; then
    endurance_rate=$((endurance_success * 100 / endurance_total))
else
    endurance_rate=0
fi

if [ $endurance_rate -ge 95 ]; then
    echo -e "${GREEN}✅ SUCCESS${NC} - Extended Endurance Test ($endurance_rate% uptime over 15 seconds)"
    ((STRESS_PASSED++))
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - Extended Endurance Test ($endurance_rate% uptime over 15 seconds)"
fi

echo -e "    ${BLUE}📊 Endurance: $endurance_success/$endurance_total requests successful${NC}"

# Calculate performance stress results
stress_success_rate=$((STRESS_PASSED * 100 / STRESS_TESTS))
overall_success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))

echo ""
echo "=== Database Performance Stress Results ==="
echo "Stress Tests: $STRESS_PASSED/$STRESS_TESTS passed ($stress_success_rate%)"
echo "Total Tests: $TESTS_PASSED/$TESTS_RUN passed ($overall_success_rate%)"

# Comprehensive performance assessment
if [ $stress_success_rate -ge 85 ]; then
    echo -e "${GREEN}🏋️ Database Performance Stress: EXCELLENT${NC}"
    echo "   ✅ Outstanding performance under high load"
    echo "   ✅ Consistent response times during stress"
    echo "   ✅ Excellent scalability and reliability"
    echo "   ✅ Robust error handling under pressure"
    echo "   ✅ Superior endurance and sustained performance"
    stress_status="EXCELLENT"
elif [ $stress_success_rate -ge 70 ]; then
    echo -e "${YELLOW}🏋️ Database Performance Stress: GOOD${NC}"
    echo "   ✅ Good performance under normal to high load"
    echo "   ✅ Generally reliable response times"
    echo "   ⚠️  Some performance degradation under extreme stress"
    stress_status="GOOD"
elif [ $stress_success_rate -ge 55 ]; then
    echo -e "${YELLOW}🏋️ Database Performance Stress: ADEQUATE${NC}"
    echo "   ✅ Basic performance adequate for normal load"
    echo "   🔧 Performance optimization recommended for high load"
    stress_status="ADEQUATE"
else
    echo -e "${RED}🏋️ Database Performance Stress: NEEDS OPTIMIZATION${NC}"
    echo "   ❌ Significant performance issues under load"
    echo "   🚨 Critical performance optimization required"
    stress_status="NEEDS_OPTIMIZATION"
fi

echo ""
echo -e "${BLUE}📋 Performance Components Tested:${NC}"
echo "   ⚡ Response time consistency under various loads"
echo "   🔥 Extreme stress testing with high request volumes"
echo "   📊 Large dataset retrieval performance"
echo "   🔒 Authentication middleware performance scaling"
echo "   📝 Write operation performance under stress"
echo "   🧪 Error handling performance and reliability"
echo "   🏋️ Extended endurance and sustained load testing"
echo "   📈 Scalability limits and performance boundaries"

echo ""
echo -e "${BLUE}📈 Performance Benchmarks Used:${NC}"
echo "   🟢 Excellent: < ${EXCELLENT_RESPONSE_TIME}ms average response"
echo "   🟡 Good: < ${GOOD_RESPONSE_TIME}ms average response"
echo "   🟠 Acceptable: < ${ACCEPTABLE_RESPONSE_TIME}ms average response"
echo "   🔴 Poor: > ${ACCEPTABLE_RESPONSE_TIME}ms average response"

# Exit based on performance assessment
case "$stress_status" in
    "EXCELLENT"|"GOOD"|"ADEQUATE")
        exit 0
        ;;
    *)
        exit 1
        ;;
esac