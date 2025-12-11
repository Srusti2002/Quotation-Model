import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const { Content } = Layout;

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ 
        marginLeft: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Topbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content style={{ 
          padding: 0,
          background: '#f5f5f5',
          overflow: 'auto',
          flex: 1,
          position: 'relative'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;