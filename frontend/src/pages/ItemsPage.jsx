// src/pages/ItemsPage.jsx
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
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

const COLUMN_TYPES = [
  { value: 'string', label: 'STRING' },
  { value: 'integer', label: 'INTEGER' },
  { value: 'float', label: 'FLOAT' },
  { value: 'text', label: 'TEXT' },
  { value: 'date', label: 'DATE' },
];

const PROTECTED_COLUMNS = ['id', 'quotation_id'];

const ItemsPage = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [columnForm] = Form.useForm();

  const [editingRowId, setEditingRowId] = useState(null);
  const [editingColKey, setEditingColKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const fetchColumns = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/items/columns');
      const { columns: cols } = await res.json();
      setColumns(cols || []);
    } catch {
      message.error('Failed to load columns');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/items');
      const result = await res.json();
      setData(result);
    } catch {
      message.error('Failed to load items');
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

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      message.success('Item deleted');
      fetchData();
    } catch {
      message.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

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
      const res = await fetch('http://127.0.0.1:8000/items/update-field', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: editingRowId,
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

  const handleAddColumn = async (values) => {
    const name = values.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (columns.includes(name)) return message.warning('Column exists');

    try {
      await fetch('http://127.0.0.1:8000/items/add-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: name, column_type: values.type }),
      });
      message.success('Column added');
      columnForm.resetFields();
      fetchColumns();
      fetchData();
    } catch {
      message.error('Failed');
    }
  };

  const handleDeleteColumn = async (col) => {
    if (PROTECTED_COLUMNS.includes(col)) return message.warning('Protected');

    try {
      await fetch('http://127.0.0.1:8000/items/delete-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: col }),
      });
      message.success('Deleted');
      fetchColumns();
      fetchData();
    } catch {
      message.error('Failed');
    }
  };

  const tableColumns = columns
    .filter(c => c !== 'id')
    .map(col => ({
      title: col.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      dataIndex: col,
      key: col,
      width: 280,
      render: (text, record) => {
        const isEditing = editingRowId === record.id && editingColKey === col;
        const isMoney = col === 'unit_rate' || col === 'total_cost';

        if (isEditing) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              {isMoney ? (
                <InputNumber
                  value={editingValue}
                  onChange={setEditingValue}
                  style={{ width: '100%' }}
                  precision={2}
                  min={0}
                  autoFocus
                  formatter={v => v ? `₹ ${v}` : ''}
                  parser={v => v.replace(/₹\s?|,/g, '')}
                />
              ) : (
                <Input
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  autoFocus
                />
              )}
              <Button type="link" icon={<CheckOutlined style={{ color: 'green' }} />} onClick={saveInlineEdit} />
              <Button type="link" danger icon={<CloseOutlined />} onClick={cancelEdit} />
            </Space.Compact>
          );
        }

        if (isMoney && text != null) return `₹ ${Number(text).toFixed(2)}`;
        return text || '-';
      },
    }));

  tableColumns.push({
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 100,
    render: (_, record) => (
      <Popconfirm title="Delete item?" onConfirm={() => handleDelete(record.id)}>
        <Button danger type="link" size="small" icon={<DeleteOutlined />} loading={deletingId === record.id} />
      </Popconfirm>
    ),
  });

  return (
    <div style={{ padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Items Management</h2>
        {/* Add Item button REMOVED */}
        <Button size="large" icon={<SettingOutlined />} onClick={openColumnsDrawer}>
          Manage Columns
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0,0.08)' }}>
        <Table
          columns={tableColumns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Only Column Management Drawer */}
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
              {PROTECTED_COLUMNS.includes(col) ? (
                <Text type="secondary">Protected</Text>
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

export default ItemsPage;