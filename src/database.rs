/*use rusqlite::{Connection, Result};

const DB_PATH: &str = "EncryptedDb.db";
const ENCRYPTION_KEY: &str = "p6%7P*KJzZpvK@jZS4Xb36hGPGMVuj@U!aDYYq6";

/* pub fn create_connection() -> Result<Connection> {
    let conn = Connection::open(DB_PATH)?;
    conn.pragma_update(None, "key", ENCRYPTION_KEY)?;
    Ok(conn)
} */

pub fn create_connection() -> Result<Connection>{
    let conn = Connection::open("ResourcesDb.db")?;
    Ok(conn)
}
the encrypted db has to be integrated later because currently I copy paste what is in tauri-sqlite repo
*/

use crate::state::ServiceAccess;
use chrono::{Datelike, Local, NaiveDate};
use log::info;
use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
use tauri::AppHandle;

const CURRENT_DB_VERSION: u32 = 2;

/// Initializes the database connection, creating the .sqlite file if needed, and upgrading the database
/// if it's out of date.
pub fn initialize_database(app_handle: &AppHandle) -> Result<Connection, rusqlite::Error> {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .expect("The app data directory should exist.");
    fs::create_dir_all(&app_dir).expect("The app data directory should be created.");

    /*  store in network drive
        // Get the network path from an environment variable or use a default
    let network_path = env::var("MY_APP_DB_PATH")
        .unwrap_or_else(|_| String::from(r"\\SERVER\Share\MyAppData"));
    let network_path = PathBuf::from(network_path);

    // Ensure the directory exists
    fs::create_dir_all(&network_path).map_err(|e| format!("Failed to create directory: {}", e))?;

    let sqlite_path = network_path.join("MyApp.sqlite");

    // Attempt to open the database with retry logic
    let mut attempts = 0;
    let max_attempts = 3;
    let mut db = loop {
        match Connection::open(&sqlite_path) {
            Ok(conn) => break conn,
            Err(e) if attempts < max_attempts => {
                attempts += 1;
                eprintln!("Failed to connect to database, retrying ({}/{}): {}", attempts, max_attempts, e);
                std::thread::sleep(std::time::Duration::from_secs(2));
            }
            Err(e) => return Err(Box::new(e)),
        }
    };

    // ... rest of the function

    Ok(db)*/

    let mut db = Connection::open("ResourcesDb.db")?;

    let mut user_pragma = db.prepare("PRAGMA user_version")?;
    let existing_user_version: u32 = user_pragma.query_row([], |row| Ok(row.get(0)?))?;
    drop(user_pragma);

    upgrade_database_if_needed(&mut db, existing_user_version)?;

    Ok(db)
}

