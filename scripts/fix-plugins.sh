#!/bin/bash

# Script to standardize all plugin.json files

PLUGINS_DIR="/Users/testtorial/Documents/MCP/PT/plugins"

echo "🔧 Standardizing plugin.json files..."
echo ""

for plugin_dir in "$PLUGINS_DIR"/*/; do
    plugin_name=$(basename "$plugin_dir")
    json_file="$plugin_dir/plugin.json"

    if [ -f "$json_file" ]; then
        # Check if "main" field exists
        if ! grep -q '"main"' "$json_file"; then
            echo "📝 Adding 'main' field to $plugin_name"

            # Add main field after description (simple approach)
            sed -i.bak 's/"description": "\(.*\)",/"description": "\1",\n  "main": "index.html",/' "$json_file"
            rm "$json_file.bak" 2>/dev/null
        else
            echo "✅ $plugin_name already has 'main' field"
        fi
    fi
done

echo ""
echo "✅ Done!"
