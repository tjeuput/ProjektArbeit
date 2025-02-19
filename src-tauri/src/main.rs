#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod state;
mod commands;

use crate::database::{
    update_schedule, Employee, RotationsPlan, 
    check_auth_db, create_auth_db, remove_auth_db, User
};
use crate::commands::auth::{check_auth, login, logout};
use chrono::Utc;
use log::info;
use rusqlite::params;
use state::{AppState, ServiceAccess};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Manager};
use tauri::api::dialog;

// Your existing command handlers remain the same
#[tauri::command]
fn get_table_schedule_area(app_handle: AppHandle, area: i32) -> String {
    match app_handle.db(|db| database::get_table_schedule_area(db, area)) {
        Ok(json_string) => json_string,
        Err(e) => {
            eprintln!(
                "Failed to fetch get table schedule from the database: {}",
                e
            );
            format!("Error: {}", e)
        }
    }
}



// Your other command handlers remain the same
#[tauri::command]
fn update_schedule_command(app_handle: AppHandle) -> Result<(), String> {
    let app_handle = Arc::new(app_handle);
    update_schedule(&app_handle)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_employees(page: usize, page_size: usize, app_handle: AppHandle) -> Result<String, String> {
    app_handle
        .db(|db| database::get_employees(db, page, page_size))
        .map_err(|e| format!("Error: {}", e))
}

#[tauri::command]
fn add_employee(app_handle: AppHandle, employee: Employee) -> Result<String, String> {
    info!("add_employee called with: {:?}", employee);
    let result = app_handle.db_mut(|db| match database::add_employee(db, &employee) {
        Ok(id) => Ok(format!("Employee added with ID: {}", id)),
        Err(e) => Err(format!("Failed to add employee: {}", e)),
    });
    info!("add_employee result: {:?}", result);
    result
}

#[tauri::command]
fn get_employee_daily_count_area(app_handle: AppHandle, area: i32) -> Result<String, String> {
    app_handle
        .db(|db| database::get_employee_daily_count_area(db, area))
        .map_err(|e| format!("Error:{}", e))
}

#[tauri::command]
fn get_group(app_handle: AppHandle) -> Result<String, String> {
    app_handle
        .db(|db| database::get_group(db))
        .map_err(|e| format!("Error:{}", e))
}

#[tauri::command]
fn get_session(app_handle: AppHandle) -> Result<String, String> {
    app_handle
        .db(|db| database::get_session(db))
        .map_err(|e| format!("Error:{}", e))
}

#[tauri::command]
fn speichere_rotation(
    app_handle: AppHandle,
    rotation_plan: RotationsPlan,
) -> Result<String, String> {
    app_handle
        //Verwende db_mut, um veränderbaren Zugriff auf die Datenbankverbindung zu erhalten
        .db_mut(|db| database::speichere_rotationsplan(db, &rotation_plan))
        .map(|_| "Rotationsplan erfolgreich gespeichert".to_string())
        .map_err(|e| format!("Fehler beim Speichern: {}", e))
}

#[tauri::command]
fn pruefe_schichtgruppe(
    app_handle: AppHandle,
    gruppeId: String,
    startDatum: String,  
    endDatum: String,    
) -> Result<String, String> {
    println!("Checking schedules for group {} from {} to {}", 
             gruppeId, startDatum, endDatum);
    
    app_handle
        .db(|db| database::pruefe_schichtgruppe(db, gruppeId, startDatum, endDatum)) //unveränderlicher Zugriff für SELECT-Abfragen
        .map_err(|e| format!("Error:{}", e))
}


fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = Arc::new(app.handle());

            // Initialize database
            let db = database::initialize_database(&app_handle)
                .expect("Failed to initialize database");

            // Manage AppState
            app.manage(AppState {
                db: std::sync::Mutex::new(Some(db)),
            });

            let app_handle_clone = Arc::clone(&app_handle);

            // Run update_schedule immediately
            if let Err(e) = update_schedule(&app_handle_clone) {
                eprintln!("Error updating schedule on startup: {:?}", e);
            }

            // Run the update_schedule in a separate thread
            thread::spawn(move || {
                loop {
                    let now = Utc::now();
                    let next_run = (now + chrono::Duration::days(1))
                        .date_naive()
                        .and_hms_opt(1, 0, 0)
                        .unwrap();

                    let next_run_utc = next_run.and_utc();
                    let duration_until_next_run = next_run_utc - now;
                    thread::sleep(duration_until_next_run.to_std().unwrap());

                    if let Err(e) = update_schedule(&app_handle_clone) {
                        eprintln!("Error updating schedule: {:?}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_table_schedule_area,
            get_employees,
            add_employee,
            get_employee_daily_count_area,
            update_schedule_command,
            get_group,
            get_session,
            pruefe_schichtgruppe,
            speichere_rotation,
            check_auth,
            login,
            logout,
           
        ])
        .run(tauri::generate_context!())
        .expect("Error while running application");
}