import { Card, message, Form, DatePicker, Button } from "antd";
import { Content } from "antd/es/layout/layout";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import { useAuth } from '../AuthContext';
import Gruppeauswaehlen from "../Components/Schichtplaner/Gruppeauswaehlen";
import SchichtrotationTabelle, {
  Wochenplan,
} from "../Components/Schichtplaner/SchichtrotationTabelle";
import {RotationsWocheForm} from "../types/index";
import { planPruefen, speichereRotationsplan } from "../services/api";

/**
 * Interface für das Formular zur Schichtrotation
 * @interface SchichtrotationFormular
 * @property {string} gruppe - ID  der ausgewählten Gruppe
 * @property {[Dayjs, Dayjs]} datumbereich - Start- und Enddatum als Dayjs-Objekte
 * @property {number} zeitraum - Länge des Zeitraums in Tagen (14, 28, 42 oder 63)
 * @property {Wochenplan[]} wochenplan - Array von Wochenplänen mit Schichtzuweisungen
 */
interface SchichtrotationFormular {
  gruppe: string;
  datumbereich: [Dayjs, Dayjs]; 
  zeitraum: number;
  wochenplan: Wochenplan[];
}

const { RangePicker } = DatePicker;
/**
 * Komponente für die Erstellung und Verwaltung von Schichtrotationsplänen
 * 
 * Ermöglicht die Auswahl einer Gruppe, eines Zeitraums und die Zuweisung von
 * Schichten für jeden Wochentag im gewählten Zeitraum.
 * 
 * States:
 * - zeitraum: Ausgewählter Zeitraum in Tagen
 * - wochenplan: Aktuelle Schichtzuweisungen für den Zeitraum
 * 
 * Funktionen:
 * - handleZeitraum: Verarbeitet Änderungen des Zeitraums
 * - handleWochenplan: Aktualisiert den Wochenplan
 * - beiAbschluss: Speichert den erstellten Rotationsplan
 */
const Schichtrotationplan: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const [form] = Form.useForm();
  const [zeitraum, setZeitraum] = useState<number>(14);
  const [wochenplan, setWochenplan] = useState<Wochenplan[]>([]);

  useEffect(() => {
    const heute = dayjs();
    const einJahrVonHeute = heute.add(365, "day");

    form.setFieldsValue({
      zeitraum: 14,
      wochenplan: [],
      datumbereich: [heute, einJahrVonHeute],
    });
  }, []);

  const handleZeitraum = (value: number) => {
    setZeitraum(value);
    form.setFieldValue("zeitraum", value);
  };

  const handleWochenplan = (neueWochenplan: Wochenplan[]) => {
    setWochenplan(neueWochenplan);
    form.setFieldValue("wochenplan", neueWochenplan);
  };

  const beiAbschluss = async (values: SchichtrotationFormular) => {
  try {

         // Überprüfen Sie, ob der Benutzer die Berechtigung zum Erstellen von Rotationsplänen hat
        if (!hasPermission('manager')) {
            message.error('Sie haben keine Berechtigung, Schichtrotationspläne zu erstellen.');
            return;
        }
      const [startDatum, endDatum] = values.datumbereich;
      // Nach vorhandenen Zeitplänen suchen
      const existingSchedules = await planPruefen(
          values.gruppe,
          startDatum.format("YYYY-MM-DD"),
          endDatum.format("YYYY-MM-DD")
      );

      console.log('Found existing schedules:', existingSchedules);

      // Wenn es bereits Zeitpläne gibt, Bestätigungsdialog anzeigen
      if (existingSchedules && existingSchedules.length > 0) {
          const employeeNames = existingSchedules
              .map(schedule => `${schedule.mitarbeiter_name} ${schedule.mitarbeiter_nachname}`)
              .join(", ");
              
          const confirmOverwrite = window.confirm(
              `Achtung: Die folgenden Mitarbeiter haben in diesem Zeitraum bereits Dienstpläne:\n${employeeNames}\n\nMöchten Sie deren Dienstpläne überschreiben?`
          );
          
          if (!confirmOverwrite) {
              message.info("Vorgang abgebrochen");
              return;
          }
      }

      // Konvertiere den Plan
      const konvertierterWochenplan: RotationsWocheForm[] = values.wochenplan.map(woche => ({
          woche: woche.woche,
          schichten: {
              mo: String(woche.mo || ''),
              di: String(woche.di || ''),
              mi: String(woche.mi || ''),
              dn: String(woche.do || ''),
              fr: String(woche.fr || ''),
              sa: String(woche.sa || ''),
              so: String(woche.so || '')
          }
      }));

      await speichereRotationsplan(
          values.gruppe,
          startDatum.format("YYYY-MM-DD"),
          endDatum.format("YYYY-MM-DD"),
          konvertierterWochenplan
      );

      message.success("Schichtrotationsplan erfolgreich gespeichert");
  } catch (error) {
      console.error('Error saving rotation plan:', error);
      if (error instanceof Error) {
          message.error(`Fehler: ${error.message}`);
      } else {
          message.error("Ein unerwarteter Fehler ist aufgetreten");
      }
  }
};
  
  return (
    <Content
      style={{
        margin: "24px 16px",
        padding: 24,
        minHeight: 280,
        display: "flex",
      }}
    >
      <Card style={{ width: "100%" }}>
        <Form
          form={form}
          layout="horizontal"
          style={{ width: "100%" }}
          onFinish={beiAbschluss}
          initialValues={{ zeitraum: 14 }}
        >
          <Form.Item
            name="gruppe"
            label="Gruppe"
            rules={[{ required: true, message: "Bitte Gruppe auswählen" }]}
          >
            <Gruppeauswaehlen />
          </Form.Item>

          <Form.Item
            name="datumbereich"
            label="DatumBereich"
            rules={[{ required: true, message: "Bitte Zeitraum auswählen" }]}
          >
            <RangePicker />
          </Form.Item>

          <Form.Item name="wochenplan" label="Schichtrotation">
            <SchichtrotationTabelle
              zeitraum={zeitraum}
              onZeitraumChange={handleZeitraum}
              wochenplan={wochenplan}
              onWochenplanUpdate={handleWochenplan}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Zuweisung
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Content>
  );
};

export default Schichtrotationplan;
