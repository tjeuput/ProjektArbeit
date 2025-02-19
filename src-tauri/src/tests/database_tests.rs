use crate::database::{pruefe_schichtgruppe, speichere_rotationsplan, VorhandenerZeitplan, RotationsPlan, Schicht};
use rusqlite::Connection;
use std::error::Error;

fn setup_test_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
        // Create all required tables
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS TB_SCHEDULE_2024 (
                id_employee INTEGER,
                date_id INTEGER,
                session_id INTEGER,
                updated_session_id INTEGER
            );

            CREATE TABLE IF NOT EXISTS TB_EMPLOYEE (
                id_employee INTEGER PRIMARY KEY,
                name TEXT,
                last_name TEXT,
                id_area INTEGER,
                id_group INTEGER
            );

            CREATE TABLE IF NOT EXISTS TB_SCHEDULE_2023 (
                id_employee INTEGER,
                date_id INTEGER,
                session_id INTEGER,
                updated_session_id INTEGER
            );

            CREATE TABLE IF NOT EXISTS TB_YEAR_HOLIDAY (
                id_employee INTEGER,
                year INTEGER,
                year_holiday INTEGER,
                PRIMARY KEY (id_employee, year)
            );

            CREATE TABLE IF NOT EXISTS TB_DATE (
                date_id INTEGER PRIMARY KEY,
                date TEXT
            );

            CREATE TABLE IF NOT EXISTS TB_SESSION (
                session_id INTEGER PRIMARY KEY,
                name TEXT
            );

            -- Insert some basic test data
            INSERT INTO TB_SESSION (session_id, name) VALUES 
                (1, 'Session 1'),
                (2, 'Session 2');

            INSERT INTO TB_DATE (date_id, date) VALUES 
                (1, '2024-01-01'),
                (2, '2024-01-02');
            "
        )?;

        Ok(())
    }

    #[test]
    fn test_database_setup() {
        // Create in-memory database for testing
        let mut conn = Connection::open(":memory:").unwrap();
        
        // Set up required tables first
        setup_test_tables(&conn).expect("Failed to set up test tables");

        println!("Testing database upgrade from version 1");
        let result = upgrade_database_if_needed(&mut conn, 1);
        match result {
            Ok(_) => println!("Upgrade successful"),
            Err(e) => {
                println!("Error during upgrade: {}", e);
                panic!("Database upgrade failed: {}", e);
            }
        }

        // Verify indexes exist
        let indexes: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='index'")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<String>, _>>()
            .unwrap();

        // Check for specific indexes
        assert!(
            indexes.contains(&"idx_schedule_2024_employee_session".to_string()),
            "Missing employee session index"
        );
        assert!(
            indexes.contains(&"idx_schedule_2024_date".to_string()),
            "Missing schedule date index"
        );
        assert!(
            indexes.contains(&"idx_employee_area_full".to_string()),
            "Missing employee area index"
        );

        // Verify version
        let version: u32 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, 2, "Database version should be 2 after upgrade");
        println!("Final database version: {}", version);
    }

/// Helper function to set up a test database
fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    
    // Create required tables
    conn.execute(
        "CREATE TABLE TB_EMPLOYEE (
            id_employee INTEGER PRIMARY KEY,
            name TEXT,
            last_name TEXT,
            id_group INTEGER
        )",
        [],
    ).unwrap();

    conn.execute(
        "CREATE TABLE TB_SCHEDULE_2024 (
            id_employee INTEGER,
            date_id INTEGER,
            session_id INTEGER,
            updated_session_id INTEGER
        )",
        [],
    ).unwrap();

    conn.execute(
        "CREATE TABLE TB_DATE (
            date_id INTEGER PRIMARY KEY,
            date TEXT
        )",
        [],
    ).unwrap();

    // Insert test data
    conn.execute(
        "INSERT INTO TB_EMPLOYEE (id_employee, name, last_name, id_group) VALUES 
        (1, 'Test', 'User', 1),
        (2, 'Another', 'User', 1)",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO TB_DATE (date_id, date) VALUES 
        (1, '2024-01-01'),
        (2, '2024-01-02'),
        (3, '2024-01-03')",
        [],
    ).unwrap();

    conn
}

