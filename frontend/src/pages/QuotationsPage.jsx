// src/pages/QuotationsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  message,
  Drawer,
  Form,
  Popconfirm,
  Select,
  Typography,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

const COLUMN_TYPES = [
  { value: 'text', label: 'TEXT' },
  { value: 'string', label: 'STRING' },
  { value: 'integer', label: 'INTEGER' },
  { value: 'float', label: 'FLOAT' },
  { value: 'boolean', label: 'BOOLEAN' },
  { value: 'date', label: 'DATE' },
];

const REQUIRED_COLUMNS = ['id', 'customer_name', 'enquiry_ref', 'mobile_number'];

const QuotationsPage = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingColKey, setEditingColKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const [form] = Form.useForm();
  const [columnForm] = Form.useForm();

  // Fetch columns
  const fetchColumns = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/quotation/columns');
      const result = await res.json();
      setColumns(result.columns || []);
    } catch {
      message.error('Failed to load columns');
    }
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/quotation');
      const result = await res.json();
      setData(result);
    } catch {
      message.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
    fetchData();
  }, []);

  const openColumnsDrawer = () => {
    setDrawerOpen(true);
    columnForm.resetFields();
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    columnForm.resetFields();
  };

  // Delete quotation
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/quotation/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      message.success('Deleted');
      fetchData();
    } catch {
      message.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // Inline editing
  const startEdit = (record, col) => {
    setEditingRowId(record.id);
    setEditingColKey(col);
    setEditingValue(record[col] ?? '');
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditingColKey(null);
    setEditingValue('');
  };

  const saveInlineEdit = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/quotation/update-field', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotation_id: editingRowId,
          column_name: editingColKey,
          value: editingValue,
        }),
      });
      if (res.ok) {
        message.success('Updated');
        fetchData();
      } else {
        const err = await res.json();
        message.error(err.detail || 'Update failed');
      }
    } catch {
      message.error('Update failed');
    } finally {
      cancelEdit();
    }
  };

  // Add Column
  const handleAddColumn = async (values) => {
    const name = values.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (columns.includes(name)) {
      return message.warning('Column already exists');
      return;
    }

    try {
      await fetch('http://127.0.0.1:8000/quotation/add-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: name, column_type: values.type }),
      });
      message.success('Column added');
      columnForm.resetFields();
      fetchColumns();
      fetchData();
    } catch {
      message.error('Failed to add column');
    }
  };

  // Delete Column
  const handleDeleteColumn = async (col) => {
    if (REQUIRED_COLUMNS.includes(col)) {
      return message.warning('Cannot delete required column');
    }
    try {
      await fetch('http://127.0.0.1:8000/quotation/delete-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: col }),
      });
      message.success('Column deleted');
      fetchColumns();
      fetchData();
    } catch {
      message.error('Failed to delete column');
    }
  };

  // Table columns
  const tableColumns = columns
    .filter((col) => col !== 'id')
    .map((col) => ({
      title: col
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      dataIndex: col,
      key: col,
      width: 280,
      render: (text, record) => {
        const isEditing = editingRowId === record.id && editingColKey === col;
        const isMoney = col.includes('charge') || col.includes('price');
        const isDate = col.includes('date');

        if (isEditing) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              {isDate ? (
                <Input
                  type="date"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  autoFocus
                />
              ) : isMoney ? (
                <InputNumber
                  value={editingValue}
                  onChange={setEditingValue}
                  style={{ width: '100%' }}
                  precision={2}
                  min={0}
                  autoFocus
                />
              ) : (
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  autoFocus
                />
              )}
              <Button
                type="link"
                icon={<CheckOutlined style={{ color: 'green' }} />}
                onClick={saveInlineEdit}
              />
              <Button type="link" danger icon={<CloseOutlined />} onClick={cancelEdit} />
            </Space.Compact>
          );
        }

        if (isDate && text) {
          const d = new Date(text);
          return isNaN(d.getTime()) ? text : d.toLocaleDateString('en-GB');
        }
        if (isMoney && text != null) return `$ ${Number(text).toFixed(2)}`;
        if (col.includes('terms_condition') && text) {
          return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;
        }
        return text || '-';
      },
    }));

  tableColumns.push({
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 100,
    render: (_, record) => (
      <Popconfirm title="Delete quotation?" onConfirm={() => handleDelete(record.id)}>
        <Button
          danger
          type="link"
          size="small"
          icon={<DeleteOutlined />}
          loading={deletingId === record.id}
        />
      </Popconfirm>
    ),
  });

  return (
    <div style={{ padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
          Quotations Management
        </h2>
        <Button size="large" icon={<SettingOutlined />} onClick={openColumnsDrawer}>
          Manage Columns
        </Button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <Table
          columns={tableColumns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Columns Management Drawer */}
      <Drawer
        title="Manage Columns"
        width={500}
        onClose={closeDrawer}
        open={drawerOpen}
      >
        <Form form={columnForm} onFinish={handleAddColumn} layout="inline" style={{ marginBottom: 24 }}>
          <Form.Item name="name" rules={[{ required: true }]}>
            <Input placeholder="Column name" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="type" initialValue="string">
            <Select style={{ width: 130 }}>
              {COLUMN_TYPES.map(t => (
                <Option key={t.value} value={t.value}>{t.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit">Add Column</Button>
        </Form>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Text strong>Existing Columns:</Text>
          {columns.filter(c => c !== 'id').map(col => (
            <div key={col} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #eee' }}>
              <Text>{col}</Text>
              {REQUIRED_COLUMNS.includes(col) ? (
                <Text type="secondary">Required</Text>
              ) : (
                <Popconfirm title="Delete column and all data?" onConfirm={() => handleDeleteColumn(col)}>
                  <Button danger size="small">Delete</Button>
                </Popconfirm>
              )}
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
};

export default QuotationsPage;