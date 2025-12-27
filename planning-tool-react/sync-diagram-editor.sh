#!/bin/bash

# Sync Diagram Editor Files
# This script syncs files from /planning-tool/diagram-editor to the React project

SOURCE_DIR="/Users/testtorial/Documents/MCP/planning-tool/diagram-editor"
TARGET_JS="/Users/testtorial/Documents/MCP/planning-tool/planning-tool-react/public/diagram-editor.js"
TARGET_CSS="/Users/testtorial/Documents/MCP/planning-tool/planning-tool-react/src/css/diagram-editor.css"

echo "🔄 Syncing diagram editor files..."

# Copy JavaScript file
echo "📝 Copying script.js..."
cp "$SOURCE_DIR/script.js" "$TARGET_JS"

# Copy and process CSS file
echo "🎨 Processing style.css with scoping..."
cp "$SOURCE_DIR/style.css" "$TARGET_CSS"

# Scope CSS selectors with .system-flow-page prefix
sed -i '' 's/^\* {/.system-flow-page * {/' "$TARGET_CSS"
sed -i '' 's/^body {/.system-flow-page {/' "$TARGET_CSS"

# Scope class selectors
sed -i '' -E 's/^(\.app-container|\.top-toolbar|\.menu-section|\.hamburger-btn|\.dropdown-menu|\.menu-item|\.menu-separator|\.tool-group|\.tool-btn|\.tool-separator|\.properties-group|\.prop-label|\.zoom-controls|\.zoom-btn|\.zoom-level|\.main-content|\.breadcrumb-container|\.breadcrumb|\.breadcrumb-item|\.breadcrumb-actions|\.breadcrumb-btn|\.back-button|\.canvas-wrapper|\.context-menu|\.context-menu-item|\.context-menu-separator|\.right-sidebar|\.sidebar-header|\.sidebar-content|\.close-sidebar-btn|\.layout-options|\.radio-group|\.radio-label|\.import-btn|\.impact-panel|\.impact-header|\.impact-content|\.impact-hint|\.close-impact-btn|\.comparison-toolbar|\.comparison-buttons|\.comparison-btn|\.exit-comparison-btn|\.bottom-tab-bar|\.bottom-tabs-container|\.bottom-tab|\.bottom-tab-name|\.bottom-tab-close-btn|\.bottom-new-tab-btn) \{/.system-flow-page \1 {/' "$TARGET_CSS"

# Scope ID selectors
sed -i '' -E 's/^(#hamburgerBtn|#dropdownMenu|#recentFilesMenu|#folderFilesMenu|#folderFilesList|#selectTool|#strokeColor|#fillColor|#strokeWidth|#zoomOut|#zoomIn|#zoomReset|#zoomLevel|#canvas|#canvasWrapper|#contextMenu|#rightSidebar|#sidebarTitle|#closeSidebar|#mermaidInput|#mermaidOutput|#importFromSidebar|#applyMermaidChanges|#copyMermaidBtn|#viewMermaidBtn|#importMermaid|#exportMermaid|#exportPNG|#clearCanvas|#saveFile|#saveAsFile|#openFile|#fileInput|#browseFolder|#recentFiles|#connectionEditor|#connectionName|#connectionNote|#saveConnection|#cancelConnection|#connectionTooltip|#shapeImportInput|#arrowStyleSelector|#startArrowType|#endArrowType|#applyArrowStyle|#arrowStyleInMenu|#impactPanel|#impactContent|#closeImpactPanel|#comparisonToolbar|#viewAsIs|#viewToBe|#exitComparison|#breadcrumb|#childShapeTags|#modernModeBtn|#impactAnalysisBtn|#backButton|#contextBoxesBar|#inboundTabs|#outboundTabs) \{/.system-flow-page \1 {/' "$TARGET_CSS"

# Scope pseudo-class selectors
sed -i '' -E 's/^(\.breadcrumb-item\.active|\.comparison-btn\.active|\.tool-btn\.active|\.bottom-tab\.active|\.menu-item:hover|\.hamburger-btn:hover|\.tool-btn:hover|\.zoom-btn:hover|\.close-sidebar-btn:hover|\.import-btn:hover|\.breadcrumb-btn:hover|\.back-button:hover|\.context-menu-item:hover|\.close-impact-btn:hover|\.comparison-btn:hover|\.exit-comparison-btn:hover|\.bottom-tab:hover|\.bottom-tab-close-btn:hover|\.bottom-new-tab-btn:hover|\.bottom-new-tab-btn:active) \{/.system-flow-page \1 {/' "$TARGET_CSS"

# Update colors to match theme
sed -i '' 's/#1976d2/#667eea/g' "$TARGET_CSS"
sed -i '' 's/#2196f3/#667eea/g' "$TARGET_CSS"
sed -i '' 's/#4caf50/#10b981/g' "$TARGET_CSS"

# Fix z-index for top-toolbar to not overlap sidebar
sed -i '' 's/z-index: 10000;/z-index: 100;/g' "$TARGET_CSS"

# Fix app-container to fit in React layout (not fullscreen)
# Change .app-container from 100vw to 100% width
sed -i '' '/\.system-flow-page \.app-container/,/^}/ s/width: 100vw;/width: 100%;/' "$TARGET_CSS"
sed -i '' '/\.system-flow-page \.app-container/,/^}/ s/height: 100vh;/height: 100%;/' "$TARGET_CSS"

# Fix .system-flow-page height to account for header
sed -i '' 's/\.system-flow-page {$/\.system-flow-page {\n    height: calc(100vh - 60px);/' "$TARGET_CSS"
sed -i '' '/\.system-flow-page {/,/^}/ s/height: 100vh;//' "$TARGET_CSS"

# Fix .main-content margin conflict with app layout
# Add margin: 0 to prevent inheriting from app's .main-content
sed -i '' '/\.system-flow-page \.main-content {/,/^}/ {
    /z-index: 0;/a\
    margin-left: 0 !important;  /* Override app layout margin-left */\
    margin-right: 0 !important;
}' "$TARGET_CSS"

# Fix horizontal scrollbar - force overflow-x: hidden on all main containers
sed -i '' '/\.system-flow-page {$/,/^}/ {
    s/overflow: hidden;/overflow: hidden;\
    overflow-x: hidden !important;/
    /height:/a\
    width: 100%;\
    max-width: 100%;
}' "$TARGET_CSS"

sed -i '' '/\.system-flow-page \.app-container {$/,/^}/ {
    /position: relative;/a\
    overflow-x: hidden;\
    max-width: 100%;
}' "$TARGET_CSS"

sed -i '' '/\.system-flow-page \.main-content {$/,/^}/ {
    s/overflow: hidden;/overflow: hidden;\
    overflow-x: hidden !important;/
    /margin-right: 0 !important;/a\
    width: 100%;\
    max-width: 100%;
}' "$TARGET_CSS"

sed -i '' '/\.system-flow-page \.canvas-wrapper {$/,/^}/ {
    s/overflow: auto;/overflow: auto;\
    overflow-x: hidden;\
    overflow-y: auto;/
    s/width: 100%;/width: 100%;\
    max-width: 100%;/
}' "$TARGET_CSS"

echo "✅ Sync completed successfully!"
echo ""
echo "📋 Files synced:"
echo "  - script.js → public/diagram-editor.js"
echo "  - style.css → src/css/diagram-editor.css (scoped)"
echo ""
echo "💡 To sync again after editing /diagram-editor files, run:"
echo "   ./sync-diagram-editor.sh"
