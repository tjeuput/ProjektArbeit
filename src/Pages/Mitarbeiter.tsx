import { Card, Space, Tabs } from 'antd';
import React, { useState } from 'react';
import Mitarbeiterbogen from './Mitarbeiterbogen';
import EmployeeForm from './MitarbeiterHinzufuegen';

const Mitarbeiter: React.FC = () => {
  const { TabPane } = Tabs;
  const [tabs, setTabs] = useState([
    { key: '1', title: 'Mitarbeiter', content: <Mitarbeiterbogen /> },
    { key: '2', title: 'Neuer Mitarbeiter', content: <EmployeeForm /> }
  ]);


  return (
    <Space direction="vertical" style={{ width: '100%' }}>
     
        <Card>
          
          <Tabs defaultActiveKey='1'>
            {tabs.map(tab => (
              <TabPane tab={tab.title} key={tab.key}>
                {tab.content}
              </TabPane>
            ))}
          </Tabs>
        </Card>
     
    </Space>
  );
};

export default Mitarbeiter;