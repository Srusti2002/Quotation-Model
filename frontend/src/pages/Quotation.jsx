import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  message,
  Typography,
  Divider,
  Form,
  Input,
  Space,
  Popconfirm,
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  LayoutOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuotationDesigner from './QuotationDesigner';

const { Title, Text } = Typography;

// Sortable card component
const SortableCard = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const Quotation = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuotationData, setSelectedQuotationData] = useState(null);
  const [editForm] = Form.useForm();
  const [editingItems, setEditingItems] = useState([]);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Dynamic columns state
  const [quotationColumns, setQuotationColumns] = useState([]);
  const [itemsColumns, setItemsColumns] = useState([]);

  // Designer mode state
  const [designerMode, setDesignerMode] = useState(false);
  const [designerData, setDesignerData] = useState(null);

  const API_BASE = 'http://127.0.0.1:8000';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save column order to backend
  const saveColumnOrderToServer = async (columnOrder) => {
    try {
      const response = await fetch(`${API_BASE}/user-preferences/column-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ column_order: columnOrder }),
      });
      
      if (response.ok) {
        message.success('Column order saved permanently');
      } else {
        message.error('Failed to save column order');
      }
    } catch (error) {
      console.error('Failed to save column order:', error);
      message.error('Failed to save column order');
    }
  };

  // Fetch columns dynamically
  const fetchColumns = async () => {
    try {
      const [quotationRes, itemsRes, serverOrderRes] = await Promise.all([
        fetch(`${API_BASE}/quotation/columns`),
        fetch(`${API_BASE}/items/columns`),
        fetch(`${API_BASE}/user-preferences/column-order`)
      ]);

      const quotationData = await quotationRes.json();
      const itemsData = await itemsRes.json();
      const serverOrderData = await serverOrderRes.json();

      const filteredQuotationCols = quotationData.columns.filter(
        col => col.column_name !== 'id'
      );
      const filteredItemsCols = itemsData.columns.filter(
        col => col.column_name !== 'id' && col.column_name !== 'quotation_id'
      );

      setItemsColumns(filteredItemsCols);

      // Apply server order or default order
      let orderedColumns = filteredQuotationCols;
      if (serverOrderData.column_order && serverOrderData.column_order.length > 0) {
        orderedColumns = serverOrderData.column_order.map(colName => 
          filteredQuotationCols.find(col => col.column_name === colName)
        ).filter(Boolean);
        
        // Add any missing columns to the end
        const missingColumns = filteredQuotationCols.filter(col => 
          !serverOrderData.column_order.includes(col.column_name)
        );
        orderedColumns = [...orderedColumns, ...missingColumns];
      }

      setQuotationColumns(orderedColumns);
    } catch (error) {
      console.error('Error fetching columns:', error);
      message.error('Failed to load column structure');
    }
  };

  // Fetch all quotations with items
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotation-with-items`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      message.error('Failed to load quotations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchColumns();
      await fetchData();
    };
    initializeData();
  }, []);

  // Helper function to format column names
  const formatLabel = (columnName) => {
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = quotationColumns.findIndex(col => col.column_name === active.id);
      const newIndex = quotationColumns.findIndex(col => col.column_name === over.id);
      
      const newOrder = arrayMove(quotationColumns, oldIndex, newIndex);
      setQuotationColumns(newOrder);
      
      const columnNames = newOrder.map(col => col.column_name);
      saveColumnOrderToServer(columnNames);
    }
  };

  // Open view modal
  const handleView = (record) => {
    setSelectedQuotationData(record);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedQuotationData(null);
  };

  // Open designer
  const handleDesign = (record) => {
    setDesignerData(record);
    setDesignerMode(true);
  };

  const handleCloseDesigner = () => {
    setDesignerMode(false);
    setDesignerData(null);
  };

  // Open edit modal
  const handleEdit = (record) => {
    setSelectedQuotationData(record);
    setEditingItems(record.items.map(item => ({ ...item })));
    setItemsToDelete([]);
    
    // Set form values dynamically
    const formValues = {};
    quotationColumns.forEach(col => {
      formValues[col.column_name] = record.quotation[col.column_name] || '';
    });
    editForm.setFieldsValue(formValues);
    
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedQuotationData(null);
    setEditingItems([]);
    setItemsToDelete([]);
    editForm.resetFields();
  };

  // Handle item field change
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editingItems];
    updatedItems[index][field] = value;
    
    // Auto-calculate total_cost if qty or unit_rate changes
    if (field === 'qty' || field === 'unit_rate') {
      const qty = parseFloat(updatedItems[index].qty) || 0;
      const unitRate = parseFloat(updatedItems[index].unit_rate) || 0;
      updatedItems[index].total_cost = qty * unitRate;
    }
    
    setEditingItems(updatedItems);
  };

  // Add new item
  const handleAddItem = () => {
    const newItem = {};
    itemsColumns.forEach(col => {
      newItem[col.column_name] = '';
    });
    setEditingItems([...editingItems, newItem]);
  };

  // Delete item
  const handleDeleteItem = (index) => {
    const item = editingItems[index];
    
    // If item has an id, add it to delete list
    if (item.id) {
      setItemsToDelete([...itemsToDelete, item.id]);
    }
    
    // Remove from editing items
    const updatedItems = editingItems.filter((_, i) => i !== index);
    setEditingItems(updatedItems);
  };

  // Submit edit
  const handleSubmitEdit = async () => {
    try {
      setSubmitting(true);
      
      // Get quotation data from form
      const quotationData = editForm.getFieldsValue();
      
      // Prepare items data
      const itemsData = editingItems.map(item => {
        const itemPayload = {};
        
        itemsColumns.forEach(col => {
          const value = item[col.column_name];
          if (col.data_type.includes('integer') || col.data_type.includes('numeric')) {
            itemPayload[col.column_name] = value ? parseInt(value) : null;
          } else {
            itemPayload[col.column_name] = value || null;
          }
        });
        
        // Include id if it exists (for updates)
        if (item.id) {
          itemPayload.id = item.id;
        }
        
        return itemPayload;
      });

      const payload = {
        quotation_data: quotationData,
        items_data: itemsData,
        items_to_delete: itemsToDelete,
      };

      const response = await fetch(
        `${API_BASE}/quotation-with-items/${selectedQuotationData.quotation.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update quotation');
      }

      message.success('Quotation updated successfully');
      handleCloseEditModal();
      fetchData(); // Refresh data
    } catch (error) {
      message.error('Failed to update quotation');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total cost
  const calculateTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.total_cost) || 0);
    }, 0);
  };

  // If in designer mode, show designer
  if (designerMode) {
    return (
      <QuotationDesigner
        quotationData={designerData}
        onBack={handleCloseDesigner}
      />
    );
  }

  // Table columns
  const columns = [
    {
      title: 'Sl.No',
      key: 'slno',
      width: 80,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Customer Name',
      key: 'customer_name',
      width: 200,
      render: (_, record) => record.quotation.customer_name || '-',
    },
    {
      title: 'Department',
      key: 'department',
      width: 200,
      render: (_, record) => record.quotation.departments || '-',
    },
    {
      title: 'Action',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            size="small"
          >
            View
          </Button>
          <Button
            type="default"
            icon={<LayoutOutlined />}
            onClick={() => handleDesign(record)}
            size="small"
            style={{ 
              background: '#52c41a', 
              borderColor: '#52c41a',
              color: 'white'
            }}
          >
            Design
          </Button>
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      padding: 32, 
      background: '#f5f5f5', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
          Quotations
        </h2>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey={(record) => record.quotation.id}
          loading={loading}
          scroll={{ y: 'calc(100vh - 240px)' }}
          pagination={{ pageSize: 20 }}
          bordered
          style={{ flex: 1 }}
        />
      </div>

      {/* View Modal - A4 Size */}
      <Modal
        title={null}
        open={viewModalOpen}
        onCancel={handleCloseViewModal}
        footer={null}
        width={900}
        centered
        styles={{ body: { padding: 0, maxHeight: '90vh', overflow: 'auto', background: '#eef2f7' } }}
      >
        {selectedQuotationData && (
          <div className="a4-wrapper">
            <div className="a4-page">
              {/* Header */}
              <div className="a4-head">
                <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
                  QUOTATION
                </Title>
                <div className="subtitle">
                  Quotation ID: {selectedQuotationData.quotation.id}
                </div>
              </div>

              <Divider style={{ margin: '12px 0 18px' }} />

              {/* Quotation and Customer Details - compact grid with drag & drop */}
              <div className="a4-section">
                <div className="a4-section-title">
                  <Title level={5} style={{ margin: 0 }}>
                    Quotation & Customer Details
                  </Title>
                  <small>Drag cards to reorder (order saved permanently)</small>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={quotationColumns.map(col => col.column_name)}>
                    <div className="details-grid">
                      {quotationColumns.map((col) => (
                        <SortableCard key={col.column_name} id={col.column_name}>
                          <div className="detail-card">
                            <div className="detail-label">{formatLabel(col.column_name)}</div>
                            <div className="detail-value">
                              {selectedQuotationData.quotation[col.column_name] || '-'}
                            </div>
                          </div>
                        </SortableCard>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Items Details Table */}
              <div className="a4-section">
                <div className="a4-section-title">
                  <Title level={5} style={{ margin: 0 }}>
                    Items Details
                  </Title>
                  <small>Columns wrap to stay inside A4 view</small>
                </div>
                <div className="items-table">
                  <div className="table-scroll">
                    <table className="a4-table">
                      <thead>
                        <tr>
                          <th style={{ width: 70 }}>Sl.No</th>
                          {itemsColumns.map((col) => (
                            <th key={col.column_name}>{formatLabel(col.column_name)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuotationData.items.map((item, index) => (
                          <tr key={item.id}>
                            <td>{index + 1}</td>
                            {itemsColumns.map((col) => {
                              const value = item[col.column_name];
                              const isMoney = col.column_name.includes('rate') || col.column_name.includes('cost');
                              const displayValue =
                                isMoney && value
                                  ? `₹ ${Number(value).toFixed(2)}`
                                  : value || '-';

                              return (
                                <td
                                  key={col.column_name}
                                  style={{ textAlign: isMoney ? 'right' : 'left' }}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Total Cost - Lower Right */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, position: 'relative', zIndex: 2 }}>
                <div className="totals-box">
                  <span className="label">Total Cost:</span>
                  <span className="value">₹ {calculateTotal(selectedQuotationData.items).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="footer-note">
                <Divider style={{ margin: '20px 0 12px' }} />
                This is a system-generated quotation
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal - Dynamic */}
      <Modal
        title={<Title level={4}>Edit Quotation</Title>}
        open={editModalOpen}
        onCancel={handleCloseEditModal}
        width={1200}
        centered
        footer={[
          <Button key="cancel" onClick={handleCloseEditModal}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={handleSubmitEdit}
          >
            Save Changes
          </Button>,
        ]}
        styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
      >
        <Form form={editForm} layout="vertical">
          <Divider orientation="left">Quotation Details</Divider>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {quotationColumns.map((col) => (
              <Form.Item 
                key={col.column_name}
                label={formatLabel(col.column_name)} 
                name={col.column_name}
              >
                {col.data_type.includes('text') || col.column_name.includes('condition') || col.column_name.includes('terms') ? (
                  <Input.TextArea rows={2} placeholder={`Enter ${formatLabel(col.column_name).toLowerCase()}`} />
                ) : (
                  <Input 
                    type={col.data_type.includes('integer') || col.data_type.includes('numeric') ? 'number' : 'text'}
                    placeholder={`Enter ${formatLabel(col.column_name).toLowerCase()}`} 
                  />
                )}
              </Form.Item>
            ))}
          </div>

          <Divider orientation="left">
            Items 
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddItem}
              style={{ marginLeft: 16 }}
              size="small"
            >
              Add Item
            </Button>
          </Divider>

          <div style={{ marginTop: 16 }}>
            {editingItems.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: 16,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  marginBottom: 16,
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong>Item {index + 1}</Text>
                  <Popconfirm
                    title="Delete this item?"
                    onConfirm={() => handleDeleteItem(index)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger size="small" icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {itemsColumns.map((col) => (
                    <div key={col.column_name}>
                      <Text>{formatLabel(col.column_name)}</Text>
                      <Input
                        type={col.data_type.includes('integer') || col.data_type.includes('numeric') ? 'number' : 'text'}
                        value={item[col.column_name] || ''}
                        onChange={(e) => handleItemChange(index, col.column_name, e.target.value)}
                        placeholder={`Enter ${formatLabel(col.column_name).toLowerCase()}`}
                        disabled={col.column_name === 'total_cost'}
                        style={col.column_name === 'total_cost' ? { background: '#f0f0f0' } : {}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {editingItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, background: '#fafafa', borderRadius: 8 }}>
                <Text type="secondary">No items added. Click "Add Item" to create one.</Text>
              </div>
            )}
          </div>

          {/* Total Cost Display */}
          {editingItems.length > 0 && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  border: '2px solid #1890ff',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  background: '#e6f7ff',
                  minWidth: '200px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ marginRight: 20 }}>Total Cost:</Text>
                  <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                    ₹ {calculateTotal(editingItems).toFixed(2)}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Quotation;