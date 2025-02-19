
use crate::commands::get_plan_schedule;

mod db;
mod commands;


fn main() {
    match get_plan_schedule(){
      Ok(result)=> {
        println!("Mitarbeiter Schichtplan:");
        for schichtplan in result {
            println!("{:?}", schichtplan);
        }
      }
      Err(e) => eprintln!("Error fetching: {}", e),
    }
}
