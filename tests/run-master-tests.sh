#!/bin/bash

# Master Test Runner - Comprehensive Test Suite
# Executes all test categories with detailed reporting and analysis
# Run from project root: ./tests/run-master-tests.sh

echo "========================================================================"
echo "                    PROPOSAL REVIEWING TOOL"
echo "                   COMPREHENSIVE TEST SUITE"
echo "========================================================================"
echo "Execution Date: $(date)"
echo "Test Suite Version: 1.0"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Global counters
TOTAL_CATEGORIES=0
CATEGORIES_PASSED=0
TOTAL_SCRIPTS=0
SCRIPTS_PASSED=0
TOTAL_TESTS=0
TESTS_PASSED=0

# Results tracking
RESULTS_DIR="tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MASTER_REPORT="$RESULTS_DIR/master_test_report_$TIMESTAMP.md"
SUMMARY_LOG="$RESULTS_DIR/test_summary_$TIMESTAMP.log"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize report
cat > "$MASTER_REPORT" << 'EOF'
# Comprehensive Test Report - Proposal Reviewing Tool

## Executive Summary

This report presents the results of comprehensive testing across all system components of the Proposal Reviewing Tool prototype. Testing was conducted to validate functionality, performance, security, and integration across the full technology stack.

## Test Execution Overview

EOF

echo "Date: $(date)" >> "$MASTER_REPORT"
echo "Test Suite Version: 1.0" >> "$MASTER_REPORT"
echo "" >> "$MASTER_REPORT"

