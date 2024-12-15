/* get_group from Rust has struct Group 
{ id_group: i32, group_label: String}*/
import {Dayjs} from "dayjs";
export interface Gruppe {
    gruppe_id: number;
    bezeichnung: string;
}

export interface Schicht {
    schicht_id: number;
    bezeichnung: string;
}

export interface planPruefe{
    datumbereich: [Dayjs, Dayjs];
    gruppeId: string;

}

export interface VorhandenerZeitplan {
    mitarbeiter_id: number;
    mitarbeiter_name: string;
    mitarbeiter_nachname: string;
}

export interface SchichtTage {
    mo: string;
    di: string;
    mi: string;
    dn: string;  // Note: Changed from 'do' since it's a reserved word in JS
    fr: string;
    sa: string;
    so: string;
}

export interface RotationsWoche {
    woche: string;
    schichten: SchichtTage;
}

export interface RotationsPlan {
    gruppe_id: string;
    start_datum: string;
    end_datum: string;
    wochen: RotationsWoche[];
}
export interface RotationsWocheForm {
    woche: string;
    schichten: {
      mo: string;
      di: string;
      mi: string;
      dn: string;
      fr: string;
      sa: string;
      so: string;
    };
  }