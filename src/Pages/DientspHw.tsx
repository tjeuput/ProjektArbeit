import React, { useState, useEffect } from 'react';
import { Button, Select, Form, Input, DatePicker, Cascader, Typography } from 'antd';
import { invoke } from '@tauri-apps/api/tauri';

const { RangePicker } = DatePicker;

const formItemLayout = {
    labelCol: {
        xs: { span: 24 },
        sm: { span: 6 }
    },
    wrapperCol: {
        xs: { span: 24 },
        sm: { span: 14 }
    }
}

const DienstpHw: React.FC = () => {
    const [groupOptions, setGroupOptions] = useState([]);

    const fetchGroup = async () => {
        try {
            const response = await invoke("get_group");
            const group  = JSON.parse(response);

            console.log(group);
            
            
            const options = group.map(g => ({
                value: g.id_group,
                label: g.group_label
            }));
            
            setGroupOptions(options);
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    };

    useEffect(() => {
        fetchGroup();
    }, []);

    const [sessionOptions, setSessionOptions] = useState([]);

    const fetchSession = async () => {
        try {
            const response = await invoke("get_session");
            const sessions  = JSON.parse(response);

            console.log(sessions);
            
            
            const options = sessions.map( session => ({
                value: session.session_id,
                label:session.session_name
            }));
            
            setSessionOptions(options);
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    };

    useEffect(() => {
        fetchSession();
    }, []);

    return (
        <>
            <Typography> Wöchenlichezyklus </Typography>
            <Form {...formItemLayout} variant="filled" style={{ maxWidth: 600 }}>
                <Form.Item label="Gruppe für Diestplan" name="group" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={groupOptions} />
                </Form.Item>
                <Form.Item label="Mo" name="mo" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="Di" name="di" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="Mi" name="mi" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="Do" name="do" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="Fr" name="fr" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="Sa" name="sa" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="So" name="so" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <Select options={sessionOptions} />
                </Form.Item>
                <Form.Item label="Datumsauswahl" name="rangepicker" rules={[{ required: true, message: 'Bitte eingeben!' }]}>
                    <RangePicker />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
                    <Button type='primary' htmlType='submit'>Zuweisen</Button>
                </Form.Item>
            </Form>
        </>
    );
};

export default DienstpHw;