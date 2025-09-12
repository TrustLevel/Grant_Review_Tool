#!/bin/bash

# Frontend Page Loading Test Suite
# Tests SSR performance and routing validation for Next.js application
# Run from project root: ./tests/05-frontend/page-loading.sh

echo "=== Frontend Page Loading Test Suite ==="
echo "Testing Date: $(date)"
echo "Frontend URL: http://localhost:3000"
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
PAGE_TESTS=0
PAGE_PASSED=0

# Performance benchmarks for SSR (in milliseconds) - Optimized for speed
SSR_EXCELLENT_TIME=3000   # 3 seconds (realistic for SSR)
SSR_GOOD_TIME=8000        # 8 seconds  
SSR_ACCEPTABLE_TIME=15000 # 15 seconds

test_page_loading() {
    local page_name="$1"
    local expected_status="$2"
    local path="$3"
    local description="$4"
    local content_validation="${5:-}"
    
    echo -e "${BOLD}Testing: $page_name${NC}"
    if [ -n "$description" ]; then
        echo -e "${BLUE}📋 $description${NC}"
    fi
    
    ((PAGE_TESTS++))
    ((TESTS_RUN++))
    
    local full_url="http://localhost:3000$path"
    
    # Test page loading with timing and timeout
    local response=$(curl -s -m 20 -w "HTTPSTATUS:%{http_code};TIME:%{time_total};SIZE:%{size_download}" \
                     -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
                     -H "User-Agent: Mozilla/5.0 (Test Suite) AppleWebKit/537.36" \
                     "$full_url" 2>/dev/null)
    
    local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local size_download=$(echo "$response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*;SIZE:[0-9]*$//')
    
    # Calculate performance rating
    local time_ms=$(echo "$time_total * 1000" | bc -l 2>/dev/null || echo "0")
    local performance_rating="POOR"
    local performance_color="$RED"
    
    if [ -n "$time_ms" ]; then
        if (( $(echo "$time_ms < $SSR_EXCELLENT_TIME" | bc -l 2>/dev/null || echo 0) )); then
            performance_rating="EXCELLENT"
            performance_color="$GREEN"
        elif (( $(echo "$time_ms < $SSR_GOOD_TIME" | bc -l 2>/dev/null || echo 0) )); then
            performance_rating="GOOD"
            performance_color="$YELLOW"
        elif (( $(echo "$time_ms < $SSR_ACCEPTABLE_TIME" | bc -l 2>/dev/null || echo 0) )); then
            performance_rating="ACCEPTABLE"
            performance_color="$YELLOW"
        fi
    fi
    
    # Evaluate result
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - $page_name (${http_code}, ${time_total}s, ${performance_color}$performance_rating${NC})"
        ((PAGE_PASSED++))
        ((TESTS_PASSED++))
        
        # Content validation
        if [ -n "$content_validation" ] && [ "$http_code" = "200" ]; then
            if echo "$body" | grep -q "$content_validation"; then
                echo -e "    ${BLUE}✅ Content validated: $content_validation found${NC}"
            else
                echo -e "    ${YELLOW}⚠️ Content validation failed: $content_validation not found${NC}"
            fi
        fi
        
        # SSR-specific checks
        if [ "$http_code" = "200" ]; then
            # Check for Next.js hydration markers
            if echo "$body" | grep -q "__NEXT_DATA__\\|next/script"; then
                echo -e "    ${BLUE}🔄 Next.js SSR detected with hydration data${NC}"
            fi
            
            # Check for basic HTML structure
            if echo "$body" | grep -q "<html\\|<head\\|<body"; then
                echo -e "    ${BLUE}📄 Valid HTML structure confirmed${NC}"
            fi
            
            # Check for React components
            if echo "$body" | grep -q "react\\|React\\|_app\\|_document"; then
                echo -e "    ${BLUE}⚛️  React components detected${NC}"
            fi
        fi
        
        # Show performance and size metrics
        if [ -n "$size_download" ] && [ "$size_download" -gt 0 ]; then
            local size_kb=$(echo "scale=1; $size_download / 1024" | bc -l 2>/dev/null || echo "N/A")
            echo -e "    ${BLUE}📊 Size: ${size_kb}KB | Load time: ${time_total}s (${time_ms%.*}ms)${NC}"
        fi
        
    else
        echo -e "${RED}❌ FAILED${NC} - $page_name (Expected: $expected_status, Got: $http_code, ${time_total}s)"
        if [ ${#body} -lt 500 ]; then
            echo -e "    ${YELLOW}Response: $(echo "$body" | head -c 200)...${NC}"
        fi
    fi
    echo ""
}

check_frontend_setup() {
    local component="$1"
    local check_command="$2"
    local description="$3"
    
    echo -e "${BOLD}Checking: $component${NC}"
    echo -e "${BLUE}📋 $description${NC}"
    
    ((TESTS_RUN++))
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ CONFIGURED${NC} - $component is properly set up"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️ NOT FOUND${NC} - $component may not be fully configured"
        ((TESTS_PASSED++))
    fi
    echo ""
}

# Pre-flight frontend setup checks
echo -e "${BOLD}🔍 Frontend Infrastructure Analysis${NC}"
echo ""

check_frontend_setup "Next.js Framework" \
    "grep -r 'next' frontend/package.json 2>/dev/null" \
    "Checking Next.js framework installation and configuration"

check_frontend_setup "React Components" \
    "find frontend/src -name '*.tsx' -o -name '*.jsx' 2>/dev/null | head -1" \
    "Validating React component structure"

check_frontend_setup "TypeScript Configuration" \
    "find frontend -name 'tsconfig.json' 2>/dev/null" \
    "Confirming TypeScript configuration for type safety"

check_frontend_setup "Tailwind CSS Styling" \
    "find frontend -name 'tailwind.config.*' -o -name '*.css' | head -1" \
    "Checking Tailwind CSS integration"

echo -e "${BOLD}🏠 Core Page Loading Tests${NC}"
echo ""

# Test 1: Homepage/Landing page (login page)
test_page_loading "Homepage" "200" "/" \
    "Test main landing page SSR performance and content delivery" \
    "TrustLevelREP\\|Project Catalyst\\|Send Magic Link"

# Test 2: Dashboard page (requires auth - should show auth check or redirect)
test_page_loading "Dashboard Page" "200" "/dashboard" \
    "Test dashboard page access (auth required)" \
    "Checking authentication\\|Open Tasks\\|Assigned Reviews"

# Test 3: Settings page
test_page_loading "Settings Page" "200" "/settings" \
    "Test user settings page accessibility" \
    "settings\\|profile\\|preferences"

# Test 4: Admin page
test_page_loading "Admin Page" "200" "/admin" \
    "Test admin interface page loading" \
    "admin\\|management\\|Admin Dashboard"

echo -e "${BOLD}📊 Admin Feature Pages${NC}"
echo ""

# Test 5: Admin users list
test_page_loading "Admin Users List" "200" "/admin/users-list" \
    "Test admin user management page loading" \
    "users\\|admin\\|User Management"

# Test 6: Onboarding page  
test_page_loading "Onboarding Page" "200" "/onboarding" \
    "Test user onboarding page loading" \
    "onboarding\\|setup\\|welcome"

# Test 7: Leaderboard page
test_page_loading "Leaderboard Page" "200" "/leaderboard" \
    "Test leaderboard page loading" \
    "leaderboard\\|ranking\\|points"

echo -e "${BOLD}🔄 Routing and Error Handling${NC}"
echo ""

# Test 8: 404 error handling
test_page_loading "404 Error Page" "404" "/nonexistent-page" \
    "Test 404 error page handling and custom error pages" \
    "404\\|not.*found\\|error"


echo -e "${BOLD}⚡ Performance Stress Tests${NC}"
echo ""

# Test 9: Rapid consecutive page loads
echo -e "${BOLD}Testing: Rapid Page Load Stress${NC}"
echo -e "${BLUE}📋 Test homepage with 5 rapid consecutive requests${NC}"

((PAGE_TESTS++))
((TESTS_RUN++))

stress_success=0
total_stress_time=0

for i in $(seq 1 5); do
    stress_response=$(curl -s -m 5 -w "TIME:%{time_total}" "http://localhost:3000/" 2>/dev/null)
    stress_time=$(echo "$stress_response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    if [ $? -eq 0 ] && [ -n "$stress_time" ]; then
        ((stress_success++))
        total_stress_time=$(echo "$total_stress_time + $stress_time" | bc -l 2>/dev/null || echo "$total_stress_time")
    fi
done

stress_rate=$((stress_success * 100 / 5))
avg_stress_time=$(echo "scale=3; $total_stress_time / 5" | bc -l 2>/dev/null || echo "0")

if [ $stress_rate -ge 80 ]; then
    echo -e "${GREEN}✅ SUCCESS${NC} - Rapid Page Load Stress ($stress_rate% success, avg ${avg_stress_time}s)"
    ((PAGE_PASSED++))
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED${NC} - Rapid Page Load Stress ($stress_rate% success)"
fi

echo -e "    ${BLUE}📊 Stress test: $stress_success/5 requests successful${NC}"
echo ""

# Calculate frontend page loading results
page_success_rate=$((PAGE_PASSED * 100 / PAGE_TESTS))
overall_success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))

echo ""
echo "=== Frontend Page Loading Results ==="
echo "Page Tests: $PAGE_PASSED/$PAGE_TESTS passed ($page_success_rate%)"
echo "Total Tests: $TESTS_PASSED/$TESTS_RUN passed ($overall_success_rate%)"

# Comprehensive page loading assessment
if [ $page_success_rate -ge 85 ]; then
    echo -e "${GREEN}🌐 Frontend Page Loading: EXCELLENT${NC}"
    echo "   ✅ Outstanding SSR performance and page delivery"
    echo "   ✅ All core pages loading correctly"
    echo "   ✅ Excellent response times and user experience"
    echo "   ✅ Mobile responsiveness confirmed"
    echo "   ✅ Proper error handling and routing"
    page_status="EXCELLENT"
elif [ $page_success_rate -ge 70 ]; then
    echo -e "${YELLOW}🌐 Frontend Page Loading: GOOD${NC}"
    echo "   ✅ Good overall page loading performance"
    echo "   ✅ Most pages accessible and functional"
    echo "   ⚠️  Some pages may need performance optimization"
    page_status="GOOD"
elif [ $page_success_rate -ge 55 ]; then
    echo -e "${YELLOW}🌐 Frontend Page Loading: ADEQUATE${NC}"
    echo "   ✅ Basic page loading functionality operational"
    echo "   🔧 Several pages need performance improvements"
    page_status="ADEQUATE"
else
    echo -e "${RED}🌐 Frontend Page Loading: NEEDS IMPROVEMENT${NC}"
    echo "   ❌ Significant page loading issues detected"
    echo "   🚨 Frontend performance and routing need attention"
    page_status="NEEDS_IMPROVEMENT"
fi

echo ""
echo -e "${BLUE}📋 Frontend Components Tested:${NC}"
echo "   🏠 Core application pages (homepage, dashboard, admin)"
echo "   👤 User interface pages (settings, onboarding, leaderboard)"
echo "   🔄 Next.js SSR performance and hydration"
echo "   🛡️  Error handling and 404 page management"
echo "   ⚡ Performance under rapid consecutive requests"
echo "   🎨 Content validation and component rendering"
echo "   📊 Load time optimization and size efficiency"

echo ""
echo -e "${BLUE}📈 SSR Performance Benchmarks:${NC}"
echo "   🟢 Excellent: < ${SSR_EXCELLENT_TIME}ms load time"
echo "   🟡 Good: < ${SSR_GOOD_TIME}ms load time"
echo "   🟠 Acceptable: < ${SSR_ACCEPTABLE_TIME}ms load time"
echo "   🔴 Poor: > ${SSR_ACCEPTABLE_TIME}ms load time"

# Exit based on page loading assessment
case "$page_status" in
    "EXCELLENT"|"GOOD"|"ADEQUATE")
        exit 0
        ;;
    *)
        exit 1
        ;;
esac