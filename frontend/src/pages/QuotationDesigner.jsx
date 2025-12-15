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

// Sortable Item Component
const SortableItem = ({ id, children, isSelected, onClick }) => {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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

  // Get icon based on type
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
  const fileInputRef = useRef(null);

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

  // Initialize available fields from quotation data
  const initializeFields = () => {
    const fields = [];
    
    // Add quotation fields dynamically
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

    // Add special elements
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

  // Load saved layout from server
  const loadSavedLayout = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/user-preferences/quotation-layout/${quotationData.quotation.id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.layout && data.layout.length > 0) {
          setCanvasItems(data.layout);
        }
      }
    } catch (error) {
      console.error('Failed to load saved layout:', error);
    }
  };

  // Save layout to server
  const saveLayout = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/user-preferences/quotation-layout/${quotationData.quotation.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ layout: canvasItems }),
        }
      );

      if (response.ok) {
        message.success('Layout saved successfully!');
      } else {
        message.error('Failed to save layout');
      }
    } catch (error) {
      message.error('Failed to save layout');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Format label
  const formatLabel = (key) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate total cost
  const calculateTotal = () => {
    if (!quotationData.items) return 0;
    return quotationData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.total_cost) || 0);
    }, 0);
  };

  // Handle image upload
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
    return false; // Prevent automatic upload
  };

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Check if dragging from sidebar to canvas
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
        };

        // If dropping over an existing item, insert at that position
        if (String(overId).startsWith('canvas-')) {
          const overIndex = canvasItems.findIndex(item => item.canvasId === overId);
          const newCanvasItems = [...canvasItems];
          newCanvasItems.splice(overIndex >= 0 ? overIndex : canvasItems.length, 0, newItem);
          setCanvasItems(newCanvasItems);
        } else {
          // Add to end if dropping on canvas container
          setCanvasItems([...canvasItems, newItem]);
        }
      }
      return;
    }

    // Reordering within canvas
    if (String(activeId).startsWith('canvas-') && String(overId).startsWith('canvas-')) {
      const oldIndex = canvasItems.findIndex(item => item.canvasId === activeId);
      const newIndex = canvasItems.findIndex(item => item.canvasId === overId);
      
      if (oldIndex !== newIndex) {
        setCanvasItems(arrayMove(canvasItems, oldIndex, newIndex));
      }
    }
  };

  // Remove item from canvas
  const removeFromCanvas = (canvasId) => {
    setCanvasItems(canvasItems.filter((item) => item.canvasId !== canvasId));
    if (selectedItem?.canvasId === canvasId) {
      setSelectedItem(null);
    }
  };

  // Update item properties
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

  // Render canvas item content
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
          <div style={{ textAlign: item.textAlign || 'center' }}>
            {item.value ? (
              <img
                src={item.value}
                alt="Uploaded"
                style={{
                  width: `${item.width}px`,
                  height: item.height ? `${item.height}px` : 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
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
                }}
              >
                <PictureOutlined style={{ fontSize: '32px' }} />
              </div>
            )}
          </div>
        );

      default:
        return <div>{item.label}</div>;
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="quotation-designer">
      {/* Header */}
      <div className="designer-header">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} size="large">
          Back
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          Quotation Designer - ID: {quotationData?.quotation?.id}
        </Title>
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
            Save Layout
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
          {/* Left Sidebar - Available Fields */}
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

          {/* Center - A4 Canvas */}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                    >
                      <div style={{ width: item.type === 'table' ? '100%' : `${item.width}px` }}>
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

          {/* Right Sidebar - Properties */}
          <div className="properties-panel">
            <div className="sidebar-header">
              <Title level={5}>Properties</Title>
              <Text type="secondary">
                {selectedItem ? 'Customize selected element' : 'Select an element'}
              </Text>
            </div>

            {selectedItem ? (
              <div className="properties-content">
                {/* Image Upload for Image type */}
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
                      <Button
                        danger
                        block
                        icon={<DeleteOutlined />}
                        onClick={() => updateItemProperty(selectedItem.canvasId, 'value', null)}
                        style={{ marginTop: '8px' }}
                      >
                        Remove Image
                      </Button>
                    )}
                  </div>
                )}

                {/* Font Size (not for divider) */}
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

                {/* Font Weight (not for divider and image) */}
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

                {/* Text Align */}
                {selectedItem.type !== 'divider' && (
                  <div className="property-group">
                    <label>Align</label>
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
                  </div>
                )}

                {/* Text Color (not for divider and image) */}
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

                {/* Width */}
                {selectedItem.type !== 'table' && (
                  <div className="property-group">
                    <label>Width (px)</label>
                    <Input
                      type="number"
                      value={selectedItem.width}
                      onChange={(e) =>
                        updateItemProperty(selectedItem.canvasId, 'width', e.target.value)
                      }
                      min={100}
                      max={700}
                    />
                  </div>
                )}

                {/* Height (for images) */}
                {selectedItem.type === 'image' && (
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
                  </div>
                )}

                {/* Content (for text and header) */}
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