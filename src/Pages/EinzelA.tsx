import React, { useState, useEffect }  from 'react';
import {  Table, Space } from 'antd';
import { Content } from 'antd/es/layout/layout';
import MonthsHeader from '../Components/ScheduleTable/ScheduleTblAnt';
import { invoke } from '@tauri-apps/api/tauri';

interface DataType{
  key: React.Key,
  
  rest:number,

  restUm:number,
  name: string,
  1 : string,
  2: string,
}


interface Employee {
  rest_2023?: number;
  rum_rest?: number;
  name?: string;
  sessions_planned?: string[];
  year_holiday?: number;
  um_planned?: number;
  last_name?: string;
  sessions_updated?: string[];
}

interface MappedEmployee {
  key: number;
  rest: number;
  restUm: number;
  name: string;
  [key: string]: number | string;
}

const EinzelA: React.FC = () => {
  const columns = MonthsHeader();
  console.log("months header is", MonthsHeader());

  const [schedule, setSchedule] = useState<MappedEmployee[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetchSchedule();
  }, []);

  const data : DataType [] = [];

      data.push({
        key: 1,
      
        rest:30,
        
        restUm: 30,
        name: "myname",
        1 : "1",
        2: "1",
        },
        {
          key: 2,
        restUm: 20,
        rest:10,
        
        name: "myname",
        1 : "1",
        2: "1",
      
        }
      
      
      
      
      )

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await invoke<string>("get_table_schedule");
      console.log("Debug: Received response:", response);

      const parsedResponse: Employee[] = JSON.parse(response);

      const mappedData: MappedEmployee[] = parsedResponse.flatMap((employee, index) => {
        if (!employee) {
          console.error(`Employee at index ${index} is undefined`);
          return [];
        }

        const baseEmployee: MappedEmployee = {
          key: index * 2 + 1,
          rest: employee.rest_2023 ?? 0,
          restUm: employee.rum_rest ?? 0,
          name: employee.name ?? 'Unknown',
        };

        employee.sessions_planned?.forEach((session, idx) => {
          baseEmployee[`${idx + 1}`] = session;
        });

        const updatedEmployee: MappedEmployee = {
          key: index * 2 + 2,
          rest: employee.year_holiday ?? 0,
          restUm: employee.um_planned ?? 0,
          name: employee.last_name ?? 'Unknown',
        };

        employee.sessions_updated?.forEach((session, idx) => {
          updatedEmployee[`${idx + 1}`] = session;
        });

        return [baseEmployee, updatedEmployee];
      });
      console.log("Mapped data is:", mappedData);
      setSchedule(mappedData);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const getRowClassName = (record: MappedEmployee, index: number) => {
    return index % 2 ? 'employee-row-bottom' : 'employee-row-top';
  };


 

  return (
    <Space direction='vertical' style={{width:'100%'}}>
      <Content style= {{margin:'8px 8px 8px',
        padding:20,
        justifyContent: 'center',
        alignItems:'center',
        display:'flex',
        width: '100%',
        overflowX:'auto'
      }}>
    <Table
      columns={columns} dataSource={schedule}
      bordered
    size="small"
    scroll={{ x: 'calc(700px + 50%)'}}
    rowClassName={getRowClassName}
    
    /></Content>
    </Space>
  )
}

export default EinzelA;
