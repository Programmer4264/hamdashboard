import type { MenuItem } from '../../config/configTypes';

interface SideMenuProps {
  items: MenuItem[];
  side: 'L' | 'R';
  onMenuAction: (item: MenuItem, index: number) => void;
}

export function SideMenu({ items, side, onMenuAction }: SideMenuProps) {
  const filteredItems = items.filter((item) => item.side === side);

  if (filteredItems.length === 0) return null;

  const isLeft = side === 'L';
  const menuId = isLeft ? 'myMenuL' : 'myMenuR';

  return (
    <div
      id={menuId}
      className="hamburger-menu fixed z-[10]"
      style={{
        top: 6,
        ...(isLeft ? { left: 6 } : { right: 6 }),
      }}
    >
      {/* Hamburger trigger */}
      <button
        className="hamburger-trigger"
        aria-label={isLeft ? 'Left menu' : 'Right menu'}
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
          ...(isLeft ? {} : { marginLeft: 'auto' }),
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect y="3" width="20" height="2" rx="1" fill="currentColor" />
          <rect y="9" width="20" height="2" rx="1" fill="currentColor" />
          <rect y="15" width="20" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <div
        className="hamburger-dropdown"
        style={{
          position: 'absolute',
          top: 40,
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
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateY(-8px)',
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
