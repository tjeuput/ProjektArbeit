import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';



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

interface EmployeeCount {
  name: string;
  [key: string]: number | string; // Allowing both number and string for flexibility
}

const EinzelHw: React.FC = () => {
  const [schedule, setSchedule] = useState<MappedEmployee[]>([]);

  const fetchEmployeeDaily = async () => {
    try {
      const response = await invoke<string>("get_employee_daily_count");
      
      const parsedResponse = JSON.parse(response);
    
      // Map the parsed JSON to the EmployeeCount interface
      const employeeCountMapped: EmployeeCount[] = {
  ...parsedResponse,
  name: "Mirarbeiter am Meldetag"
        
      }

      console.log("count map", employeeCountMapped);

    } catch (error){
      console.log("error fetching employee daily:", error);
    }
  };

  useEffect(()=>{
    fetchEmployeeDaily();
  }, []
)

  const fetchSchedule = async () => {
    try {
      const response = await invoke<string>("get_table_schedule");
      //console.log("Debug: Received response:", response);

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

       
        const updatedEmployee: MappedEmployee = {
          key: index * 2 + 2,
          rest: employee.year_holiday ?? 0,
          restUm: employee.um_planned ?? 0,
          name: employee.last_name ?? 'Unknown',
        };

        return [baseEmployee, updatedEmployee];
      });
      //console.log("Mapped data is:", mappedData);
      setSchedule(mappedData);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setSchedule([]);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <></>
  );
}

export default EinzelHw;
