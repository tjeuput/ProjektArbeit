use crate::state::ServiceAccess;
use chrono::{Datelike, Local, NaiveDate};
use log::{error, info};
use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;

const CURRENT_DB_VERSION: u32 = 1;

const BATCH_SIZE: i32 = 1000;

/// Initializes the database connection, creating the .sqlite file if needed, and upgrading the database
/// if it's out of date.
pub fn initialize_database(app_handle: &AppHandle) -> Result<Connection, rusqlite::Error> {
    info!("Initializing database...");

    let mut db = Connection::open("ResourcesDb.db")?;

    // Check required tables first
    check_required_tables(&db)?;

    let mut user_pragma = db.prepare("PRAGMA user_version")?;
    let existing_user_version: u32 = user_pragma.query_row([], |row| Ok(row.get(0)?))?;
    drop(user_pragma);

    info!("Current database version: {}", existing_user_version);

    upgrade_database_if_needed(&mut db, existing_user_version)?;

    Ok(db)
}

pub fn upgrade_database_if_needed(
    db: &mut Connection,
    existing_version: u32,
) -> Result<(), rusqlite::Error> {
    info!(
        "Starting database upgrade from version {}",
        existing_version
    );

    let create_index_statements = [
        (
            "idx_schedule_2024_employee_session",
            "CREATE INDEX idx_schedule_2024_employee_session 
             ON TB_SCHEDULE_2024(id_employee, session_id, updated_session_id)",
        ),
        (
            "idx_schedule_2024_date",
            "CREATE INDEX idx_schedule_2024_date 
             ON TB_SCHEDULE_2024(date_id, id_employee)",
        ),
        (
            "idx_employee_area_full",
            "CREATE INDEX idx_employee_area_full 
             ON TB_EMPLOYEE(id_area, id_employee, name, last_name)",
        ),
        (
            "idx_schedule_2023_employee_session",
            "CREATE INDEX idx_schedule_2023_employee_session 
             ON TB_SCHEDULE_2023(id_employee, session_id, updated_session_id)",
        ),
        (
            "idx_schedule_2024_date_update",
            "CREATE INDEX idx_schedule_2024_date_update 
             ON TB_SCHEDULE_2024(date_id) 
             WHERE updated_session_id IS NULL",
        ),
        (
            "idx_year_holiday_composite",
            "CREATE INDEX idx_year_holiday_composite 
             ON TB_YEAR_HOLIDAY(id_employee, year, year_holiday)",
        ),
    ];

    // First check if indexes exist
    let mut missing_indexes = Vec::new();
    for (index_name, _) in &create_index_statements {
        let count: i32 = db.query_row(
            "SELECT COUNT(*) 
             FROM sqlite_master 
             WHERE type='index' AND name=?",
            params![index_name],
            |row| row.get(0),
        )?;

        if count == 0 {
            missing_indexes.push(*index_name);
        }
    }

    // If we have missing indexes or version is less than 2, perform the upgrade
    if !missing_indexes.is_empty() || existing_version < 2 {
        info!("Missing indexes or version upgrade needed. Creating indexes...");

        // Set journal mode
        match db.pragma_update(None, "journal_mode", "WAL") {
            Ok(_) => info!("Set journal mode to WAL"),
            Err(e) => {
                error!("Failed to set journal mode: {}", e);
                return Err(e);
            }
        }

        // Start transaction
        let tx = match db.transaction() {
            Ok(tx) => tx,
            Err(e) => {
                error!("Failed to start transaction: {}", e);
                return Err(e);
            }
        };

        // Drop existing indexes first
        info!("Dropping existing indexes...");
        match tx.execute_batch(
            "
            DROP INDEX IF EXISTS idx_schedule_2024_employee_session;
            DROP INDEX IF EXISTS idx_schedule_2024_date;
            DROP INDEX IF EXISTS idx_employee_area_full;
            DROP INDEX IF EXISTS idx_schedule_2023_employee_session;
            DROP INDEX IF EXISTS idx_schedule_2024_date_update;
            DROP INDEX IF EXISTS idx_year_holiday_composite;
            ",
        ) {
            Ok(_) => info!("Successfully dropped existing indexes"),
            Err(e) => {
                error!("Failed to drop indexes: {}", e);
                return Err(e);
            }
        }

        // Create each index individually with error checking
        for (index_name, create_statement) in &create_index_statements {
            info!("Creating index {}...", index_name);
            match tx.execute(create_statement, []) {
                Ok(_) => info!("Successfully created index {}", index_name),
                Err(e) => {
                    error!("Failed to create index {}: {}", index_name, e);
                    // Log the full SQL statement for debugging
                    error!("Failed SQL statement: {}", create_statement);
                    return Err(e);
                }
            }
        }

        // Update version if needed
        if existing_version < 2 {
            match tx.pragma_update(None, "user_version", 2) {
                Ok(_) => info!("Updated database version to 2"),
                Err(e) => {
                    error!("Failed to update database version: {}", e);
                    return Err(e);
                }
            }
        }

        match tx.commit() {
            Ok(_) => info!("Successfully committed transaction"),
            Err(e) => {
                error!("Failed to commit transaction: {}", e);
                return Err(e);
            }
        }
    }

    // Verify all indexes exist after potential upgrade
    info!("Verifying indexes...");

    // List all existing indexes
    info!("Current indexes in database:");
    let mut stmt = db.prepare(
        "SELECT name, tbl_name, sql 
         FROM sqlite_master 
         WHERE type='index'",
    )?;

    let indexes = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;

    for index in indexes {
        if let Ok((name, table, sql)) = index {
            info!("Found index {} on table {}", name, table);
            info!("Index creation SQL: {}", sql);
        }
    }

    // Final verification
    for (index_name, _) in &create_index_statements {
        let count: i32 = db.query_row(
            "SELECT COUNT(*) 
             FROM sqlite_master 
             WHERE type='index' AND name=?",
            params![index_name],
            |row| row.get(0),
        )?;

        if count == 0 {
            error!("Required index {} not found after upgrade", index_name);
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(1),
                Some(format!("Expected index {} not found", index_name)),
            ));
        } else {
            info!("Verified index {} exists", index_name);
        }
    }

    info!("Database upgrade completed successfully");
    Ok(())
}

