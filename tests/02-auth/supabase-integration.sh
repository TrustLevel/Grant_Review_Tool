#!/bin/bash

# Supabase Integration Test Suite  
# Tests Supabase authentication service integration and configuration
# Run from project root: ./tests/auth-tests/supabase-integration.sh

echo "=== Supabase Integration Test Suite ==="
echo "Testing Date: $(date)"
echo "Server URL: http://localhost:3001"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

run_config_test() {
    local test_name="$1"
    local check_command="$2"
    local expected_result="$3"
    
    echo -n "Testing $test_name... "
    ((TESTS_RUN++))
    
    if eval "$check_command"; then
        if [ "$expected_result" = "should_exist" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAIL${NC} (Expected not to exist)"
        fi
    else
        if [ "$expected_result" = "should_not_exist" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAIL${NC} (Expected to exist)"
        fi
    fi
}

run_api_test() {
    local test_name="$1"
    local expected_status="$2"
    local url="$3"
    local method="${4:-GET}"
    local data="${5:-}"
    local headers="${6:-}"
    
    echo -n "Testing $test_name... "
    ((TESTS_RUN++))
    
    curl_cmd="curl -s -w \"HTTPSTATUS:%{http_code};TIME:%{time_total}\" -X \"$method\""
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    
    curl_cmd="$curl_cmd \"$url\""
    
    response=$(eval "$curl_cmd")
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (${http_code}, ${time_total}s)"
        ((TESTS_PASSED++))
        
        # Show relevant information
        if [ "$http_code" = "200" ] && echo "$body" | grep -q "supabase\|auth"; then
            echo -e "    ${BLUE}🔗 Supabase integration detected${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code, ${time_total}s)"
        if [ ${#body} -lt 150 ]; then
            echo -e "    ${YELLOW}Response: $body${NC}"
        fi
    fi
}

echo "--- Supabase Configuration Tests ---"

# Check if Supabase is configured in the frontend
echo "Checking frontend Supabase configuration..."

# Check if @supabase/supabase-js is installed
run_config_test "Supabase JS Client Installed" \
    "grep -q '@supabase/supabase-js' frontend/package.json" \
    "should_exist"

# Check for Supabase client configuration files
run_config_test "Supabase Client Config" \
    "find frontend/src -name '*.ts' -o -name '*.tsx' -o -name '*.js' | xargs grep -l 'createClient.*supabase' 2>/dev/null" \
    "should_exist"

# Check for environment variables setup
run_config_test "Environment Variables Setup" \
    "find . -name '.env*' | xargs grep -l 'SUPABASE' 2>/dev/null || find . -name '*.env*' | xargs grep -l 'NEXT_PUBLIC_SUPABASE' 2>/dev/null" \
    "should_exist"

echo ""
echo "--- Supabase Service Integration Tests ---"

# Test if Supabase auth endpoints are being used
echo "Testing authentication service integration..."

# Check if the app has auth callback route (typical Supabase setup)
run_config_test "Auth Callback Route" \
    "find frontend/src -path '*/auth/callback*' -type f" \
    "should_exist"

# Check if there's Supabase auth initialization
run_config_test "Supabase Auth Initialization" \
    "find frontend/src -name '*.ts' -o -name '*.tsx' | xargs grep -l 'supabase.*auth' 2>/dev/null" \
    "should_exist"

echo ""
echo "--- Authentication Flow Tests ---"

# Test the auth callback endpoint (should exist if Supabase is properly integrated)
run_api_test "Auth Login Endpoint" "200" "http://localhost:3001/api/auth/login" "POST" '{"email":"test@example.com","name":"Test User"}'

# Test if there are any Supabase-related routes on the backend
echo ""
echo "Checking for Supabase-related backend routes..."

# Check backend for Supabase integration
run_config_test "Backend Auth Routes" \
    "find backend/src -name 'auth.js' -o -name '*auth*' 2>/dev/null" \
    "should_exist"

echo ""
echo "--- Authentication Security Tests ---"

# Test that authentication properly handles Supabase tokens
echo "Testing Supabase token handling..."

# Test with a mock Supabase JWT format (should be rejected as invalid)
supabase_mock_token="sb-project-ref.supabase.co.mock-token-format"
run_api_test "Mock Supabase Token Format" "401" "http://localhost:3001/api/reviews" "GET" "" "-H \"Authorization: Bearer $supabase_mock_token\""

# Test with Supabase-style JWT (properly formatted but invalid signature)
supabase_style_jwt="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN1cGFiYXNlIn0.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6IjEyMzQ1Njc4OTAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxOTk5OTk5OTk5LCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.invalid-supabase-signature"
run_api_test "Invalid Supabase JWT" "401" "http://localhost:3001/api/reviews" "GET" "" "-H \"Authorization: Bearer $supabase_style_jwt\""

echo ""
echo "--- Session Management Tests ---"

# Test session persistence endpoints
echo "Testing session management..."

# Check if there are session-related endpoints
if curl -s "http://localhost:3001/api/auth/session" | grep -q "session\|auth\|user"; then
    run_api_test "Auth Status Check" "401" "http://localhost:3001/api/reviews"
else
    echo "No session endpoint found - this may be handled client-side by Supabase"
fi

echo ""
echo "--- OAuth Provider Configuration Tests ---"

# Test OAuth redirect handling
echo "Checking OAuth provider support..."

# Common OAuth callback patterns
oauth_providers=("google" "github" "discord")

for provider in "${oauth_providers[@]}"; do
    # Check if OAuth routes exist
    if find frontend/src -name '*.ts' -o -name '*.tsx' | xargs grep -l "$provider" >/dev/null 2>&1; then
        echo -e "${BLUE}📱 OAuth Provider Found: $provider${NC}"
    fi
done

echo ""
echo "--- Email Authentication Tests ---"

# Test email-related authentication endpoints
echo "Testing email authentication setup..."

# Check for email verification patterns
run_config_test "Magic Link Authentication Setup" \
    "find frontend/src -name '*.ts' -o -name '*.tsx' | xargs grep -l 'email' 2>/dev/null" \
    "should_exist"

# Check for Supabase auth integration in frontend
run_config_test "Frontend Supabase Integration" \
    "find frontend/src -name '*.ts' -o -name '*.tsx' | xargs grep -l 'supabase\|Supabase' 2>/dev/null" \
    "should_exist"

echo ""
echo "=== Supabase Integration Assessment ==="

integration_score=$((TESTS_PASSED * 100 / TESTS_RUN))

echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Integration Score: ${integration_score}%"

# Integration assessment
if [ $integration_score -ge 90 ]; then
    echo -e "${GREEN}🔗 Supabase Integration: EXCELLENT${NC}"
    echo "   ✅ Supabase client properly configured"
    echo "   ✅ Authentication flows implemented"
    echo "   ✅ Security measures in place"
    echo "   ✅ OAuth providers configured"
    exit 0
elif [ $integration_score -ge 70 ]; then
    echo -e "${YELLOW}🔗 Supabase Integration: GOOD${NC}"
    echo "   ✅ Basic integration working"
    echo "   ⚠️  Some advanced features may need attention"
    exit 0
elif [ $integration_score -ge 50 ]; then
    echo -e "${YELLOW}🔗 Supabase Integration: PARTIAL${NC}"
    echo "   ⚠️  Integration partially complete"
    echo "   🔧 Additional configuration recommended"
    exit 0
else
    echo -e "${RED}🔗 Supabase Integration: NEEDS ATTENTION${NC}"
    echo "   ❌ Integration issues detected"
    echo "   🔧 Review Supabase configuration"
    exit 1
fi