/// Upgrades the database to the current version.
pub fn upgrade_database_if_needed(
    db: &mut Connection,
    existing_version: u32,
) -> Result<(), rusqlite::Error> {
    if existing_version == 1 {
        db.pragma_update(None, "journal_mode", "WAL")?;

    
        // First check if tables exist
        let table_exist= db.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tb_area'",
            [],
            |row| row.get::<_, i32>(0)
        )? > 0;

        let tx = db.transaction()?;

        

        if !table_exist {

             // Create tables for fresh database
             println!("Creating tables for fresh database...");
             tx.execute_batch("CREATE TABLE tb_area (
	    id_area	INTEGER NOT NULL UNIQUE,
	    name_area	TEXT,
	    abbr_area	TEXT,
	    PRIMARY KEY(id_area AUTOINCREMENT)
        );
        CREATE TABLE TB_DATE (
            date_id	INTEGER,
            date	DATE NOT NULL,
            day_of_week	TEXT NOT NULL,
            PRIMARY KEY(date_id AUTOINCREMENT)
        );
        CREATE TABLE TB_GROUP (
        id_group	INTEGER NOT NULL UNIQUE,
        group_label	TEXT,
        min_size	INT,
        group_color	TEXT,
        PRIMARY KEY(id_group AUTOINCREMENT)
        );
        CREATE TABLE TB_LEGENDE (
        id_legende	INTEGER,
        abkuerzung	TEXT NOT NULL,
        beschreibung	TEXT NOT NULL,
        PRIMARY KEY(id_legende AUTOINCREMENT)
        );
        CREATE TABLE TB_SESSION (
        session_id	INTEGER,
        name	TEXT NOT NULL,
        start_time	TEXT NOT NULL,
        end_time	TEXT NOT NULL,
        PRIMARY KEY(session_id AUTOINCREMENT)
        );
        CREATE TABLE TB_EMPLOYEE (
        id_employee	INTEGER,
        employee_number	TEXT,
        name	TEXT NOT NULL,
        last_name	TEXT,
        id_group	INTEGER NOT NULL,
        id_area	INTEGER NOT NULL,
        FOREIGN KEY(id_group) REFERENCES TB_GROUP(id_group),
        FOREIGN KEY(id_area) REFERENCES TB_AREA(id_area),
        PRIMARY KEY(id_employee AUTOINCREMENT)
        );
        CREATE TABLE TB_YEAR_HOLIDAY (
        id_holiday	INTEGER,
        id_employee	INTEGER NOT NULL,
        year_holiday	INTEGER NOT NULL,
        year	INTEGER NOT NULL,
        PRIMARY KEY(id_holiday AUTOINCREMENT),
        FOREIGN KEY(id_employee) REFERENCES TB_EMPLOYEE(id_employee)
        );
        CREATE TABLE TB_SCHEDULE_2024 (
        schedule_id	INTEGER,
        id_employee	INTEGER NOT NULL,
        date_id	INTEGER NOT NULL,
        session_id	INTEGER NOT NULL,
        updated_session_id	INTEGER,
        FOREIGN KEY(date_id) REFERENCES TB_DATE(date_id),
        FOREIGN KEY(id_employee) REFERENCES TB_EMPLOYEE(id_employee),
        FOREIGN KEY(session_id) REFERENCES TB_SESSION(session_id),
        PRIMARY KEY(schedule_id AUTOINCREMENT)
        );
        CREATE TABLE TB_SCHEDULE_2023 (
        schedule_id	INTEGER,
        id_employee	INTEGER NOT NULL,
        date_id	INTEGER NOT NULL,
        session_id	INTEGER NOT NULL,
        updated_session_id	INTEGER,
        PRIMARY KEY(schedule_id AUTOINCREMENT),
        FOREIGN KEY(session_id) REFERENCES TB_SESSION(session_id),
        FOREIGN KEY(id_employee) REFERENCES TB_EMPLOYEE(id_employee),
        FOREIGN KEY(date_id) REFERENCES TB_DATE(date_id)
        );"
        )?;

        }

        // Always try to create indexes
        println!("Creating indexes...");
        tx.execute_batch(
            "
            CREATE INDEX IF NOT EXISTS idx_employee_area 
            ON TB_EMPLOYEE(id_area, id_employee);

            CREATE INDEX IF NOT EXISTS idx_year_holiday_employee_year 
            ON TB_YEAR_HOLIDAY(id_employee, year);

            CREATE INDEX IF NOT EXISTS idx_schedule_2024_employee 
            ON TB_SCHEDULE_2024(id_employee, date_id);

            CREATE INDEX IF NOT EXISTS idx_schedule_2024_sessions
            ON TB_SCHEDULE_2024(session_id, updated_session_id);

            CREATE INDEX IF NOT EXISTS idx_schedule_2023_employee 
            ON TB_SCHEDULE_2023(id_employee);

            CREATE INDEX IF NOT EXISTS idx_schedule_2023_sessions
            ON TB_SCHEDULE_2023(session_id, updated_session_id);
            "
        )?;

        
        tx.pragma_update(None, "user_version", 2)?;
        tx.commit()?;
    }


    

    Ok(())
}

const BATCH_SIZE: i32 = 1000;

