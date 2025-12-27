class DiagramEditor {
    constructor(canvasElement) {
        // Use provided canvas or get the main one
        this.canvas = canvasElement || document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.shapes = [];
        this.connections = [];
        this.selectedShape = null;
        this.selectedShapes = [];
        this.selectedConnections = [];
        this.currentTool = 'select';
        this.currentShape = null;
        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isSelecting = false;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastMousePos = null; // Store last mouse position for zoom
        this.selectionBox = null;
        this.resizeHandle = null;
        this.connectionStart = null;
        this.isConnecting = false;
        this.connectionEndPos = null;

        // Context menu
        this.contextMenuShape = null;
        this.contextMenuConnection = null;
        this.currentFileName = null;
        this.shapeToImportInto = null;

        // As-Is / To-Be comparison mode
        this.comparisonMode = false;
        this.asIsData = null;
        this.toBeData = null;
        this.currentView = 'asis'; // 'asis' or 'tobe'

        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Hierarchical structure
        this.rootShapes = [];
        this.rootConnections = [];
        this.currentGroup = null;
        this.groupPath = [];

        // Properties
        this.fillColor = '#ffffff';
        this.strokeColor = '#000000';
        this.strokeWidth = 2;

        // Connection/Arrow defaults
        this.currentLineStyle = 'solid';
        this.currentStartArrow = 'none';
        this.currentEndArrow = 'arrow';

        // Zoom state
        this.zoom = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.panX = 0;
        this.panY = 0;

        // Clipboard
        this.clipboard = [];
        this.clipboardConnections = [];

        // Connection hover and styling
        this.hoveredConnection = null;

        // Text editing on canvas
        this.editingTarget = null; // Can be shape or connection
        this.cursorVisible = true;
        this.cursorBlinkInterval = null;
        this.textSelectionStart = -1;
        this.textSelectionEnd = -1;

        // Create hidden textarea for text editing with proper selection support
        this.hiddenTextarea = document.createElement('textarea');
        this.hiddenTextarea.style.position = 'fixed';
        this.hiddenTextarea.style.left = '-9999px';
        this.hiddenTextarea.style.top = '-9999px';
        document.body.appendChild(this.hiddenTextarea);

        // Modern mode
        this.modernMode = false;

        // Impact Analysis mode
        this.impactAnalysisMode = false;
        this.impactTargets = []; // Changed to array for multi-selection
        this.impactUpstream = [];
        this.impactDownstream = [];
        this.savedSelectedShape = undefined;
        this.savedSelectedShapes = undefined;

        // Mermaid layout direction
        this.mermaidLayoutDirection = 'LR'; // Default to Left-Right
        this.mermaidInputCode = ''; // Store import textarea content per tab
        this.mermaidOutputCode = ''; // Store output/apply textarea content per tab

        // Connection editor
        this.editingConnection = null;
        this.hoveredConnection = null;

        // Context boxes data (for bottom bar)
        this.contextBoxesData = [];

        // File System Access API
        this.currentFileHandle = null;
        this.currentFolderHandle = null;

        // Recent files tracking
        this.recentFiles = this.loadRecentFiles();

        // Layer System (Phase 2)
        this.layers = [];
        this.activeLayer = null;
        this.layerIdCounter = 1;

        this.initCanvas();
        this.initLayers();
        this.bindEvents();
        this.loadFromURL(); // Load diagram from URL if present
    }

    initCanvas() {
        this.canvas.width = 2000;
        this.canvas.height = 1500;
        this.saveState(); // Initial state
        this.redraw();
    }

    bindEvents() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));

        // Tool buttons (select and shape) are now handled globally in setupSharedUIEvents()

        document.getElementById('backButton').addEventListener('click', () => {
            // Don't allow exiting group in To-Be mode
            if (this.comparisonMode && this.currentView === 'tobe') {
                alert('Cannot navigate detailed view in To-Be mode. Please switch to As-Is view first.');
                return;
            }
            this.exitGroup();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Skip if currently editing text on canvas
            if (this.editingTarget) return;

            // Prevent shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT') return;

            // Allow text editing shortcuts (Ctrl+A, C, V, X, Z, Y) in textareas
            const isTextarea = e.target.tagName === 'TEXTAREA';
            const isTextEditShortcut = (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase());

            if (isTextarea && !isTextEditShortcut) {
                // Skip other shortcuts when typing in textarea
                return;
            }

            // Disable modification shortcuts in Impact Analysis mode
            if (this.impactAnalysisMode) {
                // Only allow Escape to exit Impact Analysis mode
                if (e.key === 'Escape') {
                    this.closeImpactAnalysis();
                }
                return;
            }

            // Disable all modification shortcuts in As-Is comparison mode (read-only)
            if (this.comparisonMode && this.currentView === 'asis') {
                // Only allow view navigation shortcuts (zoom, escape)
                if (e.key === 'Escape') {
                    this.selectedShape = null;
                    this.selectedShapes = [];
                    this.selectedConnections = [];
                    this.redraw();
                } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                    e.preventDefault();
                    this.zoomIn(this.lastMousePos);
                } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                    e.preventDefault();
                    this.zoomOut(this.lastMousePos);
                } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                    e.preventDefault();
                    this.resetZoom();
                }
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedShape || this.selectedShapes.length > 0) {
                    e.preventDefault();
                    this.deleteShape(this.selectedShape);
                } else if (this.selectedConnections.length > 0) {
                    e.preventDefault();
                    // Delete all selected connections
                    this.selectedConnections.forEach(conn => {
                        const index = this.connections.indexOf(conn);
                        if (index !== -1) {
                            this.connections.splice(index, 1);
                        }
                    });
                    this.selectedConnections = [];
                    this.saveState();
                    this.redraw();
                }
            } else if (e.key === 'Escape') {
                this.selectedShape = null;
                this.selectedShapes = [];
                this.selectedConnections = [];
                this.currentTool = 'select';
                this.updateActiveButton(document.getElementById('selectTool'));
                this.redraw();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                // Allow native copy in textarea
                if (!isTextarea) {
                    e.preventDefault();
                    this.copy();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                // Allow native paste in textarea
                if (!isTextarea) {
                    e.preventDefault();
                    this.paste();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                // Allow native select all in textarea
                if (!isTextarea) {
                    e.preventDefault();
                    this.selectAll();
                }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                // Zoom In (Ctrl+= or Ctrl++)
                e.preventDefault();
                this.zoomIn(this.lastMousePos);
            } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                // Zoom Out (Ctrl+-)
                e.preventDefault();
                this.zoomOut(this.lastMousePos);
            } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                // Reset Zoom (Ctrl+0)
                e.preventDefault();
                this.resetZoom();
            }
        });

        // Property inputs
        document.getElementById('fillColor').addEventListener('change', (e) => {
            // Disable in As-Is comparison mode
            if (this.comparisonMode && this.currentView === 'asis') {
                alert('Cannot edit in As-Is mode. Switch to To-Be to make changes.');
                e.target.value = this.selectedShape?.fillColor || this.fillColor;
                return;
            }
            this.fillColor = e.target.value;
            if (this.selectedShape) {
                this.selectedShape.fillColor = e.target.value;
                this.redraw();
            }
        });

        document.getElementById('strokeColor').addEventListener('change', (e) => {
            // Disable in As-Is comparison mode
            if (this.comparisonMode && this.currentView === 'asis') {
                alert('Cannot edit in As-Is mode. Switch to To-Be to make changes.');
                e.target.value = this.selectedShape?.strokeColor || this.strokeColor;
                return;
            }
            this.strokeColor = e.target.value;
            if (this.selectedShape) {
                this.selectedShape.strokeColor = e.target.value;
                this.redraw();
            }
        });

        document.getElementById('strokeWidth').addEventListener('change', (e) => {
            // Disable in As-Is comparison mode
            if (this.comparisonMode && this.currentView === 'asis') {
                alert('Cannot edit in As-Is mode. Switch to To-Be to make changes.');
                e.target.value = this.selectedShape?.strokeWidth || this.strokeWidth;
                return;
            }
            this.strokeWidth = parseInt(e.target.value);
            if (this.selectedShape) {
                this.selectedShape.strokeWidth = parseInt(e.target.value);
                this.redraw();
            }
        });

        // Line style buttons
        document.querySelectorAll('[data-line-style]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lineStyle = btn.getAttribute('data-line-style');
                this.currentLineStyle = lineStyle;

                // Update active state
                document.querySelectorAll('[data-line-style]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Apply to selected connections
                this.selectedConnections.forEach(conn => {
                    conn.lineStyle = lineStyle;
                });
                this.saveState();
                this.redraw();
            });
        });

        // Action buttons
        document.getElementById('clearCanvas').addEventListener('click', () => {
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';
            if (confirm('Clear all shapes and connections?')) {
                this.shapes = [];
                this.connections = [];
                this.rootShapes = [];
                this.rootConnections = [];
                this.currentGroup = null;
                this.groupPath = [];
                this.selectedShape = null;
                this.updateBreadcrumb();
                document.getElementById('backButton').style.display = 'none';
                this.redraw();
            }
        });

        // File operations - Save and Save As are now handled globally in setupFileOperations()

        document.getElementById('openFile').addEventListener('click', async () => {
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';

            // Check if File System Access API is supported
            if (window.showOpenFilePicker) {
                await this.openFileWithPicker();
            } else {
                // Fallback to file input
                document.getElementById('fileInput').click();
            }
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.openFile(e.target.files[0]);
        });

        // Browse Folder
        document.getElementById('browseFolder').addEventListener('click', async () => {
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';
            await this.browseFolderAndShowFiles();
        });

        // Recent Files
        document.getElementById('recentFiles').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRecentFilesMenu();
        });

        // Close submenus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-menu')) {
                document.getElementById('recentFilesMenu').style.display = 'none';
                document.getElementById('folderFilesMenu').style.display = 'none';
            }
        });

        // Export
        document.getElementById('exportPNG').addEventListener('click', () => {
            this.exportToPNG();
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';
        });

        // Copy Link
        document.getElementById('copyLink').addEventListener('click', () => {
            this.copyShareLink();
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';
        });

        document.getElementById('exportMermaid').addEventListener('click', () => {
            this.exportToMermaid();
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';
        });

        document.getElementById('importMermaid').addEventListener('click', () => {
            this.openMermaidSidebar();
            document.getElementById('dropdownMenu').style.display = 'none';
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('recentFilesMenu').style.display = 'none';
            document.getElementById('folderFilesMenu').style.display = 'none';
        });

        // Right sidebar events
        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.closeMermaidSidebar();
        });

        // Import, Apply buttons and auto-preview are now handled globally in setupMermaidButtons()

        // Modern Mode toggle
        document.getElementById('modernModeBtn').addEventListener('click', () => {
            this.toggleModernMode();
        });

        // Impact Analysis toggle
        document.getElementById('impactAnalysisBtn').addEventListener('click', () => {
            this.toggleImpactAnalysisMode();
        });

        document.getElementById('closeImpactPanel').addEventListener('click', () => {
            this.closeImpactAnalysis();
        });

        // View Mermaid button
        document.getElementById('viewMermaidBtn').addEventListener('click', () => {
            this.showMermaidView();
        });

        // Apply button is now handled globally in setupMermaidButtons()

        // Copy Mermaid code
        document.getElementById('copyMermaidBtn').addEventListener('click', () => {
            this.copyMermaidCode();
        });

        // Connection editor events
        document.getElementById('saveConnection').addEventListener('click', () => {
            this.saveConnectionEdit();
        });

        document.getElementById('cancelConnection').addEventListener('click', () => {
            this.closeConnectionEditor();
        });

        // Close connection editor when clicking outside
        document.addEventListener('mousedown', (e) => {
            const editor = document.getElementById('connectionEditor');
            if (editor.style.display === 'block' && !editor.contains(e.target)) {
                this.closeConnectionEditor();
            }
        });

        // Close connection editor on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const editor = document.getElementById('connectionEditor');
                if (editor.style.display === 'block') {
                    this.closeConnectionEditor();
                }
            }
        });

        // Context menu events
        document.getElementById('contextMenu').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextMenuAction(action);
            }
        });

        // Hide context menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('contextMenu');
            if (menu && !menu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Hide arrow style selector when clicking elsewhere
        document.addEventListener('click', (e) => {
            const selector = document.getElementById('arrowStyleSelector');
            const applyBtn = document.getElementById('applyArrowStyle');
            if (selector.style.display === 'block' &&
                !selector.contains(e.target) &&
                e.target !== applyBtn) {
                selector.style.display = 'none';
            }
        });

        // Comparison mode buttons are now handled globally in setupComparisonToolbar()

        // Arrow style and line style selector - auto-apply on change
        const applyArrowChanges = () => {
            if (this.contextMenuConnection) {
                const startType = document.getElementById('startArrowType').value;
                const endType = document.getElementById('endArrowType').value;
                const lineStyle = document.getElementById('lineStyleType').value;
                this.contextMenuConnection.startArrow = startType;
                this.contextMenuConnection.endArrow = endType;
                this.contextMenuConnection.lineStyle = lineStyle;
                this.saveState();
                this.redraw();
            }
        };

        document.getElementById('startArrowType').addEventListener('change', applyArrowChanges);
        document.getElementById('endArrowType').addEventListener('change', applyArrowChanges);
        document.getElementById('lineStyleType').addEventListener('change', applyArrowChanges);

        // Hide arrow selector when clicking outside
        document.addEventListener('click', (e) => {
            const selector = document.getElementById('arrowStyleSelector');
            if (selector && !selector.contains(e.target) && e.target.id !== 'canvas') {
                selector.style.display = 'none';
            }
        });

        // Shape import
        document.getElementById('shapeImportInput').addEventListener('change', (e) => {
            this.handleShapeImport(e.target.files[0]);
            e.target.value = ''; // Reset input
        });

        // Hamburger menu and Layer panel are now handled globally in setupSharedUIEvents()

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomReset').addEventListener('click', () => this.resetZoom());

        // Ctrl+Scroll wheel zoom (zoom at mouse position)
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.zoomAtPoint(this.zoom + delta, e);
            }
        }, { passive: false });

        // Text editing is now handled by hidden textarea
    }

    updateActiveButton(activeBtn) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;
        return { x, y };
    }

    // Reverse of getMousePos: convert canvas coords to screen coords
    canvasToScreen(canvasX, canvasY) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = canvasX * this.zoom + this.panX + rect.left;
        const screenY = canvasY * this.zoom + this.panY + rect.top;
        return { x: screenX, y: screenY };
    }

    handleMouseDown(e) {
        // Ignore right-click
        if (e.button === 2) return;

        const pos = this.getMousePos(e);

        // Impact Analysis mode - analyze impact on click
        if (this.impactAnalysisMode) {
            const shape = this.getShapeAt(pos);
            if (shape && !shape.isContextBox) {
                const isMultiSelect = e.ctrlKey || e.metaKey;
                this.analyzeImpact(shape, isMultiSelect);
            }
            return;
        }

        // Disable all interactions in As-Is comparison mode (read-only)
        if (this.comparisonMode && this.currentView === 'asis') {
            // Only allow viewing, no editing or creating
            return;
        }

        if (this.currentTool === 'pan') {
            // Start panning
            this.isPanning = true;
            this.panStartX = e.clientX - this.panX;
            this.panStartY = e.clientY - this.panY;
            this.canvas.style.cursor = 'grabbing';
        } else if (this.currentTool === 'draw') {
            // Check if clicking on connection midpoint FIRST (highest priority)
            const connection = this.getConnectionMidpointAt(pos);
            if (connection) {
                e.preventDefault();
                e.stopPropagation();
                this.openConnectionEditor(connection, { x: e.clientX, y: e.clientY });
                return;
            }

            // Check if clicking on existing shape - auto-switch to connect mode
            const shape = this.getShapeAt(pos);
            if (shape) {
                this.connectionStart = shape;
                this.isConnecting = true;
                this.connectionEndPos = pos;
                return;
            }

            this.isDrawing = true;
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
        } else if (this.currentTool === 'select') {
            const handle = this.getResizeHandle(pos);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
            } else {
                // Check if clicking on a shape FIRST (shapes have priority)
                const shape = this.getShapeAt(pos);
                if (shape) {
                    // Ignore context boxes for selection
                    if (shape.isContextBox) {
                        return;
                    }

                    // Check if clicking on already selected shape
                    if (!this.selectedShapes.includes(shape)) {
                        // Clear previous selection unless holding Ctrl/Cmd
                        if (!e.ctrlKey && !e.metaKey) {
                            this.selectedShapes = [];
                            this.selectedConnections = [];
                            this.selectedShape = shape;
                        }
                        this.selectedShapes.push(shape);
                    }
                    this.selectedShape = shape;
                    this.isDragging = true;
                    this.dragStartX = pos.x - shape.x;
                    this.dragStartY = pos.y - shape.y;
                    this.updatePropertiesPanel();
                } else {
                    // No shape clicked - check if clicking on a connection midpoint
                    const connection = this.getConnectionMidpointAt(pos);
                    if (connection) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openConnectionEditor(connection, { x: e.clientX, y: e.clientY });
                        return;
                    }

                    // Check if clicking on a connection line
                    const connectionLine = this.getConnectionAt(pos);
                    if (connectionLine) {
                        // Select the connection
                        if (!this.selectedConnections.includes(connectionLine)) {
                            // Clear previous selection unless holding Ctrl/Cmd
                            if (!e.ctrlKey && !e.metaKey) {
                                this.selectedConnections = [];
                                this.selectedShapes = [];
                                this.selectedShape = null;
                            }
                            this.selectedConnections.push(connectionLine);
                        }
                        this.redraw();
                    } else {
                        // Start marquee selection
                        this.isSelecting = true;
                        this.dragStartX = pos.x;
                        this.dragStartY = pos.y;
                        this.selectionBox = { x: pos.x, y: pos.y, width: 0, height: 0 };
                        this.selectedShape = null;
                        this.selectedShapes = [];
                        this.selectedConnections = [];
                    }
                }
                this.redraw();
            }
        }
    }

    handleMouseMove(e) {
        // Store last mouse position for keyboard zoom
        this.lastMousePos = e;

        const pos = this.getMousePos(e);

        if (this.isPanning) {
            // Pan the canvas
            this.panX = e.clientX - this.panStartX;
            this.panY = e.clientY - this.panStartY;
            this.redraw();
            return;
        }

        if (this.isDrawing && this.currentTool === 'draw') {
            this.redraw();
            this.drawPreview(this.dragStartX, this.dragStartY, pos.x, pos.y);
        } else if (this.isDragging && this.selectedShape) {
            // Move all selected shapes if multiple selected
            const deltaX = pos.x - this.dragStartX - this.selectedShape.x;
            const deltaY = pos.y - this.dragStartY - this.selectedShape.y;

            if (this.selectedShapes.length > 1) {
                this.selectedShapes.forEach(shape => {
                    shape.x += deltaX;
                    shape.y += deltaY;
                });
            } else {
                this.selectedShape.x = pos.x - this.dragStartX;
                this.selectedShape.y = pos.y - this.dragStartY;
            }
            this.redraw();
        } else if (this.isResizing && this.selectedShape) {
            this.resizeShape(this.selectedShape, this.resizeHandle, pos);
            this.redraw();
        } else if (this.isSelecting) {
            // Update selection box
            this.selectionBox.width = pos.x - this.dragStartX;
            this.selectionBox.height = pos.y - this.dragStartY;
            this.redraw();
            this.drawSelectionBox();
        } else if (this.isConnecting && this.connectionStart) {
            this.connectionEndPos = pos;
            this.redraw();
            this.drawConnectionPreview(this.connectionStart, pos);
        } else {
            // Don't change hover state if context menu is open
            const contextMenuOpen = document.getElementById('contextMenu').style.display === 'block';

            if (!contextMenuOpen) {
                // Check if hovering over a connection midpoint (for tooltip and highlight)
                const hoveredMidpoint = this.getConnectionMidpointAt(pos);

                // Check if hovering over a connection line (for highlight)
                const hoveredConn = hoveredMidpoint || this.getConnectionAt(pos);

                if (hoveredConn !== this.hoveredConnection) {
                    this.hoveredConnection = hoveredConn;
                    this.redraw();
                }

                // Show tooltip if hovering over midpoint and connection has a note
                if (hoveredMidpoint) {
                    this.canvas.style.cursor = 'pointer';
                    if (hoveredMidpoint.note) {
                        this.showConnectionTooltip(hoveredMidpoint, { x: e.clientX, y: e.clientY });
                    } else {
                        this.hideConnectionTooltip();
                    }
                } else {
                    if (this.canvas.style.cursor === 'pointer') {
                        this.canvas.style.cursor = 'default';
                    }
                    this.hideConnectionTooltip();
                }
            }
        }
    }

    handleMouseUp(e) {
        // End panning
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
            return;
        }

        let needsSave = false;

        if (this.isDrawing) {
            const pos = this.getMousePos(e);
            const width = pos.x - this.dragStartX;
            const height = pos.y - this.dragStartY;

            if (Math.abs(width) > 10 && Math.abs(height) > 10) {
                // Dragged to create custom size
                this.createShape(this.dragStartX, this.dragStartY, width, height);
            } else {
                // Single click - create default size shape
                const defaultWidth = 100;
                const defaultHeight = this.currentShape === 'text' ? 24 : 80;
                this.createShape(this.dragStartX - defaultWidth/2, this.dragStartY - defaultHeight/2, defaultWidth, defaultHeight);
            }
            needsSave = false; // createShape already saves
        }

        if (this.isConnecting && this.connectionStart) {
            const pos = this.getMousePos(e);
            const targetShape = this.getShapeAt(pos);

            if (targetShape && targetShape !== this.connectionStart) {
                // Connect to existing shape
                this.connections.push({
                    from: this.connectionStart,
                    to: targetShape,
                    type: 'arrow',
                    label: '',
                    note: '',
                    startArrow: this.currentStartArrow,
                    endArrow: this.currentEndArrow,
                    lineStyle: this.currentLineStyle
                });
                needsSave = true;
            } else if (!targetShape) {
                // No target shape - create new shape at endpoint
                const defaultWidth = 100;
                const defaultHeight = this.currentShape === 'text' ? 24 : 80;

                // Create shape centered at mouse position
                const newShape = {
                    id: Date.now(),
                    type: this.currentShape,
                    x: pos.x - defaultWidth / 2,
                    y: pos.y - defaultHeight / 2,
                    width: defaultWidth,
                    height: defaultHeight,
                    fillColor: this.fillColor,
                    strokeColor: this.strokeColor,
                    strokeWidth: this.strokeWidth,
                    text: '',
                    children: [],
                    childConnections: [],
                    layerId: this.activeLayer ? this.activeLayer.id : null
                };

                this.shapes.push(newShape);

                // Create connection to new shape
                this.connections.push({
                    from: this.connectionStart,
                    to: newShape,
                    type: 'arrow',
                    label: '',
                    note: '',
                    startArrow: this.currentStartArrow,
                    endArrow: this.currentEndArrow,
                    lineStyle: this.currentLineStyle
                });
                needsSave = true;
            }

            this.isConnecting = false;
            this.connectionStart = null;
            this.connectionEndPos = null;
            this.redraw();
        }

        if (this.isSelecting) {
            // Find all shapes that intersect with selection box
            const box = this.selectionBox;
            const minX = box.width < 0 ? box.x + box.width : box.x;
            const minY = box.height < 0 ? box.y + box.height : box.y;
            const maxX = box.width < 0 ? box.x : box.x + box.width;
            const maxY = box.height < 0 ? box.y : box.y + box.height;

            this.selectedShapes = this.shapes.filter(shape => {
                // Skip context boxes
                if (shape.isContextBox) return false;

                // Check if shape intersects with selection box (not fully contained)
                return !(shape.x + shape.width < minX ||  // shape is completely to the left
                         shape.x > maxX ||                // shape is completely to the right
                         shape.y + shape.height < minY || // shape is completely above
                         shape.y > maxY);                 // shape is completely below
            });

            // Also select connections within the box
            this.selectedConnections = this.connections.filter(conn => {
                // Get actual rendered line positions (with offset)
                const linePos = this.getConnectionLinePosition(conn);

                // Check if connection line intersects with selection box
                return this.lineIntersectsRect(
                    linePos.fromX, linePos.fromY,
                    linePos.toX, linePos.toY,
                    minX, minY, maxX, maxY
                );
            });

            if (this.selectedShapes.length === 1) {
                this.selectedShape = this.selectedShapes[0];
            } else {
                this.selectedShape = null;
            }

            this.isSelecting = false;
            this.selectionBox = null;
            this.redraw();
        }

        // Save state after drag or resize
        if (this.isDragging || this.isResizing) {
            needsSave = true;
        }

        if (needsSave) {
            this.saveState();
        }

        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
    }

    handleDoubleClick(e) {
        // Disable editing in Impact Analysis mode
        if (this.impactAnalysisMode) return;

        // Disable editing in comparison mode (both As-Is and To-Be are read-only for text)
        if (this.comparisonMode) {
            alert('Cannot edit text in comparison mode. Exit comparison mode to make changes.');
            return;
        }

        const pos = this.getMousePos(e);
        const shape = this.getShapeAt(pos);
        const connection = !shape ? this.getConnectionAt(pos) : null;

        // Double-click on connection → edit label
        if (connection) {
            this.showInlineEditor(connection, e);
            return;
        }

        // Double-click on context box → do nothing
        if (!shape || shape.isContextBox) return;

        // Double-click on shape → edit name
        this.showInlineEditor(shape, e);
    }

    showInlineEditor(target, mouseEvent) {
        this.editingTarget = target;

        // Get current text
        const isConnection = target.hasOwnProperty('from') && target.hasOwnProperty('to');
        const currentText = isConnection ? (target.label || '') : (target.text || '');

        // Setup hidden textarea with current text
        this.hiddenTextarea.value = currentText;
        this.hiddenTextarea.focus();
        this.hiddenTextarea.select(); // Select all text by default

        // Track selection changes for highlighting
        const updateSelection = () => {
            this.textSelectionStart = this.hiddenTextarea.selectionStart;
            this.textSelectionEnd = this.hiddenTextarea.selectionEnd;
            this.redraw();
        };

        // Listen for input changes
        const updateText = () => {
            const newText = this.hiddenTextarea.value;
            if (isConnection) {
                this.editingTarget.label = newText;
            } else {
                this.editingTarget.text = newText;
            }
            updateSelection();
        };

        this.hiddenTextarea.oninput = updateText;
        this.hiddenTextarea.onselect = updateSelection;
        this.hiddenTextarea.onkeyup = updateSelection; // Track selection on key up (arrows, Ctrl+A, etc.)
        this.hiddenTextarea.onmouseup = updateSelection; // Track mouse selection

        this.hiddenTextarea.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.finishInlineEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelInlineEdit();
            }
        };

        this.hiddenTextarea.onblur = () => {
            // Only finish if we're still editing this target
            if (this.editingTarget === target) {
                this.finishInlineEdit();
            }
        };

        // Initialize selection state (all selected by default)
        setTimeout(() => {
            updateSelection();
        }, 0);

        // Start cursor blinking
        this.cursorVisible = true;
        if (this.cursorBlinkInterval) {
            clearInterval(this.cursorBlinkInterval);
        }
        this.cursorBlinkInterval = setInterval(() => {
            this.cursorVisible = !this.cursorVisible;
            this.redraw();
        }, 500);

        this.redraw();
    }


    finishInlineEdit() {
        if (!this.editingTarget) return;

        // Stop cursor blinking
        if (this.cursorBlinkInterval) {
            clearInterval(this.cursorBlinkInterval);
            this.cursorBlinkInterval = null;
        }

        // Clear textarea event handlers
        this.hiddenTextarea.oninput = null;
        this.hiddenTextarea.onkeydown = null;
        this.hiddenTextarea.onblur = null;
        this.hiddenTextarea.onselect = null;
        this.hiddenTextarea.onkeyup = null;
        this.hiddenTextarea.onmouseup = null;
        this.hiddenTextarea.value = '';

        // Clear editing and selection state
        this.editingTarget = null;
        this.textSelectionStart = -1;
        this.textSelectionEnd = -1;

        this.saveState();
        this.redraw();
    }

    cancelInlineEdit() {
        // Stop cursor blinking
        if (this.cursorBlinkInterval) {
            clearInterval(this.cursorBlinkInterval);
            this.cursorBlinkInterval = null;
        }

        // Clear textarea event handlers
        this.hiddenTextarea.oninput = null;
        this.hiddenTextarea.onkeydown = null;
        this.hiddenTextarea.onblur = null;
        this.hiddenTextarea.onselect = null;
        this.hiddenTextarea.onkeyup = null;
        this.hiddenTextarea.onmouseup = null;
        this.hiddenTextarea.value = '';

        // Clear editing and selection state
        this.editingTarget = null;
        this.textSelectionStart = -1;
        this.textSelectionEnd = -1;

        this.redraw();
    }

    handleRightClick(e) {
        e.preventDefault();

        // Disable context menu in Impact Analysis mode
        if (this.impactAnalysisMode) return;

        const pos = this.getMousePos(e);
        const shape = this.getShapeAt(pos);
        const connection = !shape ? this.getConnectionAt(pos) : null;

        if (shape && !shape.isContextBox) {
            // Show context menu for shape (not for context boxes)
            this.contextMenuShape = shape;
            this.contextMenuConnection = null;
            this.showContextMenu(e.clientX, e.clientY, shape, null);
        } else if (connection) {
            // Show context menu for connection
            this.contextMenuShape = null;
            this.contextMenuConnection = connection;
            this.showContextMenu(e.clientX, e.clientY, null, connection);
        } else {
            // Deselect all shapes and connections, reset to select tool
            this.selectedShape = null;
            this.selectedShapes = [];
            this.selectedConnections = [];
            this.currentTool = 'select';
            this.updateActiveButton(document.getElementById('selectTool'));
            this.redraw();
        }
    }

    showContextMenu(x, y, shape, connection) {
        const menu = document.getElementById('contextMenu');
        const enterGroupItem = menu.querySelector('[data-action="enterGroup"]');
        const importItem = menu.querySelector('[data-action="import"]');
        const deleteItem = menu.querySelector('[data-action="delete"]');
        const createToBeItem = menu.querySelector('[data-action="createToBe"]');
        const splitLineItem = menu.querySelector('[data-action="splitLine"]');
        const arrowStyleSection = document.getElementById('arrowStyleInMenu');
        const shapeSeparator = document.getElementById('shapeSeparator');
        const connectionSeparator = document.getElementById('connectionSeparator');

        // Check if in comparison mode
        const isAsIsMode = this.comparisonMode && this.currentView === 'asis';
        const isToBeMode = this.comparisonMode && this.currentView === 'tobe';

        // In As-Is mode, don't show context menu at all (read-only)
        if (isAsIsMode) {
            return; // Don't show menu
        }

        // Show/hide menu items based on context
        if (shape) {
            // Shape context menu
            // In To-Be mode, disable certain actions
            if (isToBeMode) {
                enterGroupItem.style.display = 'none';  // No detailed view in To-Be
                importItem.style.display = 'none';      // No import in To-Be
                createToBeItem.style.display = 'none';  // Can't create To-Be from To-Be
            } else {
                enterGroupItem.style.display = 'block';
                importItem.style.display = 'block';
                createToBeItem.style.display = 'block';
            }
            deleteItem.style.display = 'block';
            shapeSeparator.style.display = 'block';
            splitLineItem.style.display = 'none';
            arrowStyleSection.style.display = 'none';
            connectionSeparator.style.display = 'none';
        } else if (connection) {
            // Connection context menu
            enterGroupItem.style.display = 'none';
            importItem.style.display = 'none';
            deleteItem.style.display = 'block';
            createToBeItem.style.display = 'none';
            shapeSeparator.style.display = 'none';
            connectionSeparator.style.display = 'block';

            // Only show split line for bidirectional arrows (both start and end arrows present)
            const isBidirectional = connection.startArrow && connection.startArrow !== 'none' &&
                                   connection.endArrow && connection.endArrow !== 'none';
            splitLineItem.style.display = isBidirectional ? 'block' : 'none';

            // Show arrow style selector in menu
            arrowStyleSection.style.display = 'block';
            document.getElementById('startArrowType').value = connection.startArrow || 'none';
            document.getElementById('endArrowType').value = connection.endArrow || 'arrow';
            document.getElementById('lineStyleType').value = connection.lineStyle || 'solid';

            // Store reference to connection being styled
            this.hoveredConnection = connection;
        }

        menu.style.display = 'block';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Redraw to ensure connection stays highlighted
        if (connection) {
            this.redraw();
        }
    }

    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
        // Clear the hovered connection when menu closes
        this.hoveredConnection = null;
        this.redraw();
    }

    // Zoom methods
    zoomIn(mousePos = null) {
        this.zoomAtPoint(this.zoom + 0.1, mousePos);
    }

    zoomOut(mousePos = null) {
        this.zoomAtPoint(this.zoom - 0.1, mousePos);
    }

    resetZoom() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
        this.redraw();
    }

    setZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.updateZoomDisplay();
        this.redraw();
    }

    zoomAtPoint(newZoom, mousePos = null) {
        const oldZoom = this.zoom;
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        if (mousePos) {
            // Get canvas rect for accurate mouse position
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = mousePos.clientX - rect.left;
            const mouseY = mousePos.clientY - rect.top;

            // Calculate world position before zoom
            const worldX = (mouseX - this.panX) / oldZoom;
            const worldY = (mouseY - this.panY) / oldZoom;

            // Update zoom
            this.zoom = newZoom;

            // Calculate new pan to keep same world position under mouse
            this.panX = mouseX - worldX * newZoom;
            this.panY = mouseY - worldY * newZoom;
        } else {
            // Zoom from center if no mouse position provided
            this.zoom = newZoom;
        }

        this.updateZoomDisplay();
        this.redraw();
    }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    // Copy & Paste
    selectAll() {
        // Select all shapes in current view
        this.selectedShapes = [...this.shapes];
        this.selectedShape = null;
        this.selectedConnections = [];
        this.redraw();
        console.log('Selected all', this.selectedShapes.length, 'shapes');
    }

    copy() {
        const shapesToCopy = this.selectedShapes.length > 0 ? this.selectedShapes :
                            (this.selectedShape ? [this.selectedShape] : []);

        if (shapesToCopy.length === 0) return;

        // Deep clone shapes
        this.clipboard = shapesToCopy.map(shape => this.deepCloneShape(shape));

        // Copy connections between selected shapes
        this.clipboardConnections = [];
        this.connections.forEach(conn => {
            const fromIndex = shapesToCopy.indexOf(conn.from);
            const toIndex = shapesToCopy.indexOf(conn.to);

            // Only copy connections where both shapes are selected
            if (fromIndex !== -1 && toIndex !== -1) {
                this.clipboardConnections.push({
                    fromIndex: fromIndex,
                    toIndex: toIndex,
                    type: conn.type,
                    label: conn.label || ''
                });
            }
        });

        console.log(`Copied ${this.clipboard.length} shape(s)`);
    }

    paste() {
        if (this.clipboard.length === 0) return;

        // Clear current selection
        this.selectedShapes = [];
        this.selectedShape = null;

        // Paste with offset
        const offset = 30;
        const pastedShapes = [];

        this.clipboard.forEach(clipShape => {
            const newShape = this.deepCloneShape(clipShape);
            newShape.id = Date.now() + Math.random(); // New unique ID
            newShape.x += offset;
            newShape.y += offset;
            // Assign to active layer
            newShape.layerId = this.activeLayer ? this.activeLayer.id : null;

            this.shapes.push(newShape);
            pastedShapes.push(newShape);
            this.selectedShapes.push(newShape);
        });

        // Restore connections between pasted shapes
        this.clipboardConnections.forEach(connData => {
            const fromShape = pastedShapes[connData.fromIndex];
            const toShape = pastedShapes[connData.toIndex];

            if (fromShape && toShape) {
                this.connections.push({
                    from: fromShape,
                    to: toShape,
                    type: connData.type,
                    label: connData.label || '',
                    note: connData.note || ''
                });
            }
        });

        // Select the last pasted shape
        if (pastedShapes.length === 1) {
            this.selectedShape = pastedShapes[0];
        }

        this.saveState();
        this.redraw();

        console.log(`Pasted ${pastedShapes.length} shape(s)`);
    }

    deepCloneShape(shape) {
        const cloned = {
            id: Date.now() + Math.random(),
            type: shape.type,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            fillColor: shape.fillColor,
            strokeColor: shape.strokeColor,
            strokeWidth: shape.strokeWidth,
            text: shape.text || ''
        };

        // Clone children recursively
        if (shape.children && shape.children.length > 0) {
            cloned.children = shape.children.map(child => this.deepCloneShape(child));

            // Clone child connections
            if (shape.childConnections) {
                cloned.childConnections = shape.childConnections.map(conn => {
                    const fromIndex = shape.children.indexOf(conn.from);
                    const toIndex = shape.children.indexOf(conn.to);
                    return {
                        from: cloned.children[fromIndex],
                        to: cloned.children[toIndex],
                        type: conn.type,
                        label: conn.label || ''
                    };
                });
            } else {
                cloned.childConnections = [];
            }
        } else {
            cloned.children = [];
            cloned.childConnections = [];
        }

        return cloned;
    }

    handleContextMenuAction(action) {
        if (this.contextMenuShape) {
            // Handle shape actions
            switch (action) {
                case 'delete':
                    this.selectedShape = this.contextMenuShape;
                    this.selectedShapes = [this.contextMenuShape];
                    this.deleteShape(this.contextMenuShape);
                    break;
                case 'enterGroup':
                    // All shapes can now have detailed view
                    this.enterGroup(this.contextMenuShape);
                    break;
                case 'import':
                    // Import into this shape's detailed view
                    this.shapeToImportInto = this.contextMenuShape;
                    document.getElementById('shapeImportInput').click();
                    break;
                case 'createToBe':
                    this.createToBeComparison();
                    break;
            }
            this.contextMenuShape = null;
        } else if (this.contextMenuConnection) {
            // Handle connection actions
            switch (action) {
                case 'delete':
                    // Delete selected connections if any, otherwise just the context menu connection
                    if (this.selectedConnections.length > 0) {
                        this.selectedConnections.forEach(conn => {
                            const index = this.connections.indexOf(conn);
                            if (index !== -1) {
                                this.connections.splice(index, 1);
                            }
                        });
                        this.selectedConnections = [];
                    } else {
                        const connIndex = this.connections.indexOf(this.contextMenuConnection);
                        if (connIndex !== -1) {
                            this.connections.splice(connIndex, 1);
                        }
                    }
                    this.saveState();
                    this.redraw();
                    break;
                case 'splitLine':
                    // Split a bidirectional line into two separate connections
                    const conn = this.contextMenuConnection;
                    if (conn.startArrow && conn.startArrow !== 'none' &&
                        conn.endArrow && conn.endArrow !== 'none') {
                        // Create reverse connection
                        this.connections.push({
                            from: conn.to,
                            to: conn.from,
                            type: 'arrow',
                            label: '',
                            note: '',
                            startArrow: 'none',
                            endArrow: conn.startArrow
                        });
                        // Update original connection to only have end arrow
                        conn.startArrow = 'none';
                        this.saveState();
                        this.redraw();
                    }
                    break;
            }
            this.contextMenuConnection = null;
        }

        this.hideContextMenu();
    }

    createToBeComparison() {
        // Save current state if inside a group
        if (this.currentGroup) {
            this.currentGroup.children = [...this.shapes];
            this.currentGroup.childConnections = [...this.connections];
        }

        // Deep clone helper function
        const deepCloneShape = (shape) => {
            const cloned = {
                id: Date.now() + Math.random(), // New unique ID
                type: shape.type,
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                fillColor: shape.fillColor,
                strokeColor: shape.strokeColor,
                strokeWidth: shape.strokeWidth,
                text: shape.text
            };

            if (shape.children) {
                cloned.children = shape.children.map(child => deepCloneShape(child));
            }

            if (shape.childConnections) {
                cloned.childConnections = [];
                // Will be restored after all shapes are cloned
            }

            return cloned;
        };

        // Get shapes to copy (always use current view, not root)
        const shapesToCopy = this.shapes;
        const connectionsToCopy = this.connections;

        // Helper function to restore connections with cloned shapes
        const restoreConnections = (originalShapes, clonedShapes, originalConnections) => {
            return originalConnections.map(conn => {
                const fromIndex = originalShapes.indexOf(conn.from);
                const toIndex = originalShapes.indexOf(conn.to);
                return {
                    from: clonedShapes[fromIndex],
                    to: clonedShapes[toIndex],
                    type: conn.type,
                    label: conn.label || '',
                    name: conn.name || '',
                    note: conn.note || '',
                    startArrow: conn.startArrow || 'none',
                    endArrow: conn.endArrow || 'arrow',
                    lineStyle: conn.lineStyle || 'solid'
                };
            });
        };

        // Restore child connections recursively
        const restoreChildConnections = (originalShape, clonedShape) => {
            if (originalShape.childConnections && originalShape.children) {
                clonedShape.childConnections = originalShape.childConnections.map(conn => {
                    const fromIndex = originalShape.children.indexOf(conn.from);
                    const toIndex = originalShape.children.indexOf(conn.to);
                    return {
                        from: clonedShape.children[fromIndex],
                        to: clonedShape.children[toIndex],
                        type: conn.type,
                        label: conn.label || '',
                        name: conn.name || '',
                        note: conn.note || '',
                        startArrow: conn.startArrow || 'none',
                        endArrow: conn.endArrow || 'arrow',
                        lineStyle: conn.lineStyle || 'solid'
                    };
                });
            }

            if (clonedShape.children) {
                clonedShape.children.forEach((child, index) => {
                    if (originalShape.children[index]) {
                        restoreChildConnections(originalShape.children[index], child);
                    }
                });
            }
        };

        // Create As-Is data (deep clone to preserve original state)
        const asIsClonedShapes = shapesToCopy.map(shape => deepCloneShape(shape));
        const asIsClonedConnections = restoreConnections(shapesToCopy, asIsClonedShapes, connectionsToCopy);

        // Restore child connections for As-Is
        asIsClonedShapes.forEach((clonedShape, index) => {
            restoreChildConnections(shapesToCopy[index], clonedShape);
        });

        this.asIsData = {
            shapes: asIsClonedShapes,
            connections: asIsClonedConnections,
            rootShapes: asIsClonedShapes,
            rootConnections: asIsClonedConnections,
            currentGroup: this.currentGroup,
            groupPath: [...this.groupPath]
        };

        // Create To-Be data (deep clone)
        const clonedShapes = shapesToCopy.map(shape => deepCloneShape(shape));
        const clonedConnections = restoreConnections(shapesToCopy, clonedShapes, connectionsToCopy);

        clonedShapes.forEach((clonedShape, index) => {
            restoreChildConnections(shapesToCopy[index], clonedShape);
        });

        // Save To-Be data (preserve current group and path)
        this.toBeData = {
            shapes: clonedShapes,
            connections: clonedConnections,
            rootShapes: clonedShapes,
            rootConnections: clonedConnections,
            currentGroup: this.currentGroup,
            groupPath: [...this.groupPath]
        };

        // Enable comparison mode
        this.comparisonMode = true;
        this.currentView = 'asis';

        // Update UI to show comparison controls
        this.showComparisonUI();

        // Load As-Is view
        this.loadView('asis');
    }

    showComparisonUI() {
        // Update comparison toolbar through TabManager
        if (window.tabManager && window.tabManager.updateComparisonToolbarUI) {
            window.tabManager.updateComparisonToolbarUI(this);
        }
    }

    hideComparisonUI() {
        // Update comparison toolbar through TabManager
        if (window.tabManager && window.tabManager.updateComparisonToolbarUI) {
            window.tabManager.updateComparisonToolbarUI(this);
        }
    }

    loadView(view) {
        // Save current view before switching
        if (this.comparisonMode) {
            if (this.currentView === 'asis' && this.asIsData) {
                this.asIsData.shapes = this.shapes;
                this.asIsData.connections = this.connections;
                this.asIsData.rootShapes = this.rootShapes;
                this.asIsData.rootConnections = this.rootConnections;
                this.asIsData.currentGroup = this.currentGroup;
                this.asIsData.groupPath = [...this.groupPath];  // Copy array
            } else if (this.currentView === 'tobe' && this.toBeData) {
                this.toBeData.shapes = this.shapes;
                this.toBeData.connections = this.connections;
                this.toBeData.rootShapes = this.rootShapes;
                this.toBeData.rootConnections = this.rootConnections;
                this.toBeData.currentGroup = this.currentGroup;
                this.toBeData.groupPath = [...this.groupPath];  // Copy array
            }
        }

        // Load the selected view
        this.currentView = view;
        const data = view === 'asis' ? this.asIsData : this.toBeData;

        if (data) {
            this.shapes = data.shapes;
            this.connections = data.connections;
            this.rootShapes = data.rootShapes;
            this.rootConnections = data.rootConnections;
            this.currentGroup = data.currentGroup;
            this.groupPath = [...(data.groupPath || [])];  // Copy array
        }

        this.selectedShape = null;
        this.selectedShapes = [];
        this.updateBreadcrumb();
        this.redraw();

        // Update comparison toolbar UI through TabManager
        if (window.tabManager && window.tabManager.updateComparisonToolbarUI) {
            window.tabManager.updateComparisonToolbarUI(this);
        }
    }

    exitComparisonMode() {
        if (confirm('Exit comparison mode? This will return to the As-Is diagram.')) {
            // Load As-Is data
            if (this.asIsData) {
                this.shapes = [...this.asIsData.shapes];
                this.connections = [...this.asIsData.connections];
                this.rootShapes = [...this.asIsData.rootShapes];
                this.rootConnections = [...this.asIsData.rootConnections];
                this.currentGroup = this.asIsData.currentGroup;
                this.groupPath = this.asIsData.groupPath ? [...this.asIsData.groupPath] : [];
            }

            // Reset comparison mode
            this.comparisonMode = false;
            this.asIsData = null;
            this.toBeData = null;
            this.currentView = 'asis';

            // Hide comparison UI
            this.hideComparisonUI();

            this.selectedShape = null;
            this.selectedShapes = [];
            this.updateBreadcrumb();
            this.redraw();
        }
    }

    updateMermaidOutputIfOpen() {
        // Check if this editor is the active one and view mode is open
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor !== this) return; // Only update if this is the active editor

        const rightSidebar = document.getElementById('rightSidebar');
        const viewMode = document.getElementById('viewMode');
        const isViewModeActive = rightSidebar?.style.display === 'flex' && viewMode?.style.display === 'flex';

        console.log('[updateMermaidOutputIfOpen]', {
            isActive: activeEditor === this,
            isViewModeActive,
            shapesCount: this.shapes.length
        });

        if (isViewModeActive) {
            // Re-generate and update mermaid output
            if (this.shapes.length > 0) {
                const mermaidCode = this.generateMermaidFromDiagram();
                console.log('[updateMermaidOutputIfOpen] Generated:', mermaidCode);
                document.getElementById('mermaidOutput').value = mermaidCode;
                this.mermaidOutputCode = mermaidCode;
            } else {
                console.log('[updateMermaidOutputIfOpen] No shapes');
                document.getElementById('mermaidOutput').value = 'flowchart LR\n';
                this.mermaidOutputCode = 'flowchart LR\n';
            }
        }
    }

    // Undo/Redo system
    saveState() {
        // Filter out context boxes before saving
        const realShapes = this.shapes.filter(s => !s.isContextBox);
        const realConnections = this.connections.filter(c => !c.isContextConnection);
        const realRootShapes = this.rootShapes.filter(s => !s.isContextBox);
        const realRootConnections = this.rootConnections.filter(c => !c.isContextConnection);

        // Auto-update mermaid output if view mode is open
        this.updateMermaidOutputIfOpen();

        // Deep clone current state
        const state = {
            shapes: JSON.parse(JSON.stringify(realShapes)),
            connections: realConnections.map(conn => ({
                fromId: conn.from.id,
                toId: conn.to.id,
                type: conn.type,
                label: conn.label || ''
            })),
            currentGroup: this.currentGroup ? this.currentGroup.id : null,
            rootShapes: JSON.parse(JSON.stringify(realRootShapes)),
            rootConnections: realRootConnections.map(conn => ({
                fromId: conn.from.id,
                toId: conn.to.id,
                type: conn.type,
                label: conn.label || ''
            }))
        };

        // Remove future states if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new state
        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(state) {
        // Restore shapes
        this.shapes = JSON.parse(JSON.stringify(state.shapes));
        this.rootShapes = JSON.parse(JSON.stringify(state.rootShapes));

        // Restore connections by finding shapes by ID
        const findShapeById = (id, shapeList) => {
            for (let shape of shapeList) {
                if (shape.id === id) return shape;
                if (shape.children) {
                    const found = findShapeById(id, shape.children);
                    if (found) return found;
                }
            }
            return null;
        };

        this.connections = state.connections.map(conn => ({
            from: findShapeById(conn.fromId, this.shapes),
            to: findShapeById(conn.toId, this.shapes),
            type: conn.type,
            label: conn.label || ''
        })).filter(conn => conn.from && conn.to);

        this.rootConnections = state.rootConnections.map(conn => ({
            from: findShapeById(conn.fromId, this.rootShapes),
            to: findShapeById(conn.toId, this.rootShapes),
            type: conn.type,
            label: conn.label || ''
        })).filter(conn => conn.from && conn.to);

        // Restore current group
        if (state.currentGroup) {
            this.currentGroup = findShapeById(state.currentGroup, this.shapes) ||
                               findShapeById(state.currentGroup, this.rootShapes);
        } else {
            this.currentGroup = null;
        }

        this.selectedShape = null;
        this.selectedShapes = [];
        this.redraw();
    }

    handleShapeImport(file) {
        if (!file || !this.shapeToImportInto) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const fileExt = file.name.split('.').pop().toLowerCase();

                let importedData;
                if (fileExt === 'json') {
                    importedData = this.parseJSONImport(content);
                } else if (fileExt === 'mmd' || fileExt === 'mermaid') {
                    importedData = this.parseMermaidImport(content);
                } else {
                    alert('Unsupported file format. Please use .json, .mmd, or .mermaid files.');
                    return;
                }

                if (importedData) {
                    // Import into the shape's children
                    this.shapeToImportInto.children = importedData.shapes;
                    this.shapeToImportInto.childConnections = importedData.connections;
                    this.saveState();
                    this.redraw();
                    alert('Import successful!');
                }
            } catch (error) {
                alert('Error importing file: ' + error.message);
                console.error(error);
            } finally {
                this.shapeToImportInto = null;
            }
        };
        reader.readAsText(file);
    }

    parseJSONImport(content) {
        const data = JSON.parse(content);

        // Deserialize shapes
        const deserializeShape = (shapeData) => {
            const shape = { ...shapeData };
            if (shapeData.children && shapeData.children.length > 0) {
                shape.children = shapeData.children.map(child => deserializeShape(child));

                if (shapeData.childConnections) {
                    shape.childConnections = shapeData.childConnections.map(conn => ({
                        from: shape.children[conn.from],
                        to: shape.children[conn.to],
                        type: conn.type,
                        label: conn.label || ''
                    }));
                } else {
                    shape.childConnections = [];
                }
            }
            return shape;
        };

        const shapes = (data.shapes || []).map(shape => deserializeShape(shape));
        const connections = (data.connections || []).map(conn => ({
            from: shapes[conn.from],
            to: shapes[conn.to],
            type: conn.type,
            label: conn.label || ''
        }));

        return { shapes, connections };
    }

    parseMermaidImport(content) {
        // Simple Mermaid flowchart parser
        const shapes = [];
        const connections = [];
        const shapeMap = {};

        // Parse lines
        const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('%%'));

        let yOffset = 50;
        let xOffset = 50;

        for (let line of lines) {
            // Skip flowchart declaration
            if (line.startsWith('flowchart') || line.startsWith('graph')) continue;

            // Match node definition: A[Text] or A(Text) or A{Text}
            const nodeMatch = line.match(/([A-Za-z0-9_]+)([\[\(\{])(.*?)([\]\)\}])/);
            if (nodeMatch) {
                const [, id, startBracket, text] = nodeMatch;

                let shapeType = 'rectangle';
                if (startBracket === '(') shapeType = 'circle';
                else if (startBracket === '{') shapeType = 'diamond';

                if (!shapeMap[id]) {
                    const shape = {
                        id: Date.now() + Math.random(),
                        type: shapeType,
                        x: xOffset,
                        y: yOffset,
                        width: 120,
                        height: 60,
                        fillColor: '#ffffff',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        text: text,
                        children: [],
                        childConnections: []
                    };
                    shapeMap[id] = shape;
                    shapes.push(shape);
                    xOffset += 180;
                    if (xOffset > 600) {
                        xOffset = 50;
                        yOffset += 120;
                    }
                }
            }

            // Match connection: A --> B or A -.-> B or A --> |label| B
            const connMatch = line.match(/([A-Za-z0-9_]+)\s*(-->|\.\.>|-\.->)\s*(?:\|([^|]+)\|\s*)?([A-Za-z0-9_]+)/);
            if (connMatch) {
                const [, fromId, connType, label, toId] = connMatch;

                // Ensure both nodes exist
                if (!shapeMap[fromId]) {
                    shapeMap[fromId] = {
                        id: Date.now() + Math.random(),
                        type: 'rectangle',
                        x: xOffset,
                        y: yOffset,
                        width: 120,
                        height: 60,
                        fillColor: '#ffffff',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        text: fromId,
                        children: [],
                        childConnections: []
                    };
                    shapes.push(shapeMap[fromId]);
                    xOffset += 180;
                }

                if (!shapeMap[toId]) {
                    shapeMap[toId] = {
                        id: Date.now() + Math.random(),
                        type: 'rectangle',
                        x: xOffset,
                        y: yOffset,
                        width: 120,
                        height: 60,
                        fillColor: '#ffffff',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        text: toId,
                        children: [],
                        childConnections: []
                    };
                    shapes.push(shapeMap[toId]);
                    xOffset += 180;
                }

                connections.push({
                    from: shapeMap[fromId],
                    to: shapeMap[toId],
                    type: 'arrow',
                    label: label || ''
                });
            }
        }

        return { shapes, connections };
    }

    createShape(x, y, width, height) {
        const shape = {
            id: Date.now(),
            type: this.currentShape,
            x: width < 0 ? x + width : x,
            y: height < 0 ? y + height : y,
            width: Math.abs(width),
            height: Math.abs(height),
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            text: '',
            // All shapes can now have children (detailed view)
            children: [],
            childConnections: [],
            layerId: this.activeLayer ? this.activeLayer.id : null
        };

        this.shapes.push(shape);
        this.saveState();
        this.redraw();
        this.renderLayerList(); // Update layer count
    }

    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawShape(shape, isSelected = false, impactType = null) {
        // Apply impact analysis highlighting with modern colors
        if (impactType) {
            if (impactType === 'target') {
                this.ctx.shadowColor = 'rgba(168, 85, 247, 0.7)';
                this.ctx.shadowBlur = 24;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            } else if (impactType === 'upstream') {
                this.ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
                this.ctx.shadowBlur = 18;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            } else if (impactType === 'downstream') {
                this.ctx.shadowColor = 'rgba(236, 72, 153, 0.6)';
                this.ctx.shadowBlur = 18;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            }
        } else if (this.modernMode) {
            // Apply modern mode styling
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 2;
        }

        this.ctx.fillStyle = shape.fillColor;
        // In modern mode, soften pure black strokes
        this.ctx.strokeStyle = (this.modernMode && shape.strokeColor === '#000000') ? '#4a5568' : shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;

        // Change border color for impact analysis (without making it thicker)
        if (impactType) {
            if (impactType === 'target') {
                // Purple border for target shapes
                this.ctx.strokeStyle = '#a855f7';
            } else if (impactType === 'upstream') {
                this.ctx.strokeStyle = '#3b82f6';
            } else if (impactType === 'downstream') {
                this.ctx.strokeStyle = '#ec4899';
            }
        }

        switch (shape.type) {
            case 'rectangle':
                if (this.modernMode) {
                    // Draw rounded rectangle
                    this.drawRoundedRect(shape.x, shape.y, shape.width, shape.height, 8);
                } else {
                    this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                    this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                }
                break;
            case 'circle':
                const radius = Math.min(shape.width, shape.height) / 2;
                const centerX = shape.x + shape.width / 2;
                const centerY = shape.y + shape.height / 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'diamond':
                const midX = shape.x + shape.width / 2;
                const midY = shape.y + shape.height / 2;
                this.ctx.beginPath();
                if (this.modernMode) {
                    // Smooth diamond with rounded corners
                    const offset = 5;
                    this.ctx.moveTo(midX, shape.y + offset);
                    this.ctx.quadraticCurveTo(midX, shape.y, midX + offset, shape.y + offset);
                    this.ctx.lineTo(shape.x + shape.width - offset, midY - offset);
                    this.ctx.quadraticCurveTo(shape.x + shape.width, midY, shape.x + shape.width - offset, midY + offset);
                    this.ctx.lineTo(midX + offset, shape.y + shape.height - offset);
                    this.ctx.quadraticCurveTo(midX, shape.y + shape.height, midX - offset, shape.y + shape.height - offset);
                    this.ctx.lineTo(shape.x + offset, midY + offset);
                    this.ctx.quadraticCurveTo(shape.x, midY, shape.x + offset, midY - offset);
                    this.ctx.closePath();
                } else {
                    this.ctx.moveTo(midX, shape.y);
                    this.ctx.lineTo(shape.x + shape.width, midY);
                    this.ctx.lineTo(midX, shape.y + shape.height);
                    this.ctx.lineTo(shape.x, midY);
                    this.ctx.closePath();
                }
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'text':
                this.ctx.font = `${shape.height}px Arial`;
                this.ctx.fillStyle = shape.strokeColor;
                this.ctx.fillText(shape.text || 'Text', shape.x, shape.y + shape.height);
                break;
            case 'group':
                // Draw dashed border for group
                if (this.modernMode) {
                    this.ctx.setLineDash([8, 4]);
                    this.drawRoundedRect(shape.x, shape.y, shape.width, shape.height, 8);
                    this.ctx.setLineDash([]);
                } else {
                    this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                    this.ctx.setLineDash([8, 4]);
                    this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                    this.ctx.setLineDash([]);
                }

                // Draw folder icon in corner
                const iconSize = 20;
                this.ctx.fillStyle = '#3498db';
                this.ctx.fillRect(shape.x + shape.width - iconSize - 5, shape.y + 5, iconSize, iconSize - 5);
                this.ctx.fillRect(shape.x + shape.width - iconSize - 5, shape.y + 5, iconSize / 2, 3);

                // Show child count
                if (shape.children && shape.children.length > 0) {
                    this.ctx.fillStyle = '#2c3e50';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.textAlign = 'right';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(`${shape.children.length} items`, shape.x + shape.width - 5, shape.y + shape.height - 18);
                }
                break;
            case 'database':
                const dbCenterX = shape.x + shape.width / 2;
                const dbRadiusX = shape.width / 2;
                const dbRadiusY = shape.height / 8;

                // Top ellipse
                this.ctx.beginPath();
                this.ctx.ellipse(dbCenterX, shape.y + dbRadiusY, dbRadiusX, dbRadiusY, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Sides
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x, shape.y + dbRadiusY);
                this.ctx.lineTo(shape.x, shape.y + shape.height - dbRadiusY);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x + shape.width, shape.y + dbRadiusY);
                this.ctx.lineTo(shape.x + shape.width, shape.y + shape.height - dbRadiusY);
                this.ctx.stroke();

                // Middle ellipses
                this.ctx.beginPath();
                this.ctx.ellipse(dbCenterX, shape.y + shape.height / 2, dbRadiusX, dbRadiusY, 0, 0, Math.PI * 2);
                this.ctx.stroke();

                // Bottom ellipse
                this.ctx.beginPath();
                this.ctx.ellipse(dbCenterX, shape.y + shape.height - dbRadiusY, dbRadiusX, dbRadiusY, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'cloud':
                const cloudX = shape.x;
                const cloudY = shape.y;
                const cloudW = shape.width;
                const cloudH = shape.height;

                this.ctx.beginPath();
                this.ctx.moveTo(cloudX + cloudW * 0.2, cloudY + cloudH * 0.8);
                this.ctx.bezierCurveTo(cloudX, cloudY + cloudH * 0.8, cloudX, cloudY + cloudH * 0.4, cloudX + cloudW * 0.2, cloudY + cloudH * 0.4);
                this.ctx.bezierCurveTo(cloudX + cloudW * 0.2, cloudY + cloudH * 0.2, cloudX + cloudW * 0.4, cloudY, cloudX + cloudW * 0.5, cloudY);
                this.ctx.bezierCurveTo(cloudX + cloudW * 0.7, cloudY, cloudX + cloudW * 0.8, cloudY + cloudH * 0.2, cloudX + cloudW * 0.8, cloudY + cloudH * 0.4);
                this.ctx.bezierCurveTo(cloudX + cloudW, cloudY + cloudH * 0.4, cloudX + cloudW, cloudY + cloudH * 0.8, cloudX + cloudW * 0.8, cloudY + cloudH * 0.8);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'server':
                const serverPadding = 5;
                const serverBoxHeight = (shape.height - serverPadding) / 2;

                // Top server box
                this.ctx.fillRect(shape.x, shape.y, shape.width, serverBoxHeight);
                this.ctx.strokeRect(shape.x, shape.y, shape.width, serverBoxHeight);

                // Bottom server box
                this.ctx.fillRect(shape.x, shape.y + serverBoxHeight + serverPadding, shape.width, serverBoxHeight);
                this.ctx.strokeRect(shape.x, shape.y + serverBoxHeight + serverPadding, shape.width, serverBoxHeight);

                // Indicator lights
                this.ctx.fillStyle = '#48bb78';
                this.ctx.beginPath();
                this.ctx.arc(shape.x + 15, shape.y + serverBoxHeight / 2, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(shape.x + 15, shape.y + serverBoxHeight + serverPadding + serverBoxHeight / 2, 3, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'api':
                const apiBoxWidth = shape.width * 0.35;
                const apiGap = shape.width * 0.05;

                // Left box
                this.ctx.fillRect(shape.x, shape.y + shape.height * 0.3, apiBoxWidth, shape.height * 0.4);
                this.ctx.strokeRect(shape.x, shape.y + shape.height * 0.3, apiBoxWidth, shape.height * 0.4);

                // Right box
                this.ctx.fillRect(shape.x + shape.width - apiBoxWidth, shape.y + shape.height * 0.3, apiBoxWidth, shape.height * 0.4);
                this.ctx.strokeRect(shape.x + shape.width - apiBoxWidth, shape.y + shape.height * 0.3, apiBoxWidth, shape.height * 0.4);

                // Connection line
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x + apiBoxWidth, shape.y + shape.height / 2);
                this.ctx.lineTo(shape.x + shape.width - apiBoxWidth, shape.y + shape.height / 2);
                this.ctx.stroke();

                // Connection dots
                this.ctx.fillStyle = shape.strokeColor;
                this.ctx.beginPath();
                this.ctx.arc(shape.x + apiBoxWidth + apiGap, shape.y + shape.height / 2, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(shape.x + shape.width - apiBoxWidth - apiGap, shape.y + shape.height / 2, 4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'user':
                const userCenterX = shape.x + shape.width / 2;
                const headRadius = shape.height * 0.2;
                const headY = shape.y + headRadius + 10;

                // Head
                this.ctx.beginPath();
                this.ctx.arc(userCenterX, headY, headRadius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Body
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x + shape.width * 0.2, shape.y + shape.height - 5);
                this.ctx.quadraticCurveTo(shape.x + shape.width * 0.2, shape.y + shape.height * 0.5, userCenterX, shape.y + shape.height * 0.5);
                this.ctx.quadraticCurveTo(shape.x + shape.width * 0.8, shape.y + shape.height * 0.5, shape.x + shape.width * 0.8, shape.y + shape.height - 5);
                this.ctx.stroke();
                break;
            case 'process':
                const processCenterX = shape.x + shape.width / 2;
                const processCenterY = shape.y + shape.height / 2;
                const gearRadius = Math.min(shape.width, shape.height) * 0.25;
                const innerRadius = gearRadius * 0.6;
                const teeth = 8;

                // Draw gear
                this.ctx.beginPath();
                for (let i = 0; i < teeth * 2; i++) {
                    const angle = (i * Math.PI) / teeth;
                    const radius = i % 2 === 0 ? gearRadius : innerRadius;
                    const x = processCenterX + radius * Math.cos(angle);
                    const y = processCenterY + radius * Math.sin(angle);
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Inner circle
                this.ctx.beginPath();
                this.ctx.arc(processCenterX, processCenterY, gearRadius * 0.4, 0, Math.PI * 2);
                this.ctx.fillStyle = shape.fillColor;
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }

        // Draw text on shape
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        if (shape.text && shape.type !== 'text') {
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(shape.text, centerX, centerY);
        }

        // Draw text selection highlight and cursor if editing this shape
        if (this.editingTarget === shape && !this.impactAnalysisMode) {
            const text = shape.text || '';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Draw selection highlight if text is selected
            if (this.textSelectionStart !== this.textSelectionEnd && this.textSelectionStart !== -1) {
                const beforeSelection = text.substring(0, this.textSelectionStart);
                const selectedText = text.substring(this.textSelectionStart, this.textSelectionEnd);

                const beforeWidth = this.ctx.measureText(beforeSelection).width;
                const selectedWidth = this.ctx.measureText(selectedText).width;
                const totalWidth = this.ctx.measureText(text).width;

                // Calculate selection rectangle position
                const textStartX = centerX - totalWidth / 2;
                const highlightX = textStartX + beforeWidth;
                const highlightY = centerY - 10;
                const highlightHeight = 20;

                // Draw blue highlight background
                this.ctx.fillStyle = 'rgba(0, 120, 215, 0.3)'; // Windows-style blue selection
                this.ctx.fillRect(highlightX, highlightY, selectedWidth, highlightHeight);
            }

            // Draw cursor line if visible and no selection (or cursor position)
            if (this.cursorVisible && this.textSelectionStart === this.textSelectionEnd) {
                const textMetrics = this.ctx.measureText(text);
                const cursorX = centerX + textMetrics.width / 2;

                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(cursorX, centerY - 10);
                this.ctx.lineTo(cursorX, centerY + 10);
                this.ctx.stroke();
            }
        }

        // Reset shadow for modern mode
        if (this.modernMode) {
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // Draw selection handles
        if (isSelected) {
            this.drawSelectionHandles(shape);
        }
    }

    drawSelectionHandles(shape) {
        this.ctx.fillStyle = '#3498db';
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 2;

        const handles = this.getHandlePositions(shape);
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
            this.ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
        });

        // Draw bounding box
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        this.ctx.setLineDash([]);
    }

    getHandlePositions(shape) {
        return [
            { x: shape.x, y: shape.y, pos: 'nw' },
            { x: shape.x + shape.width / 2, y: shape.y, pos: 'n' },
            { x: shape.x + shape.width, y: shape.y, pos: 'ne' },
            { x: shape.x + shape.width, y: shape.y + shape.height / 2, pos: 'e' },
            { x: shape.x + shape.width, y: shape.y + shape.height, pos: 'se' },
            { x: shape.x + shape.width / 2, y: shape.y + shape.height, pos: 's' },
            { x: shape.x, y: shape.y + shape.height, pos: 'sw' },
            { x: shape.x, y: shape.y + shape.height / 2, pos: 'w' }
        ];
    }

    getResizeHandle(pos) {
        if (!this.selectedShape) return null;

        const handles = this.getHandlePositions(this.selectedShape);
        for (let handle of handles) {
            const dx = pos.x - handle.x;
            const dy = pos.y - handle.y;
            if (Math.sqrt(dx * dx + dy * dy) < 6) {
                return handle.pos;
            }
        }
        return null;
    }

    resizeShape(shape, handle, pos) {
        const minSize = 20;

        switch (handle) {
            case 'nw':
                const newWidth = shape.width + (shape.x - pos.x);
                const newHeight = shape.height + (shape.y - pos.y);
                if (newWidth > minSize && newHeight > minSize) {
                    shape.x = pos.x;
                    shape.y = pos.y;
                    shape.width = newWidth;
                    shape.height = newHeight;
                }
                break;
            case 'ne':
                shape.width = pos.x - shape.x;
                const newHeightNE = shape.height + (shape.y - pos.y);
                if (shape.width > minSize && newHeightNE > minSize) {
                    shape.y = pos.y;
                    shape.height = newHeightNE;
                }
                break;
            case 'se':
                shape.width = pos.x - shape.x;
                shape.height = pos.y - shape.y;
                break;
            case 'sw':
                const newWidthSW = shape.width + (shape.x - pos.x);
                if (newWidthSW > minSize) {
                    shape.x = pos.x;
                    shape.width = newWidthSW;
                }
                shape.height = pos.y - shape.y;
                break;
            case 'n':
                const newHeightN = shape.height + (shape.y - pos.y);
                if (newHeightN > minSize) {
                    shape.y = pos.y;
                    shape.height = newHeightN;
                }
                break;
            case 's':
                shape.height = pos.y - shape.y;
                break;
            case 'e':
                shape.width = pos.x - shape.x;
                break;
            case 'w':
                const newWidthW = shape.width + (shape.x - pos.x);
                if (newWidthW > minSize) {
                    shape.x = pos.x;
                    shape.width = newWidthW;
                }
                break;
        }
    }

    drawPreview(startX, startY, endX, endY) {
        const width = endX - startX;
        const height = endY - startY;

        this.ctx.fillStyle = this.fillColor;
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.globalAlpha = 0.5;
        this.ctx.setLineDash([5, 5]);

        const x = width < 0 ? endX : startX;
        const y = height < 0 ? endY : startY;
        const w = Math.abs(width);
        const h = Math.abs(height);

        switch (this.currentShape) {
            case 'rectangle':
                this.ctx.fillRect(x, y, w, h);
                this.ctx.strokeRect(x, y, w, h);
                break;
            case 'circle':
                const radius = Math.min(w, h) / 2;
                const centerX = x + w / 2;
                const centerY = y + h / 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'diamond':
                const midX = x + w / 2;
                const midY = y + h / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(midX, y);
                this.ctx.lineTo(x + w, midY);
                this.ctx.lineTo(midX, y + h);
                this.ctx.lineTo(x, midY);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }

        this.ctx.globalAlpha = 1;
        this.ctx.setLineDash([]);
    }

    drawArrowHead(x, y, angle, type, size = 14, isSelected = false) {
        if (type === 'none') return;

        const arrowAngle = Math.PI / 6;

        this.ctx.save();
        const color = isSelected ? '#1976d2' : '#2d3748';
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = isSelected ? 3 : 2;

        switch (type) {
            case 'arrow':
                // Standard arrow
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(
                    x - size * Math.cos(angle - arrowAngle),
                    y - size * Math.sin(angle - arrowAngle)
                );
                this.ctx.lineTo(
                    x - size * Math.cos(angle + arrowAngle),
                    y - size * Math.sin(angle + arrowAngle)
                );
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'circle':
                // Circle arrow
                const circleRadius = size / 2;
                const circleX = x - circleRadius * Math.cos(angle);
                const circleY = y - circleRadius * Math.sin(angle);
                this.ctx.beginPath();
                this.ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fill();
                this.ctx.stroke();
                break;

            case 'diamond':
                // Diamond arrow
                const diamondSize = size * 0.8;
                const diamondX = x - diamondSize * Math.cos(angle);
                const diamondY = y - diamondSize * Math.sin(angle);

                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(
                    diamondX - diamondSize * 0.5 * Math.cos(angle + Math.PI / 2),
                    diamondY - diamondSize * 0.5 * Math.sin(angle + Math.PI / 2)
                );
                this.ctx.lineTo(
                    x - diamondSize * 2 * Math.cos(angle),
                    y - diamondSize * 2 * Math.sin(angle)
                );
                this.ctx.lineTo(
                    diamondX - diamondSize * 0.5 * Math.cos(angle - Math.PI / 2),
                    diamondY - diamondSize * 0.5 * Math.sin(angle - Math.PI / 2)
                );
                this.ctx.closePath();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }

        this.ctx.restore();
    }

    getConnectionLinePosition(conn) {
        // Calculate actual rendered position of a connection line (with offset)
        const from = conn.from;
        const to = conn.to;

        // Find connections in the same direction (from → to)
        const sameDirectionConnections = this.connections.filter(c =>
            c.from === from && c.to === to
        );

        // Check if there's a reverse connection (bidirectional)
        const hasReverse = this.connections.some(c => c.from === to && c.to === from);

        // Calculate offset for multiple connections
        let offsetAmount = 0;

        if (hasReverse) {
            // For bidirectional: separate A→B and B→A to opposite sides
            const baseOffset = 20;
            const spreadDistance = 25;

            // Determine direction multiplier based on which direction was created first
            const reverseConnections = this.connections.filter(c => c.from === to && c.to === from);
            const firstSameDirection = Math.min(...sameDirectionConnections.map(c => this.connections.indexOf(c)));
            const firstReverseDirection = Math.min(...reverseConnections.map(c => this.connections.indexOf(c)));

            // If this direction was created first, use positive offset (+1)
            // If reverse direction was created first, use negative offset (-1)
            const directionMultiplier = firstSameDirection < firstReverseDirection ? 1 : -1;

            // Calculate position within this direction's group
            const connIndexInMain = this.connections.indexOf(conn);
            const sameDirectionIndices = sameDirectionConnections.map(c => this.connections.indexOf(c));
            const positionInGroup = sameDirectionIndices.indexOf(connIndexInMain);

            // Linear offset: first line at baseOffset, subsequent lines spread further
            const additionalOffset = positionInGroup * spreadDistance;
            offsetAmount = (baseOffset + additionalOffset) * directionMultiplier;
        } else if (sameDirectionConnections.length > 1) {
            const connIndexInMain = this.connections.indexOf(conn);
            const sameDirectionIndices = sameDirectionConnections.map(c => this.connections.indexOf(c));
            const positionInGroup = sameDirectionIndices.indexOf(connIndexInMain);

            const spreadDistance = 25;
            offsetAmount = (positionInGroup - (sameDirectionConnections.length - 1) / 2) * spreadDistance;
        }

        const fromCenterX = from.x + from.width / 2;
        const fromCenterY = from.y + from.height / 2;
        const toCenterX = to.x + to.width / 2;
        const toCenterY = to.y + to.height / 2;

        // Calculate perpendicular direction for offset
        // For bidirectional connections, use the same reference direction for both
        let dx, dy;
        if (hasReverse) {
            const reverseConnections = this.connections.filter(c => c.from === to && c.to === from);
            const firstSameDirection = Math.min(...sameDirectionConnections.map(c => this.connections.indexOf(c)));
            const firstReverseDirection = Math.min(...reverseConnections.map(c => this.connections.indexOf(c)));

            // Use direction of the connection that was created first as reference
            if (firstSameDirection < firstReverseDirection) {
                // This direction was first, use normal direction
                dx = toCenterX - fromCenterX;
                dy = toCenterY - fromCenterY;
            } else {
                // Reverse direction was first, flip to use its reference
                dx = fromCenterX - toCenterX;
                dy = fromCenterY - toCenterY;
            }
        } else {
            // No bidirectional, use normal direction
            dx = toCenterX - fromCenterX;
            dy = toCenterY - fromCenterY;
        }

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) {
            return { fromX: fromCenterX, fromY: fromCenterY, toX: toCenterX, toY: toCenterY };
        }

        const perpX = -dy / dist;
        const perpY = dx / dist;

        // Apply offset to center points
        const fromOffsetX = fromCenterX + perpX * offsetAmount;
        const fromOffsetY = fromCenterY + perpY * offsetAmount;
        const toOffsetX = toCenterX + perpX * offsetAmount;
        const toOffsetY = toCenterY + perpY * offsetAmount;

        // Calculate intersection points at shape edges
        const fromEdge = this.getEdgeIntersection(from, fromOffsetX, fromOffsetY, toOffsetX, toOffsetY);
        const toEdge = this.getEdgeIntersection(to, toOffsetX, toOffsetY, fromOffsetX, fromOffsetY);

        return {
            fromX: fromEdge.x,
            fromY: fromEdge.y,
            toX: toEdge.x,
            toY: toEdge.y
        };
    }

    drawConnection(conn, isUpstream = false, isDownstream = false, isTargetConnection = false) {
        const from = conn.from;
        const to = conn.to;

        // Find connections in the same direction (from → to)
        const sameDirectionConnections = this.connections.filter(c =>
            c.from === from && c.to === to
        );

        // Check if there's a reverse connection (bidirectional)
        const hasReverse = this.connections.some(c => c.from === to && c.to === from);

        // Apply impact analysis styling with modern colors
        if (isUpstream || isDownstream || isTargetConnection) {
            this.ctx.lineWidth = 4;
            if (isTargetConnection) {
                this.ctx.strokeStyle = '#a855f7';
            } else if (isUpstream) {
                this.ctx.strokeStyle = '#3b82f6';
            } else if (isDownstream) {
                this.ctx.strokeStyle = '#ec4899';
            }
        }

        // Calculate offset for multiple connections
        let offsetAmount = 0;

        if (hasReverse) {
            // For bidirectional: separate A→B and B→A to opposite sides
            const baseOffset = 20;
            const spreadDistance = 25;

            // Determine direction multiplier based on which direction was created first
            const reverseConnections = this.connections.filter(c => c.from === to && c.to === from);
            const firstSameDirection = Math.min(...sameDirectionConnections.map(c => this.connections.indexOf(c)));
            const firstReverseDirection = Math.min(...reverseConnections.map(c => this.connections.indexOf(c)));

            // If this direction was created first, use positive offset (+1)
            // If reverse direction was created first, use negative offset (-1)
            const directionMultiplier = firstSameDirection < firstReverseDirection ? 1 : -1;

            // Calculate position within this direction's group
            const connIndexInMain = this.connections.indexOf(conn);
            const sameDirectionIndices = sameDirectionConnections.map(c => this.connections.indexOf(c));
            const positionInGroup = sameDirectionIndices.indexOf(connIndexInMain);

            // Linear offset: first line at baseOffset, subsequent lines spread further
            const additionalOffset = positionInGroup * spreadDistance;
            offsetAmount = (baseOffset + additionalOffset) * directionMultiplier;
        } else if (sameDirectionConnections.length > 1) {
            // No reverse connection, just multiple in same direction
            const connIndexInMain = this.connections.indexOf(conn);
            const sameDirectionIndices = sameDirectionConnections.map(c => this.connections.indexOf(c));
            const positionInGroup = sameDirectionIndices.indexOf(connIndexInMain);

            const spreadDistance = 25;
            offsetAmount = (positionInGroup - (sameDirectionConnections.length - 1) / 2) * spreadDistance;
        }

        const fromCenterX = from.x + from.width / 2;
        const fromCenterY = from.y + from.height / 2;
        const toCenterX = to.x + to.width / 2;
        const toCenterY = to.y + to.height / 2;

        // Calculate perpendicular direction for offset
        // For bidirectional connections, use the same reference direction for both
        let dx, dy;
        if (hasReverse) {
            const reverseConnections = this.connections.filter(c => c.from === to && c.to === from);
            const firstSameDirection = Math.min(...sameDirectionConnections.map(c => this.connections.indexOf(c)));
            const firstReverseDirection = Math.min(...reverseConnections.map(c => this.connections.indexOf(c)));

            // Use direction of the connection that was created first as reference
            if (firstSameDirection < firstReverseDirection) {
                // This direction was first, use normal direction
                dx = toCenterX - fromCenterX;
                dy = toCenterY - fromCenterY;
            } else {
                // Reverse direction was first, flip to use its reference
                dx = fromCenterX - toCenterX;
                dy = fromCenterY - toCenterY;
            }
        } else {
            // No bidirectional, use normal direction
            dx = toCenterX - fromCenterX;
            dy = toCenterY - fromCenterY;
        }

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return; // Avoid division by zero

        const perpX = -dy / dist;
        const perpY = dx / dist;

        // Apply offset to center points
        const fromOffsetX = fromCenterX + perpX * offsetAmount;
        const fromOffsetY = fromCenterY + perpY * offsetAmount;
        const toOffsetX = toCenterX + perpX * offsetAmount;
        const toOffsetY = toCenterY + perpY * offsetAmount;

        // Calculate intersection points at shape edges
        const fromEdge = this.getEdgeIntersection(from, fromOffsetX, fromOffsetY, toOffsetX, toOffsetY);
        const toEdge = this.getEdgeIntersection(to, toOffsetX, toOffsetY, fromOffsetX, fromOffsetY);

        const fromX = fromEdge.x;
        const fromY = fromEdge.y;
        const toX = toEdge.x;
        const toY = toEdge.y;

        // Highlight selected connections and hovered connections
        const isSelected = this.selectedConnections.includes(conn);
        const isHovered = conn === this.hoveredConnection;
        this.ctx.strokeStyle = isSelected ? '#1976d2' : (isHovered ? '#4a90e2' : '#2d3748');
        this.ctx.lineWidth = isSelected ? 4 : (isHovered ? 3 : 2.5);

        // Debug: always use straight line for now to verify
        if (false && hasReverse) {
            // Draw curved line for bidirectional connections
            const dx = toX - fromX;
            const dy = toY - fromY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const curveOffset = distance * 0.15;

            // Calculate perpendicular offset
            const perpX = -dy / distance * curveOffset;
            const perpY = dx / distance * curveOffset;

            // Control point for quadratic curve
            const cpX = (fromX + toX) / 2 + perpX;
            const cpY = (fromY + toY) / 2 + perpY;

            // Apply line style
            const lineStyle = conn.lineStyle || 'solid';
            if (lineStyle === 'dashed') {
                this.ctx.setLineDash([10, 5]);
            } else if (lineStyle === 'dotted') {
                this.ctx.setLineDash([2, 3]);
            } else {
                this.ctx.setLineDash([]);
            }

            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);
            this.ctx.quadraticCurveTo(cpX, cpY, toX, toY);
            this.ctx.stroke();

            // Reset line dash
            this.ctx.setLineDash([]);

            // Draw arrows using helper function
            const endAngle = Math.atan2(toY - cpY, toX - cpX);
            const startAngle = Math.atan2(fromY - cpY, fromX - cpX);

            // Draw end arrow
            this.drawArrowHead(toX, toY, endAngle, conn.endArrow || 'arrow', 14, isSelected);

            // Draw start arrow
            this.drawArrowHead(fromX, fromY, startAngle, conn.startArrow || 'none', 14, isSelected);

            // Draw label on curve with sequence number
            const labelX = 0.25*fromX + 0.5*cpX + 0.25*toX;
            const labelY = 0.25*fromY + 0.5*cpY + 0.25*toY;

            // Show label if exists
            if (conn.label) {
                this.drawConnectionLabel(conn.label, labelX, labelY, conn);
            }

            // Draw clickable midpoint circle (when hovering AND no label, OR when editing)
            const isHovered = conn === this.hoveredConnection;
            const isEditing = conn === this.editingConnection;
            if ((isHovered && !conn.label) || isEditing) {
                this.ctx.beginPath();
                this.ctx.arc(labelX, labelY, 10, 0, Math.PI * 2);
                this.ctx.fillStyle = '#1976d2';
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        } else {
            // Draw straight line with line style
            const lineStyle = conn.lineStyle || 'solid';

            // Set line dash pattern based on style
            if (lineStyle === 'dashed') {
                this.ctx.setLineDash([10, 5]); // 10px line, 5px gap
            } else if (lineStyle === 'dotted') {
                this.ctx.setLineDash([2, 3]); // 2px dot, 3px gap
            } else {
                this.ctx.setLineDash([]); // Solid line
            }

            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);
            this.ctx.lineTo(toX, toY);
            this.ctx.stroke();

            // Reset line dash
            this.ctx.setLineDash([]);

            // Draw arrows using helper function
            const angle = Math.atan2(toY - fromY, toX - fromX);

            // Draw end arrow
            this.drawArrowHead(toX, toY, angle, conn.endArrow || 'arrow', 14, isSelected);

            // Draw start arrow (reverse angle)
            this.drawArrowHead(fromX, fromY, angle + Math.PI, conn.startArrow || 'none', 14, isSelected);

            // Draw label in middle
            const labelX = (fromX + toX) / 2;
            const labelY = (fromY + toY) / 2;

            // Show label if exists
            if (conn.label) {
                this.drawConnectionLabel(conn.label, labelX, labelY, conn);
            }

            // Draw clickable midpoint circle (when hovering AND no label, OR when editing)
            const isHovered = conn === this.hoveredConnection;
            const isEditing = conn === this.editingConnection;
            if ((isHovered && !conn.label) || isEditing) {
                this.ctx.beginPath();
                this.ctx.arc(labelX, labelY, 10, 0, Math.PI * 2);
                this.ctx.fillStyle = '#1976d2';
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        }
    }

    drawConnectionLabel(label, x, y, connection) {
        // Draw background
        this.ctx.font = 'bold 14px Arial';
        const metrics = this.ctx.measureText(label);
        const padding = 6;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 20;

        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x - bgWidth/2, y - bgHeight/2, bgWidth, bgHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw text
        this.ctx.fillStyle = '#667eea';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x, y);

        // Draw text selection highlight and cursor if editing this connection
        if (connection && this.editingTarget === connection) {
            const text = connection.label || '';
            this.ctx.font = 'bold 14px Arial';
            const totalWidth = this.ctx.measureText(text).width;
            const textStartX = x - totalWidth / 2;

            // Draw selection highlight if text is selected
            if (this.textSelectionStart !== this.textSelectionEnd && this.textSelectionStart !== -1) {
                const beforeSelection = text.substring(0, this.textSelectionStart);
                const selectedText = text.substring(this.textSelectionStart, this.textSelectionEnd);

                const beforeWidth = this.ctx.measureText(beforeSelection).width;
                const selectedWidth = this.ctx.measureText(selectedText).width;

                // Calculate selection rectangle position
                const highlightX = textStartX + beforeWidth;
                const highlightY = y - 10;
                const highlightHeight = 20;

                // Draw blue highlight background
                this.ctx.fillStyle = 'rgba(0, 120, 215, 0.3)'; // Windows-style blue selection
                this.ctx.fillRect(highlightX, highlightY, selectedWidth, highlightHeight);
            }

            // Draw cursor line if visible and no selection
            if (this.cursorVisible && this.textSelectionStart === this.textSelectionEnd) {
                const textMetrics = this.ctx.measureText(text);
                const cursorX = x + textMetrics.width / 2;

                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(cursorX, y - 10);
                this.ctx.lineTo(cursorX, y + 10);
                this.ctx.stroke();
            }
        }
    }

    lineIntersectsRect(x1, y1, x2, y2, rectMinX, rectMinY, rectMaxX, rectMaxY) {
        // Check if either endpoint is inside the rectangle
        const p1Inside = x1 >= rectMinX && x1 <= rectMaxX && y1 >= rectMinY && y1 <= rectMaxY;
        const p2Inside = x2 >= rectMinX && x2 <= rectMaxX && y2 >= rectMinY && y2 <= rectMaxY;

        if (p1Inside || p2Inside) return true;

        // Check if line segment intersects any of the 4 rectangle edges
        // Top edge
        if (this.lineSegmentsIntersect(x1, y1, x2, y2, rectMinX, rectMinY, rectMaxX, rectMinY)) return true;
        // Right edge
        if (this.lineSegmentsIntersect(x1, y1, x2, y2, rectMaxX, rectMinY, rectMaxX, rectMaxY)) return true;
        // Bottom edge
        if (this.lineSegmentsIntersect(x1, y1, x2, y2, rectMinX, rectMaxY, rectMaxX, rectMaxY)) return true;
        // Left edge
        if (this.lineSegmentsIntersect(x1, y1, x2, y2, rectMinX, rectMinY, rectMinX, rectMaxY)) return true;

        return false;
    }

    lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Line segment 1: (x1,y1) to (x2,y2)
        // Line segment 2: (x3,y3) to (x4,y4)
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 0.0001) return false; // Parallel lines

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    getEdgeIntersection(shape, centerX, centerY, targetX, targetY) {
        // Calculate the angle from shape center to target
        const dx = targetX - centerX;
        const dy = targetY - centerY;

        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
            return { x: centerX, y: centerY };
        }

        const angle = Math.atan2(dy, dx);

        // For rectangles, find which edge the line intersects
        const halfW = shape.width / 2;
        const halfH = shape.height / 2;

        let x, y;

        // Determine which edge to use based on angle
        const absAngle = Math.abs(angle);
        const edgeAngle = Math.atan2(halfH, halfW);

        if (absAngle < edgeAngle) {
            // Right edge
            x = centerX + halfW;
            y = centerY + halfW * Math.tan(angle);
        } else if (absAngle > Math.PI - edgeAngle) {
            // Left edge
            x = centerX - halfW;
            y = centerY - halfW * Math.tan(angle);
        } else if (angle > 0) {
            // Bottom edge
            y = centerY + halfH;
            x = centerX + halfH / Math.tan(angle);
        } else {
            // Top edge
            y = centerY - halfH;
            x = centerX - halfH / Math.tan(angle);
        }

        return { x, y };
    }

    drawConnectionPreview(fromShape, toPos) {
        const fromX = fromShape.x + fromShape.width / 2;
        const fromY = fromShape.y + fromShape.height / 2;

        // Highlight source shape
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(fromShape.x - 2, fromShape.y - 2, fromShape.width + 4, fromShape.height + 4);
        this.ctx.setLineDash([]);

        // Draw preview line
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toPos.x, toPos.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw arrow preview
        const angle = Math.atan2(toPos.y - fromY, toPos.x - fromX);
        const arrowLength = 15;
        this.ctx.fillStyle = '#3498db';
        this.ctx.beginPath();
        this.ctx.moveTo(toPos.x, toPos.y);
        this.ctx.lineTo(
            toPos.x - arrowLength * Math.cos(angle - Math.PI / 6),
            toPos.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            toPos.x - arrowLength * Math.cos(angle + Math.PI / 6),
            toPos.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Highlight target shape if hovering over one
        const targetShape = this.getShapeAt(toPos);
        if (targetShape && targetShape !== fromShape) {
            this.ctx.strokeStyle = '#27ae60';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(targetShape.x - 2, targetShape.y - 2, targetShape.width + 4, targetShape.height + 4);
            this.ctx.setLineDash([]);
        }
    }

    getShapeAt(pos) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (pos.x >= shape.x && pos.x <= shape.x + shape.width &&
                pos.y >= shape.y && pos.y <= shape.y + shape.height) {
                return shape;
            }
        }
        return null;
    }

    getConnectionAt(pos) {
        const threshold = 8; // Distance threshold for clicking on line

        for (let i = this.connections.length - 1; i >= 0; i--) {
            const conn = this.connections[i];

            // Get actual rendered line position (with offset)
            const linePos = this.getConnectionLinePosition(conn);

            const fromX = linePos.fromX;
            const fromY = linePos.fromY;
            const toX = linePos.toX;
            const toY = linePos.toY;

            // Check distance to straight line (we always use straight lines now)
            const A = pos.x - fromX;
            const B = pos.y - fromY;
            const C = toX - fromX;
            const D = toY - fromY;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;

            let xx, yy;
            if (param < 0) {
                xx = fromX;
                yy = fromY;
            } else if (param > 1) {
                xx = toX;
                yy = toY;
            } else {
                xx = fromX + param * C;
                yy = fromY + param * D;
            }

            const dist = Math.sqrt((pos.x - xx)**2 + (pos.y - yy)**2);
            if (dist < threshold) {
                return conn;
            }
        }

        return null;
    }

    deleteShape(shape) {
        // Delete single shape or all selected shapes
        const shapesToDelete = this.selectedShapes.length > 0 ? this.selectedShapes : [shape];

        // Filter out context boxes (cannot delete them)
        const deletableShapes = shapesToDelete.filter(s => !s.isContextBox);

        if (deletableShapes.length === 0) return;

        deletableShapes.forEach(s => {
            this.shapes = this.shapes.filter(sh => sh !== s);
            this.connections = this.connections.filter(c => c.from !== s && c.to !== s);
        });

        this.selectedShape = null;
        this.selectedShapes = [];
        this.saveState();
        this.redraw();
    }

    updatePropertiesPanel() {
        if (this.selectedShape) {
            document.getElementById('fillColor').value = this.selectedShape.fillColor;
            document.getElementById('strokeColor').value = this.selectedShape.strokeColor;
            document.getElementById('strokeWidth').value = this.selectedShape.strokeWidth;
        }
    }

    drawSelectionBox() {
        if (!this.selectionBox) return;

        const box = this.selectionBox;
        const x = box.width < 0 ? box.x + box.width : box.x;
        const y = box.height < 0 ? box.y + box.height : box.y;
        const width = Math.abs(box.width);
        const height = Math.abs(box.height);

        // Draw selection rectangle
        this.ctx.strokeStyle = '#667eea';
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
    }

    redraw() {
        // Reset transform before clearing
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply zoom and pan transform
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        // Update Mermaid view if sidebar is open in view mode
        this.updateMermaidViewIfOpen();

        // Sort shapes by layer z-index for proper rendering order
        const sortedShapes = [...this.shapes].sort((a, b) => {
            const layerA = this.layers.find(l => l.id === a.layerId);
            const layerB = this.layers.find(l => l.id === b.layerId);
            const zIndexA = layerA ? layerA.zIndex : -1;
            const zIndexB = layerB ? layerB.zIndex : -1;
            return zIndexA - zIndexB;
        });

        // Draw connections first (only for visible layers or no layer)
        this.connections.forEach(conn => {
            // Check if both shapes are on visible layers or have no layer
            const fromLayer = this.layers.find(l => l.id === conn.from.layerId);
            const toLayer = this.layers.find(l => l.id === conn.to.layerId);

            // Draw if no layer assigned OR layer exists and is visible
            const fromVisible = !conn.from.layerId || !fromLayer || fromLayer.visible;
            const toVisible = !conn.to.layerId || !toLayer || toLayer.visible;

            if (fromVisible && toVisible) {
                // Highlight connections in Impact Analysis mode
                if (this.impactAnalysisMode && this.impactTargets.length > 0) {
                    const isUpstream = this.impactUpstream.includes(conn.from) &&
                                       (this.impactTargets.includes(conn.to) || this.impactUpstream.includes(conn.to));
                    const isDownstream = this.impactDownstream.includes(conn.to) &&
                                         (this.impactTargets.includes(conn.from) || this.impactDownstream.includes(conn.from));
                    const isTargetConnection = this.impactTargets.includes(conn.from) || this.impactTargets.includes(conn.to);

                    this.drawConnection(conn, isUpstream, isDownstream, isTargetConnection);
                } else {
                    this.drawConnection(conn);
                }
            }
        });

        // Draw shapes (sorted by layer z-index, only visible layers or no layer)
        sortedShapes.forEach(shape => {
            // Check if shape's layer is visible or has no layer
            const layer = this.layers.find(l => l.id === shape.layerId);

            // Draw if no layer assigned OR layer exists and is visible
            if (shape.layerId && layer && !layer.visible) {
                return; // Skip only if has layer and it's not visible
            }

            const isSelected = shape === this.selectedShape || this.selectedShapes.includes(shape);

            // Impact Analysis highlighting
            let impactType = null;
            if (this.impactAnalysisMode && this.impactTargets.length > 0) {
                if (this.impactTargets.includes(shape)) {
                    impactType = 'target';
                } else if (this.impactUpstream.includes(shape)) {
                    impactType = 'upstream';
                } else if (this.impactDownstream.includes(shape)) {
                    impactType = 'downstream';
                }
            }

            this.drawShape(shape, isSelected, impactType);
        });
    }

    enterGroup(group) {
        if (!group) return;

        // Don't allow entering detailed view in To-Be mode
        if (this.comparisonMode && this.currentView === 'tobe') {
            alert('Cannot enter detailed view in To-Be mode. Please switch to As-Is view first.');
            return;
        }

        // Initialize children arrays if they don't exist
        if (!group.children) group.children = [];
        if (!group.childConnections) group.childConnections = [];

        // Save current state before entering
        if (this.currentGroup === null) {
            this.rootShapes = [...this.shapes];
            this.rootConnections = [...this.connections];
        }

        // Add to navigation path
        this.groupPath.push({
            group: group,
            shapes: [...this.shapes],
            connections: [...this.connections]
        });

        // Switch to group's children
        this.currentGroup = group;
        this.shapes = group.children || [];
        this.connections = group.childConnections || [];
        this.selectedShape = null;

        // Auto-layout: Add context boxes showing inbound/outbound connections
        this.addContextBoxes(group);

        // Update UI
        this.updateBreadcrumb();
        this.updateChildShapeTags();
        this.updateContextBoxesBar();
        document.getElementById('backButton').style.display = 'block';

        // Reset view to default
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();

        this.redraw();
    }

    addContextBoxes(currentShape) {
        // Find parent level connections
        const parentShapes = this.groupPath.length > 0 ?
            this.groupPath[this.groupPath.length - 1].shapes : this.rootShapes;
        const parentConnections = this.groupPath.length > 0 ?
            this.groupPath[this.groupPath.length - 1].connections : this.rootConnections;

        // Find inbound and outbound connections with their shapes
        const inboundShapes = [];
        const outboundShapes = [];

        parentConnections.forEach(conn => {
            if (conn.to === currentShape && !inboundShapes.includes(conn.from)) {
                inboundShapes.push(conn.from);
            }
            if (conn.from === currentShape && !outboundShapes.includes(conn.to)) {
                outboundShapes.push(conn.to);
            }
        });

        // Remove existing context boxes
        this.shapes = this.shapes.filter(s => !s.isContextBox);
        this.connections = this.connections.filter(c => !c.isContextConnection);

        // Store context box info for bottom bar (don't add to canvas)
        this.contextBoxesData = [];

        // Create context box data for inbound shapes
        inboundShapes.forEach(shape => {
            this.contextBoxesData.push({
                text: shape.text || 'Shape',
                type: 'inbound',
                referenceShape: shape,
                isContextBox: true
            });
        });

        // Create context box data for outbound shapes
        outboundShapes.forEach(shape => {
            this.contextBoxesData.push({
                text: shape.text || 'Shape',
                type: 'outbound',
                referenceShape: shape,
                isContextBox: true
            });
        });
    }

    exitGroup() {
        if (this.groupPath.length === 0) return;

        // Save current children back to group (excluding context boxes)
        if (this.currentGroup) {
            this.currentGroup.children = this.shapes.filter(s => !s.isContextBox);
            this.currentGroup.childConnections = this.connections.filter(c => !c.isContextConnection);
        }

        // Go back one level
        const previousLevel = this.groupPath.pop();
        this.shapes = previousLevel.shapes;
        this.connections = previousLevel.connections;
        this.currentGroup = this.groupPath.length > 0 ? this.groupPath[this.groupPath.length - 1].group : null;

        // If back to root, restore root state
        if (this.groupPath.length === 0) {
            this.currentGroup = null;
            document.getElementById('backButton').style.display = 'none';
        }

        this.selectedShape = null;
        this.updateBreadcrumb();
        this.updateChildShapeTags();
        this.updateContextBoxesBar();
        this.redraw();
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = '';

        // Check if in To-Be mode (breadcrumb navigation disabled)
        const isToBeMode = this.comparisonMode && this.currentView === 'tobe';

        // Root level
        const rootItem = document.createElement('span');
        rootItem.className = 'breadcrumb-item';
        rootItem.textContent = 'Main Diagram';
        rootItem.dataset.level = 'root';
        if (this.groupPath.length === 0) {
            rootItem.classList.add('active');
        } else if (!isToBeMode) {
            // Only allow navigation if not in To-Be mode
            rootItem.addEventListener('click', () => {
                while (this.groupPath.length > 0) {
                    this.exitGroup();
                }
            });
        } else {
            // In To-Be mode, add disabled style
            rootItem.style.cursor = 'not-allowed';
            rootItem.style.opacity = '0.5';
        }
        breadcrumb.appendChild(rootItem);

        // Add each level in path
        this.groupPath.forEach((level, index) => {
            const item = document.createElement('span');
            item.className = 'breadcrumb-item';
            item.textContent = level.group.text || `Group ${level.group.id}`;

            if (index === this.groupPath.length - 1) {
                item.classList.add('active');
            } else if (!isToBeMode) {
                // Only allow navigation if not in To-Be mode
                item.addEventListener('click', () => {
                    const stepsBack = this.groupPath.length - index - 1;
                    for (let i = 0; i < stepsBack; i++) {
                        this.exitGroup();
                    }
                });
            } else {
                // In To-Be mode, add disabled style
                item.style.cursor = 'not-allowed';
                item.style.opacity = '0.5';
            }
            breadcrumb.appendChild(item);
        });
    }

    updateChildShapeTags() {
        const tagsContainer = document.getElementById('childShapeTags');
        tagsContainer.innerHTML = '';

        // Only show tags when in a group (not root level)
        if (this.groupPath.length === 0) {
            return;
        }

        // Get non-context box shapes (actual child shapes)
        const childShapes = this.shapes.filter(s => !s.isContextBox);

        childShapes.forEach(shape => {
            const tag = document.createElement('span');
            tag.style.cssText = 'padding: 3px 8px; background: #fff3e0; border: 1px solid #ff9800; border-radius: 12px; font-size: 11px; color: #e65100; cursor: pointer; white-space: nowrap;';
            tag.textContent = shape.text || 'Shape';
            tag.title = 'Click to select';
            tag.addEventListener('click', () => {
                this.selectedShape = shape;
                this.selectedShapes = [shape];
                this.redraw();
            });
            tagsContainer.appendChild(tag);
        });
    }

    updateContextBoxesBar() {
        const bar = document.getElementById('contextBoxesBar');
        const inboundContainer = document.getElementById('inboundTabs');
        const outboundContainer = document.getElementById('outboundTabs');

        // Clear previous tabs
        inboundContainer.innerHTML = '';
        outboundContainer.innerHTML = '';

        // Only show bar when in a group
        if (this.groupPath.length === 0 || !this.contextBoxesData || this.contextBoxesData.length === 0) {
            bar.style.display = 'none';
            return;
        }

        // Categorize by inbound/outbound
        const inbound = this.contextBoxesData.filter(box => box.type === 'inbound');
        const outbound = this.contextBoxesData.filter(box => box.type === 'outbound');

        // Create tabs for inbound
        inbound.forEach(box => {
            const tab = document.createElement('button');
            tab.style.cssText = 'padding: 6px 12px; background: #e8f5e9; border: 1.5px solid #4caf50; border-radius: 6px; font-size: 12px; color: #2e7d32; cursor: pointer; white-space: nowrap; font-weight: 500;';
            tab.textContent = box.text;
            tab.title = 'Click to navigate';
            tab.addEventListener('click', () => {
                // Could navigate back to parent and select this shape
                console.log('Navigate to', box.referenceShape);
            });
            inboundContainer.appendChild(tab);
        });

        // Create tabs for outbound
        outbound.forEach(box => {
            const tab = document.createElement('button');
            tab.style.cssText = 'padding: 6px 12px; background: #e3f2fd; border: 1.5px solid #2196f3; border-radius: 6px; font-size: 12px; color: #1565c0; cursor: pointer; white-space: nowrap; font-weight: 500;';
            tab.textContent = box.text;
            tab.title = 'Click to navigate';
            tab.addEventListener('click', () => {
                // Could navigate back to parent and select this shape
                console.log('Navigate to', box.referenceShape);
            });
            outboundContainer.appendChild(tab);
        });

        bar.style.display = 'block';
    }

    async save() {
        // Check if we have multiple tabs - always use Save As (download method)
        if (window.tabManager && window.tabManager.tabs.size > 1) {
            await this.saveAs();
            return;
        }

        if (this.currentFileHandle) {
            // Save to existing file
            await this.saveToFile(this.currentFileHandle);
        } else {
            // No file handle yet, do Save As
            await this.saveAs();
        }
    }

    async saveAs() {
        console.log('[saveAs] Called, tabs count:', window.tabManager?.tabs.size);
        try {
            // Check if we have multiple tabs - use fallback method
            if (window.tabManager && window.tabManager.tabs.size > 1) {
                console.log('[saveAs] Multi-tab save');
                const filename = prompt('Enter filename:', this.currentFileName || 'diagram.json');
                console.log('[saveAs] Filename:', filename);
                if (filename) {
                    this.currentFileName = filename.endsWith('.json') ? filename : filename + '.json';
                    const data = window.tabManager.exportAllTabs();
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = this.currentFileName;
                    link.click();
                    URL.revokeObjectURL(url);
                    console.log('[saveAs] Download completed');
                    alert('All tabs saved successfully!');
                }
                return;
            }

            // Check if File System Access API is supported
            if (!window.showSaveFilePicker) {
                // Fallback to old download method
                const filename = prompt('Enter filename:', this.currentFileName || 'diagram.json');
                if (filename) {
                    this.currentFileName = filename.endsWith('.json') ? filename : filename + '.json';
                    this.saveToFileOldMethod(this.currentFileName);
                }
                return;
            }

            // Use File System Access API
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: this.currentFileName || 'diagram.json',
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            this.currentFileHandle = fileHandle;
            this.currentFileName = fileHandle.name;
            await this.saveToFile(fileHandle);

            // Add to recent files
            this.addToRecentFiles(fileHandle.name);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error saving file:', err);
                alert('Error saving file: ' + err.message);
            }
        }
    }

    async saveToFile(fileHandle) {
        // Check if we have multiple tabs
        if (window.tabManager && window.tabManager.tabs.size > 1) {
            // Save all tabs
            const data = window.tabManager.exportAllTabs();
            const json = JSON.stringify(data, null, 2);

            try {
                const writable = await fileHandle.createWritable();
                await writable.write(json);
                await writable.close();
                this.currentFileHandle = fileHandle;
                this.currentFileName = fileHandle.name;
                // Don't show alert here - it's shown in saveAs()
            } catch (err) {
                console.error('Error saving file:', err);
                alert('Error saving file: ' + err.message);
            }
            return;
        }

        // Single tab mode - save current editor only
        // Save current state if inside a group
        if (this.currentGroup) {
            this.currentGroup.children = [...this.shapes];
            this.currentGroup.childConnections = [...this.connections];
        }

        // Use root shapes for export
        const shapesToExport = this.currentGroup === null ? this.shapes : this.rootShapes;
        const connectionsToExport = this.currentGroup === null ? this.connections : this.rootConnections;

        // Helper function to serialize shapes with their children
        const serializeShape = (shape) => {
            const serialized = { ...shape };
            if (shape.children) {
                serialized.children = shape.children.map(child => serializeShape(child));
            }
            if (shape.childConnections) {
                serialized.childConnections = shape.childConnections.map(conn => ({
                    from: shape.children.indexOf(conn.from),
                    to: shape.children.indexOf(conn.to),
                    type: conn.type,
                    label: conn.label
                }));
            }
            return serialized;
        };

        const data = {
            shapes: shapesToExport.map(shape => serializeShape(shape)),
            connections: connectionsToExport.map(conn => ({
                from: shapesToExport.indexOf(conn.from),
                to: shapesToExport.indexOf(conn.to),
                type: conn.type,
                label: conn.label
            }))
        };

        const json = JSON.stringify(data, null, 2);

        try {
            // Write to file using File System Access API
            const writable = await fileHandle.createWritable();
            await writable.write(json);
            await writable.close();
            console.log('File saved successfully to:', fileHandle.name);
        } catch (err) {
            console.error('Error writing file:', err);
            alert('Error writing file: ' + err.message);
        }
    }

    saveToFileOldMethod(filename) {
        // Save current state if inside a group
        if (this.currentGroup) {
            this.currentGroup.children = [...this.shapes];
            this.currentGroup.childConnections = [...this.connections];
        }

        // Use root shapes for export
        const shapesToExport = this.currentGroup === null ? this.shapes : this.rootShapes;
        const connectionsToExport = this.currentGroup === null ? this.connections : this.rootConnections;

        // Helper function to serialize shapes with their children
        const serializeShape = (shape) => {
            const serialized = { ...shape };
            if (shape.children) {
                serialized.children = shape.children.map(child => serializeShape(child));
            }
            if (shape.childConnections) {
                serialized.childConnections = shape.childConnections.map(conn => ({
                    from: shape.children.indexOf(conn.from),
                    to: shape.children.indexOf(conn.to),
                    type: conn.type,
                    label: conn.label
                }));
            }
            return serialized;
        };

        const data = {
            shapes: shapesToExport.map(shape => serializeShape(shape)),
            connections: connectionsToExport.map(conn => ({
                from: shapesToExport.indexOf(conn.from),
                to: shapesToExport.indexOf(conn.to),
                type: conn.type,
                label: conn.label
            }))
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    async openFileWithPicker() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json', '.mmd', '.mermaid'] }
                }],
                multiple: false
            });

            this.currentFileHandle = fileHandle;
            this.currentFileName = fileHandle.name;

            // Add to recent files
            this.addToRecentFiles(fileHandle.name);

            const file = await fileHandle.getFile();
            const text = await file.text();

            try {
                const data = JSON.parse(text);

                // Check if this is a multi-tab file (version 2.0)
                if (data.version === '2.0' && data.tabs && window.tabManager) {
                    console.log('[openFileWithPicker] Multi-tab file detected');
                    window.tabManager.importAllTabs(data);
                    return;
                }

                // Single tab mode - load into current editor
                // Clear current state
                this.shapes = [];
                this.connections = [];
                this.rootShapes = [];
                this.rootConnections = [];
                this.currentGroup = null;
                this.groupPath = [];
                this.selectedShape = null;
                this.updateBreadcrumb();
                document.getElementById('backButton').style.display = 'none';

                // Helper function to deserialize shapes with their children
                const deserializeShape = (serialized) => {
                    const shape = { ...serialized };
                    if (serialized.children) {
                        shape.children = serialized.children.map(child => deserializeShape(child));
                    }
                    if (serialized.childConnections) {
                        shape.childConnections = serialized.childConnections.map(conn => ({
                            ...conn,
                            from: shape.children[conn.from],
                            to: shape.children[conn.to]
                        }));
                    }
                    return shape;
                };

                // Load shapes
                const loadedShapes = (data.shapes || []).map(shape => deserializeShape(shape));
                this.shapes = loadedShapes;
                this.rootShapes = [...loadedShapes];

                // Load connections
                this.connections = (data.connections || []).map(conn => ({
                    from: loadedShapes[conn.from],
                    to: loadedShapes[conn.to],
                    type: conn.type || 'line',
                    label: conn.label || ''
                }));
                this.rootConnections = [...this.connections];

                this.redraw();
            } catch (error) {
                console.error('[openFileWithPicker] Error:', error);
                console.error('[openFileWithPicker] Stack:', error.stack);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error opening file:', err);
            }
        }
    }

    openFile(file) {
        if (!file) return;

        this.currentFileName = file.name;
        this.currentFileHandle = null; // Clear file handle for old method
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileContent = e.target.result;
                const isMermaid = file.name.endsWith('.mmd') || file.name.endsWith('.mermaid');

                if (isMermaid) {
                    this.importFromMermaid(fileContent);
                } else {
                    const data = JSON.parse(fileContent);
                    console.log('[openFile] Parsed data:', data);

                    // Check if this is a multi-tab file (version 2.0)
                    if (data.version === '2.0' && data.tabs && window.tabManager) {
                        console.log('[openFile] Multi-tab file detected');
                        try {
                            window.tabManager.importAllTabs(data);
                        } catch (err) {
                            console.error('[openFile] Error in importAllTabs:', err);
                            console.error('Stack trace:', err.stack);
                            throw err;
                        }
                        return;
                    }

                    // Single tab mode - load into current editor
                    // Helper function to deserialize shapes with children
                    const deserializeShape = (shapeData) => {
                        const shape = { ...shapeData };
                        if (shapeData.children && shapeData.children.length > 0) {
                            shape.children = shapeData.children.map(child => deserializeShape(child));

                            // Restore child connections
                            if (shapeData.childConnections) {
                                shape.childConnections = shapeData.childConnections.map(conn => ({
                                    from: shape.children[conn.from],
                                    to: shape.children[conn.to],
                                    type: conn.type,
                                    label: conn.label || ''
                                }));
                            } else {
                                shape.childConnections = [];
                            }
                        }
                        return shape;
                    };

                    this.shapes = (data.shapes || []).map(shape => deserializeShape(shape));
                    this.connections = data.connections.map(conn => ({
                        from: this.shapes[conn.from],
                        to: this.shapes[conn.to],
                        type: conn.type,
                        label: conn.label || ''
                    }));

                    // Reset hierarchy state
                    this.rootShapes = [...this.shapes];
                    this.rootConnections = [...this.connections];
                    this.currentGroup = null;
                    this.groupPath = [];
                    this.selectedShape = null;
                    this.selectedShapes = [];

                    // Update UI
                    this.updateBreadcrumb();
                    document.getElementById('backButton').style.display = 'none';
                    this.redraw();
                }
            } catch (error) {
                console.error('[openFile] Error loading file:', error);
                console.error('[openFile] Error stack:', error.stack);
                console.error('[openFile] File content:', fileContent);
                // Don't show alert, just log to console
                console.error('❌ ERROR: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    exportToPNG() {
        const link = document.createElement('a');
        link.download = this.currentFileName ? this.currentFileName.replace('.json', '.png') : 'diagram.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    exportToMermaid() {
        // Save current state if inside a group
        if (this.currentGroup) {
            this.currentGroup.children = [...this.shapes];
            this.currentGroup.childConnections = [...this.connections];
        }

        // Use root shapes for export
        const shapesToExport = this.currentGroup === null ? this.shapes : this.rootShapes;
        const connectionsToExport = this.currentGroup === null ? this.connections : this.rootConnections;

        // Generate Mermaid flowchart
        let mermaid = 'flowchart TD\n';

        // Create node IDs
        const nodeIds = new Map();
        shapesToExport.forEach((shape, index) => {
            const nodeId = `node${index}`;
            nodeIds.set(shape, nodeId);

            const text = shape.text || `Shape${index}`;

            // Different bracket styles for different shape types
            let nodeDef;
            switch (shape.type) {
                case 'rectangle':
                    nodeDef = `${nodeId}[${text}]`;
                    break;
                case 'diamond':
                    nodeDef = `${nodeId}{${text}}`;
                    break;
                case 'circle':
                    nodeDef = `${nodeId}((${text}))`;
                    break;
                case 'database':
                    nodeDef = `${nodeId}[(${text})]`;
                    break;
                case 'cloud':
                    nodeDef = `${nodeId})${text}(`;
                    break;
                default:
                    nodeDef = `${nodeId}[${text}]`;
            }

            mermaid += `    ${nodeDef}\n`;
        });

        // Add connections
        connectionsToExport.forEach(conn => {
            const fromId = nodeIds.get(conn.from);
            const toId = nodeIds.get(conn.to);

            if (fromId && toId) {
                const label = conn.label ? `|${conn.label}|` : '';

                // Arrow styles
                let arrow;
                if (conn.startArrow && conn.startArrow !== 'none' && conn.endArrow && conn.endArrow !== 'none') {
                    arrow = '<-->';
                } else if (conn.startArrow && conn.startArrow !== 'none') {
                    arrow = '<--';
                } else if (conn.endArrow && conn.endArrow !== 'none') {
                    arrow = '-->';
                } else {
                    arrow = '---';
                }

                mermaid += `    ${fromId} ${arrow}${label} ${toId}\n`;
            }
        });

        // Download
        const blob = new Blob([mermaid], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = this.currentFileName ? this.currentFileName.replace('.json', '.mmd') : 'diagram.mmd';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    openMermaidSidebar() {
        // Open in import mode
        document.getElementById('sidebarTitle').textContent = 'Import Mermaid';
        document.getElementById('importMode').style.display = 'flex';
        document.getElementById('viewMode').style.display = 'none';
        document.getElementById('rightSidebar').style.display = 'flex';

        // Clear textarea when opening Import mode (ensure it's empty)
        document.getElementById('mermaidInput').value = '';
    }

    closeMermaidSidebar() {
        document.getElementById('rightSidebar').style.display = 'none';
        // Clear textarea when closing sidebar
        document.getElementById('mermaidInput').value = '';
    }

    showMermaidView() {
        // Open in view mode
        document.getElementById('sidebarTitle').textContent = 'View as Mermaid';
        document.getElementById('importMode').style.display = 'none';
        document.getElementById('viewMode').style.display = 'flex';
        document.getElementById('rightSidebar').style.display = 'flex';

        // Generate and display Mermaid code only if there are shapes
        if (this.shapes.length > 0) {
            const mermaidCode = this.generateMermaidFromDiagram();
            document.getElementById('mermaidOutput').value = mermaidCode;
            // Save to editor instance
            this.mermaidOutputCode = mermaidCode;
        } else {
            // Clear textarea if no shapes
            document.getElementById('mermaidOutput').value = '';
            this.mermaidOutputCode = '';
        }
    }

    applyMermaidChanges() {
        const mermaidCode = document.getElementById('mermaidOutput').value;

        if (!mermaidCode.trim()) {
            alert('Mermaid code is empty!');
            return;
        }

        try {
            // Get layout direction from radio button
            const directionElement = document.querySelector('input[name="applyLayoutDirection"]:checked');
            const direction = directionElement ? directionElement.value : 'horizontal';

            // Store the direction in this editor instance
            this.mermaidLayoutDirection = direction === 'vertical' ? 'TB' : 'LR';

            // Save mermaid output code to this editor
            this.mermaidOutputCode = mermaidCode;

            // Clear current diagram
            this.shapes = [];
            this.connections = [];

            // Import the edited Mermaid code
            this.importFromMermaid(mermaidCode, direction);

            // Show feedback
            const btn = document.getElementById('applyMermaidChanges');
            const originalText = btn.textContent;
            const originalBg = btn.style.background;
            btn.textContent = '✓ Applied!';
            btn.style.background = '#2e7d32';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = originalBg;
            }, 2000);

            // Update the view (don't auto-update since user is editing)
            this.redraw();
        } catch (err) {
            alert('Error applying changes: ' + err.message);
        }
    }

    copyMermaidCode() {
        const mermaidCode = document.getElementById('mermaidOutput').value;
        navigator.clipboard.writeText(mermaidCode).then(() => {
            // Show feedback
            const btn = document.getElementById('copyMermaidBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            alert('Failed to copy: ' + err);
        });
    }

    toggleModernMode() {
        this.modernMode = !this.modernMode;
        const btn = document.getElementById('modernModeBtn');

        if (this.modernMode) {
            document.body.classList.add('modern-mode');
            btn.classList.add('active');
        } else {
            document.body.classList.remove('modern-mode');
            btn.classList.remove('active');
        }

        this.redraw();
    }

    toggleImpactAnalysisMode() {
        this.impactAnalysisMode = !this.impactAnalysisMode;
        const btn = document.getElementById('impactAnalysisBtn');
        const panel = document.getElementById('impactPanel');

        if (this.impactAnalysisMode) {
            // Save current selection state before entering Impact Analysis (only if not already saved)
            if (this.savedSelectedShape === undefined && this.savedSelectedShapes === undefined) {
                this.savedSelectedShape = this.selectedShape;
                this.savedSelectedShapes = this.selectedShapes ? [...this.selectedShapes] : [];
            }

            // Enable Modern Mode automatically when entering Impact Analysis
            if (!this.modernMode) {
                this.modernMode = true;
                document.body.classList.add('modern-mode');
                const modernBtn = document.getElementById('modernModeBtn');
                modernBtn.classList.add('active');
            }

            // Exit any editing mode
            if (this.editingTarget) {
                this.finishTextEditing();
            }

            // Clear selections when entering Impact Analysis mode
            this.selectedShape = null;
            this.selectedShapes = [];

            btn.classList.add('active');
            // Don't show panel immediately - wait for user to click a shape
            // panel.style.display = 'block';
            this.impactTargets = [];
            // this.showImpactHint();

            // Change cursor to pointer (view only mode)
            this.canvas.classList.add('impact-analysis-mode');

            // Switch to select tool for better UX
            this.currentTool = 'select';
            this.updateActiveButton(document.getElementById('selectTool'));

            // Show tooltip for 2 seconds then fade out
            const tooltip = document.getElementById('impactAnalysisTooltip');
            tooltip.classList.remove('fade-out');
            tooltip.classList.add('show');

            setTimeout(() => {
                tooltip.classList.add('fade-out');
                tooltip.classList.remove('show');
            }, 2000);
        } else {
            // Disable Modern Mode when exiting Impact Analysis
            if (this.modernMode) {
                this.modernMode = false;
                document.body.classList.remove('modern-mode');
                const modernBtn = document.getElementById('modernModeBtn');
                modernBtn.classList.remove('active');
            }

            btn.classList.remove('active');
            panel.style.display = 'none';

            // Reset tooltip state properly
            const tooltip = document.getElementById('impactAnalysisTooltip');
            tooltip.classList.remove('show', 'fade-out');

            this.impactTargets = [];
            this.impactUpstream = [];
            this.impactDownstream = [];

            // Restore normal cursor
            this.canvas.classList.remove('impact-analysis-mode');

            // Restore saved selection state
            if (this.savedSelectedShape !== undefined || this.savedSelectedShapes !== undefined) {
                this.selectedShape = this.savedSelectedShape || null;
                this.selectedShapes = this.savedSelectedShapes || [];
            }
            // Clear saved values
            this.savedSelectedShape = undefined;
            this.savedSelectedShapes = undefined;
        }

        this.redraw();
    }

    closeImpactAnalysis() {
        this.impactAnalysisMode = false;
        const btn = document.getElementById('impactAnalysisBtn');
        const panel = document.getElementById('impactPanel');
        const tooltip = document.getElementById('impactAnalysisTooltip');

        // Disable Modern Mode when exiting Impact Analysis
        if (this.modernMode) {
            this.modernMode = false;
            document.body.classList.remove('modern-mode');
            const modernBtn = document.getElementById('modernModeBtn');
            modernBtn.classList.remove('active');
        }

        btn.classList.remove('active');
        panel.style.display = 'none';

        // Reset tooltip state properly (don't use inline display style)
        tooltip.classList.remove('show', 'fade-out');

        this.impactTargets = [];
        this.impactUpstream = [];
        this.impactDownstream = [];

        // Restore normal cursor
        this.canvas.classList.remove('impact-analysis-mode');

        // Restore saved selection state
        if (this.savedSelectedShape !== undefined || this.savedSelectedShapes !== undefined) {
            this.selectedShape = this.savedSelectedShape || null;
            this.selectedShapes = this.savedSelectedShapes || [];
        }
        // Clear saved values
        this.savedSelectedShape = undefined;
        this.savedSelectedShapes = undefined;

        this.redraw();
    }

    showImpactHint() {
        const content = document.getElementById('impactContent');
        content.innerHTML = '<div class="impact-hint">Click on a shape to analyze its impact</div>';
    }

    analyzeImpact(shape, isMultiSelect = false) {
        if (!this.impactAnalysisMode) return;

        if (isMultiSelect) {
            // Multi-select mode: Toggle selection
            const index = this.impactTargets.indexOf(shape);
            if (index > -1) {
                this.impactTargets.splice(index, 1);
            } else {
                this.impactTargets.push(shape);
            }
        } else {
            // Single select mode: Replace selection
            this.impactTargets = [shape];
        }

        // Reset upstream and downstream
        this.impactUpstream = [];
        this.impactDownstream = [];

        // If no targets selected, hide panel and return
        if (this.impactTargets.length === 0) {
            const panel = document.getElementById('impactPanel');
            panel.style.display = 'none';
            this.redraw();
            return;
        }

        // Show the impact panel when user has selected shapes
        const panel = document.getElementById('impactPanel');
        panel.style.display = 'block';

        // Find all upstream dependencies (shapes that flow TO any selected shape)
        const findUpstream = (currentShape, visited = new Set()) => {
            if (visited.has(currentShape)) return;
            visited.add(currentShape);

            this.connections.forEach(conn => {
                if (conn.to === currentShape && !this.impactTargets.includes(conn.from)) {
                    if (!this.impactUpstream.includes(conn.from)) {
                        this.impactUpstream.push(conn.from);
                    }
                    findUpstream(conn.from, visited);
                }
            });
        };

        // Find all downstream impacts (shapes that flow FROM any selected shape)
        const findDownstream = (currentShape, visited = new Set()) => {
            if (visited.has(currentShape)) return;
            visited.add(currentShape);

            this.connections.forEach(conn => {
                if (conn.from === currentShape && !this.impactTargets.includes(conn.to)) {
                    if (!this.impactDownstream.includes(conn.to)) {
                        this.impactDownstream.push(conn.to);
                    }
                    findDownstream(conn.to, visited);
                }
            });
        };

        // Analyze impact for all selected targets
        this.impactTargets.forEach(target => {
            findUpstream(target);
            findDownstream(target);
        });

        this.displayImpactAnalysis();
        this.redraw();
    }

    displayImpactAnalysis() {
        const content = document.getElementById('impactContent');

        if (this.impactTargets.length === 0) {
            this.showImpactHint();
            return;
        }

        const upstreamCount = this.impactUpstream.length;
        const downstreamCount = this.impactDownstream.length;

        let html = `
            <div class="impact-target">
                <div class="shape-name">Selected: ${this.impactTargets.length} shape${this.impactTargets.length > 1 ? 's' : ''}</div>
        `;

        // Show all selected targets
        this.impactTargets.forEach(target => {
            html += `
                <div class="shape-type" style="padding: 4px 0; color: #555;">
                    • ${target.text || 'Untitled'} (${target.type})
                </div>
            `;
        });

        html += `
            </div>

            <div class="impact-stats">
                <div class="stat-box upstream">
                    <div class="stat-number">${upstreamCount}</div>
                    <div class="stat-label">Dependencies</div>
                </div>
                <div class="stat-box downstream">
                    <div class="stat-number">${downstreamCount}</div>
                    <div class="stat-label">Impacts</div>
                </div>
            </div>
        `;

        if (upstreamCount > 0) {
            html += `
                <div class="impact-section">
                    <div class="impact-section-title">
                        ⬆️ Dependencies (Upstream)
                    </div>
                    <div class="impact-list">
            `;

            this.impactUpstream.forEach(shape => {
                html += `
                    <div class="impact-item upstream" data-shape-id="${this.shapes.indexOf(shape)}">
                        <span class="arrow">←</span>
                        <span>${shape.text || 'Untitled'}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        if (downstreamCount > 0) {
            html += `
                <div class="impact-section">
                    <div class="impact-section-title">
                        ⬇️ Impacts (Downstream)
                    </div>
                    <div class="impact-list">
            `;

            this.impactDownstream.forEach(shape => {
                html += `
                    <div class="impact-item downstream" data-shape-id="${this.shapes.indexOf(shape)}">
                        <span class="arrow">→</span>
                        <span>${shape.text || 'Untitled'}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        if (upstreamCount === 0 && downstreamCount === 0) {
            html += `
                <div class="impact-hint">
                    This shape has no connections.<br>
                    No impact detected.
                </div>
            `;
        }

        content.innerHTML = html;

        // Add click handlers to impact items
        content.querySelectorAll('.impact-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const shapeId = parseInt(e.currentTarget.dataset.shapeId);
                const shape = this.shapes[shapeId];
                if (shape) {
                    this.analyzeImpact(shape);
                }
            });
        });
    }

    // Connection Editor Functions
    getConnectionMidpointAt(pos) {
        const threshold = 30; // pixels from midpoint to be considered a click (increased for easier clicking)

        for (let conn of this.connections) {
            // Get actual rendered line position (with offset)
            const linePos = this.getConnectionLinePosition(conn);

            const fromX = linePos.fromX;
            const fromY = linePos.fromY;
            const toX = linePos.toX;
            const toY = linePos.toY;

            // Get midpoint of actual line
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;

            // Check if click is near midpoint
            const dist = Math.sqrt(Math.pow(pos.x - midX, 2) + Math.pow(pos.y - midY, 2));

            if (dist < threshold) {
                return conn;
            }
        }

        return null;
    }

    openConnectionEditor(conn, clickPos) {
        this.editingConnection = conn;

        // Exit Impact Analysis mode if active
        if (this.impactAnalysisMode) {
            this.impactAnalysisMode = false;
            const impactBtn = document.getElementById('impactAnalysisBtn');
            const impactPanel = document.getElementById('impactPanel');
            impactBtn.classList.remove('active');
            impactPanel.style.display = 'none';
            this.impactTargets = [];
            this.impactUpstream = [];
            this.impactDownstream = [];
            this.canvas.classList.remove('impact-analysis-mode');

            // Also disable Modern Mode
            if (this.modernMode) {
                this.modernMode = false;
                document.body.classList.remove('modern-mode');
                const modernBtn = document.getElementById('modernModeBtn');
                modernBtn.classList.remove('active');
            }
        }

        const editor = document.getElementById('connectionEditor');
        const nameInput = document.getElementById('connectionName');
        const noteInput = document.getElementById('connectionNote');

        if (!editor || !nameInput || !noteInput) {
            console.error('Could not find editor elements!');
            return;
        }

        // Set current values
        nameInput.value = conn.label || '';
        noteInput.value = conn.note || '';

        // Position editor near click
        editor.style.left = clickPos.x + 'px';
        editor.style.top = clickPos.y + 'px';
        editor.style.display = 'block';

        // Redraw to show the midpoint circle
        this.redraw();

        // Focus on name input
        setTimeout(() => {
            nameInput.focus();
        }, 100);
    }

    closeConnectionEditor() {
        const editor = document.getElementById('connectionEditor');
        editor.style.display = 'none';
        this.editingConnection = null;
        // Redraw to hide the midpoint circle
        this.redraw();
    }

    saveConnectionEdit() {
        if (!this.editingConnection) return;

        const nameInput = document.getElementById('connectionName');
        const noteInput = document.getElementById('connectionNote');

        this.editingConnection.label = nameInput.value;
        this.editingConnection.note = noteInput.value;

        this.closeConnectionEditor();
        this.saveState();
        this.redraw();
    }

    showConnectionTooltip(conn, pos) {
        if (!conn.note) return;

        const tooltip = document.getElementById('connectionTooltip');

        // Show only note (no label)
        tooltip.textContent = conn.note;
        tooltip.style.left = (pos.x + 10) + 'px';
        tooltip.style.top = (pos.y + 10) + 'px';
        tooltip.style.display = 'block';
    }

    hideConnectionTooltip() {
        const tooltip = document.getElementById('connectionTooltip');
        tooltip.style.display = 'none';
    }

    // Recent Files Management
    loadRecentFiles() {
        try {
            const stored = localStorage.getItem('diagramEditor_recentFiles');
            return stored ? JSON.parse(stored) : [];
        } catch (err) {
            console.error('Error loading recent files:', err);
            return [];
        }
    }

    saveRecentFiles() {
        try {
            localStorage.setItem('diagramEditor_recentFiles', JSON.stringify(this.recentFiles));
        } catch (err) {
            console.error('Error saving recent files:', err);
        }
    }

    addToRecentFiles(fileName, filePath = null) {
        // Remove if already exists
        this.recentFiles = this.recentFiles.filter(f => f.name !== fileName);

        // Add to beginning
        this.recentFiles.unshift({
            name: fileName,
            path: filePath,
            timestamp: Date.now()
        });

        // Keep only last 10
        this.recentFiles = this.recentFiles.slice(0, 10);

        this.saveRecentFiles();
    }

    showRecentFilesMenu() {
        const menu = document.getElementById('recentFilesMenu');
        const menuItem = document.getElementById('recentFiles');
        const rect = menuItem.getBoundingClientRect();

        menu.innerHTML = '';

        if (this.recentFiles.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'menu-item';
            emptyItem.style.color = '#999';
            emptyItem.style.cursor = 'default';
            emptyItem.textContent = 'No recent files';
            menu.appendChild(emptyItem);
        } else {
            this.recentFiles.forEach(file => {
                const item = document.createElement('div');
                item.className = 'menu-item';

                const nameDiv = document.createElement('div');
                nameDiv.textContent = '📄 ' + file.name;
                nameDiv.style.fontWeight = '500';

                const timeDiv = document.createElement('div');
                timeDiv.style.fontSize = '11px';
                timeDiv.style.color = '#999';
                timeDiv.style.marginTop = '2px';
                timeDiv.textContent = this.formatTimestamp(file.timestamp);

                item.appendChild(nameDiv);
                item.appendChild(timeDiv);

                item.addEventListener('click', async () => {
                    menu.style.display = 'none';
                    document.getElementById('dropdownMenu').style.display = 'none';
                    document.getElementById('hamburgerBtn').classList.remove('active');

                    // Try to reopen from folder if we have folder access
                    if (this.currentFolderHandle) {
                        await this.openFileFromFolder(file.name);
                    } else {
                        alert('Please use "Browse Folder" to select the folder containing your files first.');
                    }
                });

                menu.appendChild(item);
            });
        }

        menu.style.display = 'block';
        menu.style.position = 'absolute';
        menu.style.left = rect.right - rect.left + 'px';
        menu.style.top = rect.top - menuItem.parentElement.getBoundingClientRect().top + 'px';
    }

    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

        const date = new Date(timestamp);
        return date.toLocaleDateString();
    }

    async browseFolderAndShowFiles() {
        if (!window.showDirectoryPicker) {
            alert('Your browser does not support folder access. Please use Chrome or Edge.');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker();
            this.currentFolderHandle = dirHandle;

            // Show folder files in a modal/sidebar
            await this.showFolderFilesModal();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error browsing folder:', err);
                alert('Error accessing folder: ' + err.message);
            }
        }
    }

    async showFolderFilesModal() {
        const menu = document.getElementById('folderFilesMenu');
        const list = document.getElementById('folderFilesList');

        list.innerHTML = '<div style="padding: 12px; text-align: center; color: #999;">Loading...</div>';
        menu.style.display = 'block';
        menu.style.position = 'fixed';
        menu.style.left = '50%';
        menu.style.top = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        menu.style.zIndex = '2000';

        const files = [];
        try {
            for await (const entry of this.currentFolderHandle.values()) {
                if (entry.kind === 'file' && (entry.name.endsWith('.json') || entry.name.endsWith('.mmd') || entry.name.endsWith('.mermaid'))) {
                    files.push(entry);
                }
            }

            list.innerHTML = '';

            if (files.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.padding = '12px';
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.color = '#999';
                emptyDiv.textContent = 'No diagram files found';
                list.appendChild(emptyDiv);
            } else {
                files.sort((a, b) => a.name.localeCompare(b.name));

                files.forEach(entry => {
                    const item = document.createElement('div');
                    item.className = 'menu-item';
                    item.textContent = '📄 ' + entry.name;

                    item.addEventListener('click', async () => {
                        menu.style.display = 'none';
                        await this.openFileFromFolder(entry.name);
                    });

                    list.appendChild(item);
                });
            }

            // Add close button
            const closeBtn = document.createElement('div');
            closeBtn.style.padding = '10px';
            closeBtn.style.textAlign = 'center';
            closeBtn.style.borderTop = '1px solid #e3e3e3';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontWeight = '600';
            closeBtn.style.color = '#666';
            closeBtn.textContent = '✕ Close';
            closeBtn.addEventListener('click', () => {
                menu.style.display = 'none';
            });
            list.appendChild(closeBtn);

        } catch (err) {
            console.error('Error reading folder:', err);
            list.innerHTML = '<div style="padding: 12px; color: #f44336;">Error reading folder</div>';
        }
    }

    async openFileFromFolder(fileName) {
        if (!this.currentFolderHandle) {
            alert('No folder selected. Please use "Browse Folder" first.');
            return;
        }

        try {
            const fileHandle = await this.currentFolderHandle.getFileHandle(fileName);
            this.currentFileHandle = fileHandle;
            this.currentFileName = fileName;

            // Add to recent files
            this.addToRecentFiles(fileName, this.currentFolderHandle.name);

            const file = await fileHandle.getFile();
            const text = await file.text();

            const data = JSON.parse(text);

            // Clear current state
            this.shapes = [];
            this.connections = [];
            this.rootShapes = [];
            this.rootConnections = [];
            this.currentGroup = null;
            this.groupPath = [];
            this.selectedShape = null;
            this.updateBreadcrumb();
            document.getElementById('backButton').style.display = 'none';

            // Helper function to deserialize shapes with their children
            const deserializeShape = (serialized) => {
                const shape = { ...serialized };
                if (serialized.children) {
                    shape.children = serialized.children.map(child => deserializeShape(child));
                }
                if (serialized.childConnections) {
                    shape.childConnections = serialized.childConnections.map(conn => ({
                        ...conn,
                        from: shape.children[conn.from],
                        to: shape.children[conn.to]
                    }));
                }
                return shape;
            };

            // Load shapes
            const loadedShapes = data.shapes.map(shape => deserializeShape(shape));
            this.shapes = loadedShapes;
            this.rootShapes = [...loadedShapes];

            // Load connections
            this.connections = data.connections.map(conn => ({
                from: loadedShapes[conn.from],
                to: loadedShapes[conn.to],
                type: conn.type || 'line',
                label: conn.label || ''
            }));
            this.rootConnections = [...this.connections];

            this.redraw();
        } catch (err) {
            console.error('Error opening file from folder:', err);
            alert('Error opening file: ' + err.message);
        }
    }

    updateMermaidViewIfOpen() {
        // Check if sidebar is open in view mode
        const sidebar = document.getElementById('rightSidebar');
        const viewMode = document.getElementById('viewMode');
        const mermaidOutput = document.getElementById('mermaidOutput');

        if (sidebar.style.display === 'flex' && viewMode.style.display === 'flex') {
            // Don't update if user is currently editing the textarea
            if (document.activeElement === mermaidOutput) {
                return;
            }

            // Update the Mermaid code only if there are shapes
            if (this.shapes.length > 0) {
                const mermaidCode = this.generateMermaidFromDiagram();
                mermaidOutput.value = mermaidCode;
            } else {
                // Clear textarea if no shapes
                mermaidOutput.value = '';
            }
        }
    }

    generateMermaidFromDiagram() {
        const shapesToExport = this.currentGroup === null ? this.shapes : this.rootShapes;
        const connectionsToExport = this.currentGroup === null ? this.connections : this.rootConnections;

        console.log('[generateMermaidFromDiagram]', {
            currentGroup: this.currentGroup,
            shapesCount: this.shapes.length,
            rootShapesCount: this.rootShapes.length,
            shapesToExportCount: shapesToExport.length,
            connectionsToExportCount: connectionsToExport.length
        });

        // Use stored layout direction
        let mermaid = `flowchart ${this.mermaidLayoutDirection || 'LR'}\n`;

        // Create a map of shapes to IDs
        const shapeToId = new Map();
        const usedIds = new Set();

        // Generate node IDs (use mermaidId if available, otherwise create from text)
        shapesToExport.forEach((shape, index) => {
            let nodeId;

            if (shape.mermaidId) {
                // Use original Mermaid ID
                nodeId = shape.mermaidId;
            } else {
                // Generate ID from text (sanitize: remove spaces, special chars)
                const text = shape.text || `Node${index}`;
                nodeId = text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

                // Ensure unique ID
                let uniqueId = nodeId;
                let counter = 1;
                while (usedIds.has(uniqueId)) {
                    uniqueId = `${nodeId}${counter}`;
                    counter++;
                }
                nodeId = uniqueId;
            }

            usedIds.add(nodeId);
            shapeToId.set(shape, nodeId);
        });

        // Track which nodes need explicit definitions
        const nodesNeedingDefinition = new Map();

        shapesToExport.forEach((shape) => {
            const nodeId = shapeToId.get(shape);
            const text = shape.text || nodeId;

            // Check if node needs explicit definition (has brackets, or text differs from ID)
            const needsDefinition = text !== nodeId || shape.type !== 'rectangle';

            if (needsDefinition) {
                let nodeDef;
                switch (shape.type) {
                    case 'rectangle':
                        nodeDef = `${nodeId}[${text}]`;
                        break;
                    case 'diamond':
                        nodeDef = `${nodeId}{${text}}`;
                        break;
                    case 'circle':
                        nodeDef = `${nodeId}((${text}))`;
                        break;
                    case 'database':
                        nodeDef = `${nodeId}[(${text})]`;
                        break;
                    case 'cloud':
                        nodeDef = `${nodeId})${text}(`;
                        break;
                    default:
                        nodeDef = `${nodeId}[${text}]`;
                }
                nodesNeedingDefinition.set(nodeId, nodeDef);
            }
        });

        // Add connections (inline node definitions in first occurrence)
        const definedNodes = new Set();

        connectionsToExport.forEach(conn => {
            const fromId = shapeToId.get(conn.from);
            const toId = shapeToId.get(conn.to);

            if (fromId && toId) {
                // Use node definition if this is first occurrence
                let fromNode = fromId;
                if (nodesNeedingDefinition.has(fromId) && !definedNodes.has(fromId)) {
                    fromNode = nodesNeedingDefinition.get(fromId);
                    definedNodes.add(fromId);
                }

                let toNode = toId;
                if (nodesNeedingDefinition.has(toId) && !definedNodes.has(toId)) {
                    toNode = nodesNeedingDefinition.get(toId);
                    definedNodes.add(toId);
                }

                const label = conn.label ? `|${conn.label}|` : '';
                let arrow;

                if (conn.startArrow && conn.startArrow !== 'none' && conn.endArrow && conn.endArrow !== 'none') {
                    arrow = '<-->';
                } else if (conn.startArrow && conn.startArrow !== 'none') {
                    arrow = '<--';
                } else if (conn.endArrow && conn.endArrow !== 'none') {
                    arrow = '-->';
                } else {
                    arrow = '---';
                }

                mermaid += `    ${fromNode} ${arrow}${label} ${toNode}\n`;
            }
        });

        // Add any orphaned nodes (no connections) with definitions
        console.log('[generateMermaidFromDiagram] Adding orphaned nodes...');
        shapesToExport.forEach((shape) => {
            const nodeId = shapeToId.get(shape);
            console.log('  Checking node:', nodeId, {
                needsDefinition: nodesNeedingDefinition.has(nodeId),
                alreadyDefined: definedNodes.has(nodeId)
            });
            if (nodesNeedingDefinition.has(nodeId) && !definedNodes.has(nodeId)) {
                console.log('    Adding orphaned node:', nodesNeedingDefinition.get(nodeId));
                mermaid += `    ${nodesNeedingDefinition.get(nodeId)}\n`;
            }
        });

        console.log('[generateMermaidFromDiagram] Final mermaid:', mermaid);
        return mermaid;
    }

    importFromSidebarTextarea() {
        const mermaidText = document.getElementById('mermaidInput').value.trim();
        if (mermaidText) {
            // Clear current diagram first
            this.shapes = [];
            this.connections = [];
            this.rootShapes = [];
            this.rootConnections = [];

            // Get layout direction from radio button
            const directionElement = document.querySelector('input[name="layoutDirection"]:checked');
            const direction = directionElement ? directionElement.value : 'horizontal';
            console.log('Selected direction:', direction);

            // Store the direction in this editor instance
            this.mermaidLayoutDirection = direction === 'vertical' ? 'TB' : 'LR';

            // Save mermaid input code to this editor
            this.mermaidInputCode = mermaidText;

            this.importFromMermaid(mermaidText, direction);

            // Don't clear textarea - keep it for re-importing with different layout
            // Don't close sidebar automatically - let user close it
        } else {
            alert('Please paste your Mermaid code first.');
        }
    }

    importFromMermaid(mermaidText, direction = 'horizontal') {
        try {
            console.log('=== IMPORT START ===');
            console.log('Direction:', direction);
            console.log('Mermaid text:', mermaidText);

            // Store layout direction for export
            this.mermaidLayoutDirection = direction === 'horizontal' ? 'LR' : 'TD';

            // Try to detect flowchart direction from input
            const flowchartMatch = mermaidText.match(/flowchart\s+(LR|TD|TB|RL|BT)/);
            if (flowchartMatch) {
                this.mermaidLayoutDirection = flowchartMatch[1];
                console.log('Detected flowchart direction:', this.mermaidLayoutDirection);
            }

            const lines = mermaidText.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('flowchart') && !line.startsWith('graph') && !line.startsWith('%%'));
            console.log('Filtered lines:', lines);

            const shapes = [];
            const tempConnections = [];
            const nodeMap = new Map();

            // Helper function to create node if not exists
            const getOrCreateNode = (nodeId, nodeDef = null) => {
                if (nodeMap.has(nodeId)) {
                    return nodeMap.get(nodeId);
                }

                let text = nodeId; // Default text is the ID itself
                let type = 'rectangle'; // Default type

                // Parse node definition if provided
                if (nodeDef) {
                    if (nodeDef.startsWith('[') && nodeDef.endsWith(']')) {
                        text = nodeDef.slice(1, -1);
                        type = 'rectangle';
                    } else if (nodeDef.startsWith('{') && nodeDef.endsWith('}')) {
                        text = nodeDef.slice(1, -1);
                        type = 'diamond';
                    } else if (nodeDef.startsWith('((') && nodeDef.endsWith('))')) {
                        text = nodeDef.slice(2, -2);
                        type = 'circle';
                    } else if (nodeDef.startsWith('[(') && nodeDef.endsWith(')]')) {
                        text = nodeDef.slice(2, -2);
                        type = 'database';
                    } else if (nodeDef.startsWith(')') && nodeDef.endsWith('(')) {
                        text = nodeDef.slice(1, -1);
                        type = 'cloud';
                    }
                }

                const shape = {
                    type,
                    x: 0,
                    y: 0,
                    width: 120,
                    height: 60,
                    strokeColor: '#000000',
                    fillColor: '#ffffff',
                    strokeWidth: 2,
                    text: text,
                    id: Date.now() + Math.random(),
                    mermaidId: nodeId,  // Store original Mermaid node ID
                    layerId: this.activeLayer ? this.activeLayer.id : null
                };

                shapes.push(shape);
                nodeMap.set(nodeId, shape);
                console.log('Created node:', nodeId, '→', text);
                return shape;
            };

            // First pass: extract all node definitions with brackets
            lines.forEach(line => {
                console.log('Processing line:', line);
                // Match all node definitions with brackets/braces
                const nodeRegex = /(\w+)([\[\{\(].+?[\]\}\)])/g;
                let match;
                while ((match = nodeRegex.exec(line)) !== null) {
                    const nodeId = match[1];
                    const nodeDef = match[2];
                    getOrCreateNode(nodeId, nodeDef);
                }
            });

            // Second pass: create connections and create missing nodes
            const connections = [];
            lines.forEach(line => {
                // Remove node definitions from line for connection matching
                // Match pattern: nodeId[...] or nodeId{...} or nodeId((...))
                let connectionLine = line;

                // Extract all node IDs and definitions from the line
                const allNodesInLine = [];

                // Match: A[text], A{text}, A((text)), A[(text)], A)text(
                let nodeWithDefRegex = /(\w+)([\[\{\(].+?[\]\}\)])/g;
                let match;
                while ((match = nodeWithDefRegex.exec(line)) !== null) {
                    allNodesInLine.push({ id: match[1], def: match[2] });
                }

                // Now try to find connection pattern in the line
                // Pattern: (anything) --> or ==> or --- (anything)
                const arrowMatch = line.match(/(<?=*-+>?|<?=+>?)/);
                if (arrowMatch && allNodesInLine.length >= 1) {
                    // Case 1: Both nodes have definitions (e.g., A[text] --> B[text])
                    if (allNodesInLine.length >= 2) {
                        const fromId = allNodesInLine[0].id;
                        const fromDef = allNodesInLine[0].def;
                        const toId = allNodesInLine[1].id;
                        const toDef = allNodesInLine[1].def;
                        const arrow = arrowMatch[1];

                        // Extract label if present
                        const labelMatch = line.match(/\|([^|]+)\|/);
                        const label = labelMatch ? labelMatch[1] : '';

                        console.log('Connection (both defined):', fromId, arrow, toId);

                        // Create nodes with their definitions
                        const fromShape = getOrCreateNode(fromId, fromDef);
                        const toShape = getOrCreateNode(toId, toDef);

                        tempConnections.push({ fromId, toId });
                        const conn = {
                            from: fromShape,
                            to: toShape,
                            type: 'line',
                            label: label.trim(),
                            startArrow: arrow.startsWith('<') ? 'arrow' : 'none',
                            endArrow: arrow.endsWith('>') ? 'arrow' : 'none'
                        };
                        connections.push(conn);
                    }
                    // Case 2: One node has definition, one doesn't (e.g., A[1P] --> SOA)
                    else if (allNodesInLine.length === 1) {
                        // Try to find the second node ID (without brackets)
                        const arrow = arrowMatch[1];
                        const arrowIndex = line.indexOf(arrow);

                        // Split by arrow to get both sides
                        const leftSide = line.substring(0, arrowIndex).trim();
                        const rightSide = line.substring(arrowIndex + arrow.length).trim();

                        // Extract label if present
                        const labelMatch = line.match(/\|([^|]+)\|/);
                        const label = labelMatch ? labelMatch[1] : '';
                        const rightSideClean = rightSide.replace(/\|[^|]+\|/, '').trim();

                        // Extract plain node ID from right side
                        const plainNodeMatch = rightSideClean.match(/^(\w+)/);

                        if (plainNodeMatch) {
                            const firstNode = allNodesInLine[0];
                            const secondNodeId = plainNodeMatch[1];

                            let fromId, fromDef, toId, toDef;

                            // Determine which side has the definition
                            if (leftSide.includes('[') || leftSide.includes('{') || leftSide.includes('(')) {
                                // Left side has definition
                                fromId = firstNode.id;
                                fromDef = firstNode.def;
                                toId = secondNodeId;
                                toDef = null;
                            } else {
                                // Right side has definition
                                fromId = secondNodeId;
                                fromDef = null;
                                toId = firstNode.id;
                                toDef = firstNode.def;
                            }

                            console.log('Connection (mixed):', fromId, arrow, toId);

                            const fromShape = getOrCreateNode(fromId, fromDef);
                            const toShape = getOrCreateNode(toId, toDef);

                            tempConnections.push({ fromId, toId });
                            const conn = {
                                from: fromShape,
                                to: toShape,
                                type: 'line',
                                label: label.trim(),
                                startArrow: arrow.startsWith('<') ? 'arrow' : 'none',
                                endArrow: arrow.endsWith('>') ? 'arrow' : 'none'
                            };
                            connections.push(conn);
                        }
                    }
                } else {
                    // Fallback: try old pattern for simple node IDs without brackets
                    const connMatch = line.match(/(\w+)\s*(<?=*-+>?|<?=+>?)\s*(?:\|([^|]+)\|)?\s*(\w+)/);
                    if (connMatch) {
                        const fromId = connMatch[1];
                        const arrow = connMatch[2];
                        const label = connMatch[3] || '';
                        const toId = connMatch[4];

                        console.log('Connection (fallback):', fromId, arrow, toId);

                        // Create nodes if they don't exist yet
                        const fromShape = getOrCreateNode(fromId);
                        const toShape = getOrCreateNode(toId);

                        tempConnections.push({ fromId, toId });
                        const conn = {
                            from: fromShape,
                            to: toShape,
                            type: 'line',
                            label: label.trim(),
                            startArrow: arrow.startsWith('<') ? 'arrow' : 'none',
                            endArrow: arrow.endsWith('>') ? 'arrow' : 'none'
                        };
                        connections.push(conn);
                    }
                }
            });

            console.log('Total shapes created:', shapes.length);
            console.log('Total connections created:', connections.length);

            // Apply layout based on direction
            this.applyLayoutToShapes(shapes, tempConnections, nodeMap, direction);

            console.log('Setting shapes and connections...');
            this.shapes = shapes;
            this.connections = connections;
            this.rootShapes = [...shapes];
            this.rootConnections = [...connections];
            this.currentGroup = null;
            this.groupPath = [];
            this.selectedShape = null;
            this.selectedShapes = [];

            console.log('this.shapes length:', this.shapes.length);
            console.log('First shape:', this.shapes[0]);

            console.log('Updating UI...');
            this.updateBreadcrumb();
            document.getElementById('backButton').style.display = 'none';

            // Reset view to see imported shapes
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            document.getElementById('zoomLevel').textContent = '100%';

            console.log('Calling redraw...');
            this.redraw();
            console.log('Redraw completed');

            // Save state
            this.saveState();

            console.log('=== IMPORT COMPLETE ===');

        } catch (error) {
            console.error('Import error:', error);
            alert('Error parsing Mermaid file: ' + error.message);
        }
    }

    applyLayoutToShapes(shapes, connections, nodeMap, direction) {
        if (shapes.length === 0) return;

        const spacing = direction === 'horizontal' ? { level: 250, node: 120 } : { level: 150, node: 180 };

        // Build graph
        const adjList = new Map();
        const inDegree = new Map();

        nodeMap.forEach((shape, nodeId) => {
            adjList.set(nodeId, []);
            inDegree.set(nodeId, 0);
        });

        connections.forEach(conn => {
            adjList.get(conn.fromId).push(conn.toId);
            inDegree.set(conn.toId, inDegree.get(conn.toId) + 1);
        });

        // Find roots
        const roots = [];
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) roots.push(nodeId);
        });

        if (roots.length === 0 && shapes.length > 0) {
            roots.push(Array.from(nodeMap.keys())[0]);
        }

        // BFS to assign levels properly
        const levels = new Map();
        const queue = [];

        roots.forEach(root => {
            levels.set(root, 0);
            queue.push(root);
        });

        while (queue.length > 0) {
            const nodeId = queue.shift();
            const currentLevel = levels.get(nodeId);
            const neighbors = adjList.get(nodeId) || [];

            neighbors.forEach(neighborId => {
                if (!levels.has(neighborId)) {
                    levels.set(neighborId, currentLevel + 1);
                    queue.push(neighborId);
                }
            });
        }

        // Assign default level to unconnected nodes
        nodeMap.forEach((shape, nodeId) => {
            if (!levels.has(nodeId)) {
                levels.set(nodeId, 0);
            }
        });

        console.log('Levels assigned:', Array.from(levels.entries()));

        // Group by level
        const levelGroups = new Map();
        nodeMap.forEach((shape, nodeId) => {
            const level = levels.get(nodeId);
            if (!levelGroups.has(level)) levelGroups.set(level, []);
            levelGroups.get(level).push({ nodeId, shape });
        });

        // Position nodes
        levelGroups.forEach((nodes, level) => {
            nodes.forEach((item, index) => {
                if (direction === 'horizontal') {
                    item.shape.x = 100 + level * spacing.level;
                    item.shape.y = 100 + index * spacing.node;
                } else {
                    item.shape.x = 100 + index * spacing.node;
                    item.shape.y = 100 + level * spacing.level;
                }
                console.log(`Positioned ${item.nodeId} at (${item.shape.x}, ${item.shape.y})`);
            });
        });

        console.log('Layout applied:', direction, '- levels:', levelGroups.size);
    }

    exportToJSON() {
        // Save current state if inside a group
        if (this.currentGroup) {
            this.currentGroup.children = [...this.shapes];
            this.currentGroup.childConnections = [...this.connections];
        }

        // Use root shapes for export
        const shapesToExport = this.currentGroup === null ? this.shapes : this.rootShapes;
        const connectionsToExport = this.currentGroup === null ? this.connections : this.rootConnections;

        // Helper function to serialize shapes with their children
        const serializeShape = (shape) => {
            const serialized = { ...shape };
            if (shape.children) {
                serialized.children = shape.children.map(child => serializeShape(child));
            }
            if (shape.childConnections) {
                serialized.childConnections = shape.childConnections.map(conn => ({
                    from: shape.children.indexOf(conn.from),
                    to: shape.children.indexOf(conn.to),
                    type: conn.type
                }));
            }
            return serialized;
        };

        const data = {
            shapes: shapesToExport.map(shape => serializeShape(shape)),
            connections: connectionsToExport.map(conn => ({
                from: shapesToExport.indexOf(conn.from),
                to: shapesToExport.indexOf(conn.to),
                type: conn.type
            }))
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'diagram.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    importFromJSON(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Helper function to deserialize shapes with children
                const deserializeShape = (shapeData) => {
                    const shape = { ...shapeData };
                    if (shapeData.children && shapeData.children.length > 0) {
                        shape.children = shapeData.children.map(child => deserializeShape(child));

                        // Restore child connections
                        if (shapeData.childConnections) {
                            shape.childConnections = shapeData.childConnections.map(conn => ({
                                from: shape.children[conn.from],
                                to: shape.children[conn.to],
                                type: conn.type
                            }));
                        } else {
                            shape.childConnections = [];
                        }
                    }
                    return shape;
                };

                this.shapes = (data.shapes || []).map(shape => deserializeShape(shape));
                this.connections = data.connections.map(conn => ({
                    from: this.shapes[conn.from],
                    to: this.shapes[conn.to],
                    type: conn.type
                }));

                // Reset hierarchy state
                this.rootShapes = [...this.shapes];
                this.rootConnections = [...this.connections];
                this.currentGroup = null;
                this.groupPath = [];
                this.selectedShape = null;

                // Update UI
                this.updateBreadcrumb();
                document.getElementById('backButton').style.display = 'none';
                this.redraw();
            } catch (error) {
                console.error('[openFileFromFolder] Error:', error);
                console.error('[openFileFromFolder] Stack:', error.stack);
            }
        };
        reader.readAsText(file);
    }

    // ============================================
    // LAYER SYSTEM METHODS (Phase 2)
    // ============================================

    initLayers() {
        // Initialize with default "High Level" layer
        this.addLayer('High Level', true);
        this.renderLayerList();
        this.bindLayerEvents();
    }

    addLayer(name = null, skipDialog = false) {
        // Auto-generate name based on counter
        if (!name) {
            name = `Layer ${this.layerIdCounter}`;
        }

        const layer = {
            id: this.layerIdCounter++,
            name: name,
            visible: true,
            locked: false,
            zIndex: this.layers.length
        };

        this.layers.push(layer);

        // Always set newly created layer as active
        this.activeLayer = layer;

        this.renderLayerList();
        this.saveState();
        return layer;
    }

    deleteLayer(layer) {
        if (this.layers.length === 1) {
            alert('Cannot delete the last layer!');
            return;
        }

        // Check if any shapes are on this layer
        const shapesOnLayer = this.shapes.filter(s => s.layerId === layer.id);
        if (shapesOnLayer.length > 0) {
            const confirm = window.confirm(`This layer has ${shapesOnLayer.length} shape(s). Move them to another layer before deleting?`);
            if (!confirm) return;

            // Move shapes to first available layer
            const targetLayer = this.layers.find(l => l.id !== layer.id);
            shapesOnLayer.forEach(s => s.layerId = targetLayer.id);
        }

        const index = this.layers.indexOf(layer);
        this.layers.splice(index, 1);

        // Update active layer if deleted
        if (this.activeLayer === layer) {
            this.activeLayer = this.layers[0];
        }

        this.renderLayerList();
        this.redraw();
        this.saveState();
    }

    renameLayer(layer) {
        const newName = prompt('Enter new layer name:', layer.name);
        if (newName && newName !== layer.name) {
            layer.name = newName;
            this.renderLayerList();
            this.saveState();
        }
    }

    toggleLayerVisibility(layer) {
        layer.visible = !layer.visible;
        this.renderLayerList();
        this.redraw();
        this.saveState();
    }

    setActiveLayer(layer) {
        this.activeLayer = layer;
        this.renderLayerList();
    }

    moveLayerUp(layer) {
        const index = this.layers.indexOf(layer);
        if (index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            this.updateLayerZIndices();
            this.renderLayerList();
            this.redraw();
            this.saveState();
        }
    }

    moveLayerDown(layer) {
        const index = this.layers.indexOf(layer);
        if (index > 0) {
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
            this.updateLayerZIndices();
            this.renderLayerList();
            this.redraw();
            this.saveState();
        }
    }

    updateLayerZIndices() {
        this.layers.forEach((layer, index) => {
            layer.zIndex = index;
        });
    }

    getShapeCountForLayer(layer) {
        return this.shapes.filter(s => s.layerId === layer.id).length;
    }

    renderLayerList() {
        const layerList = document.getElementById('layerList');
        layerList.innerHTML = '';

        // Render layers in reverse order (top layer first in UI)
        [...this.layers].reverse().forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (this.activeLayer === layer) {
                layerItem.classList.add('active');
            }

            const visibilityBtn = document.createElement('button');
            visibilityBtn.className = 'layer-visibility-btn';
            if (!layer.visible) {
                visibilityBtn.classList.add('hidden');
            }
            visibilityBtn.innerHTML = layer.visible ? '👁️' : '👁️‍🗨️';
            visibilityBtn.title = layer.visible ? 'Hide layer' : 'Show layer';
            visibilityBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(layer);
            };

            const layerName = document.createElement('div');
            layerName.className = 'layer-name';
            layerName.textContent = layer.name;
            layerName.ondblclick = (e) => {
                e.stopPropagation();
                this.renameLayer(layer);
            };

            const layerCount = document.createElement('div');
            layerCount.className = 'layer-count';
            layerCount.textContent = this.getShapeCountForLayer(layer);

            const layerActions = document.createElement('div');
            layerActions.className = 'layer-actions';

            // Move up button
            const upBtn = document.createElement('button');
            upBtn.className = 'layer-action-btn';
            upBtn.innerHTML = '▲';
            upBtn.title = 'Move layer up';
            upBtn.onclick = (e) => {
                e.stopPropagation();
                this.moveLayerUp(layer);
            };

            // Move down button
            const downBtn = document.createElement('button');
            downBtn.className = 'layer-action-btn';
            downBtn.innerHTML = '▼';
            downBtn.title = 'Move layer down';
            downBtn.onclick = (e) => {
                e.stopPropagation();
                this.moveLayerDown(layer);
            };

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'layer-action-btn delete';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Delete layer';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteLayer(layer);
            };

            layerActions.appendChild(upBtn);
            layerActions.appendChild(downBtn);
            layerActions.appendChild(deleteBtn);

            layerItem.appendChild(visibilityBtn);
            layerItem.appendChild(layerName);
            layerItem.appendChild(layerCount);
            layerItem.appendChild(layerActions);

            // Click to set active
            layerItem.onclick = () => {
                this.setActiveLayer(layer);
            };

            layerList.appendChild(layerItem);
        });
    }

    bindLayerEvents() {
        // Add layer button
        document.getElementById('addLayerBtn').addEventListener('click', () => {
            this.addLayer();
        });
    }

    // Share Link Functions
    copyShareLink() {
        try {
            // Minify shape data - only keep essential properties
            const minifyShape = (shape) => {
                const mini = {
                    t: shape.type,
                    x: Math.round(shape.x),
                    y: Math.round(shape.y),
                    w: Math.round(shape.width),
                    h: Math.round(shape.height)
                };
                if (shape.text) mini.txt = shape.text;
                if (shape.fillColor !== '#e3f2fd') mini.f = shape.fillColor;
                if (shape.strokeColor !== '#1976d2') mini.s = shape.strokeColor;
                if (shape.strokeWidth !== 2) mini.sw = shape.strokeWidth;
                if (shape.children && shape.children.length > 0) {
                    mini.ch = shape.children.map(c => minifyShape(c));
                }
                return mini;
            };

            const minifyConnection = (conn, shapes) => {
                const mini = {
                    f: shapes.indexOf(conn.from),
                    t: shapes.indexOf(conn.to)
                };
                if (conn.label) mini.l = conn.label;
                if (conn.startArrow !== 'none') mini.sa = conn.startArrow;
                if (conn.endArrow !== 'arrow') mini.ea = conn.endArrow;
                if (conn.lineStyle !== 'solid') mini.ls = conn.lineStyle;
                return mini;
            };

            // Encode current diagram data with minified format
            const diagramData = {
                s: this.shapes.map(sh => minifyShape(sh)),
                c: this.connections.map(cn => minifyConnection(cn, this.shapes))
            };

            // Convert to JSON and compress using base64
            const jsonStr = JSON.stringify(diagramData);
            const encoded = btoa(encodeURIComponent(jsonStr));

            // Create URL with data
            const baseUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${baseUrl}?d=${encoded}`;

            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Link copied to clipboard! Share this link to show your diagram.');
            }).catch(err => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('Link copied to clipboard! Share this link to show your diagram.');
                } catch (e) {
                    alert('Could not copy link. URL: ' + shareUrl);
                }
                document.body.removeChild(textArea);
            });
        } catch (error) {
            console.error('Error creating share link:', error);
            alert('Error creating share link. The diagram might be too large.');
        }
    }

    loadFromURL() {
        try {
            // Check if there's data in URL
            const urlParams = new URLSearchParams(window.location.search);
            const encodedData = urlParams.get('d') || urlParams.get('data'); // Support both new (d) and old (data) format

            if (!encodedData) return;

            // Decode and parse data
            const jsonStr = decodeURIComponent(atob(encodedData));
            const diagramData = JSON.parse(jsonStr);

            // Expand minified data if using new format
            const expandShape = (mini) => {
                const shape = {
                    id: Date.now() + Math.random(),
                    type: mini.t,
                    x: mini.x,
                    y: mini.y,
                    width: mini.w,
                    height: mini.h,
                    text: mini.txt || '',
                    fillColor: mini.f || '#e3f2fd',
                    strokeColor: mini.s || '#1976d2',
                    strokeWidth: mini.sw || 2
                };
                if (mini.ch) {
                    shape.children = mini.ch.map(c => expandShape(c));
                    shape.childConnections = [];
                }
                return shape;
            };

            // Check if new minified format (has 's' and 'c' properties)
            if (diagramData.s) {
                // New minified format
                this.shapes = diagramData.s.map(s => expandShape(s));

                // Expand connections
                if (diagramData.c) {
                    this.connections = diagramData.c.map(c => ({
                        from: this.shapes[c.f],
                        to: this.shapes[c.t],
                        label: c.l || '',
                        name: '',
                        note: '',
                        startArrow: c.sa || 'none',
                        endArrow: c.ea || 'arrow',
                        lineStyle: c.ls || 'solid'
                    }));
                }
            } else {
                // Old format - load directly
                if (diagramData.shapes) {
                    this.shapes = diagramData.shapes;
                }
                if (diagramData.connections) {
                    this.connections = diagramData.connections;
                }
                if (diagramData.layers) {
                    this.layers = diagramData.layers;
                    if (this.layers.length > 0) {
                        this.activeLayer = this.layers[0];
                    }
                }
                if (diagramData.zoom) {
                    this.zoom = diagramData.zoom;
                    document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
                }
                if (diagramData.panX !== undefined) {
                    this.panX = diagramData.panX;
                }
                if (diagramData.panY !== undefined) {
                    this.panY = diagramData.panY;
                }
            }

            // Update UI
            this.renderLayerList();
            this.redraw();
            this.saveState();

            console.log('Diagram loaded from URL successfully');
        } catch (error) {
            console.error('Error loading diagram from URL:', error);
            // Don't show alert on load error, just continue normally
        }
    }

    // Tab Management Methods
    cleanup() {
        // Clean up event listeners and resources when tab is closed
        if (this.cursorBlinkInterval) {
            clearInterval(this.cursorBlinkInterval);
        }

        // Remove any event listeners
        // (Most are handled by the canvas which will be reused)

        // Clear state
        this.shapes = [];
        this.connections = [];
        this.selectedShape = null;
        this.selectedShapes = [];
        this.selectedConnections = [];
    }
}

// Tab Manager Class
class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.nextTabId = 1;

        this.tabsContainer = document.getElementById('bottomTabsContainer');
        this.newTabBtn = document.getElementById('bottomNewTabBtn');
        this.canvas = document.getElementById('canvas');
        this.canvasWrapper = document.getElementById('canvasWrapper');

        // Create first tab
        this.createNewTab();

        // Event listeners
        this.newTabBtn.addEventListener('click', () => this.createNewTab());

        // Tab click handlers (event delegation)
        this.tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.bottom-tab');
            const closeBtn = e.target.closest('.bottom-tab-close-btn');

            if (closeBtn && tab) {
                e.stopPropagation();
                const tabId = parseInt(tab.dataset.tabId);
                this.closeTab(tabId);
            } else if (tab) {
                const tabId = parseInt(tab.dataset.tabId);
                this.switchTab(tabId);
            }
        });

        // Double click to rename
        this.tabsContainer.addEventListener('dblclick', (e) => {
            const tabName = e.target.closest('.bottom-tab-name');
            if (tabName) {
                const tab = tabName.closest('.bottom-tab');
                const tabId = parseInt(tab.dataset.tabId);
                this.renameTab(tabId, tabName);
            }
        });
    }

    createNewTab() {
        const tabId = this.nextTabId++;

        // Create new canvas element for this tab
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'canvas';

        // Create new editor instance with the new canvas
        const editor = new DiagramEditor(newCanvas);

        // Sync current tool state from UI to new editor
        const activeToolBtn = document.querySelector('.tool-btn.active');
        if (activeToolBtn) {
            const shapeType = activeToolBtn.getAttribute('data-shape');
            if (shapeType) {
                // Shape tool is active
                editor.currentTool = 'draw';
                editor.currentShape = shapeType;
            } else if (activeToolBtn.id === 'selectTool') {
                // Select tool is active
                editor.currentTool = 'select';
            } else if (activeToolBtn.id === 'panTool') {
                // Pan tool is active
                editor.currentTool = 'pan';
            }
        }

        // Store tab data
        this.tabs.set(tabId, {
            editor: editor,
            canvas: newCanvas,
            name: `Diagram ${tabId}`
        });

        // Create tab element
        const tabElement = document.createElement('div');
        tabElement.className = 'bottom-tab';
        tabElement.dataset.tabId = tabId;
        tabElement.innerHTML = `
            <span class="bottom-tab-name">${this.tabs.get(tabId).name}</span>
            <button class="bottom-tab-close-btn" title="Close tab">×</button>
        `;

        this.tabsContainer.appendChild(tabElement);

        // Switch to new tab
        this.switchTab(tabId);

        return tabId;
    }

    switchTab(tabId) {
        if (!this.tabs.has(tabId) || this.activeTabId === tabId) return;

        // Save current tab state if exists
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            const currentTab = this.tabs.get(this.activeTabId);
            // Save mermaid textarea content to current editor
            currentTab.editor.mermaidInputCode = document.getElementById('mermaidInput').value;
            currentTab.editor.mermaidOutputCode = document.getElementById('mermaidOutput').value;
        }

        // Update active tab
        this.activeTabId = tabId;

        // Update tab UI
        document.querySelectorAll('.bottom-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.tabId) === tabId);
        });

        // Get new tab data
        const newTab = this.tabs.get(tabId);

        // Sync current tool state from UI to the editor being switched to
        const activeToolBtn = document.querySelector('.tool-btn.active');
        if (activeToolBtn) {
            const shapeType = activeToolBtn.getAttribute('data-shape');
            if (shapeType) {
                // Shape tool is active
                newTab.editor.currentTool = 'draw';
                newTab.editor.currentShape = shapeType;
                newTab.editor.canvas.style.cursor = 'crosshair';
            } else if (activeToolBtn.id === 'selectTool') {
                // Select tool is active
                newTab.editor.currentTool = 'select';
                newTab.editor.canvas.style.cursor = 'crosshair';
            } else if (activeToolBtn.id === 'panTool') {
                // Pan tool is active
                newTab.editor.currentTool = 'pan';
                newTab.editor.canvas.style.cursor = 'grab';
            }
        }

        // Replace canvas
        const oldCanvas = this.canvas;
        const newCanvas = newTab.canvas;

        // Replace in DOM
        this.canvasWrapper.replaceChild(newCanvas, oldCanvas);
        this.canvas = newCanvas;

        // Redraw
        newTab.editor.redraw();

        // Refresh layer panel if it's open
        const layerPanel = document.getElementById('layerPanel');
        if (layerPanel && layerPanel.style.display === 'flex') {
            newTab.editor.renderLayerList();
        }

        // Update comparison toolbar UI based on editor's state
        this.updateComparisonToolbarUI(newTab.editor);

        // Sync layout direction radio buttons with editor's setting
        this.syncLayoutDirectionUI(newTab.editor);

        // Restore mermaid textarea content from new editor
        document.getElementById('mermaidInput').value = newTab.editor.mermaidInputCode || '';

        // Check if sidebar is open and in view mode
        const rightSidebar = document.getElementById('rightSidebar');
        const viewMode = document.getElementById('viewMode');
        const isViewModeActive = rightSidebar.style.display === 'flex' && viewMode.style.display === 'flex';

        console.log('[switchTab] View mode check:', {
            tabId,
            sidebarDisplay: rightSidebar.style.display,
            viewModeDisplay: viewMode.style.display,
            isViewModeActive,
            shapesCount: newTab.editor.shapes.length
        });

        if (isViewModeActive) {
            // Always re-generate mermaid code for the new tab when view mode is active
            // This ensures we get fresh data from the current tab's shapes
            console.log('[switchTab] Re-generating mermaid for tab', tabId);

            if (newTab.editor.shapes.length > 0) {
                const mermaidCode = newTab.editor.generateMermaidFromDiagram();
                console.log('[switchTab] Generated code:', mermaidCode);
                document.getElementById('mermaidOutput').value = mermaidCode;
                newTab.editor.mermaidOutputCode = mermaidCode;
            } else {
                console.log('[switchTab] No shapes in tab', tabId);
                document.getElementById('mermaidOutput').value = 'flowchart LR\n';
                newTab.editor.mermaidOutputCode = 'flowchart LR\n';
            }
        } else {
            // Just restore saved content if not in view mode
            console.log('[switchTab] Not in view mode, restoring saved content');
            document.getElementById('mermaidOutput').value = newTab.editor.mermaidOutputCode || '';
        }
    }

    syncLayoutDirectionUI(editor) {
        // Get editor's layout direction (LR = horizontal, TB = vertical)
        const direction = editor.mermaidLayoutDirection === 'TB' ? 'vertical' : 'horizontal';

        // Temporarily disable syncing to prevent triggering change events
        window._syncingLayoutDirection = true;

        // Update import mode radio buttons
        const importRadios = document.querySelectorAll('input[name="layoutDirection"]');
        importRadios.forEach(radio => {
            radio.checked = radio.value === direction;
        });

        // Update apply mode radio buttons
        const applyRadios = document.querySelectorAll('input[name="applyLayoutDirection"]');
        applyRadios.forEach(radio => {
            radio.checked = radio.value === direction;
        });

        // Re-enable syncing
        setTimeout(() => {
            window._syncingLayoutDirection = false;
        }, 0);
    }

    updateComparisonToolbarUI(editor) {
        const comparisonToolbar = document.getElementById('comparisonToolbar');
        const comparisonWarning = document.getElementById('comparisonWarning');
        const viewAsIsBtn = document.getElementById('viewAsIs');
        const viewToBeBtn = document.getElementById('viewToBe');
        const layerPanel = document.getElementById('layerPanel');
        const layerToggleBtn = document.getElementById('layerToggleBtn');

        if (editor.comparisonMode) {
            // Show comparison toolbar
            if (comparisonToolbar) {
                comparisonToolbar.style.display = 'flex';
            }

            // Update active button based on current view
            if (viewAsIsBtn && viewToBeBtn) {
                if (editor.currentView === 'asis') {
                    viewAsIsBtn.classList.add('active');
                    viewToBeBtn.classList.remove('active');

                    // Show warning banner for As-Is (read-only)
                    if (comparisonWarning) {
                        comparisonWarning.style.display = 'flex';
                    }
                } else {
                    viewAsIsBtn.classList.remove('active');
                    viewToBeBtn.classList.add('active');

                    // Hide warning banner for To-Be (editable)
                    if (comparisonWarning) {
                        comparisonWarning.style.display = 'none';
                    }

                    // Close layer panel when switching to To-Be
                    if (layerPanel) {
                        layerPanel.style.display = 'none';
                    }
                    if (layerToggleBtn) {
                        layerToggleBtn.classList.remove('active');
                    }
                }
            }
        } else {
            // Hide comparison toolbar and warning
            if (comparisonToolbar) {
                comparisonToolbar.style.display = 'none';
            }
            if (comparisonWarning) {
                comparisonWarning.style.display = 'none';
            }
        }
    }

    importAllTabs(data) {
        console.log('[importAllTabs] Data:', data);

        // Close all existing tabs except the first one
        const tabIds = Array.from(this.tabs.keys());
        for (let i = tabIds.length - 1; i > 0; i--) {
            const tabId = tabIds[i];
            const tabElement = document.querySelector(`.bottom-tab[data-tab-id="${tabId}"]`);
            if (tabElement) {
                tabElement.remove();
            }
            this.tabs.delete(tabId);
        }

        // Helper function to deserialize shapes with children
        const deserializeShape = (shapeData) => {
            const shape = { ...shapeData };
            if (shapeData.children && shapeData.children.length > 0) {
                shape.children = shapeData.children.map(child => deserializeShape(child));

                // Restore child connections
                if (shapeData.childConnections) {
                    shape.childConnections = shapeData.childConnections.map(conn => ({
                        from: shape.children[conn.from],
                        to: shape.children[conn.to],
                        type: conn.type,
                        label: conn.label || ''
                    }));
                } else {
                    shape.childConnections = [];
                }
            }
            return shape;
        };

        // Load all tabs
        console.log('[importAllTabs] Tabs:', data.tabs);
        data.tabs.forEach((tabData, index) => {
            console.log('[importAllTabs] Processing tab', index, tabData);
            let tabId, editor;

            if (index === 0) {
                // Use the existing first tab
                tabId = tabIds[0];
                const tab = this.tabs.get(tabId);
                editor = tab.editor;
                tab.name = tabData.name;

                // Update tab name in UI
                const tabElement = document.querySelector(`.bottom-tab[data-tab-id="${tabId}"] .bottom-tab-name`);
                if (tabElement) {
                    tabElement.textContent = tabData.name;
                }
            } else {
                // Create new tab
                tabId = this.createNewTab();
                const tab = this.tabs.get(tabId);
                editor = tab.editor;
                tab.name = tabData.name;

                // Update tab name in UI
                const tabElement = document.querySelector(`.bottom-tab[data-tab-id="${tabId}"] .bottom-tab-name`);
                if (tabElement) {
                    tabElement.textContent = tabData.name;
                }
            }

            // Load shapes and connections into this editor
            editor.shapes = (tabData.shapes || []).map(shape => deserializeShape(shape));
            editor.connections = (tabData.connections || []).map(conn => ({
                from: editor.shapes[conn.from],
                to: editor.shapes[conn.to],
                type: conn.type,
                label: conn.label || ''
            }));

            // Reset hierarchy state
            editor.rootShapes = [...editor.shapes];
            editor.rootConnections = [...editor.connections];
            editor.currentGroup = null;
            editor.groupPath = [];
            editor.selectedShape = null;
            editor.selectedShapes = [];

            // Update UI for this editor
            editor.updateBreadcrumb();
        });

        // Switch to the active tab from the saved file
        if (data.activeTabId && this.tabs.has(data.activeTabId)) {
            this.switchTab(data.activeTabId);
        } else {
            // Fallback to first tab
            this.switchTab(tabIds[0]);
        }

        // Force redraw the active tab
        const activeEditor = this.getActiveEditor();
        if (activeEditor) {
            activeEditor.redraw();
        }

        alert('All tabs loaded successfully!');
    }

    exportAllTabs() {
        const tabsData = [];

        this.tabs.forEach((tab, tabId) => {
            const editor = tab.editor;

            // Save current state if inside a group
            if (editor.currentGroup) {
                editor.currentGroup.children = [...editor.shapes];
                editor.currentGroup.childConnections = [...editor.connections];
            }

            // Use root shapes for export
            const shapesToExport = editor.currentGroup === null ? editor.shapes : editor.rootShapes;
            const connectionsToExport = editor.currentGroup === null ? editor.connections : editor.rootConnections;

            // Helper function to serialize shapes with their children
            const serializeShape = (shape) => {
                const serialized = { ...shape };
                if (shape.children) {
                    serialized.children = shape.children.map(child => serializeShape(child));
                }
                if (shape.childConnections) {
                    serialized.childConnections = shape.childConnections.map(conn => ({
                        from: shape.children.indexOf(conn.from),
                        to: shape.children.indexOf(conn.to),
                        type: conn.type,
                        label: conn.label
                    }));
                }
                return serialized;
            };

            tabsData.push({
                tabId: tabId,
                name: tab.name,
                shapes: shapesToExport.map(shape => serializeShape(shape)),
                connections: connectionsToExport.map(conn => ({
                    from: shapesToExport.indexOf(conn.from),
                    to: shapesToExport.indexOf(conn.to),
                    type: conn.type,
                    label: conn.label
                }))
            });
        });

        return {
            version: '2.0', // New version to support multiple tabs
            activeTabId: this.activeTabId,
            tabs: tabsData
        };
    }

    closeTab(tabId) {
        if (this.tabs.size <= 1) {
            alert('Cannot close the last tab');
            return;
        }

        // Confirm if tab has content
        const tab = this.tabs.get(tabId);
        if (tab.editor.shapes.length > 0 || tab.editor.connections.length > 0) {
            if (!confirm('Close this tab? All unsaved changes will be lost.')) {
                return;
            }
        }

        // Remove tab
        this.tabs.delete(tabId);

        // Remove tab element
        const tabElement = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }

        // Switch to another tab if this was active
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            this.switchTab(remainingTabs[0]);
        }
    }

    renameTab(tabId, tabNameElement) {
        const currentName = this.tabs.get(tabId).name;

        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.style.cssText = `
            width: 100%;
            border: 1px solid #4caf50;
            border-radius: 3px;
            padding: 2px 4px;
            font-size: 13px;
            outline: none;
        `;

        // Replace span with input
        tabNameElement.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newName = input.value.trim() || currentName;
            this.tabs.get(tabId).name = newName;

            // Replace input with span
            const newSpan = document.createElement('span');
            newSpan.className = 'bottom-tab-name';
            newSpan.textContent = newName;
            input.replaceWith(newSpan);
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = currentName;
                input.blur();
            }
        });
    }

    getActiveEditor() {
        return this.tabs.get(this.activeTabId)?.editor;
    }
}

// Setup shared UI events (only once)
function setupSharedUIEvents() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    // Remove any existing listeners by cloning the button
    const newHamburgerBtn = hamburgerBtn.cloneNode(true);
    hamburgerBtn.parentNode.replaceChild(newHamburgerBtn, hamburgerBtn);

    newHamburgerBtn.addEventListener('click', (e) => {
        console.log('🍔 Hamburger clicked!');
        e.stopPropagation();

        // Check what element is on top at click position
        const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
        console.log('Element at click point:', elementAtPoint);
        console.log('Dropdown z-index:', window.getComputedStyle(dropdownMenu).zIndex);
        console.log('Hamburger z-index:', window.getComputedStyle(newHamburgerBtn).zIndex);

        const isVisible = dropdownMenu.style.display === 'block';

        if (!isVisible) {
            // Calculate position based on button
            const rect = newHamburgerBtn.getBoundingClientRect();
            dropdownMenu.style.top = (rect.bottom + 4) + 'px';
            dropdownMenu.style.left = rect.left + 'px';
            dropdownMenu.style.display = 'block';
            newHamburgerBtn.classList.add('active');
            console.log('✅ Menu opened');
        } else {
            dropdownMenu.style.display = 'none';
            newHamburgerBtn.classList.remove('active');
            console.log('❌ Menu closed');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!newHamburgerBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
            newHamburgerBtn.classList.remove('active');
        }
    });

    // Global tool button handlers (work with active editor)
    const selectTool = document.getElementById('selectTool');
    selectTool.addEventListener('click', () => {
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor) {
            activeEditor.currentTool = 'select';
            activeEditor.canvas.style.cursor = 'crosshair';
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            selectTool.classList.add('active');
        }
    });

    // Pan tool button
    const panTool = document.getElementById('panTool');
    if (panTool) {
        panTool.addEventListener('click', () => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                activeEditor.currentTool = 'pan';
                activeEditor.canvas.style.cursor = 'grab';
                document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
                panTool.classList.add('active');
            }
        });
    }

    // Shape tool buttons
    const shapeButtons = document.querySelectorAll('.tool-btn[data-shape]');
    shapeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                const shape = btn.getAttribute('data-shape');
                activeEditor.currentTool = 'draw';
                activeEditor.currentShape = shape;
                activeEditor.canvas.style.cursor = 'crosshair';
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

}

// Global layer panel management (UI only - data comes from active tab)
function setupLayerPanel() {
    const layerToggleBtn = document.getElementById('layerToggleBtn');
    const layerPanel = document.getElementById('layerPanel');

    // Remove existing listeners by cloning
    const newLayerToggleBtn = layerToggleBtn.cloneNode(true);
    layerToggleBtn.parentNode.replaceChild(newLayerToggleBtn, layerToggleBtn);

    newLayerToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Check if in comparison mode (both As-Is and To-Be)
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor && activeEditor.comparisonMode) {
            alert('Layer panel is not available in comparison mode. Exit comparison mode to manage layers.');
            return;
        }

        const isVisible = layerPanel.style.display === 'flex';

        if (!isVisible) {
            // Show panel and refresh with current tab's layers
            layerPanel.style.display = 'flex';
            newLayerToggleBtn.classList.add('active');

            // Get active editor and refresh layer panel
            if (activeEditor) {
                activeEditor.renderLayerList();
            }
        } else {
            layerPanel.style.display = 'none';
            newLayerToggleBtn.classList.remove('active');
        }
    });

    // Close layer panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!newLayerToggleBtn.contains(e.target) && !layerPanel.contains(e.target)) {
            layerPanel.style.display = 'none';
            newLayerToggleBtn.classList.remove('active');
        }
    });
}

// Global comparison toolbar management (UI only - data comes from active tab)
function setupComparisonToolbar() {
    const viewAsIsBtn = document.getElementById('viewAsIs');
    const viewToBeBtn = document.getElementById('viewToBe');
    const exitComparisonBtn = document.getElementById('exitComparison');

    if (viewAsIsBtn) {
        // Remove existing listeners by cloning
        const newViewAsIsBtn = viewAsIsBtn.cloneNode(true);
        viewAsIsBtn.parentNode.replaceChild(newViewAsIsBtn, viewAsIsBtn);

        newViewAsIsBtn.addEventListener('click', () => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                activeEditor.loadView('asis');
            }
        });
    }

    if (viewToBeBtn) {
        // Remove existing listeners by cloning
        const newViewToBeBtn = viewToBeBtn.cloneNode(true);
        viewToBeBtn.parentNode.replaceChild(newViewToBeBtn, viewToBeBtn);

        newViewToBeBtn.addEventListener('click', () => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                activeEditor.loadView('tobe');
            }
        });
    }

    if (exitComparisonBtn) {
        // Remove existing listeners by cloning
        const newExitComparisonBtn = exitComparisonBtn.cloneNode(true);
        exitComparisonBtn.parentNode.replaceChild(newExitComparisonBtn, exitComparisonBtn);

        newExitComparisonBtn.addEventListener('click', () => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                activeEditor.exitComparisonMode();
            }
        });
    }
}

// Global file operations (Save, Save As)
function setupFileOperations() {
    // Save File
    const saveFileBtn = document.getElementById('saveFile');
    const newSaveFileBtn = saveFileBtn.cloneNode(true);
    saveFileBtn.parentNode.replaceChild(newSaveFileBtn, saveFileBtn);

    newSaveFileBtn.addEventListener('click', async () => {
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor) {
            await activeEditor.save();
        }
        document.getElementById('dropdownMenu').style.display = 'none';
        document.getElementById('hamburgerBtn').classList.remove('active');
        document.getElementById('recentFilesMenu').style.display = 'none';
        document.getElementById('folderFilesMenu').style.display = 'none';
    });

    // Save As File
    const saveAsFileBtn = document.getElementById('saveAsFile');
    const newSaveAsFileBtn = saveAsFileBtn.cloneNode(true);
    saveAsFileBtn.parentNode.replaceChild(newSaveAsFileBtn, saveAsFileBtn);

    newSaveAsFileBtn.addEventListener('click', async () => {
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor) {
            await activeEditor.saveAs();
        }
        document.getElementById('dropdownMenu').style.display = 'none';
        document.getElementById('hamburgerBtn').classList.remove('active');
        document.getElementById('recentFilesMenu').style.display = 'none';
        document.getElementById('folderFilesMenu').style.display = 'none';
    });
}

// Global Mermaid layout direction listeners (work with active editor only)
function setupMermaidLayoutListeners() {
    // Import mode (layoutDirection)
    document.querySelectorAll('input[name="layoutDirection"]').forEach(radio => {
        const newRadio = radio.cloneNode(true);
        radio.parentNode.replaceChild(newRadio, radio);

        newRadio.addEventListener('change', () => {
            // Ignore change events during programmatic sync
            if (window._syncingLayoutDirection) return;

            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                const mermaidText = document.getElementById('mermaidInput').value.trim();
                if (mermaidText) {
                    activeEditor.importFromSidebarTextarea();
                }
            }
        });
    });

    // Apply mode (applyLayoutDirection)
    document.querySelectorAll('input[name="applyLayoutDirection"]').forEach(radio => {
        const newRadio = radio.cloneNode(true);
        radio.parentNode.replaceChild(newRadio, radio);

        newRadio.addEventListener('change', () => {
            // Ignore change events during programmatic sync
            if (window._syncingLayoutDirection) return;

            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                // Just save the layout direction, don't auto-apply
                // User must click "Apply Changes" button manually
                const direction = newRadio.value;
                activeEditor.mermaidLayoutDirection = direction === 'vertical' ? 'TB' : 'LR';
            }
        });
    });
}

function setupMermaidButtons() {
    // Import button
    const importBtn = document.getElementById('importFromSidebar');
    const newImportBtn = importBtn.cloneNode(true);
    importBtn.parentNode.replaceChild(newImportBtn, importBtn);

    newImportBtn.addEventListener('click', () => {
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor) {
            activeEditor.importFromSidebarTextarea();
        }
    });

    // Apply button
    const applyBtn = document.getElementById('applyMermaidChanges');
    const newApplyBtn = applyBtn.cloneNode(true);
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);

    newApplyBtn.addEventListener('click', () => {
        const activeEditor = window.tabManager?.getActiveEditor();
        if (activeEditor) {
            activeEditor.applyMermaidChanges();
        }
    });

    // Auto-import on paste
    const mermaidInput = document.getElementById('mermaidInput');
    const newMermaidInput = mermaidInput.cloneNode(true);
    mermaidInput.parentNode.replaceChild(newMermaidInput, mermaidInput);

    newMermaidInput.addEventListener('paste', () => {
        setTimeout(() => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                activeEditor.importFromSidebarTextarea();
            }
        }, 100);
    });

    // Debounced auto-import on input
    let importTimeout;
    newMermaidInput.addEventListener('input', () => {
        clearTimeout(importTimeout);
        importTimeout = setTimeout(() => {
            const activeEditor = window.tabManager?.getActiveEditor();
            if (activeEditor) {
                activeEditor.importFromSidebarTextarea();
            }
        }, 500);
    });

    // Note: Auto-apply is disabled to prevent unwanted imports when updating output programmatically
    // Users must click "Apply Changes" button manually
}

// Initialize
setupSharedUIEvents();
setupLayerPanel();
setupComparisonToolbar();
setupFileOperations();
setupMermaidLayoutListeners();
setupMermaidButtons();
window.tabManager = new TabManager();
