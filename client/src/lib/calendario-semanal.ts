// Calendario semanal de muestreo para T.Mendoza
// 260 items distribuidos en 14 semanas (Diciembre 2024 - Marzo 2025)

export interface SemanaCalendario {
  mes: string;
  semana: string;
  items: string[];
}

export interface CalendarioSucursal {
  sucursal: string;
  totalItems: number;
  semanas: SemanaCalendario[];
}

export const CALENDARIO_TMENDOZA: CalendarioSucursal = {
  sucursal: "T.Mendoza",
  totalItems: 260,
  semanas: [
    {
        "mes": "DICIEMBRE",
        "semana": "3° Semana",
        "items": [
            "TA80800",
            "TA89GP00",
            "TD157",
            "TD39C",
            "TA89",
            "TA11RA",
            "TD2155",
            "TV139",
            "TF172LX",
            "TA56LX00",
            "TV80C",
            "TD39J",
            "TD302SM",
            "TA80300",
            "TD59R",
            "TD2163",
            "TA424P",
            "TV09I"
        ]
    },
    {
        "mes": "DICIEMBRE",
        "semana": "4° Semana",
        "items": [
            "TA89G",
            "TV82X",
            "TA11",
            "TD39S",
            "TF172C19",
            "TA611",
            "TA450TX",
            "TD143A",
            "TA421",
            "TV51S06",
            "TA89HX00",
            "TD111M",
            "TA89D300",
            "TA452M",
            "TA00400",
            "TD302X09",
            "TA89R00",
            "TV51S21"
        ]
    },
    {
        "mes": "ENERO",
        "semana": "1° Semana",
        "items": [
            "TA86",
            "TA56C",
            "TD67098",
            "TV136P",
            "TCCOMBO29",
            "TA424TF",
            "TA456M04",
            "TA77-3T01",
            "TV51S32",
            "TD301",
            "TF173M",
            "TD37N",
            "TA59N-304",
            "TD143G",
            "TD106-00",
            "PVREM12C",
            "TD141X00",
            "TD37C"
        ]
    },
    {
        "mes": "ENERO",
        "semana": "2° Semana",
        "items": [
            "TD09052",
            "TA56E",
            "TC23603",
            "TA451",
            "TF44M",
            "TC23614",
            "TF172C04",
            "TA451S09",
            "TA424R01",
            "TA77-3T21",
            "TA72M01",
            "TA90I10",
            "TA450S09",
            "TD456",
            "TA59N-310",
            "TA72X",
            "TD09054",
            "TA423"
        ]
    },
    {
        "mes": "ENERO",
        "semana": "3° Semana",
        "items": [
            "TC23607",
            "TA773J",
            "TA56A",
            "TA82I",
            "TV605TV",
            "TA424F07",
            "TC75S08",
            "TC400R03",
            "PVMD391730",
            "PVREM06P",
            "TC400R19",
            "TC6019",
            "TC75S29",
            "TCCOMBO42",
            "TA422TP",
            "TA80500",
            "TC400R17",
            "TC505T15"
        ]
    },
    {
        "mes": "ENERO",
        "semana": "4° Semana",
        "items": [
            "TCCOMBO25",
            "PVFD70040046",
            "TV02X",
            "TA36R",
            "TD37B",
            "PVEO1091V0",
            "TC106G303",
            "TC150C09",
            "TA423T",
            "TA451S12",
            "TA58X",
            "PVPB941000",
            "TD197M-3",
            "TA59N-305",
            "TD36D",
            "PVEE800000",
            "PVFD70040001",
            "TF307"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "1° Semana",
        "items": [
            "PVFD70030009",
            "TC307K04",
            "TA89C00",
            "TV82S",
            "TV09",
            "TA148G",
            "TA81900",
            "TA451T",
            "TD106M",
            "TF112L",
            "TF61M",
            "TD36TM",
            "TD197M",
            "TD36V",
            "TD107S",
            "TA11PM",
            "TA008T00",
            "TA73"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "2° Semana",
        "items": [
            "TA56X",
            "TA01B00",
            "TA56LF11",
            "TA59N-303",
            "TD89G-300",
            "TA456M09",
            "TA610",
            "TA138G",
            "TA77-1T00",
            "TA77-3T07",
            "TA77-3R29",
            "TA424BF07",
            "TD09029",
            "TA77-3T00",
            "TA59N",
            "TA77-3R03",
            "TA454T",
            "TA605LX"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "3° Semana",
        "items": [
            "TD09022",
            "TA451S03",
            "TD106G-3",
            "TC307K02",
            "TV02M",
            "TA58E",
            "TD09012",
            "TA170S00",
            "TV425L",
            "TV51S10",
            "TD156B",
            "TV400TR",
            "TD36MX03",
            "PVEO0105B0",
            "PVEO107605",
            "PVIN0194B0",
            "TV83",
            "TA68X"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "4° Semana",
        "items": [
            "TV82SM",
            "TA60",
            "TV82M",
            "TV215",
            "TA56LF07",
            "TA82F",
            "TV04M",
            "TC605LX04",
            "PVEO107A5",
            "TC605LX01",
            "TC605M15",
            "TA82PT03",
            "PVEO202",
            "TA82PT16",
            "TA82PT04",
            "PV750500",
            "PVEO201L",
            "PVEO200"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "1° Semana",
        "items": [
            "PVFD70040015",
            "PVFD70000059",
            "TC195OT13",
            "TC40015",
            "PVFD700000",
            "PVFD70040061",
            "PVIN0745B0",
            "TC195M19",
            "TC605M21",
            "PVMD391620",
            "TA82PT05",
            "PVFD006300",
            "PVFD70000001",
            "TD39",
            "TA56L",
            "TA82KM",
            "TA57L",
            "TV84C",
            "TV451F",
            "TA67L"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "2° Semana",
        "items": [
            "TF166A",
            "TA194M00",
            "TV51S01",
            "TA170",
            "TA450T",
            "TA170C",
            "TC400I00",
            "TA424R05",
            "TA451S11",
            "TC510T00",
            "TA451S19",
            "TV82UV",
            "TA451S04",
            "TF147BX",
            "TC150C32",
            "TC400TX00",
            "TV80M",
            "TF166L",
            "TV139F",
            "TF34RLX"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "3° Semana",
        "items": [
            "TF165",
            "TF70T",
            "TV84S",
            "TF172L",
            "TA58I",
            "TV84B",
            "TA56LF03",
            "TD38",
            "TA400TX00",
            "TA452T",
            "TV215E",
            "TV82T",
            "TA456T",
            "TF61T",
            "TA56LF06",
            "TA424F13",
            "TA72M05",
            "TA57LC",
            "TF172P05",
            "TA56LF05"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "4° Semana",
        "items": [
            "TA75L",
            "TA75L00",
            "TA424BF03",
            "TV160",
            "TA56LF01",
            "TA82KX00",
            "TA451S14",
            "TF172P01",
            "TF61ML",
            "TF150B",
            "TF44LA",
            "TD199",
            "TA453T",
            "TF307S",
            "TD38X00",
            "TA70SF",
            "TA70KF07",
            "TF72R",
            "TA66L",
            "TF147-3"
        ]
    }
]
};

// Función para obtener la semana actual según la fecha
export function getSemanaActual(): { mes: string; semana: string } | null {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth(); // 0-11
  const dia = hoy.getDate();
  
  // Calcular número de semana del mes (1-4)
  const primerDiaMes = new Date(año, mes, 1);
  const diaSemana = primerDiaMes.getDay(); // 0=Dom, 1=Lun...
  const semanaNum = Math.ceil((dia + diaSemana) / 7);
  const semanaStr = semanaNum === 1 ? "1° Semana" : 
                    semanaNum === 2 ? "2° Semana" : 
                    semanaNum === 3 ? "3° Semana" : "4° Semana";
  
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", 
                 "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  
  return { mes: meses[mes], semana: semanaStr };
}

// Obtener el calendario por sucursal (por ahora solo T.Mendoza)
export function getCalendarioSucursal(sucursalId: string): CalendarioSucursal | null {
  if (sucursalId === "T.Mendoza") {
    return CALENDARIO_TMENDOZA;
  }
  return null;
}

