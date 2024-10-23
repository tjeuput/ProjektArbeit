
import { Card, Space, Tabs} from 'antd';
import React, { useState } from 'react';
import Schichtform from './Schichtform';



const Schichtart: React.FC = () => {
    const { TabPane } = Tabs;
    const [tabs, setTabs] = useState([
        { key: '1', title: 'Schichtart', content: <Schichtform/> },
        { key: '2', title: 'Neue Schicht', content: 'Neue Schichtart hinzufügem' },

    ])

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

        
 
export default Schichtart;
