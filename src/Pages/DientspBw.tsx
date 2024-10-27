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
  [key: string]: number | string | undefined;
}

const DienstplanBw: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<number>(3);
  const columns = MonthsHeader();
  const [schedule, setSchedule] = useState<MappedEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [selectedArea]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      
      const tableScheduleResponse = await invoke<string>("get_table_schedule_area", {
        area: selectedArea
      });
      
      console.log(
        "Debug: Received table schedule response:",
        tableScheduleResponse
      );
      const parsedTableSchedule: Employee[] = JSON.parse(tableScheduleResponse);

      const employeeCountResponse = await invoke<string>(
        "get_employee_daily_count_area", 
        {area: selectedArea}
      );
      
      console.log(
        "Debug: Received employee count response:",
        employeeCountResponse
      );
      const parsedEmployeeCount: { [key: string]: number } = 
        JSON.parse(employeeCountResponse);

      // Merge the data from both APIs
      const mappedData: MappedEmployee[] = [
        ...parsedTableSchedule.flatMap((employee, index) => {
          if (!employee) {
            console.error(`Employee at index ${index} is undefined`);
            return [];
          }

          // Create base employee row (Plan)
          const baseEmployee: MappedEmployee = {
            key: index * 2 + 1,
            rest: employee.rest_2023 ?? 0,
            restUm: employee.rum_rest ?? 0,
            name: employee.name ?? "Unknown",
          };

          // Fill in planned sessions
          if (employee.sessions_planned) {
            employee.sessions_planned.forEach((session, idx) => {
              if (session && session !== 'null') {
                // Add 1 to idx since our column keys are 1-based
                baseEmployee[`${idx + 1}`] = session;
              }
            });
          }
          
          // Create updated sessions row
          const updatedEmployee: MappedEmployee = {
            key: index * 2 + 2,
            rest: employee.year_holiday ?? 0,
            restUm: employee.um_planned ?? 0,
            name: employee.last_name ?? "Unknown",
          };

          // Fill in updated sessions, maintaining original empty cells
          if (employee.sessions_updated) {
            employee.sessions_updated.forEach((session, idx) => {
              // Only set value if it's actually updated (not null)
              if (session && session !== 'null') {
                // Add 1 to idx since our column keys are 1-based
                updatedEmployee[`${idx + 1}`] = session;
              }
            });
          }

          return [baseEmployee, updatedEmployee];
        }),
        // Add the employee count row at the bottom
        {
          key: -1, // Use negative key to ensure it's always last
          name: "Mitarbeiter am Meldetag",
          ...Object.entries(parsedEmployeeCount).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value
          }), {})
        }
      ];

      console.log("Debug: Mapped data:", mappedData);
      setSchedule(mappedData);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const getRowClassName = (record: MappedEmployee, index: number) => {
    if (record.key === -1) return "count-row";
    return record.key % 2 === 0 ? "employee-row-bottom" : "employee-row-top";
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

export default DienstplanBw;