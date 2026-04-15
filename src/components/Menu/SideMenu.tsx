import { useState, useRef, useCallback } from 'react';
import type { MenuItem } from '../../config/configTypes';

interface SideMenuProps {
  items: MenuItem[];
  side: 'L' | 'R';
  onMenuAction: (item: MenuItem, index: number) => void;
}

const CLOSE_DELAY_MS = 300;

export function SideMenu({ items, side, onMenuAction }: SideMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredItems = items.filter((item) => item.side === side);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const handleMouseLeave = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  if (filteredItems.length === 0) return null;

  const isLeft = side === 'L';
  const menuId = isLeft ? 'myMenuL' : 'myMenuR';
  const dropdownId = `${menuId}-dropdown`;

  return (
    <div
      id={menuId}
      className="hamburger-menu relative z-[10]"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hamburger trigger */}
      <button
        className="hamburger-trigger"
        aria-label={isLeft ? 'Left menu' : 'Right menu'}
        aria-expanded={open}
        aria-controls={dropdownId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid hsl(210deg 10% 30%)',
          background: 'hsl(210deg 15% 18%)',
          color: '#e2e8f0',
          cursor: 'pointer',
          fontSize: 18,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect y="3" width="20" height="2" rx="1" fill="currentColor" />
          <rect y="9" width="20" height="2" rx="1" fill="currentColor" />
          <rect y="15" width="20" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <div
        id={dropdownId}
        role="menu"
        className="hamburger-dropdown"
        style={{
          position: 'absolute',
          top: '100%',
          marginTop: 4,
          ...(isLeft ? { left: 0 } : { right: 0 }),
          minWidth: 180,
          borderRadius: 10,
          border: '1px solid hsl(210deg 10% 25%)',
          background: 'hsl(210deg 15% 14%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          padding: '6px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.2s, transform 0.2s',
        }}
      >
        {filteredItems.map((item, i) => {
          const globalIndex = items.indexOf(item);
          const iconClass =
            item.type === 'core'
              ? 'menu-core'
              : item.type === 'config'
                ? 'menu-config'
                : 'menu-user';

          return (
            <a
              key={`${side}-${i}`}
              href="#"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              className={`menu-link ${iconClass}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                margin: '0 6px',
                borderRadius: 6,
                borderLeft: `3px solid #${item.color}`,
                textDecoration: 'none',
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(13px, 1.1vw, 18px)',
                fontWeight: 400,
                color: '#e2e8f0',
                transition: 'background 0.12s',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'hsl(210deg 15% 22%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'hsl(210deg 15% 22%)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                onMenuAction(item, globalIndex);
              }}
            >
              {item.text}
            </a>
          );
        })}
      </div>
    </div>
  );
}
