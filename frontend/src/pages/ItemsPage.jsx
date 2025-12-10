// src/pages/ItemsPage.jsx

import React, { useState, useEffect } from 'react';
import {
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
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
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

const REQUIRED_COLUMNS = [
  'id',
  'quotation_id',
  'sample_activity',
  'specification',
  'hsn_sac_code',
  'unit',
  'unit_rate',
  'total_cost',
];

const ItemsPage = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingColKey, setEditingColKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const [columnForm] = Form.useForm();

  // Fetch columns & data
  const fetchColumns = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/items/columns');
      const result = await res.json();
      setColumns(result.columns || []);
    } catch (err) {
      message.error('Failed to load columns');
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/items');
      const result = await res.json();
      setData(result);
    } catch (err) {
      message.error('Failed to load items');
      console.error(err);
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

  // Delete item
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

  // Inline editing
  const startEdit = (record, columnName) => {
    setEditingRowId(record.id);
    setEditingColKey(columnName);
    setEditingValue(record[columnName] ?? '');
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
        message.success('Updated successfully');
        fetchData();
      } else {
        const err = await res.json();
        message.error(err.detail || 'Update failed');
      }
    } catch (err) {
      message.error('Update failed');
    } finally {
      cancelEdit();
    }
  };

  // Add / Delete column
  const handleAddColumn = async (values) => {
    const name = values.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return message.warning('Column name required');
    if (columns.some(c => c.column_name === name)) return message.warning('Column exists');

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
      message.error('Failed to add column');
    }
  };

  const handleDeleteColumn = async (name) => {
    if (REQUIRED_COLUMNS.includes(name)) return message.warning('Cannot delete required column');
    try {
      await fetch('http://127.0.0.1:8000/items/delete-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: name }),
      });
      message.success('Column deleted');
      fetchColumns();
      fetchData();
    } catch {
      message.error('Failed to delete column');
    }
  };

  const formatTitle = (str) =>
    str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div style={{ padding: 32, background: '#f5f5f5', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Items Management</h2>
        <Button type="primary" size="large" icon={<SettingOutlined />} onClick={openColumnsDrawer}>
          Manage Columns
        </Button>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            scrollbarGutter: 'stable both-edges', // This fixes header misalignment forever
          }}
          className="custom-table-scroll"
        >
          <table style={{ width: '100%', minWidth: '1800px', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {columns.filter(c => c.column_name !== 'id').map(col => (
                  <th
                    key={col.column_name}
                    style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      borderBottom: '2px solid #f0f0f0',
                      position: 'sticky',
                      top: 0,
                      background: '#fafafa',
                      zIndex: 10,
                      minWidth: 180,
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      color: '#1f1f1f',
                    }}
                  >
                    {formatTitle(col.column_name)}
                  </th>
                ))}
                <th
                  style={{
                    padding: '14px 32px 14px 16px',
                    textAlign: 'center',
                    borderBottom: '2px solid #f0f0f0',
                    position: 'sticky',
                    top: 0,
                    right: 0,
                    background: '#fafafa',
                    zIndex: 11,
                    minWidth: 100,
                    fontWeight: 600,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.filter(c => c.column_name !== 'id').length + 1} style={{ textAlign: 'center', padding: 80, color: '#999' }}>
                    Loading items...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(c => c.column_name !== 'id').length + 1} style={{ textAlign: 'center', padding: 80, color: '#999' }}>
                    No items found
                  </td>
                </tr>
              ) : (
                data.map(record => {
                  const isEditingRow = editingRowId === record.id;

                  return (
                    <tr
                      key={record.id}
                      style={{
                        background: isEditingRow ? '#fffbe6' : 'white',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      {columns.filter(c => c.column_name !== 'id').map(col => {
                        const name = col.column_name;
                        const value = record[name];
                        const isEditing = isEditingRow && editingColKey === name;

                        const isMoney = ['price', 'amount', 'charge', 'total', 'rate', 'cost'].some(t => name.toLowerCase().includes(t));
                        const isDate = name.toLowerCase().includes('date');
                        const isLong = ['specification', 'note', 'description', 'remarks'].some(t => name.toLowerCase().includes(t));

                        return (
                          <td
                            key={name}
                            style={{
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              minWidth: 180,
                              maxWidth: 360,
                              borderRight: '1px solid #f8f8f8',
                            }}
                            onDoubleClick={() => startEdit(record, name)}
                          >
                            {isEditing ? (
                              <Space.Compact style={{ width: '100%' }}>
                                {isDate ? (
                                  <Input type="date" value={editingValue} onChange={e => setEditingValue(e.target.value)} autoFocus onClick={e => e.stopPropagation()} />
                                ) : isMoney ? (
                                  <InputNumber
                                    value={editingValue}
                                    onChange={setEditingValue}
                                    style={{ width: '100%' }}
                                    precision={2}
                                    min={0}
                                    formatter={v => v ? `$ ${v}` : ''}
                                    parser={v => v?.replace(/[^0-9.-]/g, '')}
                                    autoFocus
                                    onClick={e => e.stopPropagation()}
                                  />
                                ) : isLong ? (
                                  <TextArea value={editingValue} onChange={e => setEditingValue(e.target.value)} autoFocus rows={3} onClick={e => e.stopPropagation()} />
                                ) : (
                                  <Input value={editingValue} onChange={e => setEditingValue(e.target.value)} autoFocus onClick={e => e.stopPropagation()} />
                                )}
                                <Button type="link" size="small" icon={<CheckOutlined style={{ color: 'green' }} />} onClick={e => { e.stopPropagation(); saveInlineEdit(); }} />
                                <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={e => { e.stopPropagation(); cancelEdit(); }} />
                              </Space.Compact>
                            ) : (
                              <>
                                {isDate && value ? new Date(value).toLocaleDateString('en-GB')
                                  : isMoney && value != null ? `$ ${Number(value).toFixed(2)}`
                                  : isLong ? <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value || '-'}</div>
                                  : value ?? '-'}
                              </>
                            )}
                          </td>
                        );
                      })}

                      {/* Sticky Actions */}
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          position: 'sticky',
                          right: 0,
                          background: isEditingRow ? '#fffbe6' : 'white',
                          borderLeft: '2px solid #f0f0f0',
                          zIndex: 9,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                          <Button danger type="text" size="small" icon={<DeleteOutlined />} loading={deletingId === record.id} />
                        </Popconfirm>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Scroll hint */}
        {data.length > 0 && (
          <div style={{ padding: '8px 16px', color: '#888', fontSize: 13, textAlign: 'center', background: '#fafafa' }}>
            Scroll horizontally to view more columns
          </div>
        )}
      </div>

      {/* Drawer */}
      <Drawer title="Manage Columns" width={520} onClose={closeDrawer} open={drawerOpen} destroyOnClose>
        <Form form={columnForm} onFinish={handleAddColumn} layout="vertical">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="name" label="Column Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. warranty_period" />
            </Form.Item>
            <Form.Item name="type" label="Data Type" initialValue="string">
              <Select>
                {COLUMN_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" block>Add Column</Button>
          </Space>
        </Form>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text strong>Existing Columns:</Text>
          {columns.filter(c => c.column_name !== 'id').map(col => (
            <div
              key={col.column_name}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed #eee' }}
            >
              <div>
                <Text strong>{col.column_name}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>({col.column_type})</Text>
              </div>
              {REQUIRED_COLUMNS.includes(col.column_name) ? (
                <Text type="secondary" italic>Required</Text>
              ) : (
                <Popconfirm
                  title="Delete this column and all data?"
                  onConfirm={() => handleDeleteColumn(col.column_name)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
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