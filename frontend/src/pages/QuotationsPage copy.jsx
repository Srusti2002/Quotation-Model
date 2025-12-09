import React, { useState, useEffect } from 'react';
import {
  Button, Card, Table, Space, Tag, message, Popconfirm, Modal, Form, Input, DatePicker,
  Typography, InputNumber, Spin
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import ChargesTable from './ChargesPage';
import dayjs from 'dayjs';

const { Text } = Typography;

const QuotationsPage = () => {
  const [quotations, setQuotations] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [editingField, setEditingField] = useState(null); // { quotationId, column }

  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch dynamic columns
  const fetchColumns = async () => {
    try {
      setColumnsLoading(true);
      const res = await fetch('http://127.0.0.1:8000/quotation/columns');
      const data = await res.json();
      // Filter out internal/system fields if needed
      const filtered = data.columns.filter(col => col !== 'id');
      setColumns(filtered);
    } catch (err) {
      message.error('Failed to load column schema');
      setColumns([]);
    } finally {
      setColumnsLoading(false);
    }
  };

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/quotation');
      const data = await res.json();
      setQuotations(data);
    } catch (err) {
      message.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
    fetchQuotations();
  }, []);

  // Delete quotation
  const deleteQuotation = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/quotation/${id}`, { method: 'DELETE' });
      message.success('Quotation deleted');
      fetchQuotations();
    } catch (err) {
      message.error('Delete failed');
    }
  };

  // Update single field
  const updateField = async (quotationId, columnName, value) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/quotation/update-field', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotation_id: quotationId,
          column_name: columnName,
          value: value || null
        }),
      });

      if (!res.ok) throw new Error('Update failed');
      message.success('Field updated');
      fetchQuotations(); // Refresh data
    } catch (err) {
      message.error('Failed to update field');
    } finally {
      setEditingField(null);
    }
  };

  const toggleCharges = (q) => {
    setSelectedQuotation(selectedQuotation?.id === q.id ? null : q);
  };

  // Modal Handlers
  const showModal = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleCreate = async (values) => {
    try {
      const payload = {
        ...values,
        date: values.date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
      };

      const res = await fetch('http://127.0.0.1:8000/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create');
      message.success('Quotation created successfully!');
      handleCancel();
      fetchQuotations();
    } catch (err) {
      message.error('Failed to create quotation');
    }
  };

  // Dynamic field renderer with inline editing
  const renderField = (record, col) => {
    const value = record[col] || '-';
    const isEditing = editingField?.quotationId === record.id && editingField?.column === col;

    if (isEditing) {
      return (
        <Space>
          <Input
            autoFocus
            defaultValue={record[col] || ''}
            size="small"
            style={{ width: 200 }}
            onPressEnter={(e) => updateField(record.id, col, e.target.value)}
            onBlur={(e) => updateField(record.id, col, e.target.value)}
          />
          <Button
            size="small"
            type="text"
            icon={<SaveOutlined />}
            onClick={() => updateField(record.id, col, record[col])}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<CloseOutlined />}
            onClick={() => setEditingField(null)}
          />
        </Space>
      );
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>{String(value)}</Text>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditingField({ quotationId: record.id, column: col })}
        />
      </div>
    );
  };

  // Group columns for display
  const customerDetailsCols = ['contact_person', 'designation', 'department', 'mobile_number', 'phone_number', 'email_id'];
  const billingCols = ['customer_code', 'gst_details', 'enquiry_ref', 'enquiry_date'];
  const termsCols = ['payment_terms', 'delivery_period', 'place_of_work', 'ot_charges', 'validity', 'freight'];

  const renderSection = (title, fieldKeys, record) => (
    <Card size="small" title={title} style={{ marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '8px 16px' }}>
        {fieldKeys.map(key => columns.includes(key) ? (
          <React.Fragment key={key}>
            <div style={{ fontWeight: 600, color: '#555', textTransform: 'capitalize' }}>
              {key.replace(/_/g, ' ')}:
            </div>
            <div>{renderField(record, key)}</div>
          </React.Fragment>
        ) : null)}
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Quotations</h2>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={showModal}>
          New Quotation
        </Button>
      </div>

      {/* Create Modal - Dynamic Fields */}
      <Modal
        title={<span style={{ fontSize: 22, fontWeight: 'bold' }}>Create New Quotation</span>}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={1000}
        destroyOnClose
      >
        {columnsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin /> <Text>Loading form fields...</Text>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="quotation_no" label="Quotation No" rules={[{ required: true }]}>
                <Input placeholder="e.g. QT-2025-001" />
              </Form.Item>
              <Form.Item name="date" label="Date" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
              </Form.Item>
            </div>

            <h3>Customer & Billing Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {columns
                .filter(col => !['id', 'quotation_no', 'date'].includes(col))
                .map(col => (
                  <Form.Item
                    key={col}
                    name={col}
                    label={col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  >
                    {col.includes('date') ? (
                      <DatePicker style={{ width: '100%' }} />
                    ) : col.includes('terms') || col.includes('condition') ? (
                      <Input.TextArea rows={2} />
                    ) : (
                      <Input />
                    )}
                  </Form.Item>
                ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Button onClick={handleCancel} style={{ marginRight: 8 }}>Cancel</Button>
              <Button type="primary" htmlType="submit">Create Quotation</Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Quotations List */}
      {loading ? (
        <Card><div style={{ padding: 60, textAlign: 'center' }}>Loading quotations...</div></Card>
      ) : quotations.length === 0 ? (
        <Card><div style={{ padding: 80, textAlign: 'center', color: '#999' }}>
          No quotations yet. Click "+ New Quotation" to create one!
        </div></Card>
      ) : (
        quotations.map(q => (
          <Card
            key={q.id}
            style={{ marginBottom: 32, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(90deg, #1890ff, #096dd9)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22 }}>
                  {q.quotation_no || 'Draft Quotation'} <Tag color="white" style={{ marginLeft: 12 }}>Draft</Tag>
                </h3>
                <div style={{ opacity: 0.9 }}>
                  Date: <strong>{q.date || 'N/A'}</strong> | Contact: <strong>{q.contact_person || 'N/A'}</strong>
                </div>
              </div>
              <Space>
                <Popconfirm title="Delete this quotation?" onConfirm={() => deleteQuotation(q.id)}>
                  <Button danger type="primary" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  {renderSection('Customer Details', customerDetailsCols, q)}
                  {renderSection('Billing Information', billingCols, q)}
                </div>
                <div>
                  {renderSection('Terms & Conditions', termsCols.filter(c => columns.includes(c)), q)}
                </div>
              </div>

              {/* Charges Section */}
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: selectedQuotation?.id === q.id ? '#e6f7ff' : '#f0f2f5',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onClick={() => toggleCharges(q)}
                >
                  <h3 style={{ margin: 0 }}>
                    Charges & Line Items ({selectedQuotation?.id === q.id ? 'Hide' : 'Show'})
                  </h3>
                  <Button type="primary" size="small" icon={<PlusOutlined />}>
                    Add Charge
                  </Button>
                </div>

                {selectedQuotation?.id === q.id && (
                  <div style={{ marginTop: 16, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
                    <ChargesTable quotationId={q.id} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default QuotationsPage;