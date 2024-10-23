import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Table, Input, Button, Popconfirm, Form, Select, InputNumber, Spin } from 'antd';

import { invoke } from '@tauri-apps/api/tauri';

interface EditableCellProps {
  editing: boolean;
  dataIndex: string;
  title: string;
  inputType: 'number' | 'text';
  record: any; 
  index: number;
  children: React.ReactNode;
  [key: string]: any; 
}

interface EmployeeForm {
  key: React.Key;
  employee_number: string;
  name: string;
  last_name: string;
  id_area: number;
  id_group: number;
  year_holiday: number | null;
}

const Mitarbeiterbogen = () => {

  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState<EmployeeForm[]>([]);
  const [editingKey, setEditingKey] = useState<React.Key>('');
  const [loading, setLoading] = useState(true);
  const [tableHeight, setTableHeight] = useState(400);

  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTableHeight = () => {
      if (tableRef.current) {
        const windowHeight = window.innerHeight;
        const tableTop = tableRef.current.getBoundingClientRect().top;
        setTableHeight(windowHeight - tableTop - 20); // 20px for some bottom margin
      }
    };

    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);

    return () => window.removeEventListener('resize', updateTableHeight);
  }, []);

  const fetchEmployee = async (page = 1, pageSize = 50) => {
    try {
      setLoading(true);
      const response = await invoke("get_employees", { page, pageSize });
      
      console.log("Response is", response);
  
      const { employees, total_count } = JSON.parse(response);
  
      const employeesWithKeys = employees.map((e, idx) => ({
        ...e,
        key: (page - 1) * pageSize + idx,
      }));
      
      setDataSource(employeesWithKeys);
      setPagination(prev => ({ ...prev, current: page, total: total_count }));
      
    } catch (error) {
      console.error("Error fetching employee form:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee(pagination.current, pagination.pageSize);
  }, [pagination.current, pagination.pageSize]);

  const isEditing = (record: EmployeeForm) => record.key === editingKey;

  const edit = (record: EmployeeForm) => {
    form.setFieldsValue({
      employee_number: record.employee_number,
      name: record.name,
      last_name: record.last_name,
      id_area: record.id_area,
      id_group: record.id_group,
      year_holiday: record.year_holiday,
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (key: React.Key) => {
    try {
      const row = await form.validateFields() as EmployeeForm;
      const newData = [...dataSource];
      const index = newData.findIndex((item) => key === item.key);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        setDataSource(newData);
        setEditingKey('');

        // Save the updated employee record to the backend
        await invoke('set_employee', {
          employee: {
            employee_number: row.employee_number,
            name: row.name,
            last_name: row.last_name,
            id_area: row.id_area,
            id_group: row.id_group,
            year_holiday: row.year_holiday
          }
        });
      }
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
    }
  };



  const columns = useMemo(() => [
    {
      title: 'No',
      dataIndex: 'key',
      width: 30,
      editable: false,
      render: (_, __, index) => index + 1 + (pagination.current - 1) * pagination.pageSize,
    },
    {
      title: 'Dienstausweisnummer',
      dataIndex: 'employee_number',
      width: 40,
      editable: true,
    },
    {
      title: 'Vorname',
      dataIndex: 'name',
      editable: true,
    },
    {
      title: 'Nachname',
      dataIndex: 'last_name',
      editable: true,
    },
    {
      title: 'Bereich',
      dataIndex: 'id_area',
      editable: true,
      render: (text: number, record: EmployeeForm) => {
        const groups = { 1: 'Gelbe', 2: 'Blau', 3: 'Grau' };
        return isEditing(record) ? (
          <Select defaultValue={text} style={{ width: 120 }}>
            {Object.entries(groups).map(([id, name]) => (
              <Select.Option key={id} value={parseInt(id)}>{name}</Select.Option>
            ))}
          </Select>
        ) : groups[text as keyof typeof groups];
      },
    },
    {
      title: 'Gruppe',
      dataIndex: 'id_group',
      editable: true,
      render: (text: number, record: EmployeeForm) => {
        const groups = { 1: 'HW', 2: 'BW', 3: 'A' };
        return isEditing(record) ? (
          <Select defaultValue={groups[text as keyof typeof groups]} style={{ width: 120 }}>
            {Object.entries(groups).map(([id, name]) => (
              <Select.Option key={id} value={id}>{name}</Select.Option>
            ))}
          </Select>
        ): groups[text as keyof typeof groups];
      },
    },
    {
      title: 'Jahresurlaub',
      dataIndex: 'year_holiday',
      editable: true,
      render: (text: number | null, record: EmployeeForm) => 
        isEditing(record) ? <InputNumber defaultValue={text || 0} /> : text,
    },
    {
      title: 'Aktion',
      dataIndex: 'operation',
      width: 200,
      render: (_: any, record: EmployeeForm) => {
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
            <Button onClick={() => edit(record)} style={{ marginRight: 8 }}>
              Edit
            </Button>
            <Popconfirm title="Sicher zu Löschen?" onConfirm={() => handleDelete(record.key)}>
              <Button>Delete</Button>
            </Popconfirm>
          </span>
        );
      },
    },
  ], [dataSource, editingKey,pagination.current, pagination.pageSize]);

 

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: EmployeeForm) => ({
        record,
        inputType: col.dataIndex === 'year_holiday' ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const handleDelete = async (key: React.Key) => {
    try {
      // Call your backend to delete the employee
      await invoke('delete_employee', { employeeNumber: dataSource.find(item => item.key === key)?.employee_number });
      
      // Update the local state
      setDataSource(prevData => prevData.filter(item => item.key !== key));
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
  }) => {
    const inputNode = inputType === 'number' ? <InputNumber /> : <Input />;
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
     
      <Form form={form} component={false}>
      <Table
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        dataSource={dataSource}
        columns={mergedColumns}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }));
            setEditingKey(''); 
          },
        }}
        loading={loading}
        rowKey="key"
      />
      </Form>
    </div>
  );
};

export default Mitarbeiterbogen;