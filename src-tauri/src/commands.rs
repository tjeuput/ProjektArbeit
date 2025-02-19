use crate::database::{check_auth_db, create_auth_db, remove_auth_db, User};
use crate::state::ServiceAccess;
use rusqlite::params;
use tauri::AppHandle;

pub mod auth {
    use super::*;

    #[tauri::command]
    pub async fn check_auth(
        app_handle: AppHandle,
        auth_token: String,
    ) -> Result<Option<User>, String> {
        app_handle.db(|conn| {
            check_auth_db(conn, &auth_token)
                .map_err(|e| e.to_string())
        })
    }

    #[tauri::command]
    pub async fn login(
        app_handle: AppHandle,
        username: String,
        password: String,
    ) -> Result<User, String> {
        app_handle.db(|conn| {
            let mut stmt = conn.prepare(
                "SELECT e.id_employee, e.firstname, r.bezeichnung
                 FROM TB_EMPLOYEE e
                 JOIN TB_BENUTZERROLLE br ON e.id_employee = br.benutzer_id
                 JOIN TB_ROLLE r ON br.rolle_id = r.rolle_id
                 WHERE e.firstname = ? AND e.password = ?"
            ).map_err(|e| e.to_string())?;

            let user = stmt.query_row(params![username, password], |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    role: row.get(2)?,
                })
            }).map_err(|e| e.to_string())?;

            // Create a new auth token
            create_auth_db(conn, user.id)
                .map_err(|e| e.to_string())?;

            Ok(user)
        })
    }

    #[tauri::command]
    pub async fn logout(
        app_handle: AppHandle,
        auth_token: String,
    ) -> Result<(), String> {
        app_handle.db(|conn| {
            remove_auth_db(conn, &auth_token)
                .map_err(|e| e.to_string())
        })
    }
}