#[test]
fn test_pruefe_schichtgruppe_no_existing_schedules() {
    let conn = setup_test_db();
    
    // Test case where no schedules exist
    let result = pruefe_schichtgruppe(
        &conn,
        "1".to_string(),
        "2024-01-01".to_string(),
        "2024-01-03".to_string(),
    ).unwrap();

    let employees: Vec<VorhandenerZeitplan> = serde_json::from_str(&result).unwrap();
    assert!(employees.is_empty(), "Should return empty list when no schedules exist");
}

#[test]
fn test_pruefe_schichtgruppe_with_existing_schedules() {
    let conn = setup_test_db();
    
    // Insert test schedule
    conn.execute(
        "INSERT INTO TB_SCHEDULE_2024 (id_employee, date_id, session_id) VALUES 
        (1, 1, 1),
        (1, 2, 1)",
        [],
    ).unwrap();

    let result = pruefe_schichtgruppe(
        &conn,
        "1".to_string(),
        "2024-01-01".to_string(),
        "2024-01-03".to_string(),
    ).unwrap();

    let employees: Vec<VorhandenerZeitplan> = serde_json::from_str(&result).unwrap();
    assert_eq!(employees.len(), 1, "Should return one employee with existing schedule");
    assert_eq!(employees[0].mitarbeiter_id, 1);
    assert_eq!(employees[0].mitarbeiter_name, "Test");
    assert_eq!(employees[0].mitarbeiter_nachname, "User");
}

#[test]
fn test_speichere_rotationsplan() {
    let conn = setup_test_db();
    
    let rotation_plan = RotationsPlan {
        gruppe_id: "1".to_string(),
        start_datum: "2024-01-01".to_string(),
        end_datum: "2024-01-03".to_string(),
        schichten: vec![
            Schicht {
                tag: 1,
                schicht_id: 1,
            },
            Schicht {
                tag: 2,
                schicht_id: 2,
            },
        ],
    };

    let result = speichere_rotationsplan(&conn, &rotation_plan).unwrap();
    assert!(result, "Should return true on successful save");

    // Verify saved data
    let mut stmt = conn.prepare(
        "SELECT COUNT(*) FROM TB_SCHEDULE_2024 
         WHERE id_employee IN (
            SELECT id_employee FROM TB_EMPLOYEE WHERE id_group = 1
         )",
    ).unwrap();
    
    let count: i32 = stmt.query_row([], |row| row.get(0)).unwrap();
    assert!(count > 0, "Should have inserted schedule records");
}

#[test]
fn test_speichere_rotationsplan_invalid_dates() {
    let conn = setup_test_db();
    
    let rotation_plan = RotationsPlan {
        gruppe_id: "1".to_string(),
        start_datum: "invalid_date".to_string(),
        end_datum: "2024-01-03".to_string(),
        schichten: vec![],
    };

    let result = speichere_rotationsplan(&conn, &rotation_plan);
    assert!(result.is_err(), "Should return error for invalid dates");
}

#[test]
fn test_pruefe_schichtgruppe_invalid_dates() {
    let conn = setup_test_db();
    
    let result = pruefe_schichtgruppe(
        &conn,
        "1".to_string(),
        "invalid_date".to_string(),
        "2024-01-03".to_string(),
    );
    
    assert!(result.is_err(), "Should return error for invalid dates");
}

#[test]
fn test_pruefe_schichtgruppe_invalid_group() {
    let conn = setup_test_db();
    
    let result = pruefe_schichtgruppe(
        &conn,
        "999".to_string(), // Non-existent group
        "2024-01-01".to_string(),
        "2024-01-03".to_string(),
    ).unwrap();

    let employees: Vec<VorhandenerZeitplan> = serde_json::from_str(&result).unwrap();
    assert!(employees.is_empty(), "Should return empty list for non-existent group");
}