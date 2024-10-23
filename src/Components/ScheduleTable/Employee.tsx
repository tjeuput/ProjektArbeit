

interface TableData {
   
    [key: string] : string | number;
    
  
  }


export default function generateDayKeys(Months: Month[], Employees: Employee[]): TableData[] {
    const dailyTag = Months.slice(1).flatMap((month, indexMonth) => {
        return Array.from({ length: month.days }, (_, indexDay) => `d-${indexDay + 1}-${indexMonth + 1}`);
    });
    
    return Employees.flatMap((eSchedule) => {

        const plan = eSchedule.plan;
        const actual = eSchedule.actual;
        const dataPlan : TableData = {};
        const dataActual : TableData = {};
        dataPlan['hemployee'] = eSchedule.rest;
        dataPlan['hemployee2'] = eSchedule.firstName;
        plan.forEach((tag: string, index: number) => {
        const key = dailyTag[index];
        dataPlan[key] = tag;
        });

    // For actual
        dataActual['hemployee'] = eSchedule.rum;
        dataActual['hemployee2'] = eSchedule.lastName;
        dailyTag.forEach((key:string, index:number) => {
        dataActual[key] = actual[index];
        });

   
       console.log([dataActual,dataPlan]);
       return [dataActual,dataPlan];
      

        
    })
   
}




