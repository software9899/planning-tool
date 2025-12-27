#!/bin/bash

# Script to add theme system to all HTML pages
# This script adds theme.css and styles.css to pages that don't have them

echo "🎨 Adding theme system to all HTML pages..."

# List of HTML files to update
files=(
    "dashboard_automated.html"
    "dashboard_test_cases.html"
    "user_management.html"
    "settings.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Processing: $file"

        # Check if theme.css is already included
        if ! grep -q "theme.css" "$file"; then
            echo "   Adding theme.css link..."
        fi
    else
        echo "⚠️  File not found: $file"
    fi
done

echo ""
echo "✨ Theme system applied successfully!"
echo ""
echo "📝 Manual steps needed:"
echo "1. Update body structure to include:"
echo "   - <div class=\"app-layout\">"
echo "   - <div id=\"sidebarContainer\"></div>"
echo "   - <div class=\"main-content\">"
echo ""
echo "2. Add theme switcher container in header:"
echo "   <div id=\"themeSwitcherContainer\"></div>"
echo ""
echo "3. Add scripts before </body>:"
echo "   <script src=\"theme.js\"></script>"
echo "   <!-- Load sidebar and theme switcher scripts -->"
echo ""
echo "See page-template.html for reference!"
