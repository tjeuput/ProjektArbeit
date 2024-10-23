#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database; //v
mod state; 
use std::thread;
use state::{ServiceAccess, AppState}; //v
use tauri::{AppHandle, Manager}; //v
use log::info;
use std::sync::Arc;
use chrono::Utc;
use crate::database::{Employee, update_schedule};



#[tauri::command]
fn get_table_schedule_area(app_handle: AppHandle, area:i32) -> String {

match app_handle.db(|db| database::get_table_schedule_area(db, area)) {
    Ok(json_string) => {
        //info!("Retrieved table: {}", json_string); // Log the retrieved items
        json_string
    },
    Err(e) => {
        eprintln!("Failed to fetch get table schedule from the database: {}", e);
        format!("Error: {}", e)
    }
}
}

#[tauri::command]
fn get_employees(page:usize, page_size: usize, app_handle: AppHandle)-> Result<String, String> {

    app_handle.db(|db| database::get_employees(db, page, page_size))
    .map_err(|e| format!("Error: {}", e))
}

#[tauri::command]
fn add_employee(app_handle: AppHandle, employee: Employee) -> Result<String, String> {
    info!("add_employee called with: {:?}", employee);
    let result = app_handle.db_mut(|db| {
        match database::add_employee(db, &employee) {
            Ok(id) => Ok(format!("Employee added with ID: {}", id)),
            Err(e) => Err(format!("Failed to add employee: {}", e)),
        }
    });
    info!("add_employee result: {:?}", result);
    result
}

#[tauri::command]
fn get_employee_daily_count_area(app_handle: AppHandle, area:i32)->Result<String, String> {
    app_handle.db(|db| database::get_employee_daily_count_area(db, area))
    .map_err(|e|format!("Error:{}", e))
}

#[tauri::command]
fn get_group(app_handle: AppHandle) -> Result <String, String> {
    app_handle.db(|db| database::get_group(db))
    .map_err(|e| format!("Error:{}", e))
}

#[tauri::command]
fn get_session(app_handle: AppHandle) -> Result <String, String>{
    app_handle.db(|db|database::get_session(db))
    .map_err(|e| format!("Error:{}", e))
}

fn main() {

    env_logger::init();
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = Arc::new(app.handle());
            
            // Initialize database
            let db = database::initialize_database(&app_handle).expect("Failed to initialize database");
            
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
                    // Sleep until the next 1 AM
                    let now = Utc::now();
                    let next_run = (now + chrono::Duration::days(1))
                        .date_naive()
                        .and_hms_opt(1, 0, 0)
                        .unwrap();

                    let next_run_utc = next_run.and_utc();
                    let duration_until_next_run = next_run_utc - now;
                    thread::sleep(duration_until_next_run.to_std().unwrap());

                    // Run the update_schedule function
                    if let Err(e) = update_schedule(&app_handle_clone) {
                        eprintln!("Error updating schedule: {:?}", e);
                    }
                }
            });
           
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_table_schedule_area, get_employees, add_employee, get_employee_daily_count_area, get_group, get_session])
        .run(tauri::generate_context!())
        .expect("Error while running application");
}