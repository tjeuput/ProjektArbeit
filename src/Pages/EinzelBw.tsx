
import { DatePicker, Typography, Card, Space, Input, Col, Row, Button } from 'antd';

import { Content } from 'antd/es/layout/layout';
import React from 'react';
import EinzelauszugATbl from './EinzelATbl';



const EinzelBw: React.FC = () => {
    

    return (
        <>
        
            <Space direction="vertical" style={{ width: '100%' }}>
               
                <Content style={{
                    margin: '24px 16px',
                    padding: 24,
                    minHeight: 280,
                    display: 'flex',
                }}>
                    
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Card>
                            <Space direction="vertical">
                                <Space>
                                    <Typography>Monat: </Typography>
                                    <DatePicker picker="year" />
                                    <Input></Input>
                                    <Button>Herunterladen</Button>
                                </Space>
                            </Space>
                            </Card>
                        <Card>
                            <Row gutter={16}>
                                <Col className='gutter-row' span={6}>
                                    <div>Um Gesamt: 31 </div>
                                </Col>
                                <Col className='gutter-row' span={6}>
                                    <div> Krank: 5 </div>
                                </Col>
                                <Col className='gutter-row' span={6}>
                                    <div> Resturlaub: 0 </div>
                                </Col>
                                <Col className='gutter-row' span={6}>
                                    <div> Krank o. Attest : 20 </div>
                                </Col>
                            </Row>
                        </Card>
                        <Card>
                            <EinzelauszugATbl></EinzelauszugATbl>
                        </Card>
                    </Space>
                </Content>
            </Space>
        </>
    );
};

        
 
export default EinzelBw;
