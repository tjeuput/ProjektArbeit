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
        const response = await invoke<string>("pruefe_schichtgruppe", {
            gruppe_id: gruppeId,
            start_datum: startDatum,
            end_datum: endDatum,
        });

        return JSON.parse(response);
    } catch (error) {
        console.error("Error checking schedules:", error);
        throw new Error("Failed to check existing schedules");
    }
};

export const speichereRotationsplan = async (
    gruppeId: string,
    startDatum: string,
    endDatum: string,
    wochenplan: RotationsWoche[]
): Promise<void> => {
    try {
        // First check for conflicts
        const vorhandeneZeitplaene = await planPruefen(
            gruppeId,
            startDatum,
            endDatum
        );

        if (vorhandeneZeitplaene.length > 0) {
            const employeeNames = vorhandeneZeitplaene
                .map(plan => `${plan.mitarbeiter_name} ${plan.mitarbeiter_nachname}`)
                .join(", ");
                
            const confirmOverwrite = window.confirm(
                `Achtung: Die folgenden Mitarbeiter haben in diesem Zeitraum bereits Dienstpläne:\n${employeeNames}\n\nMöchten Sie deren Dienstpläne überschreiben?`
            );
            
            if (!confirmOverwrite) {
                throw new Error('User cancelled overwrite');
            }
        }

        // Save the rotation plan
        await invoke("speichere_rotation", {
            rotationPlan: {
                gruppe_id: gruppeId,
                start_datum: startDatum,
                end_datum: endDatum,
                wochen: wochenplan
            }
        });

    } catch (error) {
        console.error("Error saving rotation plan:", error);
        throw error;
    }
};