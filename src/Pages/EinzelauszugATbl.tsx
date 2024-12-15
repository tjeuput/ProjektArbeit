import React, {useEffect, useState} from 'react';
import { Select, Table } from 'antd';
import { fetchSchichten}  from '../services/api';
import { Schicht } from '../types/index';

const EinzelauszugATbl: React.FC = () => {

   const [schichten, setSchichten] = useState<Schicht[]>([]);

    useEffect(()=>{
      fetchSchichten()
        .then((data) => {
            setSchichten(data);
            console.log(data)
        }).catch((error)=> {
            console.error('Error fetching schichten', error);
        });
    },[]);

    console.log(schichten);

   

    const { Option } = Select;

    const menu = (<Select >
      {schichten.map((schicht) => (
          <Option key={schicht.schicht_id} value={schicht.bezeichnung}>{schicht.bezeichnung}</Option>
      ))}
      
  </Select>);

  console.log(menu);

  const attribute = [
    {
      title: "Wochennummer",
      dataIndex: "woche",
      key: "0",
    },
    {
      title: "Mo",
      dataIndex: "montag",
      key: "1",
      render: () => menu,
    },
    {
      title: "Di",
      dataIndex: "dienstag",
      key: "2",

      //render: () => schichtMenu,
    },
    {
      title: "Mi",
      dataIndex: "mittwoch",
      key: "3",

      //render: () => schichtMenu,
    },
    {
      title: "Do",
      dataIndex: "donnerstag",
      key: "4",
      //render: () => schichtMenu,
    },
    {
      title: "Fr",
      dataIndex: "freitag",
      key: "5",
      //render: () => schichtMenu,
    },
    {
      title: "Sa",
      dataIndex: "samstag",
      key: "6",
      //render: () => schichtMenu,
    },
    {
      title: "So",
      dataIndex: "sonntag",
      key: "1",
      //render: () => schichtMenu,
    },
  ];

  const wochenplan = [{key: 1, 
    woche: '1. Woche',
    mo: 'fr',
    di: 'fr',
    mi: '1',
    do: '1',
    fr: '1',
    sa: 'fr',
    so: 'fr'
  }]


    return (
     <>
     <Table columns={attribute} dataSource={wochenplan}></Table>
  </>
    
    );
  }


export default EinzelauszugATbl;
