// src/features/billing/components/CategoryFilter.tsx
import React, { useState, useEffect, useRef } from 'react';
import './CategoryFilter.css';

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  // mapping from category id to product count
  counts: Record<string, number>;
  // currently selected category id
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CategoryFilter({
  categories,
  counts,
  activeId,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  // Update sliding indicator whenever activeId changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-id="${activeId}"]`) as HTMLDivElement;
    if (activeBtn) {
      const { offsetLeft, offsetWidth } = activeBtn;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeId, categories]);

  return (
    <div className="category-filter" ref={containerRef}>
      <div className="indicator" style={indicatorStyle} />
      {categories.map(cat => (
        <div
          key={cat.id}
          className={`pill ${cat.id === activeId ? 'active' : ''}`}
          data-id={cat.id}
          onClick={() => onSelect(cat.id)}
        >
          {cat.name} ({counts[cat.id] ?? 0})
        </div>
      ))}
    </div>
  );
}
