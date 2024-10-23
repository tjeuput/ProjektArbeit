import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Menu } from 'antd';
import { TeamOutlined, ScheduleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;
type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group',
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const SideMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const items = useMemo(() => [
    getItem('BVG Dienstplan', 'dienstplan', <ScheduleOutlined />, [
      getItem('Dienstplan BW', 'DienstpBw'),
      getItem('Einzelauszug BW', 'EinzelBw'),
      getItem('Dienstplan HW', 'DienstpHw'),
      getItem('Einzelauszug HW', 'EinzelHw'),
      getItem('Dienstplan A', 'DienstpA'),
      getItem('Einzelauszug A', 'EinzelA'),
    ]),
    getItem('Verwaltung', 'verwaltung', <TeamOutlined />, [
      getItem('Mitarbeiter', 'Mitarbeiter'),
      getItem('Bereich', 'Bereich'),
      getItem('Gruppe', 'Gruppe'),
      getItem('Schichtart', 'Schichtart'),
    ]),
  ], []); // Empty dependency array as these items don't depend on any state or props

  const handleMenuClick = ({ key, keyPath }: { key: string; keyPath: string[] }) => {
    if (keyPath.length > 1) {
      // This is a submenu item
      navigate(`/${key}`);
    } else {
      // This is a top-level item, navigate to its first child
      const item = items.find(i => i.key === key);
      if (item && 'children' in item && item.children && item.children.length > 0) {
        const firstChildKey = item.children[0].key as string;
        navigate(`/${firstChildKey}`);
      }
    }
  };

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentPath = pathSegments[0];

    const findParentKey = (items: MenuItem[], targetKey: string): string | null => {
      for (const item of items) {
        if ('children' in item && item.children) {
          if (item.children.some(child => child.key === targetKey)) {
            return item.key as string;
          }
        }
      }
      return null;
    };

    const parentKey = findParentKey(items, currentPath);
    if (parentKey) {
      setSelectedKeys([currentPath]);
      setOpenKeys(prevOpenKeys => {
        if (!prevOpenKeys.includes(parentKey)) {
          return [...prevOpenKeys, parentKey];
        }
        return prevOpenKeys;
      });
    } else {
      setSelectedKeys([currentPath]);
    }

    if (location.pathname === '/') {
      navigate('/DienstpBw');
    }
  }, [location, navigate, items]);

  return (
    <Sider trigger={null} collapsible collapsed={collapsed}>
      <Menu
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        mode="inline"
        theme="dark"
        inlineCollapsed={collapsed}
        items={items}
        onClick={handleMenuClick}
        onOpenChange={setOpenKeys}
      />
    </Sider>
  );
};

export default SideMenu;