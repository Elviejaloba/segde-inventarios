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

// Calendario T.Sjuan - 244 items
export const CALENDARIO_TSJUAN: CalendarioSucursal = {
  sucursal: "T.Sjuan",
  totalItems: 244,
  semanas: [
    {
        "mes": "DICIEMBRE",
        "semana": "3° Semana",
        "items": ["ME18109", "TV06X", "ME221781", "TA11E", "ME1941", "TA11", "ME19406", "TD2135", "ME38346", "TD39C", "BL8000", "BL7505C00", "ME2838", "ME2132", "ME3992", "ME298", "OT7025M00"]
    },
    {
        "mes": "DICIEMBRE",
        "semana": "4° Semana",
        "items": ["BL719500", "BL7198M00", "BL7045S00", "PVREM06P", "TC605LX16", "ME11690", "ARACQUACAR120", "BL8021-00", "TC6019", "TC400R17", "ARSUEÑITOS", "BL544C-3", "BL7118B01", "BL7198V00", "BL7219P00", "SI6817", "OT05M00"]
    },
    {
        "mes": "ENERO",
        "semana": "1° Semana",
        "items": ["ME1165", "TD302SM", "TA1240", "ME24216", "TA89", "TA89C00", "OT05M16", "ME192019", "TD37S", "OT3702600", "BL7115L00", "ME11700", "ME27", "ME16103", "BL556-100", "BL7047I00", "BL7383BM00"]
    },
    {
        "mes": "ENERO",
        "semana": "2° Semana",
        "items": ["ME19205", "ME19207", "ME19209", "TC506M08", "BL7017L00", "ME1111", "ME16105", "TC400R19", "TV605TV", "TD111M", "BL080100", "BL544M-200", "BL701200", "BL7114CX00", "BL7118B14", "SI6818", "TA454T"]
    },
    {
        "mes": "ENERO",
        "semana": "3° Semana",
        "items": ["TA456M04", "BL558-200", "BL7009K00", "BL7055G00", "BL7222A00", "BL8D-300", "ME19411", "TA118S09", "TD09027", "TD37B", "ARACQUA500", "ARWAN120", "ARWANTED-60M120", "BL35022", "BL544C-00", "BL556-300", "BL61300"]
    },
    {
        "mes": "ENERO",
        "semana": "4° Semana",
        "items": ["BL6546MC00", "BL7010G00", "BL7014H", "BL711100", "BL7198200", "ME1115", "ME2144", "ME221765", "ME33174", "TD36D", "TF169P", "TF61M", "TF112L", "ME16326", "TA01B00", "ME266", "TA11PM"]
    },
    {
        "mes": "FEBRERO",
        "semana": "1° Semana",
        "items": ["TA56X", "OT003M26", "ME1972", "OT05M06", "ME2121", "OT05M01", "ME194717", "OT003M67", "TA73", "OT05M09", "ME3993", "OT05M07", "BL711000", "ME39911", "OT003M34", "OT003M10", "OT003M22"]
    },
    {
        "mes": "FEBRERO",
        "semana": "2° Semana",
        "items": ["OT003M54", "BL7007I00", "BL544MF-200", "ME3998", "OT003M62", "ME542", "TA56LF02", "BL7045S03", "OT003M94", "ME161617", "OT003M69", "BL8-100", "OT003M33", "OT003M41", "OT003M50", "TA137R00", "TM40F"]
    },
    {
        "mes": "FEBRERO",
        "semana": "3° Semana",
        "items": ["ME163132", "BL7047P-100", "TD36TM00", "TV80E", "ME163133", "BL544E-200", "BL003KE", "OT003B00", "ME3834", "OT05M05", "BL544E-100", "BL7111", "BL719700", "BL67099F", "BL7008A00", "BL080300", "BL544MF-300", "BL7383P00"]
    },
    {
        "mes": "FEBRERO",
        "semana": "4° Semana",
        "items": ["BL8V-100", "BL8V-200", "OT05M03", "BL701000", "BL7019H00", "BL706900", "BL8000MF00", "PVPB919600", "ME1934", "TA77-1T00", "TA138G", "TA605S", "TD195OT", "BL556-200", "TA605LX", "TA82PT21", "OT003M60", "OT003M39"]
    },
    {
        "mes": "MARZO",
        "semana": "1° Semana",
        "items": ["BL8E-200", "OT003M25", "OT003M83", "OT003M63", "OT003M37", "OT003M38", "OT003M19", "TC195M01", "OT003M79", "OT05M04", "OT003M28", "TA170C", "TC40003", "TD09012", "PVPB730900", "ME1611", "TV102L", "ME1888"]
    },
    {
        "mes": "MARZO",
        "semana": "2° Semana",
        "items": ["ME18810", "ME19537", "TA56LF07", "TA77-3T11", "TC605LX01", "TC605LX04", "ME19102", "BL7018X00", "ME1119", "TC81M04", "ME18510", "ME1859", "PV750500", "TA82F", "TC605M21", "TC150C03", "TC40015", "TV84C"]
    },
    {
        "mes": "MARZO",
        "semana": "3° Semana",
        "items": ["TA56L", "TV456M00", "TV51S01", "TC510L00", "TC400I00", "TC505X09", "TC400TX00", "BL7104-400", "TC30T15", "TC150C32", "BL7115M00", "TC40001", "BL7383C-00", "BL557-200", "TA89D00", "BL60400", "BL704000", "BL7313N00"]
    },
    {
        "mes": "MARZO",
        "semana": "4° Semana",
        "items": ["TV80M", "TV84S", "TV139F", "TF61T", "TF166M", "TA56LF03", "TV103", "TF44KM", "TA77-3S00", "TA452T", "BL61700", "TA605V", "TA70KF07", "BL67100V15", "BL67100V10", "TA72RJ00", "TA70MF", "BL89AT00"]
    }
  ]
};

export const CALENDARIO_TLUIS: CalendarioSucursal = {
  ...CALENDARIO_TMENDOZA,
  sucursal: "T.Luis"
};

export const CALENDARIO_CRISA2: CalendarioSucursal = {
  ...CALENDARIO_TMENDOZA,
  sucursal: "Crisa2"
};

// Obtener el calendario por sucursal
export function getCalendarioSucursal(sucursalId: string): CalendarioSucursal | null {
  switch (sucursalId) {
    case "T.Mendoza":
      return CALENDARIO_TMENDOZA;
    case "T.Sjuan":
      return CALENDARIO_TSJUAN;
    case "T.Luis":
      return CALENDARIO_TLUIS;
    case "Crisa2":
      return CALENDARIO_CRISA2;
    default:
      return null;
  }
}

