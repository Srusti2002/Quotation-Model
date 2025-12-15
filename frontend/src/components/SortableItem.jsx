import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SortableItem = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div 
        style={{ 
          cursor: 'move',
          padding: '8px',
          border: '1px solid #f0f0f0',
          marginBottom: '8px',
          borderRadius: '4px',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        {...listeners}
      >
        <span style={{ cursor: 'move' }}>☰</span>
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
