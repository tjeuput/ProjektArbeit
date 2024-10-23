import React, { useState } from 'react';
import { Table, Input, Button, Popconfirm, Form } from 'antd';

type DataSourceType = {
  key: React.Key;
  sessionId : number;
  name: string;
  startTime: string;
  endTime: string;
};

const defaultData: DataSourceType[] = [
  {
    key: 1,
    sessionId : 1,
    name: '1',
    startTime: '06:00:00',
    endTime: '14:00:00',
  },
  {
    key: 2,
    sessionId : 2,
    name: '2',
    startTime: '14:00:00',
    endTime: '22:00:00',
  },
];

const Schichtform: React.FC = () => {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState<DataSourceType[]>(defaultData);
  const [editingKey, setEditingKey] = useState<React.Key>('');

  const isEditing = (record: DataSourceType) => record.key === editingKey;

  const edit = (record: Partial<DataSourceType> & { key: React.Key }) => {
    form.setFieldsValue({ sessionId: 1, name: '', startTime: '',endTime:'', ...record });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as DataSourceType;
      const newData = [...dataSource];
      const index = newData.findIndex((item) => key === item.key);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        setDataSource(newData);
        setEditingKey('');
      } else {
        newData.push(row);
        setDataSource(newData);
        setEditingKey('');
      }
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
    }
  };

  const columns = [
    {
      title: 'Id Schichtplan',
      dataIndex: 'sessionId',
      editable: true,
    },
    {
      title: 'Schichtplan',
      dataIndex: 'name',
      editable: true,
    },
    {
      title: 'Schicht Start',
      dataIndex: 'startTime',
      editable: true,
    },
    {
      title: 'Schicht Ende',
      dataIndex: 'endTime',
      editable: true,
      
    },
  

    {
      title: 'Action',
      dataIndex: 'operation',
      render: (_: any, record: DataSourceType) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Button onClick={() => save(record.key)} style={{ marginRight: 8 }}>
              Speichern
            </Button>
            <Popconfirm title="Sicher zu Abbrechen?" onConfirm={cancel}>
              <Button>Abbrechen</Button>
            </Popconfirm>
          </span>
        ) : (
          <span>
            <Button disabled={editingKey !== ''} onClick={() => edit(record)} style={{ marginRight: 8 }}>
              Bearbeiten
            </Button>
            <Popconfirm title="Sicher zu Löschen?" onConfirm={() => setDataSource(dataSource.filter((item) => item.key !== record.key))}>
              <Button>Löschen</Button>
            </Popconfirm>
          </span>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: DataSourceType) => ({
        record,
        inputType: col.dataIndex === 'session_id' ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const EditableCell: React.FC<any> = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
  }) => {
    const inputNode =(
        <Input />
      );
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[{ required: true, message: `Bitte ${title} eintragen!` }]}
          >
            {inputNode}
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  return (
    <>
      
      <Form form={form} component={false}>
        <Table
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={dataSource}
          columns={mergedColumns}
          rowClassName="editable-row"
          pagination={{
            onChange: cancel,
          }}
        />
      </Form>
      
    </>
  );
};

export default Schichtform;
