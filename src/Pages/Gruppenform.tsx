import React, { useState } from 'react';
import { Table, Input, Button, Popconfirm, Form, Select, InputNumber, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

type DataSourceType = {
  key: React.Key;
  idGroup: number;
  groupLabel: string;
  minGroupSize: number;
  groupColor: string;
};

const defaultData: DataSourceType[] = [
  {
    key: 1,
    idGroup: 1,
    groupLabel: "Gelb",
    minGroupSize:0,
    groupColor: "#FFFF00",

  },
  {
    key: 2,
    idGroup: 2,
    groupLabel: "Blau",
    minGroupSize: 0,
    groupColor: "#9BC2E6",
  },
];

const Gruppenform = () => {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState<DataSourceType[]>(defaultData);
  const [editingKey, setEditingKey] = useState<React.Key>('');

  const isEditing = (record: DataSourceType) => record.key === editingKey;

  const edit = (record: Partial<DataSourceType> & { key: React.Key }) => {
    form.setFieldsValue({ idGroup: '', groupLabel: '', minGroupSize: '', groupColor: '',  ...record });
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
      title: 'Id Gruppe',
      dataIndex: 'idGroup',
      editable: true,
    },
    {
      title: 'Guppenbetitelung',
      dataIndex: 'groupLabel',
      editable: true,
    },
    {
      title: 'Gruppen Mindestanzahl',
      dataIndex: 'minGroupSize',
      editable: true,
    },
    
    
    {
      title: 'Aktion',
      dataIndex: 'operation',
      render: (_: any, record: DataSourceType) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Button onClick={() => save(record.key)} style={{ marginRight: 8 }}>
              Speichen
            </Button>
            <Popconfirm title="Sicher zu abbrechen?" onConfirm={cancel}>
              <Button>Abbrechen</Button>
            </Popconfirm>
          </span>
        ) : (
          <span>
            <Button disabled={editingKey !== ''} onClick={() => edit(record)} style={{ marginRight: 8 }}>
              Bearbeiten
            </Button>
            <Popconfirm title="Sicher zu löschen?" onConfirm={() => setDataSource(dataSource.filter((item) => item.key !== record.key))}>
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
        inputType: col.dataIndex === 'idGroup' || col.dataIndex === 'minGroupSize'? 'number' : 'text',
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
    const inputNode = ( <Input />);
    
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[{ required: true, message: `Please enter ${title}!` }]}
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

export default Gruppenform;
