// src/pages/ItemsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Table, Button, Input, Select, Space, Card, Typography, Popconfirm, message
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const ItemsPage = () => {
  const [items, setItems] = useState([
    { key: 1, isSearch: true },
    { key: 2, activity: '', description: '', spec: '', qty: '', unit: 'Nos', rate: '', total: '' }
  ]);

  const [notes, setNotes] = useState([
    "Quoted price are per each qty / Parameter.",
    "e.g. For Sl No.1 & 3: Slip Gauge Blocks CMC = ±0.043+U/1000 µm, (Where L is in mm)",
    "e.g. Sl No. 14: Long Slip Gauges CMC = ±(0.45+U/1000) µm, (Where L is in mm) i.e. 100 mm to 300 mm",
    "e.g. Sl No. 4: Long Slip Gauges CMC = ±(0.6+U/250) µm, (Where L is in mm) i.e. 350 mm to 1000 mm",
    "e.g. GST Extra as applicable"
  ]);

  const addRow = () => {
    setItems([...items, { key: Date.now(), activity: '', description: '', spec: '', qty: 1, unit: 'Nos', rate: 0, total: 0 }]);
  };

  const deleteRow = (key) => {
    setItems(items.filter(i => i.key !== key));
  };

  const updateRow = (key, field, value) => {
    setItems(items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          updated.total = (updated.qty || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const columns = [
    { title: 'Sl No', width: 70, render: (_, __, idx) => idx === 0 ? '' : <Text strong>{idx}</Text> },
    {
      title: 'Sample/Activity', width: 320,
      render: (_, record) => record.isSearch ? (
        <Input placeholder="Search calibration items" style={{ background: '#f5f5f5' }} />
      ) : (
        <Input
          value={record.activity}
          onChange={e => updateRow(record.key, 'activity', e.target.value)}
        />
      )
    },
    { title: 'Description', width: 280, render: (_, r) => r.isSearch ? '' : <Input value={r.description} onChange={e => updateRow(r.key, 'description', e.target.value)} /> },
    { title: 'Specification', width: 220, render: (_, r) => r.isSearch ? '' : <Input value={r.spec} onChange={e => updateRow(r.key, 'spec', e.target.value)} /> },
    { title: 'Qty', width: 90, render: (_, r) => r.isSearch ? '' : <Input value={r.qty} onChange={e => updateRow(r.key, 'qty', e.target.value)} /> },
    { title: 'Unit', width: 100, render: (_, r) => r.isSearch ? '' : <Select value={r.unit} onChange={v => updateRow(r.key, 'unit', v)} style={{ width: 90 }}><Select.Option value="Nos">Nos</Select.Option><Select.Option value="Set">Set</Select.Option></Select> },
    { title: 'Unit Rate (₹)', width: 140, render: (_, r) => r.isSearch ? '' : <Input prefix="₹" value={r.rate} onChange={e => updateRow(r.key, 'rate', e.target.value)} /> },
    { title: 'Total Cost (₹)', width: 140, render: (_, r) => r.isSearch ? '' : <Text strong>₹{r.total || 0}</Text> },
    {
      title: '', width: 60,
      render: (_, r) => r.isSearch ? null : (
        <Popconfirm title="Delete row?" onConfirm={() => deleteRow(r.key)}>
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ padding: 32, background: '#f9f9f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>Items/Activities</Title>
        <Space>
          <Button>+ Add Item</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>+ Add Sub Activity</Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Table columns={columns} dataSource={items} pagination={false} bordered size="middle" />
      </Card>

      <div style={{ marginTop: 30 }}>
        {notes.map((note, i) => (
          <Card key={i} size="small" style={{ marginBottom: 12, background: '#f5f5f5' }}>
            <Text type="secondary">
              <strong>Activity Note {i + 1}</strong><br />
              {note}
            </Text>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ItemsPage;