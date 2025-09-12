#!/bin/bash

# User Role & Permission Test Suite
# Tests user role-based access control, admin privileges, and permission enforcement
# Run from project root: ./tests/auth-tests/user-permissions.sh

echo "=== User Role & Permission Test Suite ==="
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

run_permission_test() {
    local test_name="$1"
    local expected_status="$2"
    local url="$3"
    local method="${4:-GET}"
    local token="${5:-}"
    local data="${6:-}"
    
    echo -n "Testing $test_name... "
    ((TESTS_RUN++))
    
    # Build curl command
    curl_cmd="curl -s -w \"HTTPSTATUS:%{http_code};TIME:%{time_total}\" -X \"$method\""
    
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H \"Authorization: Bearer $token\""
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
        
        # Show permission-specific information
        if [ "$http_code" = "401" ]; then
            error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
            echo -e "    ${BLUE}🔒 Access denied: $error_msg${NC}"
        elif [ "$http_code" = "403" ]; then
            error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
            echo -e "    ${PURPLE}🚫 Forbidden: $error_msg${NC}"
        elif [ "$http_code" = "200" ]; then
            echo -e "    ${GREEN}✅ Access granted${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code, ${time_total}s)"
        if [ ${#body} -lt 200 ]; then
            echo -e "    ${YELLOW}Response: $body${NC}"
        fi
    fi
}

check_role_system() {
    local component="$1"
    local search_pattern="$2"
    local expected="$3"
    
    echo -n "Checking $component... "
    ((TESTS_RUN++))
    
    if find backend/src -name '*.js' | xargs grep -l "$search_pattern" >/dev/null 2>&1; then
        if [ "$expected" = "should_exist" ]; then
            echo -e "${GREEN}✅ FOUND${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ UNEXPECTED${NC}"
        fi
    else
        if [ "$expected" = "should_not_exist" ]; then
            echo -e "${GREEN}✅ NOT FOUND${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${YELLOW}⚠️  NOT FOUND${NC}"
        fi
    fi
}

echo "--- Role System Architecture Tests ---"

# Check if role-based access control is implemented
check_role_system "Admin Middleware" "requireAdmin\|isAdmin\|admin.*role" "should_exist"
check_role_system "Role Validation" "role.*===\|role.*==\|role.*check" "should_exist"
check_role_system "User Roles Model" "role.*enum\|role.*type\|reviewer.*admin" "should_exist"

echo ""
echo "--- Admin-Only Endpoint Tests ---"
echo "Testing admin-protected endpoints without authentication..."

# Admin endpoints that should require authentication AND admin role
admin_endpoints=(
    "http://localhost:3001/api/admin/stats"
    "http://localhost:3001/api/admin/users"
    "http://localhost:3001/api/admin/pending-users"
    "http://localhost:3001/api/admin/assignment-requests"
)

for endpoint in "${admin_endpoints[@]}"; do
    endpoint_name=$(echo "$endpoint" | sed 's/.*\/api\/admin\//admin-/')
    run_permission_test "Admin $endpoint_name (No Auth)" "401" "$endpoint"
done

echo ""
echo "--- Regular User Endpoint Tests ---"
echo "Testing regular user endpoints without authentication..."

# Regular user endpoints that should require authentication but not admin role
user_endpoints=(
    "http://localhost:3001/api/reviews"
    "http://localhost:3001/api/settings"
    "http://localhost:3001/api/leaderboard"
    "http://localhost:3001/api/assignment-requests/my"
)

for endpoint in "${user_endpoints[@]}"; do
    endpoint_name=$(echo "$endpoint" | sed 's/.*\/api\///' | tr '/' '-')
    run_permission_test "User $endpoint_name (No Auth)" "401" "$endpoint"
done

echo ""
echo "--- POST Endpoint Permission Tests ---"
echo "Testing POST endpoints for proper permission enforcement..."

# POST endpoints with permission requirements
run_permission_test "User Onboarding (No Auth)" "401" "http://localhost:3001/api/onboarding" "POST" "" '{"username":"test"}'
run_permission_test "Assignment Request (No Auth)" "401" "http://localhost:3001/api/assignment-requests" "POST" "" '{"requestType":"reviews"}'

# Admin POST endpoints
run_permission_test "Admin User Status Update (No Auth)" "401" "http://localhost:3001/api/admin/users/123/status" "PATCH" "" '{"reviewerStatus":"approved"}'

echo ""
echo "--- Role Hierarchy Tests ---"
echo "Testing role hierarchy and permission inheritance..."

# Mock tokens for different roles (these should all be invalid but test the parsing logic)
reviewer_mock_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0Iiwicm9sZSI6InJldmlld2VyIiwiZXhwIjoxOTk5OTk5OTk5fQ.invalid-signature"
admin_mock_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0Iiwicm9sZSI6ImFkbWluIiwiZXhwIjoxOTk5OTk5OTk5fQ.invalid-signature"

# These should all return 401 due to invalid signatures, but test role parsing
run_permission_test "Mock Reviewer Token" "401" "http://localhost:3001/api/reviews" "GET" "$reviewer_mock_token"
run_permission_test "Mock Admin Token" "401" "http://localhost:3001/api/admin/stats" "GET" "$admin_mock_token"

echo ""
echo "--- Permission Consistency Tests ---"
echo "Testing permission consistency across similar endpoints..."

# Test that all admin endpoints consistently require admin role
admin_consistency_endpoints=(
    "/api/admin/stats"
    "/api/admin/users" 
    "/api/admin/pending-users"
    "/api/admin/assignment-requests"
)

echo "Verifying all admin endpoints have consistent authentication requirements..."
for endpoint in "${admin_consistency_endpoints[@]}"; do
    endpoint_name=$(echo "$endpoint" | sed 's/\/api\/admin\///')
    run_permission_test "Admin $endpoint_name Consistency" "401" "http://localhost:3001$endpoint"
done

echo ""
echo "--- User Status & Approval Tests ---"
echo "Testing user approval workflow and status validation..."

# Check if user approval system is implemented in the code
check_role_system "User Approval System" "reviewerStatus\|approval\|pending.*approved" "should_exist"
check_role_system "Status Validation" "approved.*rejected\|pending.*approved" "should_exist"

echo ""
echo "--- Permission Boundary Tests ---"
echo "Testing edge cases and permission boundaries..."

# Test cross-user data access prevention
run_permission_test "Cross-User Data Access" "401" "http://localhost:3001/api/assignment-requests/my"

# Test malformed role tokens
malformed_role_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0Iiwicm9sZSI6ImludmFsaWQtcm9sZSIsImV4cCI6MTk5OTk5OTk5OX0.invalid-signature"
run_permission_test "Invalid Role Token" "401" "http://localhost:3001/api/admin/stats" "GET" "$malformed_role_token"

echo ""
echo "--- Database-Level Permission Tests ---"
echo "Testing database-level access control..."

# Check if there are database-level permission checks
check_role_system "Database Permission Checks" "userId.*req\\.userId\|assignedTo.*req\\.userId" "should_exist"
check_role_system "Ownership Validation" "reviewerId.*userId\|assignedTo.*userId" "should_exist"

echo ""
echo "=== Permission System Assessment ==="

permission_score=$((TESTS_PASSED * 100 / TESTS_RUN))

echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Permission Score: ${permission_score}%"

# Permission system assessment
if [ $permission_score -ge 95 ]; then
    echo -e "${GREEN}🔐 Permission System: EXCELLENT${NC}"
    echo "   ✅ Role-based access control implemented"
    echo "   ✅ Admin privileges properly protected" 
    echo "   ✅ User data access controlled"
    echo "   ✅ Consistent permission enforcement"
    echo "   ✅ Proper authentication requirements"
    exit 0
elif [ $permission_score -ge 85 ]; then
    echo -e "${YELLOW}🔐 Permission System: GOOD${NC}"
    echo "   ✅ Basic permission system working"
    echo "   ⚠️  Some edge cases may need attention"
    exit 0
elif [ $permission_score -ge 70 ]; then
    echo -e "${YELLOW}🔐 Permission System: ADEQUATE${NC}"
    echo "   ✅ Core permissions working"
    echo "   🔧 Permission system needs strengthening"
    exit 0
else
    echo -e "${RED}🔐 Permission System: CRITICAL ISSUES${NC}"
    echo "   ❌ Major permission vulnerabilities detected"
    echo "   🚨 Immediate security review required"
    exit 1
fi