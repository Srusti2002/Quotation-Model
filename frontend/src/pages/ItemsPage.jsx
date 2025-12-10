// src/pages/ItemsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, InputNumber, Select, Button, Popconfirm, Card, Space, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const ItemsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([
    { key: 'search', isSearchRow: true }
  ]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load saved items from localStorage on component mount
  useEffect(() => {
    const loadSavedItems = () => {
      try {
        const saved = localStorage.getItem('quotationItems');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems([{ key: 'search', isSearchRow: true }, ...parsed]);
          } else {
            // Add an empty row if no saved items
            addRow();
          }
        } else {
          // Add an empty row if no saved items
          addRow();
        }
      } catch (error) {
        console.error('Error loading saved items:', error);
        message.error('Failed to load saved items');
        addRow();
      }
    };

    loadSavedItems();
  }, []);

  // Save items to localStorage whenever they change
  useEffect(() => {
    const saveItems = () => {
      try {
        const realItems = items.filter(i => !i.isSearchRow);
        localStorage.setItem('quotationItems', JSON.stringify(realItems));
      } catch (error) {
        console.error('Error saving items:', error);
      }
    };

    saveItems();
  }, [items]);

  const addRow = useCallback(() => {
    setItems(prevItems => [
      ...prevItems.filter(i => !i.isSearchRow),
      { 
        key: Date.now(), 
        activity: '', 
        description: '', 
        spec: '', 
        qty: 1, 
        unit: 'Nos', 
        rate: 0, 
        total: 0 
      },
      { key: 'search', isSearchRow: true }
    ]);
  }, []);

  const deleteRow = useCallback((key) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(i => i.key !== key);
      // Make sure we always have at least one item row
      if (newItems.every(item => item.isSearchRow)) {
        return [...newItems, { key: Date.now(), activity: '', description: '', spec: '', qty: 1, unit: 'Nos', rate: 0, total: 0 }];
      }
      return newItems;
    });
  }, []);

  const updateRow = useCallback((key, field, value) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.key === key) {
          const updated = { 
            ...item, 
            [field]: field === 'qty' || field === 'rate' ? parseFloat(value) || 0 : value 
          };
          
          if (field === 'qty' || field === 'rate') {
            updated.total = (parseFloat(updated.qty) || 0) * (parseFloat(updated.rate) || 0);
          }
          
          return updated;
        }
        return item;
      })
    );
  }, []);

  const handleSaveAndContinue = useCallback(() => {
    const realItems = items.filter(i => !i.isSearchRow);
    
    // Validate items
    for (const item of realItems) {
      if (!item.activity) {
        message.warning('Please fill in the Activity field for all items');
        return;
      }
      if (!item.qty || item.qty <= 0) {
        message.warning('Quantity must be greater than 0');
        return;
      }
      if (item.rate === undefined || item.rate < 0) {
        message.warning('Rate cannot be negative');
        return;
      }
    }
    
    setSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      message.success('Items saved successfully!');
      setSaving(false);
      navigate('/add-quotation');
    }, 500);
  }, [items, navigate]);

  // Filter items based on search term
  const filteredItems = searchTerm 
    ? items.filter(item => {
        if (item.isSearchRow) return true;
        return (
          (item.activity && item.activity.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.spec && item.spec.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
    : items;

  const columns = [
    { 
      title: 'Sl No', 
      width: 70, 
      render: (_, __, idx) => idx === 0 ? '' : idx,
      fixed: 'left'
    },
    { 
      title: 'Sample/Activity', 
      width: 250, 
      fixed: 'left',
      render: (_, r) => r.isSearchRow ? (
        <Input 
          placeholder="Search items..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ background: '#f5f5f5' }} 
        />
      ) : (
        <Input 
          value={r.activity} 
          onChange={e => updateRow(r.key, 'activity', e.target.value)} 
          placeholder="Enter activity"
        />
      ) 
    },
    { 
      title: 'Description', 
      width: 200,
      render: (_, r) => r.isSearchRow ? null : (
        <Input.TextArea 
          value={r.description} 
          onChange={e => updateRow(r.key, 'description', e.target.value)}
          placeholder="Description"
          autoSize={{ minRows: 1, maxRows: 3 }}
        />
      ) 
    },
    { 
      title: 'Spec', 
      width: 150,
      render: (_, r) => r.isSearchRow ? null : (
        <Input 
          value={r.spec} 
          onChange={e => updateRow(r.key, 'spec', e.target.value)}
          placeholder="Specifications"
        />
      ) 
    },
    { 
      title: 'Qty', 
      width: 90, 
      render: (_, r) => r.isSearchRow ? null : (
        <InputNumber 
          min={1} 
          value={r.qty} 
          onChange={v => updateRow(r.key, 'qty', v)} 
          style={{ width: '100%' }} 
        />
      ) 
    },
    { 
      title: 'Unit', 
      width: 100, 
      render: (_, r) => r.isSearchRow ? null : (
        <Select 
          value={r.unit} 
          onChange={v => updateRow(r.key, 'unit', v)} 
          style={{ width: '100%' }}
        >
          <Select.Option value="Nos">Nos</Select.Option>
          <Select.Option value="Set">Set</Select.Option>
          <Select.Option value="Pcs">Pcs</Select.Option>
          <Select.Option value="Kg">Kg</Select.Option>
          <Select.Option value="Ltr">Ltr</Select.Option>
          <Select.Option value="Mtr">Mtr</Select.Option>
          <Select.Option value="Sq.Ft">Sq.Ft</Select.Option>
          <Select.Option value="Hrs">Hrs</Select.Option>
          <Select.Option value="Day">Day</Select.Option>
        </Select>
      ) 
    },
    { 
      title: 'Rate (₹)', 
      width: 150,
      render: (_, r) => r.isSearchRow ? null : (
        <InputNumber 
          prefix="₹" 
          min={0}
          value={r.rate} 
          onChange={v => updateRow(r.key, 'rate', v)} 
          style={{ width: '100%' }} 
          step={0.01}
          precision={2}
        />
      ) 
    },
    { 
      title: 'Total (₹)', 
      width: 120,
      render: (_, r) => r.isSearchRow ? null : (
        <Text strong>₹{(r.qty * r.rate).toFixed(2)}</Text>
      )
    },
    { 
      title: '', 
      width: 80, 
      fixed: 'right',
      render: (_, r) => !r.isSearchRow && (
        <Popconfirm 
          title="Are you sure you want to delete this item?" 
          onConfirm={() => deleteRow(r.key)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />} 
            style={{ border: 'none' }}
          />
        </Popconfirm>
      ) 
    },
  ];

  // Calculate grand total
  const grandTotal = items.reduce((sum, item) => {
    if (item.isSearchRow) return sum;
    return sum + (item.qty || 0) * (item.rate || 0);
  }, 0);

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card 
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
              style={{ marginRight: 8 }}
            >
              Back
            </Button>
            <Title level={4} style={{ margin: 0 }}>Quotation Items</Title>
          </Space>
        }
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={addRow}
            >
              Add Item
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSaveAndContinue}
              loading={saving}
              disabled={items.length <= 1}
            >
              Save & Continue
            </Button>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: 24 }}>
          <Table 
            columns={columns} 
            dataSource={filteredItems} 
            pagination={false} 
            bordered 
            scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
            rowKey="key"
            size="middle"
            className="quotation-items-table"
            style={{ marginBottom: 16 }}
            rowClassName={(record) => record.isSearchRow ? 'search-row' : ''}
            sticky
          />
          
          <div style={{ 
            textAlign: 'right', 
            marginTop: 16,
            padding: '16px',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: '2px'
          }}>
            <Space size="large">
              <Text strong>Total Items: {items.length - 1}</Text>
              <Text strong style={{ fontSize: '18px' }}>Grand Total: ₹{grandTotal.toFixed(2)}</Text>
            </Space>
          </div>
        </div>
      </Card>
      
      <style jsx global>{`
        .quotation-items-table .ant-table-thead > tr > th {
          background: #f5f5f5;
          font-weight: 600;
        }
        .quotation-items-table .search-row {
          background: #fafafa;
        }
        .quotation-items-table .search-row:hover > td {
          background: #f5f5f5 !important;
        }
        .ant-table-cell {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default ItemsPage;