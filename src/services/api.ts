import { Gruppe, Schicht, VorhandenerZeitplan, RotationsWoche } from '../types';
import { invoke } from '@tauri-apps/api';



export const fetchGruppe = async (): Promise<Gruppe[]> => {
    try {
        const response = await invoke<string>('get_group');
       
        const gruppenResponse: {id_group: number; group_label: string}[]  = JSON.parse(response);
        if(!gruppenResponse){
            console.error('error gruppeResponse');
            return [];
        }

        const gruppeDaten: Gruppe[] = gruppenResponse.map((gruppe)=>({
            gruppe_id: gruppe.id_group,
            bezeichnung: gruppe.group_label
        }));

        return gruppeDaten;

       
       
    } catch (error){
        console.log('error fetching fetchGroups');
        return [];

    }
    
}


export const fetchSchichten = async () : Promise<Schicht[]> => {
    try {
        const response = await invoke<string>('get_session');
        const schichtenResponse: {session_id: number,session_name:string}[] = JSON.parse(response);
       
        if(!schichtenResponse){
            console.error('schichtResponse errorr');
            return[];
        }
        const schichtenDaten: Schicht[] = schichtenResponse.map( (schicht) => ({
            schicht_id: schicht.session_id,
            bezeichnung: schicht.session_name

        }));

        return schichtenDaten;
    } catch (error){
        console.error('Schichten error', error);
        return [];
    }

}

// api.ts



export const planPruefen = async (
    gruppeId: string,
    startDatum: string,
    endDatum: string
): Promise<VorhandenerZeitplan[]> => {
    try {
        console.log('Checking schedules with params:', {
            gruppeId,
            startDatum,
            endDatum
        });
        
        // Important: Make sure parameter names match exactly what Rust expects
        const response = await invoke<string>("pruefe_schichtgruppe", {
            gruppeId,
            startDatum,  // Changed from start_datum to match Rust
            endDatum,    // Changed from end_datum to match Rust
        });

        console.log('Response from pruefe_schichtgruppe:', response);
        return JSON.parse(response);
    } catch (error) {
        console.error("Error checking schedules - Full error:", error);
        console.error("Error checking schedules - Parameters:", {
            gruppeId,
            startDatum,
            endDatum
        });
        throw new Error("Fehler beim Prüfen der vorhandenen Dienstpläne");
    }
};

export const speichereRotationsplan = async (
    gruppeId: string,
    startDatum: string,
    endDatum: string,
    wochenplan: RotationsWoche[]
): Promise<void> => {
    try {
        console.log('Saving rotation plan with:', {
            gruppeId,
            startDatum,
            endDatum,
            wochenplan
        });

        // Match the Rust struct field names exactly
        await invoke("speichere_rotation", {
            rotationPlan: {
                gruppe_id: gruppeId,    // Changed to match Rust struct
                start_datum: startDatum, // Changed to match Rust struct
                end_datum: endDatum,     // Changed to match Rust struct
                wochen: wochenplan.map(woche => ({  // Match the Rust SchichtWoche struct
                    woche: woche.woche,
                    schichten: {
                        mo: woche.schichten.mo,
                        di: woche.schichten.di,
                        mi: woche.schichten.mi,
                        dn: woche.schichten.dn,
                        fr: woche.schichten.fr,
                        sa: woche.schichten.sa,
                        so: woche.schichten.so
                    }
                }))
            }
        });
    } catch (error) {
        console.error("Error saving rotation plan - Full error:", error);
        console.error("Error saving rotation plan - Data:", {
            gruppeId,
            startDatum,
            endDatum,
            wochenplan
        });
        throw new Error("Fehler beim Speichern des Rotationsplans");
    }
};