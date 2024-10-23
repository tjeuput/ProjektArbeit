import { Card, Space, Tabs } from 'antd';
import React, { useState } from 'react';
import Mitarbeiterbogen from './Bereichsform';
import Bereichsform from './Bereichsform';

const Bereich: React.FC = () => {
  const { TabPane } = Tabs;
  const [tabs, setTabs] = useState([
    { key: '1', title: 'Bereiche', content: <Bereichsform /> },
    { key: '2', title: 'Neuer Bereich', content: "Einen neuen Bereich hinzufügen" }
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

export default Bereich;