import React, { useState, useEffect } from 'react';
import { Column } from 'react-table';
import { Select } from 'antd';
import { Months, Days} from './helper';
import { fetchSchichten } from '../../services/api';
import { Schicht } from '../../types';

interface DayData{
  date: string;
  dayOfWeek: string;
}

type TableData = {
  [key: string]: DayData | string;
  year: string;
  employee: string;
  'hemployee': string;
}
// Custom cell renderer component for dropdown
const DropdownCell = ({ value, row, column }) => {
    const [schichten, setSchichten] = useState<Schicht[]>([]);
    useEffect(() => {
    fetchSchichten()
      .then((data) => {
        setSchichten(data);
        console.log(data);
      })
      .catch((error) => {
        console.error('Error fetching schichten:', error);
      });
  }, []);
    return (
      <Select 
        defaultValue={value}
        style={{ width: '100%' }}
        onChange={(newValue) => {
          // Handle change if needed
          console.log('Changed value:', newValue, 'for row:', row, 'column:', column);
        }}
      >
        {schichten.map(schicht => (
          <Select.Option key={schicht.schicht_id} value={schicht.bezeichnung}>
            {schicht.bezeichnung}
          </Select.Option>
        ))}
      </Select>
    );
  };

const HeaderItem = (): Column<TableData>[] => {
  return Months.map((month, monthIndex)=>{
    if(monthIndex === 0){
        return {
        Header: `${month.name}`,
        accessor: 'year',
        columns:[
            {Header : "", accessor: "employee",
                columns: [
                    {Header: "", accessor: "hemployee"},
                    {Header:"", accessor:"hemployee2"}
                ]
            }],

        }
    } else {
        return {
            Header: `${month.name}`,
            accessor: `Month${monthIndex}`,
            columns: Array.from({length: month.days}, (_, indexDay) =>{
                const dayOfWeek = (month.start + indexDay) % 7;
                return {
                    Header: Days[dayOfWeek],
                    accessor: `${month.name.toLowerCase()}-${indexDay + 1}`,
                    columns: [{
                      Header: `${indexDay + 1}.${monthIndex}`,
                      accessor: `d-${indexDay + 1}-${monthIndex}`,
                      Cell: DropdownCell
                    }]
                  };
                })
              };
            }
          });
        };
 console.log(DropdownCell);

export default HeaderItem;