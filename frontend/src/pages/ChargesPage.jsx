import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  message,
  Typography,
  Select,
  Drawer,
  Form,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

const COLUMN_TYPES = [
  { value: 'text', label: 'TEXT' },
  { value: 'string', label: 'string' },
  { value: 'integer', label: 'INTEGER' },
  { value: 'boolean', label: 'BOOLEAN' },
  { value: 'timestamp', label: 'TIMESTAMP' },
];

const ChargesPage = () => {
  const [data, setData] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState(''); // 'charge' or 'columns'
  const [editingRecord, setEditingRecord] = useState(null);

  // Forms
  const [form] = Form.useForm();
  const [columnForm] = Form.useForm();

  // Inline editing
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingColKey, setEditingColKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Fetch columns and data
  const fetchColumns = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/charges/columns');
      const result = await res.json();
      setDynamicColumns(result.columns || []);
    } catch (err) {
      message.error('Failed to load columns');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/charges');
      const result = await res.json();
      setData(result);
    } catch (err) {
      message.error('Failed to load charges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
    fetchData();
  }, []);

  // Drawer handlers
  const openChargeDrawer = (record = null) => {
    setEditingRecord(record);
    setDrawerType('charge');
    setDrawerOpen(true);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
  };

  const openColumnsDrawer = () => {
    setDrawerType('columns');
    setDrawerOpen(true);
    columnForm.resetFields();
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingRecord(null);
    form.resetFields();
    columnForm.resetFields();
  };

  // Save Charge (Add / Edit via drawer)
  const handleSaveCharge = async (values) => {
    const url = editingRecord
      ? `http://127.0.0.1:8000/charges/${editingRecord.id}`
      : 'http://127.0.0.1:8000/charges';

    try {
      await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      message.success(editingRecord ? 'Charge updated!' : 'Charge added!');
      closeDrawer();
      fetchData();
    } catch (err) {
      message.error('Failed to save charge');
    }
  };

  // Add Column
  const handleAddColumn = async (values) => {
    const name = values.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (dynamicColumns.includes(name)) {
      return message.warning('Column already exists');
    }

    try {
      await fetch('http://127.0.0.1:8000/charges/add-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: name, column_type: values.type }),
      });
      message.success('Column added successfully');
      columnForm.resetFields();
      await fetchColumns();
      await fetchData();
    } catch (err) {
      message.error('Failed to add column');
    }
  };

  // Delete Column
  const handleDeleteColumn = async (col) => {
    if (['name', 'charge_amount', 'specifications'].includes(col)) {
      return message.warning('Cannot delete required column');
    }
    try {
      await fetch('http://127.0.0.1:8000/charges/delete-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: col }),
      });
      message.success('Column deleted');
      await fetchColumns();
      await fetchData();
    } catch (err) {
      message.error('Failed to delete column');
    }
  };

  // Delete Charge
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const response = await fetch(`http://127.0.0.1:8000/charges/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error();
      message.success('Charge deleted successfully');
      fetchData();
    } catch (error) {
      message.error('Failed to delete charge');
    } finally {
      setDeletingId(null);
    }
  };

  // Inline Editing
  const saveInlineEdit = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/charges/update-field', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charge_id: editingRowId,
          column_name: editingColKey,
          value: editingValue,
        }),
      });
      const result = await res.json();
      if (result.status === 'success') {
        message.success('Updated!');
        await fetchData();
      } else {
        message.error(result.message || 'Update failed');
      }
    } catch (err) {
      message.error('Update failed');
    } finally {
      setEditingRowId(null);
      setEditingColKey(null);
      setEditingValue('');
    }
  };

  const startEdit = (record, col) => {
    setEditingRowId(record.id);
    setEditingColKey(col);
    setEditingValue(record[col] ?? '');
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setEditingColKey(null);
    setEditingValue('');
  };

  // Table Columns — Inline edit icons kept, Edit button REMOVED from Actions
  const generateColumns = () => [
    ...dynamicColumns
      .filter(col => col !== 'id')
      .map(col => ({
        title: col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        dataIndex: col,
        key: col,
        width: 280,
        render: (text, record) => {
          const isEditing = editingRowId === record.id && editingColKey === col;
          const isAmount = col.includes('amount') || col.includes('price');

          if (isEditing) {
            return (
              <Space.Compact style={{ width: '100%' }}>
                {isAmount ? (
                  <InputNumber
                    autoFocus
                    value={editingValue}
                    onChange={setEditingValue}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <Input
                    autoFocus
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                  />
                )}
                <Button type="link" icon={<CheckOutlined style={{ color: 'green' }} />} onClick={saveInlineEdit} />
                <Button type="link" danger icon={<CloseOutlined />} onClick={cancelInlineEdit} />
              </Space.Compact>
            );
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {isAmount && text !== null && text !== undefined
                  ? `$${Number(text).toFixed(2)}`
                  : text || '-'}
              </span>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: '#1890ff' }} />}
                onClick={() => startEdit(record, col)}
              />
            </div>
          );
        },
      })),
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Delete this charge?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            danger
            type="link"
            size="small"
            icon={<DeleteOutlined />}
            loading={deletingId === record.id}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Charges Management</h2>
        <Space size={12}>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => openChargeDrawer()}>
            Add New Charge
          </Button>
          <Button size="large" icon={<SettingOutlined />} onClick={openColumnsDrawer}>
            Manage Columns
          </Button>
        </Space>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Table
          columns={generateColumns()}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
          rowClassName={record => editingRowId === record.id ? 'editing-row' : ''}
        />
      </div>

      {/* Drawer */}
      <Drawer
        title={drawerType === 'charge' ? (editingRecord ? 'Edit Charge' : 'Add New Charge') : 'Manage Columns'}
        placement="right"
        width={500}
        onClose={closeDrawer}
        open={drawerOpen}
        styles={{ body: { padding: 24 } }}
      >
        {drawerType === 'charge' ? (
          <Form form={form} layout="vertical" onFinish={handleSaveCharge}>
            {dynamicColumns.filter(c => c !== 'id').map(col => (
              <Form.Item
                key={col}
                name={col}
                label={col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                rules={[{ required: col === 'name' || col === 'charge_amount', message: 'Required' }]}
              >
                {col.includes('amount') || col.includes('price') ? (
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                ) : (
                  <Input />
                )}
              </Form.Item>
            ))}
            <Space style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit">Save</Button>
              <Button onClick={closeDrawer}>Cancel</Button>
            </Space>
          </Form>
        ) : (
          // Your existing Manage Columns UI (unchanged)
          <>
            <Form form={columnForm} onFinish={handleAddColumn} layout="inline" style={{ marginBottom: 24 }}>
              <Form.Item name="name" rules={[{ required: true }]}>
                <Input placeholder="Column name (e.g. service_fee)" style={{ width: 200 }} />
              </Form.Item>
              <Form.Item name="type" initialValue="varchar">
                <Select style={{ width: 120 }}>
                  {COLUMN_TYPES.map(t => (
                    <Option key={t.value} value={t.value}>{t.label}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Button type="primary" htmlType="submit">Add Column</Button>
            </Form>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Existing Columns:</Text>
              {dynamicColumns.filter(c => c !== 'id').map(col => (
                <div key={col} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed #eee' }}>
                  <Text strong>{col}</Text>
                  {['name', 'charge_amount', 'specifications'].includes(col) ? (
                    <Text type="secondary" italic>Required</Text>
                  ) : (
                    <Popconfirm title="Delete column and all its data?" onConfirm={() => handleDeleteColumn(col)}>
                      <Button danger size="small">Delete</Button>
                    </Popconfirm>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Drawer>

      <style jsx>{`
        .editing-row {
          background: #fffbe6 !important;
        }
        .editing-row td {
          padding: 8px !important;
        }
      `}</style>
    </div>
  );
};

export default ChargesPage;