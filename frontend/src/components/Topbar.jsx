import React from 'react';
import { Layout } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Header } = Layout;

const Topbar = ({ collapsed, setCollapsed }) => {
  return (
    <Header style={{
      padding: '0 20px',
      background: '#fff',
      display: 'flex',
      alignItems: 'center'
    }}>
      {React.createElement(
        collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
        {
          className: 'trigger',
          onClick: () => setCollapsed(!collapsed),
          style: { fontSize: 18, cursor: 'pointer' }
        }
      )}
      <span style={{ marginLeft: 20, fontSize: 18, fontWeight: 'bold' }}>
        Charges Management
      </span>
    </Header>
  );
};

export default Topbar;