pub fn update_schedule(
    app_handle: &Arc<tauri::AppHandle>,
) -> Result<(), Box<dyn std::error::Error>> {
    app_handle.db_mut(|db| {
        db.execute(
            "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, last_updated TEXT)",
            [],
        )?;

        info!("Settings table checked/created.");

        let current_date = Local::now().date_naive();
        let first_day_of_year = NaiveDate::from_ymd_opt(current_date.year(), 1, 1).unwrap();
        let days_since_start = current_date.ordinal() as i32;

        // Get the last updated date from settings
        let last_updated: Option<String> = db
            .query_row(
                "SELECT last_updated FROM settings WHERE key = 'schedule_update'",
                [],
                |row| row.get(0),
            )
            .optional()?;

        let start_date = last_updated
            .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
            .unwrap_or(first_day_of_year);
        let mut start_day = start_date
            .signed_duration_since(first_day_of_year)
            .num_days() as i32
            + 1;

        while start_day <= days_since_start {
            let end_day = (start_day + BATCH_SIZE - 1).min(days_since_start);

            let mut updates = HashMap::new();

            {
                // Fetch records that need updating
                let mut stmt = db.prepare(
                    "
              SELECT id_employee, session_id, date_id 
              FROM TB_SCHEDULE_2024 
              WHERE date_id BETWEEN ? AND ? AND updated_session_id IS NULL
              LIMIT ?
          ",
                )?;

                let rows = stmt.query_map(params![start_day, end_day, BATCH_SIZE], |row| {
                    Ok((
                        row.get::<_, i32>(0)?, // id_employee
                        row.get::<_, i32>(1)?, // session_id
                        row.get::<_, i32>(2)?, // date_id
                    ))
                })?;

                for row in rows {
                    let (id_employee, session_id, date_id) = row?;
                    updates.insert((id_employee, date_id), session_id);
                }
            }

            // Perform bulk update in a transaction
            let tx = db.transaction()?;
            {
                let mut update_stmt = tx.prepare(
                    "
                  UPDATE TB_SCHEDULE_2024 
                  SET updated_session_id = ? 
                  WHERE id_employee = ? AND date_id = ?
              ",
                )?;

                for ((id_employee, date_id), session_id) in updates {
                    update_stmt.execute(params![session_id, id_employee, date_id])?;
                }
            }
            tx.commit()?;

            // Update the last processed day
            let last_updated_date = first_day_of_year + chrono::Duration::days(end_day as i64);
            db.execute(
                "INSERT OR REPLACE INTO settings (key, last_updated) VALUES ('schedule_update', ?)",
                params![last_updated_date.format("%Y-%m-%d").to_string()],
            )?;

            start_day = end_day + 1;
        }

        Ok(())
    })
}



#[derive(Serialize, Deserialize, Debug)]
pub struct Employee {
    id_employee: Option<i32>,
    employee_number: String,
    name: String,
    last_name: String,
    id_area: i32,
    id_group: i32,
    year_holiday: i32,
}

pub fn add_employee(db: &mut Connection, employee: &Employee) -> Result<i64, rusqlite::Error> {
    let tx = db.transaction()?;

    println!("Executing: INSERT INTO TB_EMPLOYEE (employee_number, name, last_name, id_area, id_group) VALUES (?, ?, ?, ?, ?)");
    tx.execute(
        "INSERT INTO TB_EMPLOYEE (employee_number, name, last_name, id_area, id_group) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![employee.employee_number, employee.name, employee.last_name, employee.id_area, employee.id_group],
    )?;

    let id_employee = tx.last_insert_rowid();

    println!(
        "Executing: INSERT INTO TB_YEAR_HOLIDAY (id_employee, year_holiday, year) VALUES (?, ?, ?)"
    );
    tx.execute(
        "INSERT INTO TB_YEAR_HOLIDAY (id_employee, year_holiday, year) VALUES (?1, ?2, ?3)",
        params![id_employee, employee.year_holiday, 2024],
    )?;

    tx.commit()?;
    println!("Id employee: {}", id_employee);
    Ok(id_employee)
}

#[derive(Serialize, Deserialize)]
struct DbResultEmployee {
    employee_number: String,
    name: String,
    last_name: String,
    id_area: i32,
    id_group: i32,
    year_holiday: i32,
}

#[derive(Serialize)]
struct PaginatedResponse {
    employees: Vec<DbResultEmployee>,
    total_count: usize,
}