pub fn check_required_tables(db: &Connection) -> Result<(), rusqlite::Error> {
    let required_tables = [
        "TB_SCHEDULE_2024",
        "TB_EMPLOYEE",
        "TB_SCHEDULE_2023",
        "TB_YEAR_HOLIDAY",
    ];

    for table in &required_tables {
        let count: i32 = db.query_row(
            "SELECT COUNT(*) 
             FROM sqlite_master 
             WHERE type='table' AND name=?",
            params![table],
            |row| row.get(0),
        )?;

        if count == 0 {
            error!("Required table {} not found", table);
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(1),
                Some(format!("Required table {} not found", table)),
            ));
        }
        info!("Found required table: {}", table);

        // Log table structure
        let create_sql: String = db.query_row(
            "SELECT sql 
             FROM sqlite_master 
             WHERE type='table' AND name=?",
            params![table],
            |row| row.get(0),
        )?;
        info!("Table {} structure: {}", table, create_sql);
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub role: String,
}

#[derive(Debug)]
pub struct UserAuth {
    pub user_id: i32,
    pub auth_token: String,
    pub expiry: i64,
}

pub fn check_auth_db(conn: &Connection, auth_token: &str) -> Result<Option<User>> {
    // First, let's create the auth table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS TB_USER_AUTH (
            auth_token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expiry INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES TB_EMPLOYEE(id_employee)
        )",
        [],
    )?;

    // Query to get user data from auth token
    let mut stmt = conn.prepare(
        "SELECT e.id_employee, e.firstname, r.bezeichnung
         FROM TB_USER_AUTH ua
         JOIN TB_EMPLOYEE e ON ua.user_id = e.id_employee
         JOIN TB_BENUTZERROLLE br ON e.id_employee = br.benutzer_id
         JOIN TB_ROLLE r ON br.rolle_id = r.rolle_id
         WHERE ua.auth_token = ? AND ua.expiry > unixepoch()"
    )?;

    let user = stmt.query_row(params![auth_token], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
        })
    });

    match user {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn create_auth_db(conn: &Connection, user_id: i32) -> Result<String> {
    use uuid::Uuid;
    
    // Generate an auth token
    let auth_token = Uuid::new_v4().to_string();
    
    // Set expiry to 24 hours from now
    let expiry = chrono::Utc::now()
        .timestamp() + (24 * 60 * 60);

    conn.execute(
        "INSERT INTO TB_USER_AUTH (auth_token, user_id, expiry)
         VALUES (?, ?, ?)",
        params![auth_token, user_id, expiry],
    )?;

    Ok(auth_token)
}

pub fn remove_auth_db(conn: &Connection, auth_token: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM TB_USER_AUTH WHERE auth_token = ?",
        params![auth_token],
    )?;

    Ok(())
}

