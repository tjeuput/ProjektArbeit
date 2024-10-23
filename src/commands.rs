
use crate::database::create_connection;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use rusqlite;

#[derive(Serialize, Deserialize)]
struct db_result_tb_dienstplan{
    id_bereich: i32,
    bereichabkuerzung: String,
    bereichsname: String,
    name: String,
    schedule_id: i32,
    id_employee: i32,
    date_id: i32,
    id_group: i32,
    session_id: i32,
    dienst_name: String,
    start_time: String,
    end_time: String,
    color_name: String,
}

#[derive(Clone, Debug, Serialize)]
struct Resource {
    id: String,
    name: String,
    title: String,
    parentId: Option<String>,
    group_only: bool,
}

#[derive(Clone, Debug, Serialize)]
struct Event {
    id: String,
    start: String,
    end: String,
    resourceId: String,
    title: String,
    bgColor: String,
}

#[derive(Serialize)]
pub struct MitarbeiterSchichtplan{
    pub resources: Vec<Resource>,
    pub events: Vec<Event>,
}


#[tauri::command]
pub fn get_table_schedule(db: &DbConnection, offset: usize, limit: usize) ->  Result<String, rusqlite::Error>{

    let conn = create_connection().map_err(|e| InvokeError::new(&e.to_string()))?;

    let sql = format!("
    SELECT 
        b.id_Bereich, 
        b.Bereichsabkuerzung, 
        b.Bereichsname, 
        e.name,
        schedule_id, 
        e.id_employee, 
        s.date_id, 
        e.id_group, 
        s.session_id, 
        ss.name as dienst,
        CAST(dt.date as TEXT) || ' ' || ss.start_time AS start_time,
        CAST(dt.date as TEXT) || ' ' || ss.end_time AS end_time,
        sc.color_name
        
    FROM 
        TB_SCHEDULE s
    JOIN 
        TB_EMPLOYEE e on e.id_employee = s.id_employee
    JOIN 
        TB_SESSION ss on ss.session_id = s.session_id
    JOIN 
        TB_Bereich b on b.id_Bereich = e.id_group
    LEFT JOIN 
        TB_DATE dt on dt.date_id = s.date_id
    JOIN
        TB_SESSION_COLOR sc on ss.session_id = sc.session_id
    ORDER BY 
        s.date_id ASC
    LIMIT ?
    OFFSET ?;", 
    offset, limit);
    let mut stmt = conn.prepare(&sql).map_err(|e| ErrMsg::new(&format!("Failed to prepare statement: {}", e)))?;

    let db_results = stmt.query_map(rusqlite::params![limit,offset], |row| {
            Ok(db_result_tb_dienstplan {
                id_bereich: row.get(0)?,
                bereichabkuerzung: row.get(1)?,
                bereichsname: row.get(2)?,
                name: row.get(3)?,
                schedule_id: row.get(4)?,
                id_employee: row.get(5)?,
                date_id: row.get(6)?,
                id_group: row.get(7)?,
                session_id: row.get(8)?,
                dienst_name: row.get(9)?,
                start_time: row.get(10)?,
                end_time: row.get(11)?,
                color_name: row.get(12)?,
            })
        }).map_err(|e|ErrMsg::new(&format!("Failed to query:{}", e)))?;
    
        let mut resources: Vec<Resource> = Vec::new();
        let mut groups: HashMap<i32, String> = HashMap::new();  // To store group names with Bereich ID as key
        let mut events: Vec<Event> = Vec::new();
    
        for result in db_results {
            let data = result.map_err(|e|ErrMsg::new(&format!("Failed to iterate db result:{}", e)))?;
            if !groups.contains_key(&data.id_bereich) {
                groups.insert(data.id_bereich, data.bereichsname.clone());
                resources.push(Resource {
                    id: format!("group{}", data.id_bereich),
                    name: data.bereichsname.clone(),
                    title: data.bereichsname,
                    parentId: None,
                    group_only: true,
                });
            }
            resources.push(Resource {
                id: data.id_employee.to_string(),
                name: data.name.clone(),
                title: data.name,
                parentId: Some(format!("group{}", data.id_bereich)),
                group_only: false,
            });
            events.push(Event {
                id: data.schedule_id.to_string(),
                start: data.start_time.clone(),
                end: data.end_time.clone(),
                resourceId: data.id_employee.to_string(),
                title: data.dienst_name.clone(),
                bgColor: data.color_name.clone(),
            });
        }
    
        let schichtplan = MitarbeiterSchichtplan {
            resources,
            events,
        };
    
        // Serialize data structure to JSON string
        serde_json::to_string(&schichtplan).map_err(|e|ErrMsg::new(&format!("Failed to serialize data structure to JSON:{}", e)))?;
        
    }







