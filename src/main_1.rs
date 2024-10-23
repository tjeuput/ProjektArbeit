use rusqlite::{Connection, Result, params};



fn check_database() -> Result<String, String> {
    let DB_PATH = "EncryptedDb.db";
    let ENCRYPTION_KEY = "p6%7P*KJzZpvK@jZS4Xb36hGPGMVuj@U!aDYYq6";

    let conn = match Connection::open(DB_PATH) {
        Ok(conn) => conn,
        Err(_) => return Err("Failed to open database.".to_string()),
    };

    conn.pragma_update(None, "key", &ENCRYPTION_KEY).unwrap();

    let count: i32 = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table';",
        params![],
        |row| row.get(0),
    ).unwrap();

    if count > 0 {
        Ok("Successfully connected to the database. Tables count: ".to_string() + &count.to_string())
    } else {
        Ok("The database is accessible but contains no tables or the key is incorrect.".to_string())
    }
}

fn main() {
    /* tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![check_database])
        .run(tauri::generate_context!())
        .expect("error while running tauri application"); */

        let db_path = "EncryptedDb.db";
        let encryption_key = "p6%7P*KJzZpvK@jZS4Xb36hGPGMVuj@U!aDYYq6";
    
        // Attempt to open the database
        let conn = match Connection::open(db_path) {
            Ok(conn) => conn,
            Err(e) => {
                eprintln!("Failed to open database: {}", e);
                return;  // Exit the function early if there's an error
            }
        };
    
        // Attempt to set the encryption key
        if let Err(e) = conn.pragma_update(None, "key", &encryption_key) {
            eprintln!("Failed to set encryption key: {}", e);
            return;
        }
    
        // Execute a query and handle errors
        match conn.query_row(
            "SELECT count(*) FROM TB_Mitarbeiter;",
            params![],
            |row| row.get::<_, i32>(0usize) // Add type annotation for the return type
        ) {
            Ok(count) => {
                if count > 0 {
                    println!("Successfully connected to the database. Tables count: {}", count);
                } else {
                    println!("The database is accessible but contains no tables or the key is incorrect.");
                }
            },
            Err(e) => {
                eprintln!("Failed to execute query: {}", e);
            }
        }
}