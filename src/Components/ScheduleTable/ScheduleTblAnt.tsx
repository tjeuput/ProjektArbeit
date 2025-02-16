import React, { useState, useEffect } from 'react';
import { Select } from 'antd';
import { Months, Days } from './helper';
import './ScheduleTblAnt.css';
import { fetchSchichten } from '../../services/api';
import { Schicht } from '../../types';


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


const MonthsHeader = () => {
  let currentDay = 0;
  return Months.map((month, index) => {
 
    if (index === 0) {
      return {
        title: `${month.name}`,
        
        children: [
          {
            title: 'Um',
            dataIndex: 'um',
            key: 'um',
            width: 50,
            fixed:'left',
            children: [
              {
                title: 'Rest',
                dataIndex: 'rest',
                key: 'rest',
                width: 50,
                fixed:'left',
              
              }
            ]
          },
          {
            title: 'Um Plan',
            dataIndex: 'umPlanned',
            key: 'umPlanned',
            width: 50,
            fixed:'left',
            children: [
              {
                title: 'Rest Um',
                dataIndex: 'restUm',
                key: 'restUm',
                width: 50,
                fixed:'left',
             
             
              }
            ]
          },
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 100,
            fixed:'left',
            
          },
         
        ],
        
      } 
    } else {
      return {
        
        title: `${month.name}`,
        children: Array.from({ length: month.days }, (_, indexDay) => {
          const dayOfWeek = (month.start + indexDay) % 7;
          currentDay = currentDay + 1;
          return {
            title: Days[dayOfWeek],
            
            dataIndex: `${month.name.toLowerCase()}-${indexDay + 1}`,
            key: `${month.name.toLowerCase()}-${indexDay + 1}`, // this is what I want to go, the header
            className: dayOfWeek=== 6 || dayOfWeek === 0 ? 'weekend-cell':undefined,
            width: 75,
            children: [
              {
                title: `${indexDay + 1}.${index}`,
                dataIndex: `${currentDay}`,
                className: dayOfWeek === 6 || dayOfWeek === 0 ? 'weekend-cell' : undefined,
                width: 75,
                onHeaderCell: () => ({ 'data-key': `${month.name.toLowerCase()}-${indexDay + 1}` }),
                 render: (value, record, index) => (
                  <DropdownCell value={value} record={record} index={index} />
                )
                
              }
            ]
          } 
        })
      } 
    }
  });
};

export default MonthsHeader;