
import { Card, Space, Tabs } from 'antd';
import { Content } from 'antd/es/layout/layout';
import React, { useState } from 'react';
import Gruppenform from './Gruppenform';



const Gruppe: React.FC = () => {
    const { TabPane } = Tabs;
    const [tabs, setTabs] = useState([
        { key: '1', title: 'Gruppen', content: <Gruppenform /> },
        { key: '2', title: 'Neue Gruppe', content: "Neue Gruppe hinzufügen" }
    ]);

    return (
        <>

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
        </>
    );
};



export default Gruppe;