pub fn cleanup_expired_auth_db(conn: &Connection) -> Result<()> {
    conn.execute(
        "DELETE FROM TB_USER_AUTH WHERE expiry < unixepoch()",
        [],
    )?;

    Ok(())
}

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
            INDEXED BY idx_schedule_2024_date_update
            WHERE date_id BETWEEN ? AND ? 
            AND updated_session_id IS NULL
             
          ",
                )?;

                let rows = stmt.query_map(params![start_day, end_day], |row| {
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
            if !updates.is_empty() {
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
            }

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

/*pub fn check_permission(db: &Connection, user_id: i32, required_role: &str) -> Result<bool, rusqlite::Error>{
    let role
}*/

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
                WHEN COALESCE(s.updated_session_id, s.session_id) = 8 THEN 1
            END) as rum_count,
            COUNT(CASE 
                WHEN COALESCE(s.updated_session_id, s.session_id) = 6 THEN 1
            END) as um_plan_count
        FROM TB_SCHEDULE_2024 s
        GROUP BY id_employee
    ),
    rest_2023_counts AS (
        -- Pre-calculate rest_2023 counts
        SELECT 
            s.id_employee,
            COUNT(CASE 
                WHEN COALESCE(s.updated_session_id, s.session_id) = 6 THEN 1
            END) as rest_2023
        FROM TB_SCHEDULE_2023 s
        GROUP BY s.id_employee
    ),
    employee_schedules AS (
        -- Get schedule information with all dates
        SELECT 
            e.id_employee,
            e.name,
            e.last_name,
            s.date_id,
            COALESCE(ts1.name, '') as planned_session,
            COALESCE(                           -- Changed this part
            CASE 
                WHEN s.updated_session_id IS NOT NULL THEN COALESCE(ts2.name, '')
                ELSE ''                     -- Changed NULL to ''
            END,
            ''                              -- Added default empty string
            ) as updated_session,
            COALESCE(h.year_holiday, 0) as year_holiday,
            COALESCE(r.rest_2023, 0) as rest_2023,
            COALESCE(sc.um_plan_count, 0) as um_plan_count,
            COALESCE(sc.rum_count, 0) as rum_count
        FROM TB_EMPLOYEE e
        LEFT JOIN TB_SCHEDULE_2024 s 
            ON s.id_employee = e.id_employee
        LEFT JOIN TB_SESSION ts1 
            ON ts1.session_id = s.session_id
        LEFT JOIN TB_SESSION ts2 
            ON ts2.session_id = s.updated_session_id
        LEFT JOIN TB_YEAR_HOLIDAY h 
            ON h.id_employee = e.id_employee 
            AND h.year = 2024
        LEFT JOIN schedule_counts sc 
            ON sc.id_employee = e.id_employee
        LEFT JOIN rest_2023_counts r 
            ON r.id_employee = e.id_employee
        WHERE e.id_area = ?1
        ORDER BY s.date_id
    )
    SELECT 
        id_employee,
        name,
        last_name,
        json_group_array(planned_session) FILTER (WHERE date_id IS NOT NULL) as sessions_planned,
        json_group_array(
            CASE WHEN updated_session IS NOT NULL 
            THEN updated_session 
            ELSE 'null' END
        ) FILTER (WHERE date_id IS NOT NULL) as sessions_updated,
        MAX(rest_2023) as rest_2023,
        MAX(year_holiday) as year_holiday,
        MAX(um_plan_count) as um_plan,
        MAX(rum_count) as rum_count
    FROM employee_schedules
    GROUP BY id_employee, name, last_name
    LIMIT 30
   ;
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
            let rum_rest: i32 = row.get("rum_count")?;
            let year_holiday: i32 = row.get("year_holiday")?;
            let um_plan: i32 = row.get("um_plan")?;

            let sessions_planned: Option<Vec<String>> =
                sessions_planned.map(|s| serde_json::from_str(&s).unwrap_or_else(|_| Vec::new()));

            let sessions_updated: Option<Vec<String>> =
                sessions_updated.map(|s| serde_json::from_str(&s).unwrap_or_else(|_| Vec::new()));

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

