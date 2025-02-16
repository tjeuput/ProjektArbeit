import React, { ReactNode, useEffect, useState } from "react";
import { Form, Table, Select } from "antd";
import { fetchSchichten } from "../../services/api";
import { Schicht } from "../../types";
import ZeitraumSelect from "../Schichtplaner/ZeitraumSelect";
/* Rückgabe ist eine React Node Form.Item für das gesamte Mechanismus von Zeitraum und Schichtabfolge 

/* Zeitraeume-Select-Komponente ist ein Form.Item. Sie kontrolliert Zeile der Tabelle.  

/*  Komponente Schichtabfolge ist ein Form.Item
Tabellenkonfiguration, Kopfzeile und Zeilen. Kopfzeilenkonfiguration, wie Zeilen gerendert werden, erwartete Anzeige
Jeder Attribut-Tag rendert Schicht-menü in der Zeile
+--------------+-------+-------+-------+-------+-------+-------+-------+
| Wochennummer |  Mo   |  Di   |  Mit  |  Do   |  Fr   |  Sa   |  So   |
+--------------+-------+-------+-------+-------+-------+-------+-------+
| 1. Woche     | <Sch> | <Sch> | <Sch> | <Sch> | <Sch> | <Sch> | <Sch> |
| usw..        |       |       |       |       |       |       |       |
+--------------+-------+-------+-------+-------+-------+-------+-------+ */

interface SchichtrotationTabelleProps {
  zeitraum?: number;
  onZeitraumChange?: (value: number) => void;
  wochenplan?: Wochenplan[];
  onWochenplanUpdate: (wochenplan: Wochenplan[]) => void;
}

export interface Wochenplan {
  key: number;
  woche: string;
  mo?: ReactNode;
  di?: ReactNode;
  mi?: ReactNode;
  do?: ReactNode;
  fr?: ReactNode;
  sa?: ReactNode;
  so?: ReactNode;
}

const SchichtrotationTabelle: React.FC<SchichtrotationTabelleProps> = ({
  zeitraum,
  onZeitraumChange,
  wochenplan,
  onWochenplanUpdate,
}) => {
  const [schichten, setSchichten] = useState<Schicht[]>([]);
  //API-Aufrufe: fetchSchichten(): Lädt verfügbare Schichttypen beim ersten Render
  useEffect(() => {
    fetchSchichten()
      .then((daten) => {
        setSchichten(daten);
        if (daten.length > 0) {
          initialisiereWochenplan(zeitraum || 14, daten[0].bezeichnung);
        }
      })
      .catch((error) => {
        console.error("fetchSchicht ist schiefgelaufen", error);
      });
  }, [zeitraum]);

  //Erstellt einen neuen Wochenplan mit Standardschichten

  const initialisiereWochenplan = (tage: number, defaultSchicht: string) => {
    const wochenanzahl = tage / 7;
    const neueWochenplan = [];

    for (let i = 0; i < wochenanzahl; i++) {
      neueWochenplan.push({
        key: i,
        woche: `${i + 1}. Woche`,
        mo: defaultSchicht,
        di: defaultSchicht,
        mi: defaultSchicht,
        do: defaultSchicht,
        fr: defaultSchicht,
        sa: defaultSchicht,
        so: defaultSchicht,
      });
    }
    onWochenplanUpdate?.(neueWochenplan);
  };

  //Konfiguration für Spalten der Tabelle jede wochenplan enthält schichtplan
  const attribute = [
    {
      title: "Wochennummer",
      dataIndex: "woche",
      key: "woche",
    },
    {
      title: "Mo",
      dataIndex: "montag",
      key: "mo",
   
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item name={["wochenplan", index, "mo"]} noStyle>
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "Di",
      dataIndex: "dienstag",
      key: "di",
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item
          name={["wochenplan", index, "di"]}
          rules={[{ required: true, message: "Bitte Schicht auswählen" }]}
          noStyle
        >
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "Mi",
      dataIndex: "mittwoch",
      key: "mi",
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item
          name={["wochenplan", index, "mi"]}
          rules={[{ required: true, message: "Bitte Schicht auswählen" }]}
          noStyle
        >
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "Do",
      dataIndex: "donnerstag",
      key: "do",
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item
          name={["wochenplan", index, "do"]}
          rules={[{ required: true, message: "Bitte Schicht auswählen" }]}
          noStyle
        >
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "Fr",
      dataIndex: "freitag",
      key: "fr",
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item
          name={["wochenplan", index, "fr"]}
          rules={[{ required: true, message: "Bitte Schicht auswählen" }]}
          noStyle
        >
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "Sa",
      dataIndex: "samstag",
      key: "sa",
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item
          name={["wochenplan", index, "sa"]}
          rules={[{ required: true, message: "Bitte Schicht auswählen" }]}
          noStyle
        >
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
    {
      title: "So",
      dataIndex: "sonntag",
      key: "so",
      render: (_: any, record: Wochenplan, index: number) => (
        <Form.Item
          name={["wochenplan", index, "so"]}
          rules={[{ required: true, message: "Bitte Schicht auswählen" }]}
          noStyle
        >
          <Select style={{ width: "100%" }}>
            {schichten.map((schicht) => (
              <Select.Option
                key={schicht.schicht_id}
                value={schicht.bezeichnung}
              >
                {schicht.bezeichnung}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ),
    },
  ];

  return (
    <div className="w-full">
      <Form.Item name="zeitraum">
        <ZeitraumSelect
          value={zeitraum}
          onChange={(value) => {
            onZeitraumChange?.(value);
            if (schichten.length > 0) {
              initialisiereWochenplan(value, schichten[0].bezeichnung);
            }
          }}
        />
      </Form.Item>
      <Form.Item label="Schichtabfolge" style={{ margin: 0, padding: 0 }}>
        <Table
          className="w-full"
          columns={attribute}
          dataSource={wochenplan}
          pagination={false}
        />
      </Form.Item>
    </div>
  );
};
export default SchichtrotationTabelle;
