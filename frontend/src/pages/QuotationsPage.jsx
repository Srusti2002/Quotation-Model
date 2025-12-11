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

  // Fetch columns from backend
  const fetchColumns = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/quotation/columns');
      const result = await res.json();
      setColumns(result.columns || []);
    } catch (err) {
      message.error('Failed to load columns');
      console.error(err);
    }
  };

  // Fetch quotation data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/quotation');
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
      const res = await fetch(`http://127.0.0.1:8000/quotation/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      message.success('Quotation deleted');
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
        message.success('Updated successfully');
        fetchData();
      } else {
        const err = await res.json();
        message.error(err.detail || 'Update failed');
      }
    } catch (err) {
      message.error('Update failed');
      console.error(err);
    } finally {
      cancelEdit();
    }
  };

  // Add new column
  const handleAddColumn = async (values) => {
    const name = values.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return message.warning('Column name is required');
    if (columns.some(col => col.column_name === name)) {
      return message.warning('Column already exists');
    }

    try {
      await fetch('http://127.0.0.1:8000/quotation/add-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: name, column_type: values.type }),
      });
      message.success('Column added successfully');
      columnForm.resetFields();
      fetchColumns();
      fetchData();
    } catch (err) {
      message.error('Failed to add column');
      console.error(err);
    }
  };

  // Delete column
  const handleDeleteColumn = async (columnName) => {
    if (REQUIRED_COLUMNS.includes(columnName)) {
      return message.warning('Cannot delete required column');
    }
    try {
      await fetch('http://127.0.0.1:8000/quotation/delete-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_name: columnName }),
      });
      message.success('Column deleted');
      fetchColumns();
      fetchData();
    } catch (err) {
      message.error('Failed to delete column');
      console.error(err);
    }
  };

  // Dynamic Table Columns
  const tableColumns = columns
    .filter((col) => col.column_name !== 'id')
    .map((col) => {
      const columnName = col.column_name;

      return {
        title: columnName
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        dataIndex: columnName,
        key: columnName,
        width: 200,
        ellipsis: true,
        render: (text, record) => {
          const isEditing = editingRowId === record.id && editingColKey === columnName;
          const isMoney = ['price', 'amount', 'charge', 'total', 'rate'].some(term =>
            columnName.toLowerCase().includes(term)
          );
          const isDate = columnName.toLowerCase().includes('date');
          const isLongText = ['terms_condition', 'note', 'description', 'remarks'].some(term =>
            columnName.toLowerCase().includes(term)
          );

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
                    formatter={(value) => (value ? `$ ${value}` : '')}
                    parser={(value) => value?.replace(/[^0-9.-]/g, '')}
                    autoFocus
                  />
                ) : isLongText ? (
                  <TextArea
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                    rows={3}
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

          // Display formatting
          if (isDate && text) {
            const d = new Date(text);
            return isNaN(d.getTime()) ? text : d.toLocaleDateString('en-GB');
          }
          if (isMoney && text != null) {
            return `$ ${Number(text).toFixed(2)}`;
          }
          if (isLongText && text) {
            return (
              <div style={{ whiteSpace: 'pre-wrap', maxWidth: 180, wordBreak: 'break-word' }}>
                {text}
              </div>
            );
          }

          return text ?? '-';
        },
        onCell: (record) => ({
          onDoubleClick: () => startEdit(record, columnName),
        }),
      };
    });

  // Actions column
  tableColumns.push({
    title: 'Actions',
    key: 'actions',
    fixed: 'right',
    width: 100,
    render: (_, record) => (
      <Space>
        <Popconfirm
          title="Delete this quotation?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            danger
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            loading={deletingId === record.id}
          />
        </Popconfirm>
      </Space>
    ),
  });

  return (
    <div style={{ 
      padding: 24, 
      background: '#f5f5f5', 
      minHeight: '100vh',
      position: 'relative',
      overflow: 'auto'
    }}>
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
        <Button size="large" type="primary" icon={<SettingOutlined />} onClick={openColumnsDrawer}>
          Manage Columns
        </Button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'relative',
        }}
      >
        <Table
          columns={tableColumns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ 
            x: 'max-content',
            y: 600,
            scrollToFirstRowOnChange: true,
          }}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
          bordered
          sticky
          size="middle"
          className="custom-table-scroll"
        />
      </div>

      {/* Column Management Drawer */}
      <Drawer
        title="Manage Columns"
        width={520}
        onClose={closeDrawer}
        open={drawerOpen}
        destroyOnClose
      >
        <Form form={columnForm} onFinish={handleAddColumn} layout="vertical">
          <Space style={{ width: '100%' }} direction="vertical">
            <Form.Item
              name="name"
              label="Column Name"
              rules={[{ required: true, message: 'Please enter column name' }]}
            >
              <Input placeholder="e.g. total_amount" />
            </Form.Item>
            <Form.Item name="type" label="Data Type" initialValue="string">
              <Select>
                {COLUMN_TYPES.map((t) => (
                  <Option key={t.value} value={t.value}>
                    {t.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              Add Column
            </Button>
          </Space>
        </Form>

        <div style={{ marginTop: 32, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Text strong>Existing Columns:</Text>
          {columns
            .filter((c) => c.column_name !== 'id')
            .map((col) => (
              <div
                key={col.column_name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px dashed #eee',
                }}
              >
                <div>
                  <Text strong>{col.column_name}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({col.column_type})
                  </Text>
                </div>
                {REQUIRED_COLUMNS.includes(col.column_name) ? (
                  <Text type="secondary" italic>Required</Text>
                ) : (
                  <Popconfirm
                    title="Delete this column and all its data?"
                    onConfirm={() => handleDeleteColumn(col.column_name)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger size="small">
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </div>
            ))}
        </div>
      </Drawer>

      <style>{`
        /* Perfect header alignment fix */
        .custom-table-scroll .ant-table-body {
          scrollbar-gutter: stable;
        }

        /* Custom scrollbar styling */
        .custom-table-scroll .ant-table-body::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        .custom-table-scroll .ant-table-body::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 5px;
        }
        
        .custom-table-scroll .ant-table-body::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }
        
        .custom-table-scroll .ant-table-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 5px;
        }

        /* Prevent table from overlapping sidebar */
        .ant-table-wrapper {
          position: relative;
          z-index: 1;
        }

        /* Sticky header styling */
        .custom-table-scroll .ant-table-thead > tr > th {
          position: sticky;
          top: 0;
          z-index: 3;
          background: #fafafa;
        }

        /* Fixed column styling */
        .custom-table-scroll .ant-table-cell-fix-right {
          position: sticky !important;
          right: 0;
          z-index: 2;
          background: #fff;
        }

        .custom-table-scroll .ant-table-thead .ant-table-cell-fix-right {
          z-index: 4;
          background: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default QuotationsPage;