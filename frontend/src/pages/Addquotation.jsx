// src/pages/AddQuotation.jsx
import React, { useState } from 'react';
import {
  Card, Form, Input, DatePicker, Button, Table, InputNumber, Select, Space, Typography, Row, Col, Popconfirm
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AddQuotation = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // === Customer & Quotation Header ===
  const [header, setHeader] = useState({
    quotationNo: '',
    date: null,
    customerName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gst: '',
    enquiryRef: '',
  });

  // === Dynamic Items Table ===
  const [items, setItems] = useState([
    { key: 'search', isSearchRow: true },
    { key: 1, activity: '', description: '', spec: '', qty: 1, unit: 'Nos', rate: 0, total: 0 },
  ]);

  const addRow = () => {
    setItems([...items, {
      key: Date.now(),
      activity: '',
      description: '',
      spec: '',
      qty: 1,
      unit: 'Nos',
      rate: 0,
      total: 0
    }]);
  };

  const deleteRow = (key) => {
    setItems(items.filter(item => item.key !== key));
  };

  const updateRow = (key, field, value) => {
    setItems(items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const qty = parseFloat(updated.qty) || 0;
          const rate = parseFloat(updated.rate) || 0;
          updated.total = qty * rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const columns = [
    {
      title: 'Sl No',
      width: 70,
      render: (_, __, index) => index === 0 ? '' : <Text strong>{index}</Text>,
    },
    {
      title: 'Sample/Activity',
      width: 300,
      render: (_, record) => record.isSearchRow ? (
        <Input placeholder="Search items..." style={{ background: '#f5f5f5' }} />
      ) : (
        <Input
          value={record.activity}
          onChange={e => updateRow(record.key, 'activity', e.target.value)}
        />
      ),
    },
    {
      title: 'Description',
      width: 250,
      render: (_, record) => record.isSearchRow ? '' : (
        <Input
          value={record.description}
          onChange={e => updateRow(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Specification',
      width: 200,
      render: (_, record) => record.isSearchRow ? '' : (
        <Input
          value={record.spec}
          onChange={e => updateRow(record.key, 'spec', e.target.value)}
        />
      ),
    },
    {
      title: 'Qty',
      width: 90,
      render: (_, record) => record.isSearchRow ? '' : (
        <InputNumber
          min={1}
          value={record.qty}
          onChange={v => updateRow(record.key, 'qty', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit',
      width: 100,
      render: (_, record) => record.isSearchRow ? '' : (
        <Select
          value={record.unit}
          onChange={v => updateRow(record.key, 'unit', v)}
          style={{ width: '100%' }}
        >
          <Select.Option value="Nos">Nos</Select.Option>
          <Select.Option value="Set">Set</Select.Option>
          <Select.Option value="Hour">Hour</Select.Option>
          <Select.Option value="Kg">Kg</Select.Option>
        </Select>
      ),
    },
    {
      title: 'Rate (₹)',
      width: 130,
      render: (_, record) => record.isSearchRow ? '' : (
        <InputNumber
          prefix="₹"
          min={0}
          value={record.rate}
          onChange={v => updateRow(record.key, 'rate', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total (₹)',
      width: 130,
      render: (_, record) => record.isSearchRow ? '' : (
        <Text strong>₹{record.total?.toFixed(2) || '0.00'}</Text>
      ),
    },
    {
      title: '',
      width: 60,
      render: (_, record) => !record.isSearchRow && (
        <Popconfirm title="Delete row?" onConfirm={() => deleteRow(record.key)}>
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div style={{ padding: 24, background: '#f9f9f9', minHeight: '100vh' }}>
      <Card>
        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
            <Title level={3} style={{ margin: 0 }}>Create New Quotation</Title>
          </Space>
          <Button type="primary" size="large" icon={<SaveOutlined />}>
            Save Quotation
          </Button>
        </div>

        <Form layout="vertical" form={form}>
          {/* Customer Details */}
          <Card title="Customer & Quotation Details" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Quotation No." required><Input /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Date" required><DatePicker style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Customer Name" required><Input /></Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item label="Contact Person"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item label="Mobile"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item label="Email"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item label="GST No."><Input /></Form.Item></Col>
              <Col span={12}><Form.Item label="Enquiry Reference"><Input /></Form.Item></Col>
            </Row>
          </Card>

          {/* Items Table */}
          <Card title="Items / Activities">
            <Table
              columns={columns}
              dataSource={items}
              pagination={false}
              bordered
              size="middle"
              scroll={{ x: 1300 }}
              title={() => (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Calibration Items</strong></span>
                  <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>
                    Add Row
                  </Button>
                </div>
              )}
              footer={() => (
                <div style={{ textAlign: 'right', fontSize: 16 }}>
                  <Text strong>Grand Total: ₹{grandTotal.toFixed(2)}</Text>
                </div>
              )}
            />
          </Card>

          {/* Terms */}
          <Card title="Terms & Conditions" style={{ marginTop: 24 }}>
            <Row gutter={16}>
              <Col span={8}><Form.Item label="Payment Terms"><TextArea rows={2} /></Form.Item></Col>
              <Col span={8}><Form.Item label="Validity"><TextArea rows={2} /></Form.Item></Col>
              <Col span={8}><Form.Item label="Delivery"><TextArea rows={2} /></Form.Item></Col>
            </Row>
            <Form.Item label="Warranty"><TextArea rows={3} /></Form.Item>
          </Card>
        </Form>
      </Card>
    </div>
  );
};

export default AddQuotation;
