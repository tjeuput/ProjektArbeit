import React, {useEffect, useState} from 'react';
import { Select, message } from 'antd';
import {Gruppe} from '../../types';
import {fetchGruppe} from '../../services/api'



const Gruppeauswaehlen: React.FC<{
    value?: string;
    onChange?: (value: string) => void; // Callback-Funktion, die bei Änderung der Auswahl aufgerufen wird
  }> = ({ value, onChange }) => {

    const [gruppen, setGruppe] = useState<Gruppe[]>([]);
    //Lädt die verfügbaren Gruppen beim ersten Render
    useEffect(()=>{
        fetchGruppe()
        .then((data) => {
            setGruppe(data);
        }).catch((error)=> {
            message.error(error);
        })
    },[])

    const { Option } = Select;

    return <>
    <Select 
    placeholder= "Bitte Gruppe auswählen"
    value={value}
    onChange={onChange}
    >
        {gruppen.map((gruppe) => (
            <Option 
            key={gruppe.gruppe_id} 
            value={gruppe.bezeichnung}>
                {gruppe.bezeichnung}
            </Option>
        ))}
        
    </Select></>
}

export default  Gruppeauswaehlen;