import React from 'react';
import { Layout, Menu } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();

  return (
    <Sider collapsible collapsed={collapsed} width={240}>
      <div style={{
        height: 60,
        margin: 16,
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {collapsed ? "QS" : "Quotation System"}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        onClick={(e) => navigate(e.key)}
        items={[
          {
            key: "/charges",
            icon: <DollarOutlined />,
            label: "Charges",
          }
        ]}
      />
    </Sider>
  );
};

export default Sidebar;
