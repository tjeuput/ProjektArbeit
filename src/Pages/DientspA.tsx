import React, { useState, useEffect } from "react";
import { Table, Space, Button, Card } from "antd";
import { Content } from "antd/es/layout/layout";
import MonthsHeader from "../Components/ScheduleTable/ScheduleTblAnt";
import { invoke } from "@tauri-apps/api/tauri";
import { Months } from "../Components/ScheduleTable/helper";

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
  rest?: number;
  restUm?: number;
  name: string;
  [key: string]: number | string;
}

const DienstpA: React.FC = () => {
 
  const area = 3;

  const columns = MonthsHeader();
  //console.log("months header is", MonthsHeader());

  const [schedule, setSchedule] = useState<MappedEmployee[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule(area);
  }, []);

  // function to scroll to today's date when a button is clicked
  const scrollToKey = (key: string) => {
    const tableElement = document.querySelector(".ant-table-thead"); // Get th wrapper (the header)

    if (tableElement) {
      const headerElement = tableElement.querySelector(`th[data-key="${key}"]`); // Find the header cell with the specific key

      if (headerElement) {
        headerElement.scrollIntoView({
          behavior: "smooth",
          inline: "center", // Scroll horizontally to center the header cell
        });
      } else {
        console.warn(`Header element with key '${key}' not found.`);
      }
    } else {
      console.warn("Table element not found.");
    }
  };

  // function to get today's date
  const getToday: () => string = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    // Creating the formatted string in 'month-day' format using Months in helper
    const todayIs = `${Months[month]["name"]}-${day}`;
    return todayIs.toLocaleLowerCase();
  };
  console.log(getToday());

  const fetchSchedule = async (selectedArea) => {
    
    try {

      setLoading(true);
      // Fetch data from get_table_schedule
      const tableScheduleResponse = await invoke<string>("get_table_schedule_area", {area : selectedArea});
      console.log(
        "Debug: Received response from get_table_schedule:",
        tableScheduleResponse
      );
      const parsedTableSchedule: Employee[] = JSON.parse(tableScheduleResponse);

      // Fetch data from get_employee_count
      const employeeCountResponse = await invoke<string>(
        "get_employee_daily_count_area",  {area : selectedArea}
      );
      console.log(
        "Debug: Received response from get_employee_count:",
        employeeCountResponse
      );
      const parsedEmployeeCount: { name: string; [key: string]: number } =
        JSON.parse(employeeCountResponse);

      // Merge the data from both APIs
      const mappedData: MappedEmployee[] = [
        ...parsedTableSchedule.flatMap((employee, index) => {
          if (!employee) {
            console.error(`Employee at index ${index} is undefined`);
            return [];
          }

          const baseEmployee: MappedEmployee = {
            key: index ,
            rest: employee.rest_2023 ?? 0,
            restUm: employee.rum_rest ?? 0,
            name: employee.name ?? "Unknown",
          };

          employee.sessions_planned?.forEach((session, idx) => {
            baseEmployee[`${idx + 1}`] = session;
          });

          const updatedEmployee: MappedEmployee = {
            key: index ,
            rest: employee.year_holiday ?? 0,
            restUm: employee.um_planned ?? 0,
            name: employee.last_name ?? "Unknown",
          };

          employee.sessions_updated?.forEach((session, idx) => {
            updatedEmployee[`${idx + 1}`] = session;
          });

          return [baseEmployee, updatedEmployee];
        }),
        {
          key: 0,
          name: "Mitarbeiter am Meldetag",
          ...parsedEmployeeCount,
        },
      ];

      setSchedule(mappedData);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const getRowClassName = (record: MappedEmployee, index: number) => {
    return index % 2 ? "employee-row-bottom" : "employee-row-top";
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Card>
        <Button type="primary" onClick={() => scrollToKey(getToday())}>
          Heute
        </Button>
        <Content
          style={{
            margin: "8px 8px 8px",
            padding: 20,
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            width: "100%",
            overflowX: "auto",
          }}
        >
          <Table
            columns={columns}
            dataSource={schedule}
            bordered
            size="small"
            scroll={{ x: "calc(700px + 50%)" }}
            rowClassName={getRowClassName}
            pagination={false}
            loading={loading}
          />
        </Content>
      </Card>
    </Space>
  );
};

export default DienstpA;