pub fn get_employee_daily_count_area(
    db: &Connection,
    area: i32,
) -> Result<String, rusqlite::Error> {
    // create array
    let mut stmt = db.prepare(
        "
        WITH RECURSIVE date_series AS (
            SELECT 1 as date_id
            UNION ALL
            SELECT date_id + 1
            FROM date_series
            WHERE date_id < 367
        )
        SELECT 
            ds.date_id as key,
            COUNT(DISTINCT CASE 
                WHEN COALESCE(sh.updated_session_id, sh.session_id) != 9 
                THEN sh.id_employee 
            END) as count
        FROM date_series ds
        LEFT JOIN TB_SCHEDULE_2024 sh
            ON sh.date_id = ds.date_id
        LEFT JOIN TB_EMPLOYEE e
            ON e.id_employee = sh.id_employee
            AND e.id_area = ?1
        GROUP BY ds.date_id
        ORDER BY ds.date_id;
    ",
    )?;

    // Create a HashMap to store results
    let mut results = HashMap::new();

    let rows = stmt.query_map([area], |row| {
        Ok((
            row.get::<_, i32>(0)?, // date_id
            row.get::<_, i32>(1)?, // count
        ))
    })?;

    for row_result in rows {
        if let Ok((date_id, count)) = row_result {
            results.insert(date_id, count);
        }
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
        Ok(Group {
            id_group: row.get("id_group")?,
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
/// Repräsentiert die Schichten für jeden Wochentag
#[derive(Serialize, Deserialize)]
struct Schichten {
    mo: String,
    di: String,
    mi: String,
    dn: String,
    fr: String,
    sa: String,
    so: String,
}
/// Eine Woche im Schichtplan mit Schichtzuweisungen
#[derive(Serialize, Deserialize)]
struct Wochenplan {
    key: i32,
    woche: String,
    schichten: Schichten,
}

/// Kompletter Schichtgruppenplan mit Zeitraum und Wochenplänen
#[derive(Serialize, Deserialize)]
struct SchichtGruppe {
    gruppe_id: String,
    start_datum: String,
    end_datum: String,
    wochenplan: Vec<Wochenplan>,
}
/// Informationen über Mitarbeiter mit existierenden Schichtplänen
#[derive(Serialize, Deserialize)]
struct VorhandenerZeitplan {
    mitarbeiter_id: i32,
    mitarbeiter_name: String,
    mitarbeiter_nachname: String,
}

//Prüft, ob für eine Gruppe im angegebenen Zeitraum bereits Schichtpläne existieren
pub fn pruefe_schichtgruppe(
    db: &Connection, // // erhält unveränderliche Referenz
    gruppe_id: String,
    start_datum: String,
    end_datum: String,
) -> Result<String, rusqlite::Error> {
    println!("Checking group {} from {} to {}", gruppe_id, start_datum, end_datum);

       // Hole sich zuerst die Gruppen-ID von TB_GROUP
    let group_id: i32 = db.query_row(
        "SELECT id_group FROM TB_GROUP WHERE group_label = ?",
        params![&gruppe_id],
        |row| row.get(0)
    )?;


    let mut stmt = db.prepare(
        "SELECT DISTINCT
            e.id_employee,
            e.name as employee_name,
            e.last_name
         FROM TB_EMPLOYEE e
         JOIN TB_SCHEDULE_2024 s ON s.id_employee = e.id_employee
         WHERE e.id_group = ?1
         AND s.date_id BETWEEN
             (SELECT date_id FROM TB_DATE WHERE date = ?2) 
             AND (SELECT date_id FROM TB_DATE where date = ?3)",
    )?;

    let rows = stmt.query_map(params![group_id, &start_datum, &end_datum], |row| {
        let result = VorhandenerZeitplan {
            mitarbeiter_id: row.get(0)?,
            mitarbeiter_name: row.get(1)?,
            mitarbeiter_nachname: row.get(2)?,
        };
        println!("Found employee: {} {}", result.mitarbeiter_name, result.mitarbeiter_nachname);
        Ok(result)
    })?;

    let vorhandender_zeitplan: Vec<VorhandenerZeitplan> =
        rows.collect::<Result<Vec<_>, rusqlite::Error>>()?;

    println!("Found {} schedules", vorhandender_zeitplan.len());

    serde_json::to_string(&vorhandender_zeitplan)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
}

#[derive(Serialize, Deserialize)]
pub struct SchichtWoche {
    woche: String,
    schichten: SchichtTage,
}

#[derive(Serialize, Deserialize)]
pub struct SchichtTage {
    mo: String,
    di: String,
    mi: String,
    dn: String,
    fr: String,
    sa: String,
    so: String,
}

#[derive(Serialize, Deserialize)]
pub struct RotationsPlan {
    gruppe_id: String,
    start_datum: String,
    end_datum: String,
    wochen: Vec<SchichtWoche>,
}

//Prüft, ob für eine Gruppe im angegebenen Zeitraum bereits Schichtpläne existieren
pub fn speichere_rotationsplan(
    db: &mut Connection, // Empfängt die veränderbare Verbindung von db_mut
    plan: &RotationsPlan,
) -> Result<(), rusqlite::Error> {
    let tx = db.transaction()?; // Empfängt die veränderbare Verbindung von db_mut

   // Zuerst die Gruppen-ID von TB_GROUP abrufen
    let group_id: i32 = tx.query_row(
        "SELECT id_group FROM TB_GROUP WHERE group_label = ?",
        params![&plan.gruppe_id],
        |row| row.get(0)
    )?;
    
    println!("Resolved group '{}' to ID: {}", plan.gruppe_id, group_id);

    // Prüfe  zunächst, ob wir Mitarbeiter in der Gruppe haben
    let mitarbeiter: Vec<i32> = {
        let mut stmt = tx.prepare(
            "SELECT id_employee FROM TB_EMPLOYEE WHERE id_group = ?"
        )?;
        let rows = stmt.query_map([group_id], |row| row.get(0))?;
        let result = rows.collect::<Result<Vec<_>, _>>()?;
        println!("Found {} employees in group", result.len());
        result
    };

    if mitarbeiter.is_empty() {
        println!("No employees found in group {}", plan.gruppe_id);  // Changed from gruppeId
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }

    // 2. Lösche vorhandener Zeitpläne im Datumsbereich
    {
        tx.execute(
            "DELETE FROM TB_SCHEDULE_2024 
             WHERE id_employee IN (
                 SELECT id_employee 
                 FROM TB_EMPLOYEE 
                 WHERE id_group = ?
             )
             AND date_id BETWEEN (
                 SELECT date_id 
                 FROM TB_DATE 
                 WHERE date = ?
             ) AND (
                 SELECT date_id 
                 FROM TB_DATE 
                 WHERE date = ?
             )",
            params![&plan.gruppe_id, &plan.start_datum, &plan.end_datum],
        )?;
    }
    
    // 3. Neue Zeitpläne einfügen
    let start = chrono::NaiveDate::parse_from_str(&plan.start_datum, "%Y-%m-%d")
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    {
        let mut insert_stmt = tx.prepare(
            "INSERT INTO TB_SCHEDULE_2024 (
                id_employee, 
                date_id, 
                session_id
             ) VALUES (
                ?, 
                (SELECT date_id FROM TB_DATE WHERE date = ?), 
                (SELECT session_id FROM TB_SESSION WHERE name = ?)
             )"
        )?;

        for woche in &plan.wochen {
            let tage = [
                ("mo", &woche.schichten.mo),
                ("di", &woche.schichten.di),
                ("mi", &woche.schichten.mi),
                ("do", &woche.schichten.dn),
                ("fr", &woche.schichten.fr),
                ("sa", &woche.schichten.sa),
                ("so", &woche.schichten.so),
            ];

            for (tag_offset, (_, schicht)) in tage.iter().enumerate() {
                let current_date = start.checked_add_days(chrono::Days::new(tag_offset as u64))
                    .ok_or(rusqlite::Error::ToSqlConversionFailure(
                        Box::new(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            "Date calculation overflow"
                        ))
                    ))?;

                for &mitarbeiter_id in &mitarbeiter {
                    insert_stmt.execute(params![
                        mitarbeiter_id,
                        current_date.format("%Y-%m-%d").to_string(),
                        schicht,
                    ])?;
                }
            }
        }
    }

    tx.commit()?;
    Ok(())
}



#[derive(Serialize, Deserialize)]
struct Session {
    session_id: i32,
    session_name: String,
}

pub fn get_session(db: &Connection) -> Result<String, rusqlite::Error> {
    let mut stmt = db.prepare(
        "
    SELECT s.session_id as session_id,
    s.name as session_name
    FROM tb_session s
     ",
    )?;

    let session_iter = stmt.query_map([], |row| {
        Ok(Session {
            session_id: row.get("session_id")?,
            session_name: row.get("session_name")?,
        })
    })?;

    let mut result = Vec::new();

    for sessions_result in session_iter {
        result.push(sessions_result?);
    }
    let json_result = serde_json::to_string(&result)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

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
        let version: u32 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        println!("Final database version: {}", version);
    }
}