# Function to run test category
run_test_category() {
    local category_num="$1"
    local category_name="$2"
    local category_description="$3"
    local category_dir="tests/$category_num-*"
    
    echo ""
    echo "========================================================================"
    echo -e "${BOLD}${CYAN}CATEGORY $category_num: $category_name${NC}"
    echo "========================================================================"
    echo -e "${BLUE}$category_description${NC}"
    echo ""
    
    ((TOTAL_CATEGORIES++))
    
    # Find category directory
    local actual_dir=$(find tests -maxdepth 1 -name "$category_num-*" -type d | head -1)
    
    if [ -z "$actual_dir" ]; then
        echo -e "${RED}❌ CATEGORY NOT FOUND${NC} - Directory $category_dir does not exist"
        echo "## $category_name - NOT FOUND" >> "$MASTER_REPORT"
        echo "" >> "$MASTER_REPORT"
        return 1
    fi
    
    # Initialize category results
    local category_scripts=0
    local category_passed=0
    local category_start_time=$(date +%s)
    
    # Add category to report
    echo "## $category_name" >> "$MASTER_REPORT"
    echo "" >> "$MASTER_REPORT"
    echo "$category_description" >> "$MASTER_REPORT"
    echo "" >> "$MASTER_REPORT"
    echo "| Test Script | Status | Duration | Details |" >> "$MASTER_REPORT"
    echo "|-------------|--------|----------|---------|" >> "$MASTER_REPORT"
    
    # Run all test scripts in category
    for test_script in "$actual_dir"/*.sh; do
        if [ -f "$test_script" ]; then
            local script_name=$(basename "$test_script" .sh)
            ((category_scripts++))
            ((TOTAL_SCRIPTS++))
            
            echo -e "${BOLD}Running: $script_name${NC}"
            echo "----------------------------------------"
            
            local script_start_time=$(date +%s)
            local log_file="$RESULTS_DIR/${category_num}_${script_name}_$TIMESTAMP.log"
            
            # Execute test script and capture output
            if "$test_script" > "$log_file" 2>&1; then
                local script_end_time=$(date +%s)
                local script_duration=$((script_end_time - script_start_time))
                
                echo -e "${GREEN}✅ SUCCESS${NC} - $script_name (${script_duration}s)"
                ((category_passed++))
                ((SCRIPTS_PASSED++))
                
                # Extract test counts from log
                local test_info=$(tail -10 "$log_file" | grep -E "Tests.*passed|Tests Run.*passed" | head -1)
                local status_info="SUCCESS (${script_duration}s)"
                
                echo "| $script_name | ✅ SUCCESS | ${script_duration}s | $test_info |" >> "$MASTER_REPORT"
                
                # Show brief summary from log
                local brief_summary=$(tail -5 "$log_file" | grep -E "EXCELLENT|GOOD|ADEQUATE" | head -1)
                if [ -n "$brief_summary" ]; then
                    echo -e "    ${BLUE}Result: $(echo "$brief_summary" | sed 's/.*: //')${NC}"
                fi
                
            else
                local script_end_time=$(date +%s)
                local script_duration=$((script_end_time - script_start_time))
                
                echo -e "${RED}❌ FAILED${NC} - $script_name (${script_duration}s)"
                
                echo "| $script_name | ❌ FAILED | ${script_duration}s | Check log file |" >> "$MASTER_REPORT"
                
                # Show error summary
                local error_summary=$(tail -10 "$log_file" | grep -E "FAILED|ERROR|❌" | head -2)
                if [ -n "$error_summary" ]; then
                    echo -e "    ${RED}Error: $(echo "$error_summary" | head -1)${NC}"
                fi
            fi
            echo ""
        fi
    done
    
    local category_end_time=$(date +%s)
    local category_duration=$((category_end_time - category_start_time))
    
    # Category summary
    local category_success_rate=$((category_passed * 100 / category_scripts))
    
    echo "----------------------------------------"
    echo -e "${BOLD}Category Summary: $category_name${NC}"
    echo "Scripts Passed: $category_passed/$category_scripts ($category_success_rate%)"
    echo "Total Duration: ${category_duration}s"
    
    if [ $category_success_rate -ge 80 ]; then
        echo -e "Category Status: ${GREEN}✅ PASSED${NC}"
        ((CATEGORIES_PASSED++))
    elif [ $category_success_rate -ge 60 ]; then
        echo -e "Category Status: ${YELLOW}⚠️ PARTIAL${NC}"
    else
        echo -e "Category Status: ${RED}❌ FAILED${NC}"
    fi
    
    # Add category summary to report
    echo "" >> "$MASTER_REPORT"
    echo "**Category Summary:** $category_passed/$category_scripts scripts passed ($category_success_rate%) in ${category_duration}s" >> "$MASTER_REPORT"
    echo "" >> "$MASTER_REPORT"
    
    return 0
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BOLD}🔍 Checking Test Prerequisites${NC}"
    echo "----------------------------------------"
    
    local prereq_issues=0
    
    # Check if servers are running
    echo -n "Backend Server (http://localhost:3001): "
    if curl -s -m 5 "http://localhost:3001/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Running${NC}"
    else
        echo -e "${RED}❌ Not accessible${NC}"
        ((prereq_issues++))
    fi
    
    echo -n "Frontend Server (http://localhost:3000): "
    if curl -s -m 5 "http://localhost:3000" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Running${NC}"
    else
        echo -e "${YELLOW}⚠️ Not accessible (some tests may fail)${NC}"
    fi
    
    # Check for required tools
    for tool in curl bc; do
        echo -n "$tool: "
        if command -v "$tool" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Available${NC}"
        else
            echo -e "${RED}❌ Missing${NC}"
            ((prereq_issues++))
        fi
    done
    
    echo ""
    
    if [ $prereq_issues -gt 0 ]; then
        echo -e "${RED}❌ $prereq_issues prerequisite issues detected${NC}"
        echo "Please ensure the backend server is running and required tools are installed."
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
    fi
    echo ""
}

# Function to generate final report
generate_final_report() {
    echo ""
    echo "========================================================================"
    echo -e "${BOLD}${CYAN}COMPREHENSIVE TEST RESULTS SUMMARY${NC}"
    echo "========================================================================"
    
    local overall_success_rate=$((SCRIPTS_PASSED * 100 / TOTAL_SCRIPTS))
    local category_success_rate=$((CATEGORIES_PASSED * 100 / TOTAL_CATEGORIES))
    
    echo -e "${BOLD}Test Categories:${NC} $CATEGORIES_PASSED/$TOTAL_CATEGORIES passed ($category_success_rate%)"
    echo -e "${BOLD}Test Scripts:${NC} $SCRIPTS_PASSED/$TOTAL_SCRIPTS passed ($overall_success_rate%)"
    
    # Overall assessment
    echo ""
    if [ $overall_success_rate -ge 85 ] && [ $category_success_rate -ge 80 ]; then
        echo -e "${GREEN}🏆 OVERALL STATUS: EXCELLENT${NC}"
        echo "   ✅ System demonstrates high quality and reliability"
        echo "   ✅ All major components functioning correctly"
        echo "   ✅ Ready for production deployment consideration"
    elif [ $overall_success_rate -ge 70 ] && [ $category_success_rate -ge 60 ]; then
        echo -e "${YELLOW}👍 OVERALL STATUS: GOOD${NC}"
        echo "   ✅ System core functionality is solid"
        echo "   ⚠️  Some components may need minor improvements"
        echo "   ✅ Suitable for continued development and testing"
    elif [ $overall_success_rate -ge 50 ]; then
        echo -e "${YELLOW}🔧 OVERALL STATUS: NEEDS IMPROVEMENT${NC}"
        echo "   ⚠️  System has functional issues requiring attention"
        echo "   🔧 Several components need development work"
        echo "   📋 Detailed review of failed tests recommended"
    else
        echo -e "${RED}🚨 OVERALL STATUS: CRITICAL ISSUES${NC}"
        echo "   ❌ System has significant functionality problems"
        echo "   🚨 Major development work required before deployment"
        echo "   📋 Comprehensive system review necessary"
    fi
    
    # Add final summary to report
    cat >> "$MASTER_REPORT" << EOF

## Final Assessment

### Test Execution Statistics
- **Test Categories:** $CATEGORIES_PASSED/$TOTAL_CATEGORIES passed ($category_success_rate%)
- **Test Scripts:** $SCRIPTS_PASSED/$TOTAL_SCRIPTS passed ($overall_success_rate%)
- **Execution Time:** $(date)

### Overall System Status
EOF
    
    if [ $overall_success_rate -ge 85 ] && [ $category_success_rate -ge 80 ]; then
        echo "🏆 **EXCELLENT** - System ready for production consideration" >> "$MASTER_REPORT"
    elif [ $overall_success_rate -ge 70 ] && [ $category_success_rate -ge 60 ]; then
        echo "👍 **GOOD** - System suitable for continued development" >> "$MASTER_REPORT"
    elif [ $overall_success_rate -ge 50 ]; then
        echo "🔧 **NEEDS IMPROVEMENT** - Several components require attention" >> "$MASTER_REPORT"
    else
        echo "🚨 **CRITICAL ISSUES** - Major development work required" >> "$MASTER_REPORT"
    fi
    
    echo "" >> "$MASTER_REPORT"
    echo "### Detailed Test Logs" >> "$MASTER_REPORT"
    echo "Individual test logs are available in the \`tests/results/\` directory:" >> "$MASTER_REPORT"
    
    for log_file in "$RESULTS_DIR"/*_$TIMESTAMP.log; do
        if [ -f "$log_file" ]; then
            local log_name=$(basename "$log_file")
            echo "- \`$log_name\`" >> "$MASTER_REPORT"
        fi
    done
    
    echo ""
    echo -e "${BOLD}📊 Reports Generated:${NC}"
    echo -e "  📄 Master Report: ${BLUE}$MASTER_REPORT${NC}"
    echo -e "  📋 Individual Logs: ${BLUE}$RESULTS_DIR/*_$TIMESTAMP.log${NC}"
    
    # Create summary log
    {
        echo "=== TEST EXECUTION SUMMARY ==="
        echo "Date: $(date)"
        echo "Categories: $CATEGORIES_PASSED/$TOTAL_CATEGORIES ($category_success_rate%)"
        echo "Scripts: $SCRIPTS_PASSED/$TOTAL_SCRIPTS ($overall_success_rate%)"
        echo "Status: $([ $overall_success_rate -ge 70 ] && echo "PASSED" || echo "NEEDS_WORK")"
    } > "$SUMMARY_LOG"
    
    echo ""
    echo "========================================================================"
    echo -e "${BOLD}Test execution completed. Check reports for detailed analysis.${NC}"
    echo "========================================================================"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Show header and check prerequisites
    check_prerequisites
    
    echo -e "${BOLD}Starting comprehensive test execution...${NC}"
    echo ""
    
    # Execute test categories
    run_test_category "01" "Core System Functionality" \
        "Tests fundamental system components including server health, database connectivity, and basic security measures."
    
    run_test_category "02" "Authentication & Authorization" \
        "Validates JWT token security, Supabase integration, and role-based access control mechanisms."
    
    run_test_category "03" "End-to-End Business Workflows" \
        "Tests complete user journeys from onboarding through proposal review submission and admin management."
    
    run_test_category "04" "Database Performance & Integrity" \
        "Evaluates database operations under various loads, data consistency, and concurrent access scenarios."
    
    run_test_category "05" "Frontend & Integration Testing" \
        "Assesses frontend performance, SSR functionality, and frontend-backend API integration."
    
    # Generate final report and summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    generate_final_report
    
    echo ""
    echo -e "${BOLD}Total Execution Time: ${total_duration}s${NC}"
    
    # Exit with appropriate code
    local overall_success_rate=$((SCRIPTS_PASSED * 100 / TOTAL_SCRIPTS))
    if [ $overall_success_rate -ge 70 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script interruption
cleanup() {
    echo ""
    echo -e "${YELLOW}Test execution interrupted. Partial results may be available in:${NC}"
    echo -e "  📄 $MASTER_REPORT"
    echo -e "  📋 $RESULTS_DIR/"
    exit 130
}

trap cleanup INT TERM

# Usage information
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Master Test Runner for Proposal Reviewing Tool"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo "  --version     Show version information"
    echo ""
    echo "This script runs all test categories and generates comprehensive reports."
    echo "Ensure both frontend (localhost:3000) and backend (localhost:3001) servers are running."
    echo ""
    echo "Results will be saved in tests/results/ directory."
    exit 0
fi

if [ "$1" = "--version" ]; then
    echo "Master Test Runner v1.0"
    echo "Proposal Reviewing Tool Test Suite"
    exit 0
fi

# Run main function
main "$@"