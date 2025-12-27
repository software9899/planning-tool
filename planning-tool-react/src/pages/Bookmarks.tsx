import { useState, useEffect, useRef } from 'react';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  dateAdded: string;
  category?: string;
}

interface BrowserTab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  windowId?: number;
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [browserTabs, setBrowserTabs] = useState<BrowserTab[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [extensionReady, setExtensionReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showAllWindows, setShowAllWindows] = useState(true);
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBookmarks();
    setupExtensionListener();
    loadBrowserTabs();
  }, []);

  const setupExtensionListener = () => {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'TAB_MANAGER_READY') {
        console.log('✅ Extension is ready');
        setExtensionReady(true);
      }

      if (event.data.type === 'TAB_MANAGER_RESPONSE') {
        handleExtensionResponse(event.data);
      }
    });
  };

  const handleExtensionResponse = (data: any) => {
    console.log('📨 Received response:', data);

    // Clear timeout since we got a response
    if (timeoutRef.current) {
      console.log('🔄 Clearing timeout - response received successfully');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (data.error) {
      console.error('❌ Extension error:', data.error);
      setShowError(true);
      setLoading(false);
      return;
    }

    if (data.action === 'getTabs' && data.data && data.data.tabs) {
      console.log('✅ Got tabs from extension:', data.data.tabs.length);
      console.log('📊 Tabs by window:', groupTabsByWindow(data.data.tabs));
      setBrowserTabs(data.data.tabs);

      // Get current window ID (assuming first tab's window is current)
      if (data.data.tabs.length > 0 && data.data.tabs[0].windowId) {
        setCurrentWindowId(data.data.tabs[0].windowId);
      }

      console.log('✅ Setting showError to false');
      setShowError(false);
      setLoading(false);
    }
  };

  const loadBrowserTabs = () => {
    console.log('🔄 loadBrowserTabs called');

    // Clear any existing timeout first
    if (timeoutRef.current) {
      console.log('🧹 Clearing existing timeout');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setLoading(true);
    setShowError(false);

    // Send request immediately
    console.log('📤 Sending getTabs request...');
    window.postMessage({
      type: 'TAB_MANAGER_REQUEST',
      action: 'getTabs'
    }, '*');

    // Set timeout immediately (not after 100ms delay)
    console.log('⏱️ Setting timeout for 5 seconds');
    timeoutRef.current = setTimeout(() => {
      console.error('⏱️ TIMEOUT FIRED: No response from extension after 5 seconds');
      setShowError(true);
      setLoading(false);
      timeoutRef.current = null;
    }, 5000);
  };

  const loadBookmarks = () => {
    const saved = localStorage.getItem('bookmarks');
    if (saved) {
      setBookmarks(JSON.parse(saved));
    } else {
      setBookmarks([]);
    }
  };

  const filteredBookmarks = bookmarks.filter(b =>
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.category && b.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedBookmarks = filteredBookmarks.reduce((acc, bookmark) => {
    const category = bookmark.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(bookmark);
    return acc;
  }, {} as Record<string, Bookmark[]>);

  const handleOpenBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  const handleAddBookmark = (tab: BrowserTab) => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: tab.title,
      url: tab.url,
      favicon: tab.favIconUrl || '🌐',
      dateAdded: new Date().toISOString(),
      category: 'Uncategorized'
    };

    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
    alert(`✅ เพิ่ม "${tab.title}" ไปยัง Bookmarks แล้ว!`);
  };

  const handleRemoveBookmark = (id: string) => {
    if (!confirm('ต้องการลบ bookmark นี้หรือไม่?')) return;

    const updatedBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(updatedBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
  };

  const isBookmarked = (url: string) => {
    return bookmarks.some(b => b.url === url);
  };

  const groupTabsByWindow = (tabs: BrowserTab[]) => {
    const grouped: Record<number, BrowserTab[]> = {};
    tabs.forEach(tab => {
      const winId = tab.windowId || 0;
      if (!grouped[winId]) {
        grouped[winId] = [];
      }
      grouped[winId].push(tab);
    });
    return grouped;
  };

  const filteredTabs = showAllWindows
    ? browserTabs
    : browserTabs.filter(tab => tab.windowId === currentWindowId);

  const tabsByWindow = groupTabsByWindow(filteredTabs);

  return (
    <div className="tasks-board-container" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', overflowX: 'hidden' }}>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: '0 0 8px 0' }}>
            🔖 Browser Tabs & Bookmarks
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            แสดงแท็บที่เปิดอยู่ใน Browser และ Bookmarks ที่บันทึกไว้
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          maxWidth: '600px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <span style={{
              display: 'block',
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>All Tabs</span>
            <span style={{
              display: 'block',
              fontSize: '28px',
              fontWeight: '700',
              color: '#667eea'
            }}>{browserTabs.length}</span>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <span style={{
              display: 'block',
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>Windows</span>
            <span style={{
              display: 'block',
              fontSize: '28px',
              fontWeight: '700',
              color: '#667eea'
            }}>{Object.keys(groupTabsByWindow(browserTabs)).length}</span>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <span style={{
              display: 'block',
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>Bookmarks</span>
            <span style={{
              display: 'block',
              fontSize: '28px',
              fontWeight: '700',
              color: '#667eea'
            }}>{bookmarks.length}</span>
          </div>
        </div>
      </div>

      {/* Search & Refresh */}
      <div className="actions-bar" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <input
          type="text"
          className="search-box"
          placeholder="🔍 ค้นหา bookmarks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          {browserTabs.length > 0 && (
            <button
              className="add-btn"
              onClick={() => setShowAllWindows(!showAllWindows)}
              style={{
                background: showAllWindows ? '#667eea' : 'white',
                color: showAllWindows ? 'white' : '#667eea',
                border: '2px solid #667eea'
              }}
            >
              {showAllWindows ? '🪟 All Windows' : '🪟 Current Window'}
            </button>
          )}
          <button
            className="add-btn"
            onClick={loadBrowserTabs}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh Tabs'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {showError && (
        <div style={{
          background: '#fee',
          color: '#c00',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #c00'
        }}>
          <strong>⚠️ ไม่สามารถเชื่อมต่อกับ Chrome Extension</strong><br />
          กรุณาตรวจสอบว่าได้ติดตั้ง "Planning Tool - Tab Manager" Extension และเปิดใช้งานแล้ว<br />
          <small>หรือใช้งานหน้านี้โดยไม่ต้องมี Extension (แสดงเฉพาะ Bookmarks ที่บันทึกไว้)</small>
        </div>
      )}

      {/* Browser Tabs Section */}
      {browserTabs.length > 0 && (
        <div style={{ marginBottom: '40px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#1f2937' }}>
            🌐 Browser Tabs ที่เปิดอยู่
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
            แสดง {filteredTabs.length} tabs {showAllWindows ? `จาก ${Object.keys(tabsByWindow).length} windows` : 'จาก current window'}
          </p>

          {/* Group by Window */}
          {Object.entries(tabsByWindow).map(([windowId, tabs]) => (
            <div key={windowId} style={{ marginBottom: '30px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#667eea',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🪟 Window {windowId}
                <span style={{
                  fontSize: '12px',
                  background: '#e0e7ff',
                  color: '#3730a3',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: 600
                }}>
                  {tabs.length} tabs
                </span>
              </h3>
              <div className="tabs-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                {tabs.map(tab => (
              <div key={tab.id} className="tab-card" style={{
                background: 'white',
                padding: '16px 20px',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.2s',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minWidth: 0
              }}>
                <div className="tab-favicon" style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f0f0f0',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {tab.favIconUrl ? (
                    <img
                      src={tab.favIconUrl}
                      alt="favicon"
                      style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '🌐';
                      }}
                    />
                  ) : '🌐'}
                </div>
                <div className="tab-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="tab-title" style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: '#1f2937',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tab.title}
                  </div>
                  <div className="tab-url" style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tab.url}
                  </div>
                </div>
                <div className="tab-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleAddBookmark(tab)}
                    disabled={isBookmarked(tab.url)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isBookmarked(tab.url) ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: isBookmarked(tab.url) ? '#e5e7eb' : 'rgba(102, 126, 234, 0.1)',
                      color: isBookmarked(tab.url) ? '#9ca3af' : '#667eea',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isBookmarked(tab.url) ? '✓ บันทึกแล้ว' : '⭐ Add Bookmark'}
                  </button>
                </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Saved Bookmarks Section */}
      {bookmarks.length > 0 && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '20px', color: '#1f2937' }}>
            ⭐ Saved Bookmarks ({bookmarks.length})
          </h2>
        </div>
      )}

      {Object.keys(groupedBookmarks).length === 0 && bookmarks.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔖</div>
          <h2>ยังไม่มี Bookmarks</h2>
          <p style={{ color: '#6b7280' }}>กด "Add Bookmark" จาก Browser Tabs เพื่อเริ่มบันทึก</p>
        </div>
      ) : (
        <div className="bookmarks-categories">
          {Object.entries(groupedBookmarks).map(([category, items]) => (
            <div key={category} className="bookmark-category">
              <h3 className="category-title">
                {category === 'Development' ? '💻' : category === 'Design' ? '🎨' : '📂'} {category}
                <span className="category-count">{items.length}</span>
              </h3>
              <div className="bookmarks-grid">
                {items.map(bookmark => (
                  <div
                    key={bookmark.id}
                    className="bookmark-card"
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <div onClick={() => handleOpenBookmark(bookmark.url)} style={{ display: 'flex', gap: '15px', alignItems: 'start', flex: 1 }}>
                      <div className="bookmark-favicon">
                        {bookmark.favicon && bookmark.favicon.startsWith('http') ? (
                          <img
                            src={bookmark.favicon}
                            alt="favicon"
                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '🌐';
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '24px' }}>{bookmark.favicon || '🌐'}</span>
                        )}
                      </div>
                      <div className="bookmark-info">
                        <h4>{bookmark.title}</h4>
                        <p className="bookmark-url">{bookmark.url}</p>
                        <span className="bookmark-date">
                          Added {new Date(bookmark.dateAdded).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBookmark(bookmark.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#dc2626',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                      }}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
