import React from "react";
import {Select} from 'antd';

interface ZeitraumSelectProps {
    value?: number;
    onChange?: (value: number) => void;
}

const ZeitraumSelect: React.FC<ZeitraumSelectProps> = ({value, onChange}) => {
    const zeitraeume = [
        {value: 14, label: "14 Tage"},
        {value: 28, label: "28 Tage"},
        {value: 42, label: "42 Tage"},
        {value: 63, label: "63 Tage"},
    ];

    return (
        <Select
            className="w-full"
            value={value}
            onChange={onChange}
            options={zeitraeume}
        />
    );
};

export default ZeitraumSelect;