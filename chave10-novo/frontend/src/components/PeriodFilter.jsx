import { useState, useRef, useEffect } from 'react';

const PRESET_PERIODS = [
  { id: 'today', label: 'Hoje', icon: '📅' },
  { id: 'yesterday', label: 'Ontem', icon: '📆' },
  { id: 'last7days', label: 'Últimos 7 dias', icon: '📊' },
  { id: 'last30days', label: 'Últimos 30 dias', icon: '📈' },
  { id: 'thisMonth', label: 'Este mês', icon: '🗓️' },
  { id: 'lastMonth', label: 'Mês passado', icon: '🗓️' },
  { id: 'thisYear', label: 'Este ano', icon: '📅' },
  { id: 'custom', label: 'Personalizado', icon: '⚙️' },
];

function calculatePeriod(presetId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (presetId) {
    case 'today':
      return {
        start: today,
        end: today,
      };
    
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: yesterday,
      };
    }
    
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return {
        start,
        end: today,
      };
    }
    
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return {
        start,
        end: today,
      };
    }
    
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start,
        end: today,
      };
    }
    
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start,
        end,
      };
    }
    
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        start,
        end: today,
      };
    }
    
    default:
      return null;
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PeriodFilter({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(value.preset || 'thisMonth');
  const [customStart, setCustomStart] = useState(value.start || formatDate(new Date()));
  const [customEnd, setCustomEnd] = useState(value.end || formatDate(new Date()));
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handlePresetSelect(presetId) {
    if (presetId === 'custom') {
      setSelectedPreset('custom');
      return;
    }

    const period = calculatePeriod(presetId);
    if (period) {
      setSelectedPreset(presetId);
      onChange({
        preset: presetId,
        start: formatDate(period.start),
        end: formatDate(period.end),
      });
      setIsOpen(false);
    }
  }

  function handleCustomApply() {
    if (!customStart || !customEnd) return;
    
    onChange({
      preset: 'custom',
      start: customStart,
      end: customEnd,
    });
    setIsOpen(false);
  }

  function getDisplayLabel() {
    if (selectedPreset === 'custom') {
      return `${formatDateBR(new Date(customStart))} - ${formatDateBR(new Date(customEnd))}`;
    }
    
    const preset = PRESET_PERIODS.find(p => p.id === selectedPreset);
    return preset ? `${preset.icon} ${preset.label}` : 'Selecione o período';
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          background: '#fff',
          border: '1.5px solid var(--gray-300)',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--gray-700)',
          cursor: 'pointer',
          transition: 'all .15s',
          whiteSpace: 'nowrap',
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = 'var(--brand)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.08)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'var(--gray-300)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{getDisplayLabel()}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          background: '#fff',
          border: '1px solid var(--gray-200)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: 320,
          animation: 'slideDown 0.2s ease',
        }}>
          {/* Presets */}
          <div style={{ padding: '12px 14px' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '.6px',
              marginBottom: 8,
            }}>
              Períodos Rápidos
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PRESET_PERIODS.filter(p => p.id !== 'custom').map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    background: selectedPreset === preset.id ? 'var(--brand-light)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: selectedPreset === preset.id ? 600 : 500,
                    color: selectedPreset === preset.id ? 'var(--brand)' : 'var(--gray-700)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                  onMouseOver={e => {
                    if (selectedPreset !== preset.id) {
                      e.currentTarget.style.background = 'var(--gray-50)';
                    }
                  }}
                  onMouseOut={e => {
                    if (selectedPreset !== preset.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: 16 }}>{preset.icon}</span>
                  <span style={{ flex: 1 }}>{preset.label}</span>
                  {selectedPreset === preset.id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Period */}
          <div style={{
            borderTop: '1px solid var(--gray-200)',
            padding: '14px',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '.6px',
              marginBottom: 10,
            }}>
              ⚙️ Período Personalizado
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--gray-600)',
                  marginBottom: 4,
                }}>
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1.5px solid var(--gray-300)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--gray-600)',
                  marginBottom: 4,
                }}>
                  Data Final
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1.5px solid var(--gray-300)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={handleCustomApply}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                Aplicar Período
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
