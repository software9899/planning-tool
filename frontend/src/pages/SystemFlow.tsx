import { useEffect, useRef } from 'react';
import '../css/diagram-editor.css';

export default function SystemFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="/diagram-editor.js"]');

    if (existingScript) {
      // Script already loaded, just initialize
      if ((window as any).DiagramEditor && !editorRef.current) {
        editorRef.current = new (window as any).DiagramEditor();
      }
      return;
    }

    // Load the diagram editor script
    const script = document.createElement('script');
    script.src = '/diagram-editor.js';
    script.async = true;
    script.onload = () => {
      // Initialize the diagram editor after script loads
      if ((window as any).DiagramEditor && containerRef.current && !editorRef.current) {
        editorRef.current = new (window as any).DiagramEditor();
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup - but don't remove script to prevent re-declaration errors
      // The script can be reused across navigations
      editorRef.current = null;
    };
  }, []);

  return (
    <div className="system-flow-page" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
      <div className="app-container" ref={containerRef}>
        {/* Top Toolbar */}
        <div className="top-toolbar">
          {/* Hamburger Menu */}
          <div className="menu-section">
            <button className="hamburger-btn" id="hamburgerBtn" title="Menu">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M 2 4 L 18 4 M 2 10 L 18 10 M 2 16 L 18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className="dropdown-menu" id="dropdownMenu" style={{ display: 'none' }}>
              <div className="menu-item" id="saveFile">💾 Save</div>
              <div className="menu-item" id="saveAsFile">💾 Save As...</div>
              <div className="menu-item" id="openFile">📂 Open
                <input type="file" id="fileInput" accept=".json,.mmd,.mermaid" style={{ display: 'none' }} />
              </div>
              <div className="menu-item" id="browseFolder">📁 Browse Folder...</div>
              <div className="menu-separator"></div>
              <div className="menu-item" id="recentFiles">🕐 Recent Files ›</div>
              <div className="menu-separator"></div>
              <div className="menu-item" id="importMermaid">📋 Import Mermaid</div>
              <div className="menu-separator"></div>
              <div className="menu-item" id="exportPNG">📸 Export PNG</div>
              <div className="menu-item" id="exportMermaid">📊 Export Mermaid</div>
              <div className="menu-separator"></div>
              <div className="menu-item" id="copyLink">🔗 Copy Link</div>
              <div className="menu-item" id="clearCanvas">🗑️ Clear All</div>
            </div>

            {/* Recent Files Submenu */}
            <div className="dropdown-menu" id="recentFilesMenu" style={{ display: 'none' }}></div>

            {/* Folder Files Menu */}
            <div className="dropdown-menu" id="folderFilesMenu" style={{ display: 'none' }}>
              <div style={{ padding: '8px 16px', fontWeight: 'bold', fontSize: '12px', color: '#666', borderBottom: '1px solid #e3e3e3' }}>
                Files in folder
              </div>
              <div id="folderFilesList"></div>
            </div>
          </div>

          {/* Shape Tools */}
          <div className="tool-group">
            <button className="tool-btn" id="selectTool" title="Select (V)">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M 3 2 L 3 18 L 9 12 L 11 16 L 13 15 L 11 11 L 17 10 Z" fill="currentColor"/>
              </svg>
            </button>

            <button className="tool-btn" id="panTool" title="Pan / Hand Tool (H)">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 10 3 L 10 8"/>
                  <path d="M 7 5 L 10 2 L 13 5"/>
                  <path d="M 10 12 L 10 17"/>
                  <path d="M 7 15 L 10 18 L 13 15"/>
                  <path d="M 3 10 L 8 10"/>
                  <path d="M 5 7 L 2 10 L 5 13"/>
                  <path d="M 12 10 L 17 10"/>
                  <path d="M 15 7 L 18 10 L 15 13"/>
                  <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                </g>
              </svg>
            </button>

            <div className="tool-separator"></div>

            <button className="tool-btn" data-shape="rectangle" title="Rectangle (R)">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <rect x="2" y="5" width="16" height="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button className="tool-btn" data-shape="circle" title="Circle (C)">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button className="tool-btn" data-shape="diamond" title="Diamond (D)">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M 10 2 L 18 10 L 10 18 L 2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button className="tool-btn" data-shape="text" title="Text (T)">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <text x="10" y="14" textAnchor="middle" fontSize="14" fill="currentColor" fontWeight="bold">T</text>
              </svg>
            </button>

            <div className="tool-separator"></div>

            <button className="tool-btn" data-shape="database" title="Database">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <ellipse cx="10" cy="6" rx="6" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M 4 6 L 4 14 Q 4 17 10 17 Q 16 17 16 14 L 16 6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <ellipse cx="10" cy="14" rx="6" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button className="tool-btn" data-shape="cloud" title="Cloud">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M 6 13 Q 4 13 4 11 Q 4 9 6 9 Q 6 6 9 6 Q 10 4 11 4 Q 14 4 15 6 Q 17 6 17 9 Q 19 9 19 11 Q 19 13 17 13 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button className="tool-btn" data-shape="user" title="User">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M 5 16 Q 5 11 10 11 Q 15 11 15 16" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>

            <div className="tool-separator"></div>

            {/* Connection/Line Styles */}
            <button className="tool-btn" id="solidLineBtn" title="Solid Line" data-line-style="solid">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button className="tool-btn" id="dashedLineBtn" title="Dashed Line" data-line-style="dashed">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <line x1="3" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button className="tool-btn" id="dottedLineBtn" title="Dotted Line" data-line-style="dotted">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="4" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="10" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* Properties */}
          <div className="properties-group">
            <label className="prop-label">
              <input type="color" id="strokeColor" defaultValue="#000000" title="Stroke color" />
            </label>
            <label className="prop-label">
              <input type="color" id="fillColor" defaultValue="#ffffff" title="Fill color" />
            </label>
            <label className="prop-label">
              <input type="number" id="strokeWidth" defaultValue="2" min="1" max="10" title="Stroke width" style={{ width: '50px' }} />
            </label>
          </div>

          {/* Zoom Controls */}
          <div className="zoom-controls">
            <button className="zoom-btn" id="zoomOut" title="Zoom out">−</button>
            <span className="zoom-level" id="zoomLevel">100%</span>
            <button className="zoom-btn" id="zoomIn" title="Zoom in">+</button>
            <button className="zoom-btn" id="zoomReset" title="Reset zoom">⊙</button>
          </div>

          {/* Layer Toggle Button */}
          <button className="layer-toggle-btn" id="layerToggleBtn" title="Layers">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M 10 3 L 17 6 L 17 10 L 10 13 L 3 10 L 3 6 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M 3 10 L 10 13 L 17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M 3 13 L 10 16 L 17 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>  {/* End top-toolbar */}

        {/* Layer Panel Dropdown */}
        <div className="layer-dropdown-menu" id="layerPanel" style={{ display: 'none' }}>
          <div className="layer-panel-header">
            <h3>Layers</h3>
            <button className="add-layer-btn" id="addLayerBtn" title="Add new layer">+</button>
          </div>
          <div className="layer-list" id="layerList">
            {/* Layers will be dynamically added here */}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="main-content">
          {/* Comparison Mode Toolbar */}
          <div id="comparisonToolbar" className="comparison-toolbar" style={{ display: 'none' }}>
            <div className="comparison-buttons">
              <button id="viewAsIs" className="comparison-btn active">📊 As-Is</button>
              <button id="viewToBe" className="comparison-btn">🎯 To-Be</button>
            </div>
            <button id="exitComparison" className="exit-comparison-btn">✕ Exit Comparison</button>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="breadcrumb-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div id="breadcrumb" className="breadcrumb">
                <span className="breadcrumb-item active" data-level="root">Main Diagram</span>
              </div>
              <div id="childShapeTags" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}></div>
            </div>
            <div className="breadcrumb-actions">
              <button id="modernModeBtn" className="breadcrumb-btn" title="Toggle Modern UI" style={{ display: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M 5 6 L 11 6 M 5 9 L 9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Modern UI
              </button>
              <button id="impactAnalysisBtn" className="breadcrumb-btn" title="Impact Analysis Mode">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M 8 2 L 8 5 M 8 11 L 8 14 M 2 8 L 5 8 M 11 8 L 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M 4 4 L 6 6 M 10 10 L 12 12 M 12 4 L 10 6 M 6 10 L 4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Impact Analysis
              </button>
              <button id="viewMermaidBtn" className="breadcrumb-btn" title="View as Mermaid">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M 2 4 L 14 4 M 2 8 L 14 8 M 2 12 L 14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button id="backButton" className="back-button" style={{ display: 'none' }}>← Back</button>
            </div>
          </div>

          {/* Canvas Wrapper for Zoom/Pan */}
          <div className="canvas-wrapper" id="canvasWrapper">
            <canvas id="canvas"></canvas>
          </div>

          {/* Context Menu */}
          <div id="contextMenu" className="context-menu" style={{ display: 'none' }}>
            <div className="context-menu-item" data-action="delete">Delete</div>
            <div className="context-menu-item" data-action="enterGroup">Detailed</div>
            <div className="context-menu-item" data-action="import">Import...</div>
            <div className="context-menu-separator" id="shapeSeparator"></div>
            <div className="context-menu-item" data-action="createToBe">Create To-Be</div>
            <div className="context-menu-separator" id="connectionSeparator"></div>
            <div className="context-menu-item" data-action="splitLine">Split Line</div>
            <div id="arrowStyleInMenu" style={{ padding: '8px 12px', display: 'none' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#333', fontSize: '12px' }}>Arrow Style</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>Start:</span>
                <select id="startArrowType" style={{ flex: 1, padding: '3px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '14px' }}>
                  <option value="none">—</option>
                  <option value="arrow">→</option>
                  <option value="circle">○</option>
                  <option value="diamond">◇</option>
                </select>
                <span style={{ fontSize: '11px', color: '#666' }}>End:</span>
                <select id="endArrowType" defaultValue="arrow" style={{ flex: 1, padding: '3px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '14px' }}>
                  <option value="none">—</option>
                  <option value="arrow">→</option>
                  <option value="circle">○</option>
                  <option value="diamond">◇</option>
                </select>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#333', fontSize: '12px' }}>Line Style</div>
              <select id="lineStyleType" defaultValue="solid" style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '14px' }}>
                <option value="solid">━━━ Solid</option>
                <option value="dashed">╍╍╍ Dashed</option>
                <option value="dotted">┄┄┄ Dotted</option>
              </select>
            </div>
          </div>

          {/* Arrow Style Selector */}
          <div id="arrowStyleSelector" style={{ display: 'none', position: 'absolute', background: 'white', border: '2px solid #667eea', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Arrow Style</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Start:</label>
                <select id="selectorStartArrowType" style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="circle">Circle</option>
                  <option value="diamond">Diamond</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#666' }}>End:</label>
                <select id="selectorEndArrowType" defaultValue="arrow" style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="circle">Circle</option>
                  <option value="diamond">Diamond</option>
                </select>
              </div>
            </div>
            <button id="applyArrowStyle" style={{ width: '100%', padding: '6px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Apply</button>
          </div>

          {/* Hidden Inputs */}
          <input type="file" id="shapeImportInput" accept=".json,.mmd,.mermaid" style={{ display: 'none' }} />

          {/* Connection Editor Dialog */}
          <div id="connectionEditor" style={{ display: 'none', position: 'absolute', background: 'white', border: '2px solid #667eea', borderRadius: '8px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000, minWidth: '300px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#333', fontSize: '16px' }}>Edit Connection</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>Name:</label>
              <input type="text" id="connectionName" placeholder="Connection name" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>Note:</label>
              <textarea id="connectionNote" placeholder="Add a note..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', resize: 'vertical', minHeight: '80px' }}></textarea>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button id="saveConnection" style={{ flex: 1, padding: '8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              <button id="cancelConnection" style={{ flex: 1, padding: '8px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>

          {/* Connection Note Tooltip */}
          <div id="connectionTooltip" style={{ display: 'none', position: 'absolute', background: 'rgba(0,0,0,0.85)', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', maxWidth: '250px', zIndex: 3000, pointerEvents: 'none', whiteSpace: 'pre-wrap' }}></div>

          {/* Impact Analysis Panel */}
          <div id="impactPanel" className="impact-panel" style={{ display: 'none' }}>
            <div className="impact-header">
              <h3>📊 Impact Analysis</h3>
              <button className="close-impact-btn" id="closeImpactPanel">✕</button>
            </div>
            <div className="impact-content" id="impactContent">
              <div className="impact-hint">Click on a shape to analyze its impact</div>
            </div>
          </div>

          {/* Context Boxes Bottom Bar */}
          <div id="contextBoxesBar" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '2px solid #e0e0e0', padding: '12px 20px', zIndex: 1500, boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', maxWidth: '100%', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#10b981', fontSize: '13px' }}>Inbound:</span>
                <div id="inboundTabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}></div>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#e0e0e0' }}></div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#667eea', fontSize: '13px' }}>Outbound:</span>
                <div id="outboundTabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}></div>
              </div>
            </div>
          </div>

          {/* Bottom Tab Bar */}
          <div className="bottom-tab-bar">
            <div className="bottom-tabs-container" id="bottomTabsContainer">
              {/* Tabs will be created dynamically */}
              <button className="bottom-new-tab-btn" id="bottomNewTabBtn" title="New tab">+</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar for Mermaid */}
        <div className="right-sidebar" id="rightSidebar" style={{ display: 'none' }}>
          <div className="sidebar-header">
            <h3 id="sidebarTitle">Import Mermaid</h3>
            <button className="close-sidebar-btn" id="closeSidebar">✕</button>
          </div>
          <div className="sidebar-content">
            {/* Import Mode */}
            <div id="importMode" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <textarea id="mermaidInput" placeholder={`Paste your Mermaid flowchart code here...

Example:
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`}></textarea>

              <div className="layout-options">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Layout Direction:</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name="layoutDirection" value="horizontal" defaultChecked />
                    <span>Horizontal (Left to Right)</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="layoutDirection" value="vertical" />
                    <span>Vertical (Top to Bottom)</span>
                  </label>
                </div>
              </div>

              <button className="import-btn" id="importFromSidebar">Import to Canvas</button>
            </div>

            {/* View Mode */}
            <div id="viewMode" style={{ display: 'none', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <textarea id="mermaidOutput" style={{ flex: 1, fontFamily: "'Courier New', monospace", fontSize: '13px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', resize: 'none' }}></textarea>

              <div className="layout-options">
                <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Layout Direction:</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name="applyLayoutDirection" value="horizontal" defaultChecked />
                    <span>Horizontal (Left to Right)</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="applyLayoutDirection" value="vertical" />
                    <span>Vertical (Top to Bottom)</span>
                  </label>
                </div>
              </div>

              <button className="import-btn" id="applyMermaidChanges" style={{ background: '#10b981' }}>✓ Apply Changes</button>
              <button className="import-btn" id="copyMermaidBtn">📋 Copy to Clipboard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
