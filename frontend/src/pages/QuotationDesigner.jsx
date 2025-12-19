
import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, message, Divider, Input, Select, Upload } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PrinterOutlined,
  FontSizeOutlined,
  FileTextOutlined,
  TableOutlined,
  DollarOutlined,
  MinusOutlined,
  EditOutlined,
  PictureOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './QuotationDesigner.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Resizable Image Component
const ResizableImage = ({ item, onResize, onDragMove, isSelected, onClick }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  const handleResizeStart = (e, corner) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ 
      width: item.width || 200, 
      height: item.height || 100 
    });
  };

  const handleImageDragStart = (e) => {
    if (isResizing) return;
    e.stopPropagation();
    setIsDraggingImg(true);
    setDragStart({ 
      x: e.clientX - (item.imageX || 0), 
      y: e.clientY - (item.imageY || 0) 
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const deltaX = e.clientX - startPos.x;
        const deltaY = e.clientY - startPos.y;
        
        const newWidth = Math.max(50, Math.min(700, startSize.width + deltaX));
        const newHeight = Math.max(50, Math.min(500, startSize.height + deltaY));
        
        onResize(newWidth, newHeight);
      } else if (isDraggingImg) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        onDragMove(newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsDraggingImg(false);
    };

    if (isResizing || isDraggingImg) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isDraggingImg, startPos, startSize, dragStart, onResize, onDragMove]);

  if (!item.value) {
    return (
      <div
        style={{
          width: `${item.width}px`,
          height: `${item.height || 100}px`,
          border: '2px dashed #d9d9d9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          borderRadius: '4px',
          margin: '0 auto',
        }}
      >
        <PictureOutlined style={{ fontSize: '32px' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: isDraggingImg ? 'grabbing' : 'grab',
      }}
      onClick={onClick}
    >
      <img
        ref={imageRef}
        src={item.value}
        alt="Uploaded"
        style={{
          width: `${item.width}px`,
          height: `${item.height}px`,
          objectFit: item.objectFit || 'contain',
          display: 'block',
          userSelect: 'none',
          pointerEvents: isResizing ? 'none' : 'auto',
        }}
        onMouseDown={handleImageDragStart}
        draggable={false}
      />
      
      {isSelected && (
        <>
          {/* Resize Handle - Bottom Right */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'br')}
            style={{
              position: 'absolute',
              bottom: '-5px',
              right: '-5px',
              width: '12px',
              height: '12px',
              backgroundColor: '#1890ff',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'nwse-resize',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
          
          {/* Resize Handle - Bottom Left */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'bl')}
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: '-5px',
              width: '12px',
              height: '12px',
              backgroundColor: '#1890ff',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'nesw-resize',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
          
          {/* Visual Border when selected */}
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              right: '-2px',
              bottom: '-2px',
              border: '2px solid #1890ff',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </div>
  );
};

// Sortable Item Component
const SortableItem = ({ id, children, isSelected, onClick, isImage }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled: isImage && isSelected, // Disable sortable when image is selected
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // For images, don't apply drag listeners to allow internal dragging
  const dragProps = isImage ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={`canvas-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Draggable Sidebar Item Component
const DraggableSidebarItem = ({ id, field }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `sidebar-${id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = () => {
    switch (field.type) {
      case 'header':
        return <FontSizeOutlined style={{ fontSize: '20px' }} />;
      case 'field':
        return <FileTextOutlined style={{ fontSize: '20px' }} />;
      case 'table':
        return <TableOutlined style={{ fontSize: '20px' }} />;
      case 'total':
        return <DollarOutlined style={{ fontSize: '20px' }} />;
      case 'divider':
        return <MinusOutlined style={{ fontSize: '20px' }} />;
      case 'text':
        return <EditOutlined style={{ fontSize: '20px' }} />;
      case 'image':
        return <PictureOutlined style={{ fontSize: '20px' }} />;
      default:
        return <FileTextOutlined style={{ fontSize: '20px' }} />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`sidebar-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="item-icon">{getIcon()}</div>
      <div className="item-details">
        <div className="item-label">{field.label}</div>
        <div className="item-category">{field.category}</div>
      </div>
    </div>
  );
};

const QuotationDesigner = ({ quotationData, onBack }) => {
  const [availableFields, setAvailableFields] = useState([]);
  const [canvasItems, setCanvasItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const API_BASE = 'http://127.0.0.1:8000';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (quotationData) {
      initializeFields();
      loadSavedLayout();
    }
  }, [quotationData]);

  const initializeFields = () => {
    const fields = [];
    
    Object.keys(quotationData.quotation).forEach((key) => {
      if (key !== 'id') {
        fields.push({
          id: `quotation-${key}`,
          type: 'field',
          fieldKey: key,
          label: formatLabel(key),
          value: quotationData.quotation[key] || '-',
          category: 'quotation',
        });
      }
    });

    fields.push(
      {
        id: 'header-title',
        type: 'header',
        label: 'Header Title',
        value: 'QUOTATION',
        category: 'special',
      },
      {
        id: 'items-table',
        type: 'table',
        label: 'Items Table',
        category: 'special',
      },
      {
        id: 'total-cost',
        type: 'total',
        label: 'Total Cost',
        category: 'special',
      },
      {
        id: 'divider',
        type: 'divider',
        label: 'Divider Line',
        category: 'special',
      },
      {
        id: 'text-block',
        type: 'text',
        label: 'Custom Text Block',
        value: 'Enter your custom text here...',
        category: 'special',
      },
      {
        id: 'image-block',
        type: 'image',
        label: 'Image / Logo',
        value: null,
        category: 'special',
      }
    );

    setAvailableFields(fields);
  };

  const loadSavedLayout = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/user-preferences/global-quotation-template`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.template && data.template.length > 0) {
          setCanvasItems(data.template);
        }
      }
    } catch (error) {
      console.error('Failed to load saved template:', error);
    }
  };

  const saveLayout = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/user-preferences/global-quotation-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ template: canvasItems }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        message.success('Global template saved! This template will be applied to all quotations.');
      } else {
        message.error('Failed to save template');
      }
    } catch (error) {
      message.error('Failed to save template');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (key) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const calculateTotal = () => {
    if (!quotationData.items) return 0;
    return quotationData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.total_cost) || 0);
    }, 0);
  };

  const handleImageUpload = (canvasId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateItemProperty(canvasId, 'value', e.target.result);
      message.success('Image uploaded successfully');
    };
    reader.onerror = () => {
      message.error('Failed to upload image');
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleImageResize = (canvasId, newWidth, newHeight) => {
    setCanvasItems(
      canvasItems.map((item) =>
        item.canvasId === canvasId 
          ? { ...item, width: newWidth, height: newHeight } 
          : item
      )
    );
    if (selectedItem?.canvasId === canvasId) {
      setSelectedItem({ ...selectedItem, width: newWidth, height: newHeight });
    }
  };

  const handleImageDragMove = (canvasId, x, y) => {
    setCanvasItems(
      canvasItems.map((item) =>
        item.canvasId === canvasId 
          ? { ...item, imageX: x, imageY: y } 
          : item
      )
    );
    if (selectedItem?.canvasId === canvasId) {
      setSelectedItem({ ...selectedItem, imageX: x, imageY: y });
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (String(activeId).startsWith('sidebar-')) {
      const fieldId = String(activeId).replace('sidebar-', '');
      const field = availableFields.find(f => f.id === fieldId);
      
      if (field) {
        const newItem = {
          ...field,
          canvasId: `canvas-${Date.now()}-${Math.random()}`,
          fontSize: field.type === 'header' ? 24 : 14,
          fontWeight: field.type === 'header' ? 'bold' : 'normal',
          textAlign: field.type === 'image' ? 'center' : 'left',
          color: '#000000',
          width: field.type === 'image' ? 200 : 400,
          height: field.type === 'image' ? 100 : undefined,
          objectFit: field.type === 'image' ? 'contain' : undefined,
          imageX: 0,
          imageY: 0,
        };

        if (String(overId).startsWith('canvas-')) {
          const overIndex = canvasItems.findIndex(item => item.canvasId === overId);
          const newCanvasItems = [...canvasItems];
          newCanvasItems.splice(overIndex >= 0 ? overIndex : canvasItems.length, 0, newItem);
          setCanvasItems(newCanvasItems);
        } else {
          setCanvasItems([...canvasItems, newItem]);
        }
      }
      return;
    }

    if (String(activeId).startsWith('canvas-') && String(overId).startsWith('canvas-')) {
      const oldIndex = canvasItems.findIndex(item => item.canvasId === activeId);
      const newIndex = canvasItems.findIndex(item => item.canvasId === overId);
      
      if (oldIndex !== newIndex) {
        setCanvasItems(arrayMove(canvasItems, oldIndex, newIndex));
      }
    }
  };

  const removeFromCanvas = (canvasId) => {
    setCanvasItems(canvasItems.filter((item) => item.canvasId !== canvasId));
    if (selectedItem?.canvasId === canvasId) {
      setSelectedItem(null);
    }
  };

  const updateItemProperty = (canvasId, property, value) => {
    setCanvasItems(
      canvasItems.map((item) =>
        item.canvasId === canvasId ? { ...item, [property]: value } : item
      )
    );
    if (selectedItem?.canvasId === canvasId) {
      setSelectedItem({ ...selectedItem, [property]: value });
    }
  };

  const renderCanvasItem = (item) => {
    switch (item.type) {
      case 'header':
        return (
          <div
            style={{
              fontSize: `${item.fontSize}px`,
              fontWeight: item.fontWeight,
              textAlign: item.textAlign,
              color: item.color,
            }}
          >
            {item.value}
          </div>
        );

      case 'field':
        return (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: `${item.fontSize}px`, color: item.color }}>
              {item.label}:
            </strong>
            <span style={{ fontSize: `${item.fontSize}px`, color: item.color }}>
              {item.value}
            </span>
          </div>
        );

      case 'table':
        return (
          <div style={{ width: '100%', overflow: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: `${item.fontSize || 12}px`,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Sl.No</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Description</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Qty</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Unit Rate</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {quotationData.items.map((rowItem, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {rowItem.sample_activity || rowItem.description || '-'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {rowItem.qty || '-'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                      ₹ {Number(rowItem.unit_rate || 0).toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                      ₹ {Number(rowItem.total_cost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'total':
        return (
          <div
            style={{
              fontSize: `${item.fontSize}px`,
              fontWeight: item.fontWeight,
              textAlign: item.textAlign,
              color: item.color,
              padding: '12px',
              border: '2px solid #1890ff',
              borderRadius: '8px',
              backgroundColor: '#e6f7ff',
            }}
          >
            <strong>Total Cost:</strong> ₹ {calculateTotal().toFixed(2)}
          </div>
        );

      case 'divider':
        return <Divider style={{ margin: '8px 0' }} />;

      case 'text':
        return (
          <div
            style={{
              fontSize: `${item.fontSize}px`,
              fontWeight: item.fontWeight,
              textAlign: item.textAlign,
              color: item.color,
              whiteSpace: 'pre-wrap',
            }}
          >
            {item.value}
          </div>
        );

      case 'image':
        return (
          <div style={{ 
            textAlign: item.textAlign || 'center',
            display: 'flex',
            justifyContent: item.textAlign === 'left' ? 'flex-start' : 
                           item.textAlign === 'right' ? 'flex-end' : 'center'
          }}>
            <ResizableImage
              item={item}
              isSelected={selectedItem?.canvasId === item.canvasId}
              onResize={(w, h) => handleImageResize(item.canvasId, w, h)}
              onDragMove={(x, y) => handleImageDragMove(item.canvasId, x, y)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(item);
              }}
            />
          </div>
        );

      default:
        return <div>{item.label}</div>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="quotation-designer">
      <div className="designer-header">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} size="large">
          Back
        </Button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Global Quotation Template Designer
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Designing for: {quotationData?.quotation?.customer_name || `Quotation #${quotationData?.quotation?.id}`}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button icon={<PrinterOutlined />} onClick={handlePrint} size="large">
            Print
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={saveLayout}
            loading={loading}
            size="large"
          >
            Save Global Template
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="designer-content">
          <div className="sidebar">
            <div className="sidebar-header">
              <Title level={5}>Available Elements</Title>
              <Text type="secondary">Drag items to the canvas</Text>
            </div>

            <SortableContext
              items={availableFields.map(f => `sidebar-${f.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="sidebar-content">
                {availableFields.map((field) => (
                  <DraggableSidebarItem
                    key={field.id}
                    id={field.id}
                    field={field}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          <div className="canvas-container">
            <div className="canvas-wrapper">
              <SortableContext
                items={canvasItems.map(item => item.canvasId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="a4-canvas" id="canvas-drop-zone">
                  {canvasItems.length === 0 && (
                    <div className="canvas-empty">
                      <Text type="secondary" style={{ fontSize: '16px' }}>
                        Drag elements from the left sidebar to start designing
                      </Text>
                    </div>
                  )}

                  {canvasItems.map((item) => (
                    <SortableItem
                      key={item.canvasId}
                      id={item.canvasId}
                      isSelected={selectedItem?.canvasId === item.canvasId}
                      isImage={item.type === 'image'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                    >
                      <div style={{ 
                        width: item.type === 'table' ? '100%' : 
                               item.type === 'image' ? 'auto' : `${item.width}px`,
                        maxWidth: '100%'
                      }}>
                        {renderCanvasItem(item)}
                      </div>
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCanvas(item.canvasId);
                        }}
                      >
                        ✕
                      </button>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>

          <div className="properties-panel">
            <div className="sidebar-header">
              <Title level={5}>Properties</Title>
              <Text type="secondary">
                {selectedItem ? 'Customize selected element' : 'Select an element'}
              </Text>
            </div>

            {selectedItem ? (
              <div className="properties-content">
                {selectedItem.type === 'image' && (
                  <div className="property-group">
                    <label>Upload Image</label>
                    <Upload
                      beforeUpload={(file) => handleImageUpload(selectedItem.canvasId, file)}
                      showUploadList={false}
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />} block>
                        {selectedItem.value ? 'Change Image' : 'Upload Image'}
                      </Button>
                    </Upload>
                    {selectedItem.value && (
                      <>
                        <Button
                          danger
                          block
                          icon={<DeleteOutlined />}
                          onClick={() => updateItemProperty(selectedItem.canvasId, 'value', null)}
                          style={{ marginTop: '8px' }}
                        >
                          Remove Image
                        </Button>
                        <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                          💡 Click and drag the image to resize it. Drag from the corners to adjust size.
                        </Text>
                      </>
                    )}
                  </div>
                )}

                {selectedItem.type !== 'divider' && selectedItem.type !== 'image' && (
                  <div className="property-group">
                    <label>Font Size (px)</label>
                    <Input
                      type="number"
                      value={selectedItem.fontSize}
                      onChange={(e) =>
                        updateItemProperty(selectedItem.canvasId, 'fontSize', e.target.value)
                      }
                      min={8}
                      max={72}
                    />
                  </div>
                )}

                {selectedItem.type !== 'divider' && selectedItem.type !== 'image' && (
                  <div className="property-group">
                    <label>Font Weight</label>
                    <Select
                      value={selectedItem.fontWeight}
                      onChange={(value) =>
                        updateItemProperty(selectedItem.canvasId, 'fontWeight', value)
                      }
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="normal">Normal</Select.Option>
                      <Select.Option value="bold">Bold</Select.Option>
                      <Select.Option value="600">Semi-Bold</Select.Option>
                      <Select.Option value="300">Light</Select.Option>
                    </Select>
                  </div>
                )}

                {selectedItem.type !== 'divider' && (
                  <div className="property-group">
                    <label>{selectedItem.type === 'image' ? 'Position' : 'Align'}</label>
                    <Select
                      value={selectedItem.textAlign}
                      onChange={(value) =>
                        updateItemProperty(selectedItem.canvasId, 'textAlign', value)
                      }
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="left">Left</Select.Option>
                      <Select.Option value="center">Center</Select.Option>
                      <Select.Option value="right">Right</Select.Option>
                    </Select>
                    {selectedItem.type === 'image' && (
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Image position on the canvas
                      </Text>
                    )}
                  </div>
                )}

                {selectedItem.type !== 'divider' && selectedItem.type !== 'image' && (
                  <div className="property-group">
                    <label>Text Color</label>
                    <Input
                      type="color"
                      value={selectedItem.color}
                      onChange={(e) =>
                        updateItemProperty(selectedItem.canvasId, 'color', e.target.value)
                      }
                    />
                  </div>
                )}

                {selectedItem.type !== 'table' && selectedItem.type !== 'image' && (
                  <div className="property-group">
                    <label>Width (px)</label>
                    <Input
                      type="number"
                      value={selectedItem.width}
                      onChange={(e) =>
                        updateItemProperty(selectedItem.canvasId, 'width', e.target.value)
                      }
                      min={50}
                      max={700}
                    />
                  </div>
                )}

                {selectedItem.type === 'image' && (
                  <>
                    <div className="property-group">
                      <label>Width (px)</label>
                      <Input
                        type="number"
                        value={selectedItem.width || 200}
                        onChange={(e) =>
                          updateItemProperty(selectedItem.canvasId, 'width', e.target.value)
                        }
                        min={50}
                        max={700}
                      />
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Or drag corners on image to resize
                      </Text>
                    </div>

                    <div className="property-group">
                      <label>Height (px)</label>
                      <Input
                        type="number"
                        value={selectedItem.height || 100}
                        onChange={(e) =>
                          updateItemProperty(selectedItem.canvasId, 'height', e.target.value)
                        }
                        min={50}
                        max={500}
                      />
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Or drag corners on image to resize
                      </Text>
                    </div>

                    <div className="property-group">
                      <label>Image Fit</label>
                      <Select
                        value={selectedItem.objectFit || 'contain'}
                        onChange={(value) =>
                          updateItemProperty(selectedItem.canvasId, 'objectFit', value)
                        }
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="contain">Contain (fit inside)</Select.Option>
                        <Select.Option value="cover">Cover (fill area)</Select.Option>
                        <Select.Option value="fill">Fill (stretch)</Select.Option>
                        <Select.Option value="scale-down">Scale Down</Select.Option>
                      </Select>
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        How image fills the space
                      </Text>
                    </div>
                  </>
                )}

                {(selectedItem.type === 'text' || selectedItem.type === 'header') && (
                  <div className="property-group">
                    <label>Content</label>
                    <TextArea
                      value={selectedItem.value}
                      onChange={(e) =>
                        updateItemProperty(selectedItem.canvasId, 'value', e.target.value)
                      }
                      rows={4}
                    />
                  </div>
                )}

                <Divider />
                <Button
                  danger
                  block
                  icon={<DeleteOutlined />}
                  onClick={() => removeFromCanvas(selectedItem.canvasId)}
                >
                  Remove from Canvas
                </Button>
              </div>
            ) : (
              <div className="properties-empty">
                <Text type="secondary">
                  Click on an element in the canvas to edit its properties
                </Text>
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
};

export default QuotationDesigner;