pub fn get_employees(
    db: &Connection,
    page: usize,
    page_size: usize,
) -> Result<String, rusqlite::Error> {
    let offset = (page - 1) * page_size;

    let mut stmt = db.prepare(
        "
    SELECT 
        e.employee_number, 
        e.name, 
        e.last_name,
        COALESCE(h.year_holiday, 0) as year_holiday,
        e.id_area,
        e.id_group
    FROM TB_EMPLOYEE e
    LEFT JOIN TB_YEAR_HOLIDAY h 
        ON e.id_employee = h.id_employee AND h.year = 2024
    LIMIT ? OFFSET ?    
     ",
    )?;

    let employees: Vec<DbResultEmployee> = stmt
        .query_map(&[&(page_size as i64), &(offset as i64)], |row| {
            Ok(DbResultEmployee {
                employee_number: row.get("employee_number")?,
                name: row.get("name")?,
                last_name: row.get("last_name")?,
                id_area: row.get("id_area")?,
                id_group: row.get("id_group")?,
                year_holiday: row.get("year_holiday")?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let total_count: usize =
        db.query_row("SELECT COUNT(*) FROM TB_EMPLOYEE", [], |row| row.get(0))?;

    let response = PaginatedResponse {
        employees,
        total_count,
    };

    serde_json::to_string(&response)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
}

#[derive(Serialize, Deserialize)]
struct DbResultDiesntplan {
    id: i32,
    name: String,
    last_name: String,
    sessions_planned: Option<Vec<String>>,
    sessions_updated: Option<Vec<String>>,
    rest_2023: i32,
    rum_rest: i32,
    year_holiday: i32,
    um_plan: i32,
}

pub fn get_table_schedule_area(db: &Connection, area: i32) -> Result<String, rusqlite::Error> {
    let mut stmt = db.prepare(
        "
  WITH schedule_counts AS (
    -- Pre-calculate all counts for each employee
    SELECT 
        id_employee,
        COUNT(CASE 
            WHEN (updated_session_id IS NULL OR updated_session_id = '') AND session_id = 8 THEN 1
            WHEN updated_session_id = '8' THEN 1
        END) as rum_count,
        COUNT(CASE 
            WHEN (updated_session_id IS NULL OR updated_session_id = '') AND session_id = 6 THEN 1
            WHEN updated_session_id = '6' THEN 1
        END) as um_plan_count
    FROM TB_SCHEDULE_2024
    GROUP BY id_employee
),
rest_2023_counts AS (
    -- Pre-calculate rest_2023 counts
    SELECT 
        s.id_employee,
        COUNT(CASE 
            WHEN (s.updated_session_id IS NULL OR s.updated_session_id = '') AND s.session_id = 6 THEN 1
            WHEN s.updated_session_id = '6' THEN 1
        END) as rest_2023
    FROM TB_SCHEDULE_2023 s
    JOIN TB_YEAR_HOLIDAY yh ON yh.id_employee = s.id_employee AND yh.year = 2023
    GROUP BY s.id_employee
),
employee_schedules AS (
    -- Get schedule information
    SELECT 
        e.id_employee,
        e.name,
        e.last_name,
        s.date_id,
        ts1.name as planned_session,
        ts2.name as updated_session,
        h.year_holiday,
        rc.rest_2023,
        sc.um_plan_count,
        sc.rum_count
    FROM TB_EMPLOYEE e
    LEFT JOIN TB_SCHEDULE_2024 s ON s.id_employee = e.id_employee
    LEFT JOIN TB_SESSION ts1 ON ts1.session_id = s.session_id
    LEFT JOIN TB_SESSION ts2 ON ts2.session_id = s.updated_session_id
    LEFT JOIN TB_YEAR_HOLIDAY h ON h.id_employee = e.id_employee AND h.year = 2024
    LEFT JOIN schedule_counts sc ON sc.id_employee = e.id_employee
    LEFT JOIN rest_2023_counts rc ON rc.id_employee = e.id_employee
    WHERE e.id_area = 3
)
SELECT 
    id_employee,
    name,
    last_name,
    json_group_array(date_id || ':' || COALESCE(planned_session, 'null')) as planned,
    json_group_array(date_id || ':' || COALESCE(updated_session, 'null')) as updated,
    rest_2023,
    um_plan_count as um_plan,
    (rest_2023 - rum_count) as rum_rest,
    year_holiday,
    um_plan_count
FROM employee_schedules
GROUP BY id_employee, name, last_name;
",
    )?;

    let db_results: Vec<DbResultDiesntplan> = stmt
        .query_map(&[&area], |row| {
            let id: i32 = row.get("id_employee")?;
            let name: String = row.get("name")?;
            let last_name: String = row.get("last_name")?;
            let sessions_planned: Option<String> = row.get("sessions_planned")?;
            let sessions_updated: Option<String> = row.get("sessions_updated")?;
            let rest_2023: i32 = row.get("rest_2023")?;
            let rum_rest: i32 = row.get("rum_rest")?;
            let year_holiday: i32 = row.get("year_holiday")?;
            let um_plan: i32 = row.get("um_plan")?;

            let sessions_planned: Option<Vec<String>> = sessions_planned.map(|s| {
                s.split(',')
                    .map(|s| s.trim().to_string())
                    .collect()
            });

            let sessions_updated: Option<Vec<String>> = sessions_updated.map(|s| {
                s.split(',')
                    .map(|s| s.trim().to_string())
                    .collect()
            });

            //println!("Debug: Raw result - id: {}, name: {:?}, last_name: {}, sessions_planned: {:?}, sessions_updated: {:?}", id, name, last_name, sessions_planned, sessions_updated);

            Ok(DbResultDiesntplan {
                id,
                name,
                last_name,
                sessions_planned, 
                sessions_updated,
                rest_2023,
                rum_rest,
                year_holiday,
                um_plan,
            })
        })?
        .collect::<Result<_, rusqlite::Error>>()?;

    let json_result = serde_json::to_string(&db_results)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    Ok(json_result)
}



#[derive(Serialize, Deserialize)]
struct DailyCountEmployee {
    date_id: i32,
    count: i32,
}

pub fn get_employee_daily_count_area(db: &Connection, area: i32) -> Result<String, rusqlite::Error> {
    // create array
    let mut stmt = db.prepare(
        "
       SELECT COUNT(DISTINCT sh_2024.id_employee)
       FROM TB_EMPLOYEE e
	   JOIN 
			TB_SCHEDULE_2024 sh_2024 ON sh_2024.id_employee = e.id_employee
       WHERE 
			sh_2024.date_id = ? AND 
			(sh_2024.updated_session_id IS NOT NULL OR sh_2024.session_id != 9) AND
			e.id_area = ?
	    ",
    )?;

    let mut results = HashMap::new();

    for date_id in 1..=366 {
        let count: i32 = stmt.query_row([date_id, area], |row| row.get(0))?;
        results.insert(date_id, count);
        //println!("Date id {}, count {}", date_id, count);
    }

    // Serialize the results to JSON
    let json_result = serde_json::to_string(&results)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    Ok(json_result)
}

#[derive(Serialize, Deserialize)]
struct Group {
    id_group: i32,
    group_label: String,
}


pub fn get_group(db: &Connection) -> Result<String, rusqlite::Error> {
    // create array
    let mut stmt = db.prepare(
        "
       SELECT a.id_group as id_group, a.group_label as group_label 
       FROM tb_group a
	    ",
    )?;

    let group_iter = stmt.query_map([], |row| {
        Ok (Group {
            id_group : row.get("id_group")?,
            group_label: row.get("group_label")?, 
        })
    })?;

    let mut result = Vec::new();

    for group_result in group_iter {
       let group = group_result?;
        result.push(group);
    }

    // Serialize the results to JSON
    let json_result = serde_json::to_string(&result)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    Ok(json_result)
}


#[derive(Serialize, Deserialize)]
struct Session{
    session_id: i32,
    session_name: String
}

pub fn get_session(db: &Connection)->Result<String, rusqlite::Error>{
    let mut stmt = db.prepare("
    SELECT s.session_id as session_id,
    s.name as session_name
    FROM tb_session s
    WHERE s.session_id BETWEEN 1 AND 5 ")?;

    let session_iter = stmt.query_map([], |row|{
        Ok(Session{
            session_id : row.get("session_id")?,
            session_name: row.get("session_name")?,
        })
    })?;    

    let mut result = Vec::new();

    for sessions_result in session_iter{
        result.push(sessions_result?);

    }
    let json_result = serde_json::to_string(&result)
        .map_err(|e|rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    Ok(json_result)

    
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_database_setup() {
        // Create in-memory database for testing
        let mut conn = Connection::open(":memory:").unwrap();
        
        println!("Testing database upgrade from version 1");
        let result = upgrade_database_if_needed(&mut conn, 1);
        match result {
            Ok(_) => println!("Upgrade successful"),
            Err(e) => {
                println!("Error during upgrade: {}", e);
                panic!("Database upgrade failed: {}", e);
            }
        }
        
        // Verify version
        let version: u32 = conn.query_row(
            "PRAGMA user_version",
            [],
            |row| row.get(0)
        ).unwrap();
        println!("Final database version: {}", version);
    }
}