import { Column } from 'react-table';
import { Months, Days} from './helper';

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
                    columns: [
                        {Header: `${indexDay + 1}.${monthIndex}`,
                        accessor: `d-${indexDay + 1}-${monthIndex}`}
                    ]
                } 
            })
        }
    }
})

}
 

export default HeaderItem;