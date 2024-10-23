import React, { useState } from 'react';
import { Form, Input, Select, InputNumber, Button, message } from 'antd';
import { invoke } from '@tauri-apps/api/tauri';

const { Option } = Select;

const EmployeeForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await invoke('add_employee', { employee: values });
      if (result && result.startsWith("Employee added with ID:")) {
        messageApi.success(result);
        form.resetFields();
      } else {
        messageApi.error('Unexpected response: ' + result);
      }
    } catch (error) {
      messageApi.error('Mitarbeiter kann nicht hinzugefügt werden: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item
          name="employee_number"
          label="Dienstausweisnummer"
          rules={[{ required: true, message: 'Bitte Dienstausweisnummer eingeben!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Bitte Vorname eingeben' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="last_name"
          label="Nachname"
          rules={[{ required: true, message: 'Bitte Nachname eingeben!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="id_area"
          label="Id Bereich"
          rules={[{ required: true, message: 'Bitte Id Bereich eingeben!' }]}
        >
          <Select>
            <Option value={1}>1</Option>
            <Option value={2}>2</Option>
            <Option value={3}>3</Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="id_group"
          label="Id Gruppe"
          rules={[{ required: true, message: 'Bitte Id Gruppe eingeben!' }]}
        >
          <Select>
            <Option value={1}>1</Option>
            <Option value={2}>2</Option>
            <Option value={3}>3</Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="year_holiday"
          label="Jahresurlaub Anzahl"
          rules={[{ required: true, message: 'Bitte Jahresurlaub Anzahl eingeben!' }]}
        >
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Neu Mitarbeiter hinzufügen
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default EmployeeForm;
